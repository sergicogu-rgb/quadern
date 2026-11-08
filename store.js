/* Quadern · capa de dades local-primer amb sincronització a Supabase.
   Imita l'API que feia servir l'app dins de Claude (collection/doc/set/update/delete/get/onSnapshot)
   perquè la resta del codi no canviï. Tot s'escriu primer al mòbil i es puja quan hi ha connexió. */
(function(){
  const SB_URL="https://tsgvbxvrufuqlbzekmwd.supabase.co";
  const SB_KEY="sb_publishable_CIQ_0caYmCUsbustLjvTfg_qZR4At_K";
  const sb=window.supabase?window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
  const L={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
  const Q={sb,uid:null,email:null,cache:L.get("q_cache",{}),out:L.get("q_out",[]),lastSync:L.get("q_last",null),synced:false,listeners:{},busy:false,pulling:false};
  window.QStore=Q;
  const save=()=>{L.set("q_cache",Q.cache);L.set("q_out",Q.out);L.set("q_last",Q.lastSync)};
  const emit=col=>{(Q.listeners[col]||[]).forEach(f=>{try{f()}catch(e){console.error(e)}});(Q.listeners["*"]||[]).forEach(f=>f())};
  const genId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,10);
  function write(col,id,data){
    Q.cache[col]=Q.cache[col]||{};
    if(data==null) delete Q.cache[col][id]; else Q.cache[col][id]=data;
    Q.out=Q.out.filter(w=>!(w.col===col&&w.id===id));
    Q.out.push({col,id,data:data==null?null:data,deleted:data==null,v:genId()});
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
        const rows=batch.map(w=>({user_id:Q.uid,col:w.col,id:w.id,data:w.data,deleted:w.deleted}));
        const {error}=await sb.from("docs").upsert(rows,{onConflict:"user_id,col,id"});
        if(error) throw error;
        const done=new Set(batch.map(w=>w.v)); Q.out=Q.out.filter(w=>!done.has(w.v)); save();
      }
    }catch(e){console.warn("Sincronització pendent:",e.message||e)}
    Q.busy=false; emit("_out");
  }
  async function pull(){
    if(!sb||!Q.uid||Q.pulling||navigator.onLine===false) return; Q.pulling=true;
    try{
      let from=0,max=Q.lastSync,changed=new Set();
      for(;;){
        let q=sb.from("docs").select("col,id,data,deleted,updated_at").eq("user_id",Q.uid).order("updated_at",{ascending:true}).range(from,from+999);
        if(Q.lastSync) q=q.gt("updated_at",Q.lastSync);
        const {data,error}=await q; if(error) throw error;
        for(const r of data){
          if(Q.out.some(w=>w.col===r.col&&w.id===r.id)) continue;
          Q.cache[r.col]=Q.cache[r.col]||{};
          if(r.deleted||r.data==null) delete Q.cache[r.col][r.id]; else Q.cache[r.col][r.id]=r.data;
          changed.add(r.col); if(!max||r.updated_at>max) max=r.updated_at;
        }
        if(data.length<1000) break; from+=1000;
      }
      Q.lastSync=max; Q.synced=true; save(); changed.forEach(emit); if(!changed.size) Object.keys(Q.listeners).forEach(emit);
    }catch(e){console.warn("No s'ha pogut actualitzar:",e.message||e)}
    Q.pulling=false;
  }
  Q.flush=flush; Q.pull=pull; Q.sync=async()=>{await flush();await pull()};
  Q.pendingCount=()=>Q.out.filter(w=>w.col!=="drafts").length;
  Q.on=(col,f)=>{(Q.listeners[col]=Q.listeners[col]||[]).push(f)};

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
  async function onSession(session){
    if(!session){Q.uid=null;showLogin();return}
    if(Q.uid&&Q.uid!==session.user.id){Q.cache={};Q.out=[];Q.lastSync=null;save()}
    Q.uid=session.user.id; Q.email=session.user.email; L.set("q_uid",Q.uid); hideLogin();
    clearBadge();
    await Promise.race([Q.sync(),new Promise(r=>setTimeout(r,5000))]);
    dbResolve(DB);
  }
  window.claude={use:async n=>n==="db"?dbReady:n==="assets"?assets:null};
  // Sense connexió però amb sessió anterior: entra igualment amb les dades del mòbil
  const lastUid=L.get("q_uid",null);
  if(!sb){ if(lastUid){Q.uid=lastUid;dbResolve(DB)} else showLogin(); }
  else { sb.auth.getSession().then(({data})=>{
    if(data.session) onSession(data.session);
    else if(lastUid&&navigator.onLine===false){Q.uid=lastUid;dbResolve(DB)}
    else showLogin();
  }).catch(()=>{ if(lastUid){Q.uid=lastUid;dbResolve(DB)} else showLogin() }); }
  if(sb) sb.auth.onAuthStateChange((ev,session)=>{ if(ev==="SIGNED_IN"&&session&&Q.uid!==session.user.id) onSession(session); if(ev==="SIGNED_OUT"){Q.uid=null;showLogin()} });
  window.addEventListener("online",()=>Q.sync());
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible") Q.sync(); else flush()});
  setInterval(()=>{if(document.visibilityState==="visible") Q.sync()},60000);

  /* pantalla d'accés */
  function showLogin(){
    if(!document.body){document.addEventListener("DOMContentLoaded",showLogin,{once:true});return}
    let el=document.getElementById("login");
    if(!el){el=document.createElement("div");el.id="login";document.body.appendChild(el)}
    el.hidden=false;
    el.innerHTML=`<div class="lgin"><div class="lgbrand">Quadern <i>d'entrenament</i></div>
      <h1 id="lg-title">Entrar</h1>
      <form id="lg-form" class="stack">
        <label class="f"><span class="lbl">Correu</span><input id="lg-email" type="email" autocomplete="email" required></label>
        <label class="f"><span class="lbl">Contrasenya</span><input id="lg-pass" type="password" autocomplete="current-password" minlength="6" required></label>
        <button class="primary" id="lg-go" style="height:52px;font-size:17px">Entrar</button>
        <button type="button" class="plain" id="lg-mode">No tens compte? Crea'n un</button>
        <button type="button" class="plain" id="lg-reset" style="font-size:13px">He oblidat la contrasenya</button>
        <p class="sub" id="lg-msg" style="min-height:20px"></p>
      </form></div>`;
    if(!sb){el.querySelector("#lg-msg").textContent="Cal connexió a internet per entrar el primer cop.";}
    let signup=false; const msg=t=>{document.getElementById("lg-msg").textContent=t};
    document.getElementById("lg-mode").onclick=()=>{signup=!signup;document.getElementById("lg-title").textContent=signup?"Crear compte":"Entrar";document.getElementById("lg-go").textContent=signup?"Crear compte":"Entrar";document.getElementById("lg-mode").textContent=signup?"Ja tens compte? Entra":"No tens compte? Crea'n un";msg("")};
    document.getElementById("lg-reset").onclick=async()=>{const e=document.getElementById("lg-email").value.trim();if(!e){msg("Escriu el teu correu primer");return}
      const {error}=await sb.auth.resetPasswordForEmail(e,{redirectTo:location.origin+location.pathname});msg(error?error.message:"T'hem enviat un correu per canviar la contrasenya.")};
    document.getElementById("lg-form").onsubmit=async ev=>{ev.preventDefault();const email=document.getElementById("lg-email").value.trim(),password=document.getElementById("lg-pass").value;
      const b=document.getElementById("lg-go");b.disabled=true;msg(signup?"Creant el compte…":"Entrant…");
      try{
        if(signup){const {data,error}=await sb.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname}});if(error)throw error;
          if(!data.session) msg("Compte creat. Confirma'l des del correu que t'hem enviat i després entra aquí.");}
        else{const {error}=await sb.auth.signInWithPassword({email,password});if(error)throw error}
      }catch(e){msg(/Invalid login/i.test(e.message)?"Correu o contrasenya incorrectes.":/not confirmed/i.test(e.message)?"Encara has de confirmar el compte des del correu.":e.message)}
      b.disabled=false};
  }
  function hideLogin(){const el=document.getElementById("login");if(el)el.hidden=true}
  Q.signOut=async()=>{await flush();if(sb)await sb.auth.signOut();Q.cache={};Q.out=[];Q.lastSync=null;save();localStorage.removeItem("draft");localStorage.removeItem("q_uid");location.reload()};
})();
