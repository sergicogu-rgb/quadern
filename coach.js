/* Quadern · mode entrenador
   - Panell de clients (resum de cada client, invitacions, obrir/desvincular)
   - Vista d'un client: Resum (informe automàtic), Rutines (editor), Pauta (editor amb calculadora), Pes, Setmana, Menjar, Informes
   - Informe setmanal automàtic (també el veu el client a Informes)
   Depèn de les funcions i l'estat globals de index.html (S, $, esc, fn, render...). */
const CV=()=>!!(window.QStore&&QStore.viewing);
const IS_COACH=()=>!!(window.QStore&&QStore.isCoach());
const IS_CLIENT=()=>!!(window.QStore&&QStore.isClient());
const COACH_VIEWS=["resum","rutines","pauta","pes","progres","setmana","nutricio","informes"];
const CLIENT_HIDDEN=["clients","resum","rutines","pauta"];

/* ---------- pestanyes i capçalera ---------- */
let TABS_OWN=null;
const ICO={
  resum:`<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 16v-3M13 16v-5M16 16v-2"/>`,
  rutines:`<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>`,
  pauta:`<path d="M12 7c-1.5-2.5-6.5-2.5-7 2.5-.4 4.5 2.5 10.5 5 10.5 1 0 1.3-.6 2-.6s1 .6 2 .6c2.5 0 5.4-6 5-10.5C18.5 4.5 13.5 4.5 12 7z"/><path d="M12 7c0-2 1-3.5 3-4"/>`,
  pes:`<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M9 9.5a4 4 0 0 1 6 0M12 12l1.5-2.5"/>`,
  setmana:`<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>`,
  nutricio:`<path d="M5 20V9M10 20V4M15 20v-7M20 20v-4"/>`,
  informes:`<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>`};
function renderTabs(){
  const nav=document.querySelector("#tabs .in"); if(!nav) return;
  if(TABS_OWN==null) TABS_OWN=nav.innerHTML;
  const want=CV()?"cv":"own"; if(nav.dataset.mode===want) return; nav.dataset.mode=want;
  if(want==="own"){nav.innerHTML=TABS_OWN;return}
  const L={resum:"Resum",rutines:"Rutines",pauta:"Pauta",pes:"Pes",setmana:"Setmana",nutricio:"Kcal",informes:"Informes"};
  nav.innerHTML=Object.keys(L).map(k=>`<a href="#${k}" data-v="${k}"><svg viewBox="0 0 24 24">${ICO[k]}</svg>${L[k]}</a>`).join("");
}
function cvTop(){
  const v=QStore.viewing;
  return `<button class="plain" id="cv-back" style="padding:4px 0;font-weight:700;color:var(--accent)">‹ Clients</button>
    <span class="brand" style="text-align:right;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(v.name||v.email||"Client")}</span>`;
}
/* Quines vistes es poden obrir segons el mode */
function allowView(v){
  if(CV()) return COACH_VIEWS.includes(v)?v:"resum";
  if(v==="clients") return IS_COACH()?v:"avui";
  if(v==="rutines"||v==="pauta") return IS_COACH()?v:"avui";
  if(v==="resum") return "avui";
  return v;
}

/* ---------- PANELL DE CLIENTS ---------- */
let ovw=null, ovwErr=null, ovwInv=[], ovwBusy=false, invLink=null, unlinkConfirm=null;
async function loadOverview(){
  if(ovwBusy) return; ovwBusy=true;
  try{
    ovw=await QStore.rpc("coach_overview");
    const {data}=await QStore.sb.from("invites").select("email,name,created_at,accepted_at").is("accepted_at",null).order("created_at",{ascending:false});
    ovwInv=data||[]; ovwErr=null;
  }catch(e){ovwErr=e.message}
  ovwBusy=false; if(cur==="clients") render();
}
const ago=iso=>{if(!iso) return "mai"; const d=Math.round((dt(todayISO())-dt(String(iso).slice(0,10)))/864e5); return d<=0?"avui":d===1?"ahir":"fa "+d+" dies"};
function renderClients(){
  const el=$("#v-clients");
  if(!IS_COACH()){el.innerHTML=`<div class="empty"><b>Només per a l'entrenador</b></div>`;return}
  if(ovw==null&&!ovwErr) loadOverview();
  let h=`<div class="stack"><div class="vhead"><span class="lbl">Panell d'entrenador</span><h1>Clients</h1></div>`;
  h+=`<form class="card stack" id="inv-form"><span class="lbl">Convidar un client</span>
    <div class="row"><label class="f"><span class="lbl">Nom</span><input id="inv-name" autocomplete="off" required></label>
    <label class="f"><span class="lbl">Correu</span><input id="inv-email" type="email" autocomplete="off" required></label></div>
    <button class="primary" id="inv-go" style="height:50px">Enviar invitació</button>
    <p class="sub" style="font-size:13px">Rep un correu per crear la contrasenya. En entrar haurà d'acceptar el consentiment de dades abans de registrar res.</p>
    ${invLink?`<div class="note stack"><span>No s'ha pogut enviar el correu. Envia-li aquest enllaç (per WhatsApp, per exemple). Caduca en 24 h.</span>
      <div class="btns" style="margin:0"><button type="button" id="inv-share">Compartir l'enllaç</button><button type="button" id="inv-copy">Copiar l'enllaç</button></div></div>`:""}
  </form>`;
  if(ovwErr) h+=`<div class="note">No s'han pogut carregar els clients: ${esc(ovwErr)}</div>`;
  else if(ovw==null) h+=`<div class="empty"><b>Carregant…</b></div>`;
  else if(!ovw.length) h+=`<div class="empty"><b>Encara no tens clients</b>Convida el primer amb el formulari de dalt.</div>`;
  else ovw.forEach(c=>{
    const cons=c.consent_at?`<span class="pill">RGPD ✓</span>`:`<span class="pill w">Consentiment pendent</span>`;
    h+=`<article class="card stack"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
      <div style="min-width:0"><h3 style="margin:0">${esc(c.name||c.email)}</h3><div class="sub" style="font-size:13px;overflow:hidden;text-overflow:ellipsis">${esc(c.email||"")}</div></div>
      <div class="ph" style="justify-content:flex-end">${cons}</div></div>
      <div class="tiles"><div class="tile"><div class="lbl">Sessions 7 d</div><div class="v">${c.sessions_7d||0}</div></div>
        <div class="tile"><div class="lbl">Pes</div><div class="v">${c.last_weight!=null?fn(+c.last_weight,1):"–"}<small> kg</small></div></div>
        <div class="tile"><div class="lbl">Kcal 7 d</div><div class="v">${c.kcal_7d!=null?fn(+c.kcal_7d,0):"–"}<small> · ${c.kcal_days_7d||0}/7</small></div></div></div>
      <div class="sub num" style="font-size:13px">Últim entrenament: ${esc(ago(c.last_session))} · últim pes: ${esc(ago(c.last_weight_date))}</div>
      <div class="btns" style="margin:0"><button class="primary" data-open="${esc(c.id)}">Obrir</button>
        <button class="danger" data-unlink="${esc(c.id)}">${unlinkConfirm===c.id?"Confirma: desvincular":"Desvincular"}</button></div></article>`;
  });
  if(ovwInv.length) h+=`<div class="card tw" style="padding:6px 10px"><table><thead><tr><th>Invitacions pendents</th><th class="r"></th></tr></thead><tbody>
    ${ovwInv.map(i=>`<tr><td><b>${esc(i.name||"")}</b><div class="sub" style="font-size:12px">${esc(i.email)} · ${esc(ago(i.created_at))}</div></td>
      <td class="r" style="white-space:nowrap"><button class="plain" data-resend="${esc(i.email)}" data-name="${esc(i.name||"")}">Reenviar</button><button class="plain" data-cancel="${esc(i.email)}" style="color:var(--bad)">✕</button></td></tr>`).join("")}</tbody></table></div>`;
  h+=`<button class="ghost" id="ovw-reload">Actualitzar</button></div>`;
  el.innerHTML=h;
}
async function sendInvite(email,name,b){
  if(b) b.disabled=true; invLink=null;
  try{
    const r=await QStore.fn({action:"invite",email,name});
    if(r.existing) toast("Ja tenia compte: ara és client teu");
    else if(r.emailed) toast("Invitació enviada a "+email);
    else if(r.link){invLink=r.link; toast("Correu no enviat: comparteix l'enllaç")}
    else toast("No s'ha pogut convidar: "+(r.reason||"error"));
    ovw=null; await loadOverview();
  }catch(e){toast("No s'ha pogut convidar: "+e.message)}
  if(b) b.disabled=false; render();
}
document.addEventListener("submit",e=>{ if(e.target.id!=="inv-form") return; e.preventDefault();
  sendInvite($("#inv-email").value.trim(),$("#inv-name").value.trim(),$("#inv-go")); });
