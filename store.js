/* Quadern · capa de dades local-primer amb sincronització a Supabase.
   API de col·leccions (collection/doc/set/update/delete/get/onSnapshot). Tot s'escriu primer al mòbil i es puja quan hi ha connexió.
   Multiusuari: l'entrenador pot "obrir" un client (Q.viewAs) i llavors llegeix i escriu les dades d'aquell client. */
(function(){
  const SB_URL="https://tsgvbxvrufuqlbzekmwd.supabase.co";
  const SB_KEY="sb_publishable_CIQ_0caYmCUsbustLjvTfg_qZR4At_K";
  const APP_URL=location.origin+location.pathname;
  // Abans que Supabase llegeixi l'enllaç del correu: és una invitació o un canvi de contrasenya?
  const AUTH_TYPE=(/[#&?]type=(invite|recovery|magiclink|signup)/.exec(location.hash+location.search)||[])[1]||null;
  const sb=window.supabase?window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:"implicit"}}):null;
  const L={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};

  /* Col·leccions: què registra el client i què prepara l'entrenador */
  const CLIENT_COLS=["sessions","bodyweight","kcallog","drafts","intake"];
  const COACH_COLS=["exercises","templates","targets","programs","nutrition","reports"];
  const CONSENT_VERSION="v3-2026-11";
  const AI={name:"Q",full:"Q, l'entrenador IA del Quadern",provider:"Claude, d'Anthropic PBC"};
  const CONTROLLER={name:"Sergi Coma",role:"entrenador personal",contact:"sergicogu@gmail.com"};

  const Q={sb,uid:null,email:null,target:null,viewing:null,profile:null,consent:null,
    cache:L.get("q_cache",{}),out:L.get("q_out",[]),lastSync:L.get("q_last",null),synced:false,listeners:{},busy:false,pulling:false,
    CLIENT_COLS,COACH_COLS,CONSENT_VERSION,CONTROLLER,AI};
  window.QStore=Q;
  const ck=()=>Q.viewing?"q_cache_"+Q.viewing.id:"q_cache", lk=()=>Q.viewing?"q_last_"+Q.viewing.id:"q_last";
  const save=()=>{L.set(ck(),Q.cache);L.set("q_out",Q.out);L.set(lk(),Q.lastSync)};
  const emit=col=>{(Q.listeners[col]||[]).forEach(f=>{try{f()}catch(e){console.error(e)}});(Q.listeners["*"]||[]).forEach(f=>{try{f()}catch(e){}})};
  const emitAll=()=>Object.keys(Q.listeners).forEach(c=>{if(c!=="*"&&c!=="_out")emit(c)});
  const genId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,10);
  Q.canWrite=col=>Q.viewing?COACH_COLS.includes(col):(Q.isCoach()||CLIENT_COLS.includes(col));
  Q.isCoach=()=>!!(Q.profile&&Q.profile.role==="coach");
  Q.isClient=()=>!!(Q.profile&&Q.profile.role!=="coach");
  function write(col,id,data){
    if(Q.profile&&!Q.canWrite(col)){
      const e=new Error(Q.viewing?"Això només ho pot registrar el client":"Això ho prepara el teu entrenador"); e.readonly=true; return Promise.reject(e);
    }
    const u=Q.target||Q.uid;
    Q.cache[col]=Q.cache[col]||{};
    if(data==null) delete Q.cache[col][id]; else Q.cache[col][id]=data;
    Q.out=Q.out.filter(w=>!(w.col===col&&w.id===id&&(w.u||Q.uid)===u));
    Q.out.push({u,col,id,data:data==null?null:data,deleted:data==null,v:genId()});
    save(); emit(col); flush();
    return Promise.resolve();
  }
  function snap(col,ord){
    let docs=Object.entries(Q.cache[col]||{}).map(([id,d])=>({id,data:()=>d}));
    if(ord){const [f,dir]=ord;docs.sort((a,b)=>{const x=a.data()[f]??"",y=b.data()[f]??"";return (x<y?-1:x>y?1:0)*(dir==="desc"?-1:1)})}
    return {docs,metadata:{fromCache:!(Q.synced||Q.lastSync),hasPendingWrites:Q.out.length>0}};
  }
  function collection(col){
    let ord=null;
    const api={
      orderBy(f,dir){ord=[f,dir||"asc"];return api},
      onSnapshot(next){const f=()=>next(snap(col,ord));(Q.listeners[col]=Q.listeners[col]||[]).push(f);setTimeout(f,0);return()=>{Q.listeners[col]=Q.listeners[col].filter(x=>x!==f)}},
      doc(id){id=id||genId();return{
        id,path:col+"/"+id,
        set:d=>write(col,id,JSON.parse(JSON.stringify(d))),
        update:d=>write(col,id,Object.assign({},(Q.cache[col]||{})[id]||{},JSON.parse(JSON.stringify(d)))),
        delete:()=>write(col,id,null),
        get:async()=>{const d=(Q.cache[col]||{})[id];return{exists:!!d,id,data:()=>d}}
      }}
    };
    return api;
  }
  async function flush(){
    if(!sb||!Q.uid||Q.busy||!Q.out.length||navigator.onLine===false) return;
    Q.busy=true;
    try{
      while(Q.out.length){
        const batch=Q.out.slice(0,200);
        const rows=batch.map(w=>({user_id:w.u||Q.uid,col:w.col,id:w.id,data:w.data,deleted:w.deleted}));
        const {error}=await sb.from("docs").upsert(rows,{onConflict:"user_id,col,id"});
        if(error){
          // Permís denegat (p. ex. consentiment retirat): descarta el que no es pot pujar perquè no bloquegi la resta
          if(/row-level security|permission/i.test(error.message)&&batch.length===1){Q.out=Q.out.filter(w=>w.v!==batch[0].v);save();continue}
          if(/row-level security|permission/i.test(error.message)){ // prova d'un en un
            for(const w of batch){const r=await sb.from("docs").upsert([{user_id:w.u||Q.uid,col:w.col,id:w.id,data:w.data,deleted:w.deleted}],{onConflict:"user_id,col,id"});
              if(!r.error||/row-level security|permission/i.test(r.error.message)){Q.out=Q.out.filter(x=>x.v!==w.v)} else throw r.error}
            save(); continue;
          }
          throw error;
        }
        const done=new Set(batch.map(w=>w.v)); Q.out=Q.out.filter(w=>!done.has(w.v)); save();
      }
    }catch(e){console.warn("Sincronització pendent:",e.message||e)}
    Q.busy=false; emit("_out");
  }
  async function pull(){
    if(!sb||!Q.uid||Q.pulling||navigator.onLine===false) return; Q.pulling=true;
    const who=Q.target||Q.uid;
    try{
      let from=0,max=Q.lastSync,changed=new Set();
      for(;;){
        let q=sb.from("docs").select("col,id,data,deleted,updated_at").eq("user_id",who).order("updated_at",{ascending:true}).range(from,from+999);
        if(Q.lastSync) q=q.gt("updated_at",Q.lastSync);
        const {data,error}=await q; if(error) throw error;
        if((Q.target||Q.uid)!==who) break; // s'ha canviat de client mentre carregava
        for(const r of data){
          if(Q.out.some(w=>(w.u||Q.uid)===who&&w.col===r.col&&w.id===r.id)) continue;
          Q.cache[r.col]=Q.cache[r.col]||{};
          if(r.deleted||r.data==null) delete Q.cache[r.col][r.id]; else Q.cache[r.col][r.id]=r.data;
          changed.add(r.col); if(!max||r.updated_at>max) max=r.updated_at;
        }
        if(data.length<1000){ Q.lastSync=max; Q.synced=true; save(); changed.forEach(emit); if(!changed.size) emitAll(); break }
        from+=1000;
      }
    }catch(e){console.warn("No s'ha pogut actualitzar:",e.message||e)}
    Q.pulling=false;
  }
  Q.flush=flush; Q.pull=pull; Q.sync=async()=>{await flush();await pull()};
  Q.pendingCount=()=>Q.out.filter(w=>w.col!=="drafts").length;
  Q.on=(col,f)=>{(Q.listeners[col]=Q.listeners[col]||[]).push(f)};

  /* Entrenador: obrir les dades d'un client i tornar a les pròpies */
  function switchTo(v){
    save();
    Q.viewing=v; Q.target=v?v.id:null;
    Q.cache=L.get(ck(),{}); Q.lastSync=L.get(lk(),null); Q.synced=false; Q.pulling=false;
    document.body.classList.toggle("cv",!!v);
    emit("_view"); emitAll(); pull();
  }
  Q.viewAs=c=>{ if(!Q.isCoach()) return; switchTo({id:c.id,name:c.name||c.email,email:c.email}) };
  Q.viewSelf=()=>switchTo(null);
  Q.forgetClient=id=>{L.del("q_cache_"+id);L.del("q_last_"+id)};
  Q.rpc=async(fn,args)=>{const {data,error}=await sb.rpc(fn,args||{}); if(error) throw error; return data};
  Q.fn=async body=>{const {data,error}=await sb.functions.invoke("quadern",{body});
    if(error){let m=error.message; try{const j=await error.context.json(); if(j&&j.error) m=j.error}catch(e){} throw new Error(m)} if(data&&data.error) throw new Error(data.error); return data};
  /* Llegir directament col·leccions d'un altre usuari (per copiar rutines o pautes) */
  Q.fetchCol=async(user,cols)=>{const {data,error}=await sb.from("docs").select("col,id,data").eq("user_id",user).in("col",cols).eq("deleted",false); if(error) throw error; return data};
  Q.putDocs=async(user,rows)=>{const {error}=await sb.from("docs").upsert(rows.map(r=>({user_id:user,col:r.col,id:r.id,data:r.data,deleted:false})),{onConflict:"user_id,col,id"}); if(error) throw error};

  /* fotos */
  const assets={
    async upload(blob){
      if(!sb||!Q.uid) throw new Error("Cal connexió per pujar fotos");
      const path=Q.uid+"/"+genId()+".jpg";
      const {error}=await sb.storage.from("fotos").upload(path,blob,{contentType:blob.type||"image/jpeg",upsert:false});
      if(error) throw error;
      const url=sb.storage.from("fotos").getPublicUrl(path).data.publicUrl;
      return {id:path,url,sizeBytes:blob.size,contentType:blob.type};
    },
    async delete(id){ if(id&&String(id).startsWith(Q.uid+"/")) await sb.storage.from("fotos").remove([id]) },
    async list(){return {assets:[],usage:{}}}
  };

  /* notificacions push */
  const VAPID="BNPfX3sqH0FuahU4_tx7Z3Ij6Qm7CGQYiOe41LRHc78zUG-eEvFhDLcJUXTPgDl0EtJsA9cu3B2wh88KS8PSJwo";
  const b64=s=>{s=s.replace(/-/g,"+").replace(/_/g,"/");const r=atob(s+"===".slice((s.length+3)%4));return Uint8Array.from(r,c=>c.charCodeAt(0))};
  const standalone=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
  Q.push={
    supported:()=>"serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window,
    standalone,
    async state(){
      if(!Q.push.supported()) return standalone()?"unsupported":"install";
      if(Notification.permission==="denied") return "denied";
      try{const r=await navigator.serviceWorker.ready;const s=await r.pushManager.getSubscription();return s&&Notification.permission==="granted"?"on":"off"}catch(e){return "off"}
    },
    async enable(){
      if(!sb||!Q.uid) throw new Error("Cal connexió");
      const perm=await Notification.requestPermission(); if(perm!=="granted") throw new Error(perm==="denied"?"denied":"Permís no concedit");
      const r=await navigator.serviceWorker.ready;
      let s=await r.pushManager.getSubscription();
      if(!s) s=await r.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64(VAPID)});
      const j=s.toJSON();
      const {error}=await sb.from("push_subs").upsert({endpoint:j.endpoint,user_id:Q.uid,p256dh:j.keys.p256dh,auth:j.keys.auth,ua:navigator.userAgent.slice(0,200)},{onConflict:"endpoint"});
      if(error) throw error; return "on";
    },
    async disable(){
      const r=await navigator.serviceWorker.ready; const s=await r.pushManager.getSubscription();
      if(s){ if(sb) await sb.from("push_subs").delete().eq("endpoint",s.endpoint); await s.unsubscribe() } return "off";
    },
    async test(){
      if(!sb||!Q.uid) throw new Error("Cal connexió");
      const {error}=await sb.rpc("push_test"); if(error) throw error;
    }
  };
  async function clearBadge(){
    try{ if(navigator.clearAppBadge) navigator.clearAppBadge() }catch(e){}
    if(sb&&Q.uid&&navigator.onLine!==false){ try{await sb.from("notifications").update({read_at:new Date().toISOString()}).eq("user_id",Q.uid).is("read_at",null)}catch(e){} }
  }
  Q.clearBadge=clearBadge;
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible") clearBadge()});

  /* sessió */
  let dbResolve; const dbReady=new Promise(r=>dbResolve=r);
  const DB={collection};
  let needPassword=AUTH_TYPE==="invite"||AUTH_TYPE==="recovery";
  async function loadProfile(){
    const {data:p,error}=await sb.from("profiles").select("id,name,role,coach_id,email").eq("id",Q.uid).maybeSingle();
    if(error) throw error;
    Q.profile=p; L.set("q_profile",p);
    if(p&&p.role!=="coach"){
      const {data:c}=await sb.from("consents").select("id,version,ai,accepted_at").eq("user_id",Q.uid).is("revoked_at",null).order("accepted_at",{ascending:false}).limit(1);
      Q.consent=(c&&c[0])||null; L.set("q_consent",Q.consent);
    } else Q.consent=null;
  }
  async function onSession(session){
    if(!session){Q.uid=null;showLogin();return}
    if(Q.uid&&Q.uid!==session.user.id){Q.cache={};Q.out=[];Q.lastSync=null;save()}
    Q.uid=session.user.id; Q.email=session.user.email; L.set("q_uid",Q.uid);
    clearBadge();
    if(needPassword){showPassword();return}
    try{await loadProfile()}catch(e){Q.profile=L.get("q_profile",null);Q.consent=L.get("q_consent",null)}
    if(gate()) return;
    hideLogin();
    await Promise.race([Q.sync(),new Promise(r=>setTimeout(r,5000))]);
    dbResolve(DB);
  }
  /* Abans d'entrar: client sense entrenador o sense consentiment → pantalla corresponent */
  function gate(){
    const p=Q.profile; if(!p||p.role==="coach") return false;
    if(!p.coach_id){showNoCoach();return true}
    if(!Q.consent||!Q.consent.ai){showConsent(false);return true}
    return false;
  }
  window.qapp={use:async n=>n==="db"?dbReady:n==="assets"?assets:null};
  const lastUid=L.get("q_uid",null);
  const offlineEnter=()=>{Q.uid=lastUid;Q.profile=L.get("q_profile",null);Q.consent=L.get("q_consent",null);if(!gate())dbResolve(DB)};
  if(!sb){ if(lastUid) offlineEnter(); else showLogin(); }
  else { sb.auth.getSession().then(({data})=>{
    if(data.session) onSession(data.session);
    else if(lastUid&&navigator.onLine===false) offlineEnter();
    else showLogin();
  }).catch(()=>{ if(lastUid) offlineEnter(); else showLogin() }); }
  if(sb) sb.auth.onAuthStateChange((ev,session)=>{
    if(ev==="PASSWORD_RECOVERY"){needPassword=true; if(session){Q.uid=session.user.id;Q.email=session.user.email} showPassword(); return}
    if(ev==="SIGNED_IN"&&session&&Q.uid!==session.user.id) onSession(session);
    if(ev==="SIGNED_OUT"){Q.uid=null;showLogin()} });
  window.addEventListener("online",()=>Q.sync());
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible") Q.sync(); else flush()});
  setInterval(()=>{if(document.visibilityState==="visible") Q.sync()},60000);

  /* ---------- pantalles d'accés ---------- */
  function screen(html){
    if(!document.body){document.addEventListener("DOMContentLoaded",()=>screen(html),{once:true});return null}
    let el=document.getElementById("login");
    if(!el){el=document.createElement("div");el.id="login";document.body.appendChild(el)}
    el.hidden=false; el.scrollTop=0; el.innerHTML=`<div class="lgin"><div class="lgbrand">Quadern <i>d'entrenament</i></div>${html}</div>`; return el;
  }
  const $i=id=>document.getElementById(id);
  const msgTo=id=>t=>{const m=$i(id);if(m)m.textContent=t};
  function showLogin(){
    if(!screen(`<h1 id="lg-title">Entrar</h1>
      <form id="lg-form" class="stack">
        <label class="f"><span class="lbl">Correu</span><input id="lg-email" type="email" autocomplete="email" required></label>
        <label class="f"><span class="lbl">Contrasenya</span><input id="lg-pass" type="password" autocomplete="current-password" minlength="6" required></label>
        <button class="primary" id="lg-go" style="height:52px;font-size:17px">Entrar</button>
        <button type="button" class="plain" id="lg-reset" style="font-size:13px">He oblidat la contrasenya</button>
        <p class="sub" id="lg-msg" style="min-height:20px"></p>
        <p class="sub" style="font-size:13px">L'accés és per invitació del teu entrenador. Si t'ha convidat, obre l'enllaç del correu.</p>
      </form>`)){document.addEventListener("DOMContentLoaded",showLogin,{once:true});return}
    const msg=msgTo("lg-msg");
    if(!sb) msg("Cal connexió a internet per entrar el primer cop.");
    $i("lg-reset").onclick=async()=>{const e=$i("lg-email").value.trim();if(!e){msg("Escriu el teu correu primer");return}
      const {error}=await sb.auth.resetPasswordForEmail(e,{redirectTo:APP_URL});msg(error?error.message:"T'hem enviat un correu per canviar la contrasenya.")};
    $i("lg-form").onsubmit=async ev=>{ev.preventDefault();const email=$i("lg-email").value.trim(),password=$i("lg-pass").value;
      const b=$i("lg-go");b.disabled=true;msg("Entrant…");
      try{const {error}=await sb.auth.signInWithPassword({email,password});if(error)throw error}
      catch(e){msg(/Invalid login/i.test(e.message)?"Correu o contrasenya incorrectes.":/not confirmed/i.test(e.message)?"Encara has de confirmar el compte des del correu.":e.message)}
      b.disabled=false};
  }
  function showPassword(){
    if(!screen(`<h1>${AUTH_TYPE==="recovery"?"Nova contrasenya":"Benvingut/da"}</h1>
      <p class="sub">${AUTH_TYPE==="recovery"?"Escriu la contrasenya nova.":"Crea una contrasenya per entrar a l'app a partir d'ara."}</p>
      <form id="pw-form" class="stack">
        <label class="f"><span class="lbl">Contrasenya (mínim 8 caràcters)</span><input id="pw-1" type="password" autocomplete="new-password" minlength="8" required></label>
        <label class="f"><span class="lbl">Repeteix-la</span><input id="pw-2" type="password" autocomplete="new-password" minlength="8" required></label>
        <button class="primary" id="pw-go" style="height:52px;font-size:17px">Desar i continuar</button>
        <p class="sub" id="pw-msg" style="min-height:20px"></p></form>`)) return;
    const msg=msgTo("pw-msg");
    $i("pw-form").onsubmit=async ev=>{ev.preventDefault();const a=$i("pw-1").value,b=$i("pw-2").value;
      if(a!==b){msg("Les dues contrasenyes no coincideixen");return}
      $i("pw-go").disabled=true;msg("Desant…");
      const {data,error}=await sb.auth.updateUser({password:a});
      if(error){msg(error.message);$i("pw-go").disabled=false;return}
      needPassword=false; history.replaceState(null,"",APP_URL);
      const {data:s}=await sb.auth.getSession(); Q.uid=null; onSession(s.session)};
  }
  function showNoCoach(){
    if(!screen(`<h1>Compte sense entrenador</h1><p class="sub">Aquesta app funciona per invitació. Demana al teu entrenador que et convidi amb aquest correu: <b>${esc(Q.email||"")}</b>.</p>
      <button class="primary" id="nc-retry" style="height:52px">Ja m'ha convidat</button><button class="plain" id="nc-out">Tancar sessió</button>`)) return;
    $i("nc-retry").onclick=async()=>{await loadProfile().catch(()=>{}); if(!gate()){hideLogin();await Q.sync();dbResolve(DB)}};
    $i("nc-out").onclick=()=>Q.signOut();
  }
  function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  /* ---------- Consentiment RGPD ---------- */
  Q.consentText=()=>`
    <div class="card stack" style="font-size:14px;line-height:1.45">
      <p><b>Responsable:</b> ${esc(CONTROLLER.name)}, ${esc(CONTROLLER.role)}. Contacte: ${esc(CONTROLLER.contact)}.</p>
      <p><b>Quines dades:</b> nom i correu; entrenaments (exercicis, càrregues, repeticions i notes); pes corporal; calories diàries i pauta d'alimentació. El pes, l'alimentació i les notes sobre molèsties o salut són <b>dades de salut</b> (categoria especial, art. 9 RGPD).</p>
      <p><b>Per a què:</b> planificar i seguir el teu entrenament i la teva alimentació i preparar-te un informe setmanal. No es fan servir per a res més, no es venen ni es cedeixen a ningú.</p>
      <p><b>Entrenador IA (${esc(AI.name)}):</b> el servei inclou ${esc(AI.full)}, un sistema d'intel·ligència artificial (${esc(AI.provider)}) que analitza les teves dades (fitxa, entrenaments, pes i alimentació) per proposar-te rutines, càrregues, pautes i missatges. <b>Cap proposta t'arriba sense que el teu entrenador la revisi i l'aprovi</b>, de manera que no hi ha decisions basades només en un tractament automatitzat (art. 22 RGPD). Els missatges de ${esc(AI.name)} sempre es mostren com a fets per IA. Anthropic hi actua com a encarregat del tractament i les dades es poden tractar fora de la UE (EUA) amb les garanties de l'art. 46 RGPD.</p>
      <p><b>Base legal:</b> el teu consentiment explícit (art. 6.1.a i 9.2.a RGPD i Llei orgànica 3/2018).</p>
      <p><b>On es guarden:</b> a Supabase, amb servidors a la UE (París), que actua com a encarregat del tractament. L'app s'allotja a GitHub Pages, que no guarda dades teves.</p>
      <p><b>Quant de temps:</b> mentre siguis client. Si esborres el compte, s'eliminen totes les teves dades.</p>
      <p><b>Els teus drets:</b> accés, rectificació, supressió, oposició, limitació i portabilitat, i retirar el consentiment quan vulguis. Des de ⚙︎ pots descarregar totes les teves dades o esborrar el compte. També pots escriure a ${esc(CONTROLLER.contact)}. Si creus que no es respecten, pots reclamar a l'Agència Espanyola de Protecció de Dades (aepd.es).</p>
    </div>`;
  function showConsent(editing){
    const cur=Q.consent;
    if(!screen(`<h1>Protecció de dades</h1><p class="sub">${cur&&!editing?"Hem actualitzat el servei: ara inclou un entrenador IA. Llegeix-ho i accepta-ho per continuar.":"Abans de començar, llegeix com es tracten les teves dades."}</p>${Q.consentText()}
      <form id="cs-form" class="stack">
        <label class="chkl"><input type="checkbox" id="cs-adult" ${editing?"checked disabled":""} required> Tinc 18 anys o més.</label>
        <label class="chkl"><input type="checkbox" id="cs-health" ${editing?"checked disabled":""} required> Consenteixo expressament el tractament de les meves dades de salut per a aquestes finalitats.</label>
        <label class="chkl"><input type="checkbox" id="cs-ai" ${editing?"checked disabled":""} required> Accepto que ${esc(AI.name)} (intel·ligència artificial) analitzi les meves dades per proposar-me entrenaments i pautes, sempre revisades pel meu entrenador.</label>
        ${editing?"":`<button class="primary" id="cs-go" style="height:52px;font-size:17px">Acceptar i continuar</button>`}
        <button type="button" class="plain" id="cs-no">${editing?"Tornar":"No accepto"}</button>
        <p class="sub" id="cs-msg" style="min-height:20px"></p></form>`)) return;
    const msg=msgTo("cs-msg");
    $i("cs-no").onclick=()=>{ if(editing){hideLogin();return} msg("Sense el consentiment no es pot fer servir l'app. Pots tancar la sessió o acceptar-lo."); const b=$i("cs-no"); if(b.dataset.c){Q.signOut();return} b.dataset.c="1"; b.textContent="Tancar sessió"; };
    $i("cs-form").onsubmit=async ev=>{ev.preventDefault();
      const adult=$i("cs-adult").checked, health=$i("cs-health").checked, ai=$i("cs-ai").checked;
      if(!adult||!health||!ai){msg("Cal marcar les tres caselles per fer servir l'app");return}
      $i("cs-go").disabled=true; msg("Desant…");
      try{
        if(cur){const r=await sb.from("consents").update({revoked_at:new Date().toISOString()}).eq("id",cur.id); if(r.error) throw r.error}
        const {data,error}=await sb.from("consents").insert({user_id:Q.uid,version:CONSENT_VERSION,health,adult,ai,user_agent:navigator.userAgent.slice(0,200)}).select("id,version,ai,accepted_at").single();
        if(error) throw error;
        Q.consent=data; L.set("q_consent",data); hideLogin();
        if(!editing){await Promise.race([Q.sync(),new Promise(r=>setTimeout(r,5000))]); dbResolve(DB)}
        emit("_view");
      }catch(e){msg("No s'ha pogut desar: "+e.message);$i("cs-go").disabled=false}};
  }
  Q.editConsent=()=>showConsent(true);
  Q.deleteAccount=async()=>{await Q.fn({action:"delete_account"}); await sb.auth.signOut().catch(()=>{}); localStorage.clear(); location.replace(APP_URL)};
  function hideLogin(){const el=document.getElementById("login");if(el)el.hidden=true}
  Q.signOut=async()=>{await flush();if(sb)await sb.auth.signOut();
    Object.keys(localStorage).filter(k=>/^q_|^draft$|^pend$/.test(k)).forEach(k=>L.del(k)); location.reload()};
})();