document.addEventListener("click",async e=>{
  if(!e.target.closest("#v-clients")) return; const b=e.target.closest("button"); if(!b) return;
  if(b.dataset.open){const c=(ovw||[]).find(x=>x.id===b.dataset.open); if(c){QStore.viewAs(c); location.hash="resum"} return}
  if(b.dataset.unlink){const id=b.dataset.unlink; if(unlinkConfirm!==id){unlinkConfirm=id;render();return}
    unlinkConfirm=null; try{await QStore.rpc("coach_unlink",{client:id}); QStore.forgetClient(id); toast("Client desvinculat"); ovw=null; loadOverview()}catch(err){toast("Error: "+err.message)} return}
  if(b.dataset.resend) return sendInvite(b.dataset.resend,b.dataset.name,b);
  if(b.dataset.cancel){try{await QStore.sb.from("invites").delete().eq("email",b.dataset.cancel); ovw=null; loadOverview(); toast("Invitació anul·lada")}catch(err){toast(err.message)} return}
  if(b.id==="ovw-reload"){ovw=null;ovwErr=null;render();return}
  if(b.id==="inv-copy"){try{await navigator.clipboard.writeText(invLink);toast("Enllaç copiat")}catch(err){prompt("Copia l'enllaç:",invLink)} return}
  if(b.id==="inv-share"){try{await navigator.share({title:"Quadern d'entrenament",text:"T'he convidat al meu Quadern d'entrenament. Obre l'enllaç per crear la contrasenya:",url:invLink})}catch(err){} return}
});

/* ---------- INFORME SETMANAL AUTOMÀTIC ---------- */
/* Ritmes de pes de referència (% del pes corporal per setmana):
   definició −0,5 a −1 % (Helms et al. 2014; Garthe et al. 2011), volum net +0,25 a +0,5 % (Iraki et al. 2019),
   recomposició i manteniment ±0,25 %. Volum de 10-20 sèries efectives/setm. per grup (Schoenfeld et al. 2017). */
const PHASES={def:{t:"Definició",lo:-1,hi:-0.5},vol:{t:"Volum net",lo:0.25,hi:0.5},rec:{t:"Recomposició",lo:-0.25,hi:0.25},man:{t:"Manteniment",lo:-0.25,hi:0.25}};
const phaseOf=txt=>{const t=String(txt||"").toLowerCase(); return /defin|cut/.test(t)?"def":/volum|bulk/.test(t)?"vol":/recomp/.test(t)?"rec":"man"};
let repWeek=null;
function pautaAt(iso){let a=null; pautes().forEach(x=>{if(x.from<=iso)a=x}); return a}
function autoReport(ws){
  const we=addDays(ws,6), pws=addDays(ws,-7), pwe=addDays(ws,-1);
  const ses=S.sessions.filter(s=>s.date>=ws&&s.date<=we).sort((a,b)=>a.date.localeCompare(b.date));
  const all=sessionsSorted();
  const sets=ses.flatMap(s=>(s.items||[]).flatMap(it=>(it.sets||[]).filter(effective).map(x=>({...x,muscle:it.muscle||(exById(it.exId)||{}).muscle||"Altres"}))));
  const byM={}; sets.forEach(x=>byM[x.muscle]=(byM[x.muscle]||0)+1);
  let up=0,same=0,down=0; const prs=[];
  ses.forEach(s=>(s.items||[]).forEach(it=>{
    const b=bestE1(it.sets); if(!b) return;
    const prev=all.find(o=>o.date<s.date&&(o.items||[]).some(i=>i.exId===it.exId));
    if(prev){const pb=bestE1(prev.items.find(i=>i.exId===it.exId).sets); if(b>pb*1.005) up++; else if(b<pb*0.995) down++; else same++}
    const hist=all.filter(o=>o.date<s.date).flatMap(o=>(o.items||[]).filter(i=>i.exId===it.exId).flatMap(i=>i.sets||[]));
    if(hist.length&&b>bestE1(hist)) prs.push({name:it.name||(exById(it.exId)||{}).name||"Exercici",best:b,sets:it.sets});
  }));
  const bw=bwData(), wB=bw.filter(x=>x.date>=ws&&x.date<=we), pB=bw.filter(x=>x.date>=pws&&x.date<=pwe);
  const avg=a=>a.length?a.reduce((s,x)=>s+x.kg,0)/a.length:null;
  const bwA=avg(wB), bwP=avg(pB), dPct=bwA!=null&&bwP!=null?(bwA-bwP)/bwP*100:null;
  const kc=S.kcallog.filter(x=>x.date>=ws&&x.date<=we&&x.kcal), kA=kc.length?kc.reduce((s,x)=>s+x.kcal,0)/kc.length:null;
  const P=pautaAt(we), tg=P&&P.targets?P.targets.kcal:null, ph=PHASES[phaseOf(P&&(P.phase||P.title))];
  const nT=S.templates.length;
  const notes=ses.map(s=>s.notes||"").filter(n=>/mol[eè]st|dolor|lesi|mal d|tib|punxada/i.test(n));
  const flags=[];
  flags.push(`${ses.length} sessions${nT?" de "+nT+" rutines":""}${nT&&ses.length<nT?" · falten "+(nT-ses.length):""}.`);
  if(wB.length<4) flags.push(`Només ${wB.length}/7 dies de pes: la mitjana és poc fiable (es recomanen 4 o més).`);
  if(dPct!=null&&ph){const ok=dPct>=ph.lo-0.05&&dPct<=ph.hi+0.05;
    flags.push(`Pes ${dPct>0?"+":""}${fn(dPct,2)} % vs setmana anterior. Objectiu ${ph.t.toLowerCase()}: ${fn(ph.lo,2)} a ${fn(ph.hi,2)} %/setm. ${ok?"✓ Dins del ritme.":dPct<ph.lo?"Baixa massa ràpid.":dPct>ph.hi?"Puja massa ràpid o no baixa.":""}`)}
  if(kc.length<5) flags.push(`Kcal registrades ${kc.length}/7 dies: amb menys de 5 no es pot calibrar el manteniment.`);
  if(kA&&tg){const d=(kA-tg)/tg*100; flags.push(`Kcal mitjanes ${fn(kA,0)} vs pauta ${fn(tg,0)} (${d>0?"+":""}${fn(d,0)} %).${Math.abs(d)>10?" Desviació important.":""}`)}
  if(up+same+down) flags.push(`Rendiment: ${up} exercicis milloren, ${same} igual, ${down} baixen (1RM estimat vs la vegada anterior).`);
  if(notes.length) flags.push(`Hi ha ${notes.length} nota${notes.length>1?"es":""} amb molèsties: revisa-les.`);
  return {ws,we,ses,sets,byM,prs,bwA,dPct,wBn:wB.length,kA,kn:kc.length,tg,flags,P};
}
function autoReportCard(){
  const lastFull=addDays(weekStart(todayISO()),-7); const ws=repWeek||lastFull; const r=autoReport(ws);
  const cur=weekStart(todayISO());
  const muscles=Object.entries(r.byM).sort((a,b)=>b[1]-a[1]);
  return `<article class="card stack report"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
      <button class="plain" data-rw="-7" aria-label="Setmana anterior">‹</button>
      <div style="text-align:center"><span class="lbl">Resum automàtic${ws===cur?" · en curs":""}</span><h3 style="margin:2px 0 0">${esc(fdate(r.ws,{day:"numeric",month:"short"}))} – ${esc(fdate(r.we,{day:"numeric",month:"short"}))}</h3></div>
      <button class="plain" data-rw="7" aria-label="Setmana següent" ${ws>=cur?"disabled":""}>›</button></div>
    <div class="tiles"><div class="tile"><div class="lbl">Sessions</div><div class="v">${r.ses.length}<small> · ${r.sets.length} sèries</small></div></div>
      <div class="tile"><div class="lbl">Pes mitjà</div><div class="v">${r.bwA!=null?fn(r.bwA,1):"–"}<small>${r.dPct!=null?" · "+(r.dPct>0?"+":"")+fn(r.dPct,1)+" %":""}</small></div></div>
      <div class="tile"><div class="lbl">Kcal</div><div class="v">${r.kA?fn(r.kA,0):"–"}<small> · ${r.kn}/7</small></div></div></div>
    <ul class="tips">${r.flags.map(f=>`<li>${esc(f)}</li>`).join("")}</ul>
    ${muscles.length?`<details><summary class="lbl" style="cursor:pointer">Sèries efectives per grup muscular</summary><div class="tw"><table><tbody>${muscles.map(([m,n])=>`<tr><td>${esc(m)}</td><td class="r num">${n}</td></tr>`).join("")}</tbody></table></div><p class="sub" style="font-size:12px">Referència per a hipertròfia: uns 10-20 sèries setmanals per grup, repartides en 2 dies o més.</p></details>`:""}
    ${r.prs.length?`<details><summary class="lbl" style="cursor:pointer">Rècords (${r.prs.length})</summary><div class="tw"><table><tbody>${r.prs.map(p=>`<tr><td>${esc(p.name)}</td><td class="r num">${p.sets.map(x=>fn(x.kg,2)+"×"+x.reps).join(" · ")}</td></tr>`).join("")}</tbody></table></div></details>`:""}
  </article>`;
}
document.addEventListener("click",e=>{const b=e.target.closest("button[data-rw]"); if(!b) return;
  const cur=weekStart(todayISO()); let ws=addDays(repWeek||addDays(cur,-7),+b.dataset.rw); if(ws>cur) ws=cur; repWeek=ws; render();});

/* ---------- RESUM DEL CLIENT (vista de l'entrenador) ---------- */
function renderResum(){
  const el=$("#v-resum"); const v=QStore.viewing||{}; const tp=tplsSorted(), nx=nextTemplate(tp), P=activePauta(), last=sessionsSorted()[0];
  const bw=bwData(), lb=bw[bw.length-1], st=kcalStats();
  el.innerHTML=`<div class="stack"><div class="vhead"><span class="lbl">${esc(v.email||"")}</span><h1>${esc(v.name||"Client")}</h1></div>
    ${autoReportCard()}
    <div class="card tw" style="padding:6px 10px"><table><tbody>
      <tr><td>Rutines</td><td class="r">${tp.length?tp.length+" · propera: "+esc(nx?nx.name:"–"):"<a href='#rutines'>Cap · crea-les</a>"}</td></tr>
      <tr><td>Últim entrenament</td><td class="r">${last?esc(fdate(last.date))+" · "+esc(last.name||""):"–"}</td></tr>
      <tr><td>Pauta activa</td><td class="r">${P?esc(P.title||P.phase||"")+" · "+fn((P.targets||{}).kcal,0)+" kcal":"<a href='#pauta'>Cap · crea-la</a>"}</td></tr>
      <tr><td>Últim pes</td><td class="r num">${lb?fn(lb.kg,2)+" kg · "+esc(fdate(lb.date)):"–"}</td></tr>
      <tr><td>Manteniment estimat</td><td class="r num">${st.maint?fn(Math.round(st.maint/10)*10,0)+" kcal":"calen 14 dies ("+st.nL+"/14)"}</td></tr>
    </tbody></table></div>
    <p class="sub" style="font-size:13px">Les dades de registre (sessions, pes i kcal) només les pot introduir el client. Tu prepares les rutines, la pauta i els informes.</p></div>`;
}

/* ---------- EDITOR DE RUTINES ---------- */
let rtDel=null, exEdit=null;
const parseRanges=s=>String(s||"").split(/[,;·]/).map(x=>x.match(/(\d+)\s*[-–x×]\s*(\d+)/)).filter(Boolean).map(m=>({min:+m[1],max:+m[2]}));
function renderRutines(){
  const el=$("#v-rutines"); const tp=tplsSorted();
  const exOpts=MUSCLES.map(m=>{const xs=S.exercises.filter(e=>(e.muscle||"Altres")===m).sort((a,b)=>a.name.localeCompare(b.name));return xs.length?`<optgroup label="${esc(m)}">${xs.map(e=>`<option value="${esc(e.id)}">${esc(e.name)}</option>`).join("")}</optgroup>`:""}).join("");
  let h=`<div class="stack"><div class="vhead"><span class="lbl">${CV()?esc(QStore.viewing.name):"Les meves"} · en ordre de rotació</span><h1>Rutines</h1></div>`;
  if(!tp.length) h+=`<div class="empty"><b>Encara no hi ha rutines</b>Crea'n una o copia les d'un altre quadern.</div>`;
  tp.forEach((t,k)=>{
    h+=`<article class="card stack"><div class="row" style="align-items:center"><span class="big" style="font-size:22px;color:var(--muted);flex:0 0 auto">${k+1}</span>
      <input data-tname="${esc(t.id)}" value="${esc(t.name||"")}" aria-label="Nom de la rutina" style="flex:1 1 auto;font-weight:700"></div>
      <div class="tw"><table><tbody>${(t.exIds||[]).map((id,j)=>{const ex=exById(id)||{name:"(exercici esborrat)"};const c=exCfg(ex);
        return `<tr><td><button class="plain" data-exedit="${esc(id)}" style="padding:0;text-align:left;font-weight:600">${esc(ex.name)}</button><div class="sub" style="font-size:12px">${esc(ex.muscle||"")} · ${esc(rngStr(c))} · +${fn(c.inc,2)} kg</div></td>
          <td class="r" style="white-space:nowrap">${j?`<button class="plain" data-exup="${esc(t.id)}|${j}" aria-label="Pujar">↑</button>`:""}<button class="plain" data-exrm="${esc(t.id)}|${j}" aria-label="Treure" style="color:var(--bad)">✕</button></td></tr>`}).join("")||`<tr><td class="sub">Sense exercicis</td></tr>`}</tbody></table></div>
      <div class="row"><select data-addsel="${esc(t.id)}" style="flex:2 1 160px"><option value="">Afegir exercici…</option>${exOpts}<option value="__new">+ Exercici nou…</option></select></div>
      <div class="btns" style="margin:0">${k?`<button data-tup="${esc(t.id)}">Moure amunt</button>`:""}<button class="danger" data-tdel="${esc(t.id)}">${rtDel===t.id?"Confirma: esborrar la rutina":"Esborrar rutina"}</button></div></article>`;
  });
  h+=`<div class="btns"><button class="primary" id="rt-new">Nova rutina</button><button id="rt-copy">Copiar rutines d'un altre quadern…</button></div>
    <p class="sub" style="font-size:13px">Rangs per sèrie: escriu-los com “7-9, 3-5, 7-9” (una entrada per sèrie). La progressió és doble: quan totes les sèries arriben al màxim del rang, l'app proposa pujar la càrrega.</p></div>`;
  el.innerHTML=h;
}
async function saveTpl(t){await db.collection("templates").doc(t.id).set(Object.fromEntries(Object.entries(t).filter(([k])=>k!=="id")))}
document.addEventListener("change",async e=>{
  const t=e.target;
  if(t.dataset.tname){const tp=S.templates.find(x=>x.id===t.dataset.tname); if(!tp) return; const v=t.value.trim(); if(!v||v===tp.name) return; tp.name=v; try{await saveTpl(tp);toast("Nom desat")}catch(err){toast(err.message)} return}
  if(t.dataset.addsel){const tp=S.templates.find(x=>x.id===t.dataset.addsel); const v=t.value; t.value=""; if(!tp||!v) return;
    if(v==="__new"){exEdit={tpl:tp.id,ex:null}; openSheet("exedit"); return}
    tp.exIds=[...(tp.exIds||[]),v]; try{await saveTpl(tp);render()}catch(err){toast(err.message)} return}
});
document.addEventListener("click",async e=>{
  if(!e.target.closest("#v-rutines")) return; const b=e.target.closest("button"); if(!b||!db) return;
  const byId=id=>S.templates.find(x=>x.id===id);
  try{
    if(b.dataset.exedit){exEdit={tpl:null,ex:b.dataset.exedit}; openSheet("exedit"); return}
    if(b.dataset.exup){const [tid,j]=b.dataset.exup.split("|"),tp=byId(tid),i=+j; const a=[...tp.exIds]; [a[i-1],a[i]]=[a[i],a[i-1]]; tp.exIds=a; await saveTpl(tp); render(); return}
    if(b.dataset.exrm){const [tid,j]=b.dataset.exrm.split("|"),tp=byId(tid); tp.exIds=tp.exIds.filter((_,i)=>i!==+j); await saveTpl(tp); render(); return}
    if(b.dataset.tup){const tp=tplsSorted(), i=tp.findIndex(x=>x.id===b.dataset.tup); [tp[i-1],tp[i]]=[tp[i],tp[i-1]]; for(let k=0;k<tp.length;k++){if(tp[k].order!==k+1){tp[k].order=k+1;await saveTpl(tp[k])}} render(); return}
    if(b.dataset.tdel){const id=b.dataset.tdel; if(rtDel!==id){rtDel=id;render();return} rtDel=null; await db.collection("templates").doc(id).delete(); toast("Rutina esborrada"); return}
    if(b.id==="rt-new"){const ref=db.collection("templates").doc(); const n=S.templates.length+1; await ref.set({name:"Rutina "+n,order:n,exIds:[]}); toast("Rutina creada"); return}
    if(b.id==="rt-copy"){openSheet("rtcopy"); return}
  }catch(err){toast("No s'ha pogut desar: "+err.message)}
});

/* ---------- fulls inferiors del mode entrenador (els crida drawSheet) ---------- */
let copySrc=[];
function coachSheet(kind){
  if(kind==="exedit"){
    const ex=exEdit&&exEdit.ex?exById(exEdit.ex):null, c=exCfg(ex);
    return `<h3>${ex?"Editar exercici":"Exercici nou"}</h3>
      <label class="f"><span class="lbl">Nom</span><input id="ce-name" value="${esc(ex?ex.name:"")}"></label>
      <label class="f"><span class="lbl">Grup muscular</span><select id="ce-muscle">${MUSCLES.map(m=>`<option ${ex&&ex.muscle===m?"selected":""}>${m}</option>`).join("")}</select></label>
      <label class="f"><span class="lbl">Rangs de reps (un per sèrie)</span><input id="ce-rng" value="${esc(ex?rngStr(c,", ").replace(/–/g,"-"):"8-12, 8-12, 8-12")}"></label>
      <label class="f"><span class="lbl">Pujada de càrrega (kg)</span><input id="ce-inc" inputmode="decimal" value="${fin(ex?c.inc:2.5)}"></label>
      <div class="btns"><button class="primary" id="ce-save">${ex?"Desar":"Crear i afegir"}</button><button id="sh-close">Tancar</button></div>`;
  }
  if(kind==="rtcopy"){
    const opts=[...(CV()?[{id:QStore.uid,name:"El meu quadern"}]:[]),...((ovw||[]).filter(c=>!CV()||c.id!==QStore.viewing.id).map(c=>({id:c.id,name:c.name||c.email})))];
    copySrc=opts;
    return `<h3>Copiar rutines</h3><p class="sub">Es copien les rutines i els exercicis. Les rutines actuals d'aquest quadern se substitueixen; l'historial no es toca.</p>
      <label class="f"><span class="lbl">D'on</span><select id="cp-src">${opts.map((o,i)=>`<option value="${i}">${esc(o.name)}</option>`).join("")}</select></label>
      ${opts.length?"":`<p class="sub">Obre primer el panell de clients perquè apareguin.</p>`}
      <div class="btns"><button class="primary" id="cp-go" ${opts.length?"":"disabled"}>Copiar</button><button id="sh-close">Tancar</button></div>`;
  }
  if(kind==="ptcopy"){
    const opts=[...(CV()?[{id:QStore.uid,name:"El meu quadern"}]:[]),...((ovw||[]).filter(c=>!CV()||c.id!==QStore.viewing.id).map(c=>({id:c.id,name:c.name||c.email})))];
    copySrc=opts;
    return `<h3>Partir d'una altra pauta</h3><p class="sub">Carrega la pauta més recent d'un altre quadern a l'editor perquè l'adaptis. No es desa fins que premis Desar.</p>
      <label class="f"><span class="lbl">D'on</span><select id="cp-src">${opts.map((o,i)=>`<option value="${i}">${esc(o.name)}</option>`).join("")}</select></label>
      <div class="btns"><button class="primary" id="cpp-go" ${opts.length?"":"disabled"}>Carregar</button><button id="sh-close">Tancar</button></div>`;
  }
  return null;
}
async function coachSheetClick(b){
  if(b.id==="ce-save"){
    const name=$("#ce-name").value.trim(), muscle=$("#ce-muscle").value, ranges=parseRanges($("#ce-rng").value), inc=num($("#ce-inc").value);
    if(!name){toast("Escriu el nom");return true} if(!ranges.length||ranges.some(r=>r.min>r.max)||!inc){toast("Rangs com 8-12, 8-12 i una pujada en kg");return true}
    const data={name,muscle,ranges,repMin:ranges[0].min,repMax:ranges[0].max,inc};
    try{
      if(exEdit.ex){await db.collection("exercises").doc(exEdit.ex).update(data)}
      else{const ref=db.collection("exercises").doc(); await ref.set({...data,createdAt:new Date().toISOString()});
        const tp=S.templates.find(x=>x.id===exEdit.tpl); if(tp){tp.exIds=[...(tp.exIds||[]),ref.id]; await saveTpl(tp)}}
      toast("Desat"); closeSheet(); render();
    }catch(err){toast("No s'ha pogut desar: "+err.message)}
    return true;
  }
  if(b.id==="cp-go"){
    const src=copySrc[+$("#cp-src").value]; if(!src) return true; b.disabled=true;
    try{
      const rows=await QStore.fetchCol(src.id,["exercises","templates"]); const target=QStore.target||QStore.uid;
      const old=S.templates.map(t=>({col:"templates",id:t.id,data:null}));
      await QStore.sb.from("docs").upsert(old.map(r=>({user_id:target,col:r.col,id:r.id,data:null,deleted:true})),{onConflict:"user_id,col,id"});
      await QStore.putDocs(target,rows);
      await QStore.pull(); toast(rows.filter(r=>r.col==="templates").length+" rutines copiades"); closeSheet(); render();
    }catch(err){b.disabled=false; toast("No s'ha pogut copiar: "+err.message)}
    return true;
  }
  if(b.id==="cpp-go"){
    const src=copySrc[+$("#cp-src").value]; if(!src) return true; b.disabled=true;
    try{const rows=(await QStore.fetchCol(src.id,["nutrition"])).filter(r=>r.data&&r.data.from).sort((a,b)=>b.data.from.localeCompare(a.data.from));
      if(!rows.length){toast("Aquest quadern no té cap pauta");b.disabled=false;return true}
      peLoad(rows[0].data,true); closeSheet(); render();
    }catch(err){b.disabled=false;toast(err.message)}
    return true;
  }
  return false;
}

/* ---------- EDITOR DE PAUTES amb calculadora ----------
   Despesa: Mifflin-St Jeor (Frankenfield et al. 2005) × nivell d'activitat (PAL).
   Ajust per fase: definició −20 %, recomposició −10 %, volum net +10 %.
   Proteïna g/kg: definició 2,2 · recomposició 2,0 · volum i manteniment 1,8 (Morton et al. 2018; Helms et al. 2014).
   Greix 0,8 g/kg (mínim un 20 % de les kcal); hidrats, la resta. */
const PHASE_ADJ={def:{k:-0.20,p:2.2},rec:{k:-0.10,p:2.0},vol:{k:0.10,p:1.8},man:{k:0,p:1.8}};
let pe=null;
const blankMeal=n=>({name:"Àpat "+n,note:"",kcal:null,p:null,c:null,g:null,items:[{name:"",g:null}]});
function peLoad(src,asNew){
  const d=JSON.parse(JSON.stringify(src||{}));
  pe={editing:asNew?null:(d.from?("pauta-"+d.from):null),from:asNew?addDays(weekStart(todayISO()),7):(d.from||todayISO()),title:d.title||"",phase:d.phase||"Recomposició",source:d.source||"Entrenador",provisional:!!d.provisional,
    targets:Object.assign({kcal:null,p:null,c:null,g:null},d.targets||{}),meals:(d.meals&&d.meals.length?d.meals:[blankMeal(1)]),
    supTxt:(d.supplements||[]).map(x=>x.name+": "+x.txt).join("\n"),tipsTxt:(d.tips||[]).join("\n"),
    calc:Object.assign({sex:"h",age:30,cm:175,kg:null,pal:1.55},d.calc||{}),extra:d};
  const lb=bwData().slice(-1)[0]; if(!pe.calc.kg&&lb) pe.calc.kg=lb.kg;
}
function calcTargets(){
  const c=pe.calc, kg=num(c.kg), cm=num(c.cm), age=num(c.age), pal=num(c.pal); if(!kg||!cm||!age||!pal) return null;
  const bmr=10*kg+6.25*cm-5*age+(c.sex==="d"?-161:5), tdee=bmr*pal, ph=PHASE_ADJ[phaseOf(pe.phase)];
  const st=kcalStats(); const base=c.useMaint&&st.maint?st.maint:tdee;
  const kcal=Math.round(base*(1+ph.k)/10)*10, p=Math.round(kg*ph.p), g=Math.max(Math.round(kg*0.8),Math.round(kcal*0.2/9)), cc=Math.max(0,Math.round((kcal-p*4-g*9)/4));
  return {bmr:Math.round(bmr),tdee:Math.round(tdee),maint:st.maint?Math.round(st.maint):null,kcal,p,c:cc,g};
}
function renderPauta(){
  const el=$("#v-pauta");
  if(!pe){
    const list=[...pautes()].reverse();
    el.innerHTML=`<div class="stack"><div class="vhead"><span class="lbl">${CV()?esc(QStore.viewing.name):"La meva"} · alimentació</span><h1>Pautes</h1></div>
      ${list.length?`<div class="card tw" style="padding:6px 10px"><table><thead><tr><th>Des del</th><th>Pauta</th><th class="r">Kcal</th><th></th></tr></thead><tbody>
      ${list.map(p=>`<tr><td class="num">${esc(fdate(p.from,{day:"numeric",month:"short",year:"2-digit"}))}</td><td>${esc(p.title||p.phase||"")}${p===activePauta()?' <span class="pill">Activa</span>':""}</td><td class="r num">${fn((p.targets||{}).kcal,0)}</td>
        <td class="r" style="white-space:nowrap"><button class="plain" data-pedit="${esc(p.id)}">Editar</button><button class="plain" data-pdup="${esc(p.id)}">Duplicar</button></td></tr>`).join("")}</tbody></table></div>`
      :`<div class="empty"><b>Encara no hi ha cap pauta</b>Crea'n una nova o parteix d'una altra.</div>`}
      <div class="btns"><button class="primary" id="pe-new">Nova pauta</button><button id="pe-from">Partir d'una altra pauta…</button></div></div>`;
    return;
  }
  const t=pe.targets, r=calcTargets(), st=kcalStats();
  const sum=pe.meals.reduce((a,m)=>({kcal:a.kcal+(num(m.kcal)||0),p:a.p+(num(m.p)||0),c:a.c+(num(m.c)||0),g:a.g+(num(m.g)||0)}),{kcal:0,p:0,c:0,g:0});
  const tk=(num(t.p)||0)*4+(num(t.c)||0)*4+(num(t.g)||0)*9;
  el.innerHTML=`<div class="stack"><div class="vhead"><span class="lbl">${pe.editing?"Editant":"Pauta nova"}</span><h1>${esc(pe.title||"Pauta")}</h1></div>
    <div class="card stack">
      <div class="row"><label class="f"><span class="lbl">Des del</span><input type="date" data-pe="from" value="${esc(pe.from)}"></label>
        <label class="f"><span class="lbl">Fase</span><select data-pe="phase">${["Definició","Recomposició","Volum net","Manteniment"].map(x=>`<option ${pe.phase===x?"selected":""}>${x}</option>`).join("")}</select></label></div>
      <label class="f"><span class="lbl">Títol</span><input data-pe="title" value="${esc(pe.title)}" placeholder="p. ex. Volum net · gener"></label>
      <label class="chkl"><input type="checkbox" data-pe="provisional" ${pe.provisional?"checked":""}> Provisional</label></div>
    <details class="card" ${t.kcal?"":"open"}><summary>Calculadora de kcal i macros</summary><div class="stack">
      <div class="row"><label class="f"><span class="lbl">Sexe</span><select data-pc="sex"><option value="h" ${pe.calc.sex==="h"?"selected":""}>Home</option><option value="d" ${pe.calc.sex==="d"?"selected":""}>Dona</option></select></label>
        <label class="f"><span class="lbl">Edat</span><input data-pc="age" inputmode="numeric" value="${esc(pe.calc.age??"")}"></label></div>
      <div class="row"><label class="f"><span class="lbl">Alçada (cm)</span><input data-pc="cm" inputmode="numeric" value="${esc(pe.calc.cm??"")}"></label>
        <label class="f"><span class="lbl">Pes (kg)</span><input data-pc="kg" inputmode="decimal" value="${esc(fin(pe.calc.kg))}"></label></div>
      <label class="f"><span class="lbl">Activitat (total del dia, entrenament inclòs)</span><select data-pc="pal">${[[1.4,"Sedentari + 3-4 entrenaments (1,4)"],[1.55,"Moderat · 7-10k passos + entrenament (1,55)"],[1.7,"Actiu · feina de peu o >10k passos (1,7)"],[1.85,"Molt actiu · feina física (1,85)"]].map(([v,l])=>`<option value="${v}" ${+pe.calc.pal===v?"selected":""}>${l}</option>`).join("")}</select></label>
      ${st.maint?`<label class="chkl"><input type="checkbox" data-pc="useMaint" ${pe.calc.useMaint?"checked":""}> Partir del manteniment real (${fn(Math.round(st.maint/10)*10,0)} kcal, de les dades del registre)</label>`:""}
      ${r?`<div class="sub num">Metabolisme basal ${fn(r.bmr,0)} · despesa estimada ${fn(r.tdee,0)} kcal${r.maint?" · real "+fn(r.maint,0):""}</div>
        <div class="sub num"><b>Proposta ${esc(pe.phase.toLowerCase())}: ${fn(r.kcal,0)} kcal · P ${r.p} · HC ${r.c} · G ${r.g}</b></div>
        <button type="button" id="pe-apply">Aplicar la proposta</button>`:`<div class="sub">Omple sexe, edat, alçada, pes i activitat.</div>`}
      <p class="sub" style="font-size:12px">És un punt de partida: la fórmula pot errar un ±10 %. Després de 2-3 setmanes de registre, ajusta amb el pes real (unes ±150 kcal).</p></div></details>
    <div class="card stack"><span class="lbl">Objectius diaris</span>
      <div class="mac">${[["kcal","Kcal","k"],["p","P (g)","p"],["c","HC (g)","c"],["g","G (g)","g"]].map(([k,l,cl])=>`<label class="tile ${cl}"><div class="lbl">${l}</div><input data-pt="${k}" inputmode="numeric" value="${esc(t[k]??"")}" style="font-size:20px;font-weight:700;width:100%"></label>`).join("")}</div>
      <div class="sub num" style="font-size:13px">Macros = ${fn(tk,0)} kcal${t.kcal&&Math.abs(tk-t.kcal)>50?` · <b style="color:var(--warn)">no quadra amb ${fn(t.kcal,0)}</b>`:""}${num(pe.calc.kg)&&t.p?` · proteïna ${fn(t.p/num(pe.calc.kg),1)} g/kg`:""}</div></div>
    ${pe.meals.map((m,i)=>`<div class="card stack"><div class="row" style="align-items:center"><input data-pm="${i}|name" value="${esc(m.name)}" style="font-weight:700;flex:1 1 auto;width:100%;min-width:0"><button class="plain" data-pmrm="${i}" style="color:var(--bad)" aria-label="Treure l'àpat">✕</button></div>
      <input data-pm="${i}|note" value="${esc(m.note||"")}" placeholder="Nota (p. ex. post-entrenament)">
      ${(m.items||[]).map((it,j)=>`<div class="row" style="align-items:center"><input data-pi="${i}|${j}|name" value="${esc(it.name||"")}" placeholder="Aliment" style="flex:3 1 0">
        <input data-pi="${i}|${j}|g" inputmode="decimal" value="${esc(it.g??"")}" placeholder="g" style="flex:1 1 0;min-width:60px"><button class="plain" data-pirm="${i}|${j}" aria-label="Treure">✕</button></div>`).join("")}
      <button class="ghost" data-piadd="${i}">+ Aliment</button>
      <div class="row">${[["kcal","Kcal"],["p","P"],["c","HC"],["g","G"]].map(([k,l])=>`<label class="f"><span class="lbl">${l}</span><input data-pm="${i}|${k}" inputmode="numeric" value="${esc(m[k]??"")}"></label>`).join("")}</div></div>`).join("")}
    <button class="ghost" id="pe-addmeal">+ Àpat</button>
    <div class="sub num" style="font-size:13px">Suma dels àpats: ${fn(sum.kcal,0)} kcal · P ${fn(sum.p,0)} · HC ${fn(sum.c,0)} · G ${fn(sum.g,0)}</div>
    <label class="f"><span class="lbl">Suplements (un per línia, “Nom: indicació”)</span><textarea data-pe="supTxt" placeholder="Creatina: 3-5 g al dia, a qualsevol hora">${esc(pe.supTxt)}</textarea></label>
    <label class="f"><span class="lbl">Consells (un per línia)</span><textarea data-pe="tipsTxt">${esc(pe.tipsTxt)}</textarea></label>
    <div class="btns"><button class="good" id="pe-save">Desar la pauta</button><button id="pe-cancel">Tancar sense desar</button>
      ${pe.editing?`<button class="danger" id="pe-del">${pe.delC?"Confirma: esborrar la pauta":"Esborrar la pauta"}</button>`:""}</div></div>`;
}
function peSet(e){
  const t=e.target; if(!pe||!t.closest||!t.closest("#v-pauta")) return false;
  const v=t.type==="checkbox"?t.checked:t.value;
  if(t.dataset.pe){pe[t.dataset.pe]=v; return true}
  if(t.dataset.pc){pe.calc[t.dataset.pc]=t.type==="checkbox"?v:(num(v)??v); return true}
  if(t.dataset.pt){pe.targets[t.dataset.pt]=num(v); return true}
  if(t.dataset.pm){const [i,k]=t.dataset.pm.split("|"); pe.meals[+i][k]=["kcal","p","c","g"].includes(k)?num(v):v; return true}
  if(t.dataset.pi){const [i,j,k]=t.dataset.pi.split("|"); pe.meals[+i].items[+j][k]=k==="g"?num(v):v; return true}
  return false;
}
document.addEventListener("input",e=>{peSet(e)});
document.addEventListener("change",e=>{ if(peSet(e)&&(e.target.dataset.pc||e.target.dataset.pt||e.target.dataset.pe==="phase"||e.target.dataset.pm)){ setTimeout(()=>{ if(!document.activeElement||!document.activeElement.closest("#v-pauta")||e.target.tagName==="SELECT"||e.target.type==="checkbox") renderPauta() },0) } });
document.addEventListener("click",async e=>{
  if(!e.target.closest("#v-pauta")) return; const b=e.target.closest("button"); if(!b) return;
  if(b.dataset.pedit){peLoad(S.nutrition.find(x=>x.id===b.dataset.pedit),false); if(pe) pe.editing=b.dataset.pedit; render(); window.scrollTo(0,0); return}
  if(b.dataset.pdup){peLoad(S.nutrition.find(x=>x.id===b.dataset.pdup),true); render(); window.scrollTo(0,0); return}
  if(b.id==="pe-new"){peLoad({},true); pe.title=""; render(); return}
  if(b.id==="pe-from"){ if(ovw==null&&IS_COACH()) await loadOverview(); openSheet("ptcopy"); return}
  if(!pe) return;
  if(b.id==="pe-apply"){const r=calcTargets(); if(r){pe.targets={kcal:r.kcal,p:r.p,c:r.c,g:r.g}} renderPauta(); return}
  if(b.id==="pe-addmeal"){pe.meals.push(blankMeal(pe.meals.length+1)); renderPauta(); return}
  if(b.dataset.pmrm!=null){pe.meals.splice(+b.dataset.pmrm,1); renderPauta(); return}
  if(b.dataset.piadd!=null){pe.meals[+b.dataset.piadd].items.push({name:"",g:null}); renderPauta(); return}
  if(b.dataset.pirm){const [i,j]=b.dataset.pirm.split("|"); pe.meals[+i].items.splice(+j,1); renderPauta(); return}
  if(b.id==="pe-cancel"){pe=null; render(); return}
  if(b.id==="pe-del"){ if(!pe.delC){pe.delC=1;renderPauta();return} try{await db.collection("nutrition").doc(pe.editing).delete(); pe=null; toast("Pauta esborrada"); render()}catch(err){toast(err.message)} return}
  if(b.id==="pe-save"){
    const T=pe.targets; if(!pe.from||!T.kcal){toast("Cal la data d'inici i les kcal");return}
    const meals=pe.meals.map(m=>({...m,items:(m.items||[]).filter(i=>i.name&&String(i.name).trim())})).filter(m=>m.name);
    const doc={...pe.extra,from:pe.from,title:pe.title||pe.phase,phase:pe.phase,source:pe.source||"Entrenador",provisional:!!pe.provisional,
      targets:{kcal:T.kcal,p:T.p,c:T.c,g:T.g},meals,calc:pe.calc,
      supplements:pe.supTxt.split("\n").map(l=>l.trim()).filter(Boolean).map(l=>{const k=l.indexOf(":");return k>0?{name:l.slice(0,k).trim(),txt:l.slice(k+1).trim()}:{name:l,txt:""}}),
      tips:pe.tipsTxt.split("\n").map(l=>l.trim()).filter(Boolean),updatedAt:new Date().toISOString()};
    const id="pauta-"+pe.from;
    try{ b.disabled=true;
      if(pe.editing&&pe.editing!==id) await db.collection("nutrition").doc(pe.editing).delete();
      await db.collection("nutrition").doc(id).set(doc); pe=null; toast("Pauta desada"); render(); window.scrollTo(0,0);
    }catch(err){b.disabled=false; toast("No s'ha pogut desar: "+err.message)}
  }
});

/* ---------- compte del client: privacitat ---------- */
function accExtra(){
  if(IS_COACH()) return `<button class="primary" id="acc-clients">Panell de clients</button><button id="acc-rut">Les meves rutines</button><button id="acc-pau">Les meves pautes</button>`;
  if(IS_CLIENT()){return `<button id="acc-priv">Privacitat</button><button class="danger" id="acc-del">Esborrar el compte i totes les dades</button>`}
  return "";
}
async function accClick(b){
  switch(b.id){
    case "acc-clients": closeSheet(); if(CV()) QStore.viewSelf(); location.hash="clients"; return true;
    case "acc-rut": closeSheet(); location.hash="rutines"; return true;
    case "acc-pau": closeSheet(); pe=null; location.hash="pauta"; return true;
    case "acc-priv": closeSheet(); QStore.editConsent(); return true;
    case "acc-del":
      if(b.dataset.c!=="1"){b.dataset.c="1";b.textContent="Segur? S'esborrarà tot i no es pot desfer";return true}
      if(b.dataset.c==="1"&&!b.dataset.c2){b.dataset.c2="1";b.textContent="Confirma definitivament";return true}
      b.disabled=true; b.textContent="Esborrant…";
      try{await QStore.deleteAccount()}catch(err){b.disabled=false;toast("No s'ha pogut esborrar: "+err.message)} return true;
  }
  return false;
}
