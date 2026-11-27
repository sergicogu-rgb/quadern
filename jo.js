/* NEXFORM · apartat «Jo»: Informes, Fotos i mesures, Guia.
   - Mesures del cos (cm) i 3 fotos de progrés per data, col·lecció 'body' (id = YYYY-MM-DD).
   - Les fotos van al bucket privat 'progres' i es veuen amb URL signades (només el client i el seu entrenador).
   - Guia ràpida: 3 primers passos + com funciona cada apartat; avís a Avui les 2 primeres setmanes.
   Depèn dels helpers globals de index.html (S, $, esc, fn, fin, fdate, todayISO, addDays, queueWrite, flushPend, toast, render...). */

const BODY_M=[["waist","Cintura","a l'altura del melic"],["hip","Maluc","a la part més ampla"],["chest","Pit","a l'altura dels mugrons"],["arm","Braç","al mig, relaxat"],["thigh","Cuixa","a mitja cuixa"]];
const BODY_P=[["front","Davant"],["side","Perfil"],["back","Esquena"]];
let bodyDate=null, bodySlot=null, bodyCmp="front", bodyDel=null;
const bodyList=()=>[...(S.body||[])].filter(d=>d&&d.date).sort((a,b)=>a.date.localeCompare(b.date));
const bodyOf=d=>(S.body||[]).find(x=>x.id===d)||null;

/* URL signades de les fotos privades (caducen en 1 h; es guarden en memòria) */
const ppUrl={};
async function ppHydrate(root){
  const imgs=[...(root||document).querySelectorAll("img[data-pp]")]; if(!imgs.length) return;
  const sb=window.QStore&&QStore.sb; if(!sb) return;
  const now=Date.now(), need=[...new Set(imgs.map(i=>i.dataset.pp).filter(p=>!ppUrl[p]||ppUrl[p].exp<now))];
  if(need.length){ try{const {data}=await sb.storage.from("progres").createSignedUrls(need,3600);
    (data||[]).forEach(r=>{if(r&&r.signedUrl&&r.path) ppUrl[r.path]={u:r.signedUrl,exp:now+50*60*1000}})}catch(e){} }
  imgs.forEach(i=>{const c=ppUrl[i.dataset.pp]; if(c&&i.getAttribute("src")!==c.u) i.src=c.u});
}
const ppImg=(path,alt)=>`<img data-pp="${esc(path)}" alt="${esc(alt)}" loading="lazy">`;

function renderCos(){
  const el=$("#v-cos"), cv=!!(window.QStore&&QStore.viewing), today=todayISO();
  const list=bodyList(), first=list[0], last=list[list.length-1];
  if(!bodyDate) bodyDate=today;
  const d=bodyOf(bodyDate)||{}, ph=d.photos||{};
  const nf=(v,dec=1)=>v==null||v===""?"–":fn(v,dec);
  let h=`<div class="stack"><div class="vhead"><span class="lbl">Cada 2-4 setmanes</span><h1>Fotos i <em>mesures</em></h1></div>`;
  if(!cv){
    h+=`<div class="card stack"><div class="row"><label class="f"><span class="lbl">Data</span><input type="date" id="bd-date" value="${esc(bodyDate)}" max="${esc(today)}"></label></div>
      <div class="bgrid">${BODY_M.map(([k,l,hint])=>`<label class="f"><span class="lbl">${l} <small>cm</small></span><input inputmode="decimal" id="bd-${k}" value="${d[k]!=null?fin(d[k]):""}" placeholder="${esc(last&&last[k]!=null?fin(last[k]):"")}"><small class="sub">${hint}</small></label>`).join("")}</div>
      <button class="primary" id="bd-save">${bodyOf(bodyDate)?"Actualitzar mesures":"Desar mesures"}</button>
      <p class="sub" style="font-size:12px;margin:0">Amb cinta mètrica, al matí en dejú, sense estrènyer. Mesura sempre al mateix punt.</p></div>`;
    h+=`<div class="card stack"><span class="lbl">Fotos del ${esc(fdate(bodyDate))}</span>
      <div class="pp3">${BODY_P.map(([k,l])=>`<button class="ppslot ${ph[k]?"has":""}" data-pslot="${k}" aria-label="${ph[k]?"Canviar":"Afegir"} la foto de ${l.toLowerCase()}">${ph[k]?ppImg(ph[k],l):"<span>＋</span>"}<b>${l}</b></button>`).join("")}</div>
      <p class="sub" style="font-size:12px;margin:0">Mateix lloc, mateixa llum i mateixa roba. Cos relaxat, braços al costat. 🔒 Les fotos són privades: només les veus tu i el teu entrenador.</p></div>`;
  }
  const withP=list.filter(x=>x.photos&&Object.values(x.photos).some(Boolean));
  if(withP.length>=2){
    const a=withP.find(x=>x.photos[bodyCmp])||withP[0], b=[...withP].reverse().find(x=>x.photos[bodyCmp])||withP[withP.length-1];
    h+=`<div class="card stack"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span class="lbl">Abans i ara</span>
      <span class="ppseg">${BODY_P.map(([k,l])=>`<button class="plain ${k===bodyCmp?"on":""}" data-pcmp="${k}">${l}</button>`).join("")}</span></div>
      ${a!==b&&a.photos[bodyCmp]&&b.photos[bodyCmp]?`<div class="ppcmp"><figure>${ppImg(a.photos[bodyCmp],"Abans")}<figcaption>${esc(fdate(a.date,{day:"numeric",month:"short",year:"numeric"}))}</figcaption></figure><figure>${ppImg(b.photos[bodyCmp],"Ara")}<figcaption>${esc(fdate(b.date,{day:"numeric",month:"short",year:"numeric"}))}</figcaption></figure></div>`
        :`<p class="sub" style="margin:0">Encara no hi ha dues fotos d'aquest angle en dates diferents.</p>`}</div>`;
  } else if(cv&&withP.length===1){
    const x=withP[0]; h+=`<div class="card stack"><span class="lbl">Fotos del ${esc(fdate(x.date))}</span><div class="pp3">${BODY_P.map(([k,l])=>x.photos[k]?`<figure class="ppslot has">${ppImg(x.photos[k],l)}<b>${l}</b></figure>`:"").join("")}</div></div>`;
  }
  if(!list.length){el.innerHTML=h+`<div class="empty"><b>Encara no hi ha cap registre</b>${cv?"El client encara no ha apuntat mesures ni fotos.":"Apunta les mesures i fes les 3 fotos avui. Repeteix-ho cada 2-4 setmanes: quan el pes no es mou, la cintura i les fotos diuen si vas bé."}</div></div>`;ppHydrate(el);return}
  const cols=BODY_M.filter(([k])=>list.some(x=>x[k]!=null&&x[k]!==""));
  if(cols.length){
    const diff=k=>{const a=list.find(x=>x[k]!=null&&x[k]!==""), b=[...list].reverse().find(x=>x[k]!=null&&x[k]!=="");
      if(!a||!b||a===b) return "–"; const v=b[k]-a[k]; return `${v>0?"+":""}${fn(v,1)}`};
    h+=`<div class="card tw" style="padding:6px 10px"><table><thead><tr><th>Data</th>${cols.map(([,l])=>`<th class="r">${l}</th>`).join("")}<th></th></tr></thead><tbody>
      ${[...list].reverse().map(x=>`<tr><td>${cv?"":`<button class="plain linkb" data-bdate="${esc(x.date)}">`}${esc(fdate(x.date,{day:"numeric",month:"short"}))}${x.photos&&Object.values(x.photos).some(Boolean)?" 📷":""}${cv?"":"</button>"}</td>${cols.map(([k])=>`<td class="r num">${nf(x[k])}</td>`).join("")}<td class="r">${cv?"":`<button class="plain" data-bdel="${esc(x.date)}" style="padding:2px 6px;color:var(--bad)">${bodyDel===x.date?"Confirma":"✕"}</button>`}</td></tr>`).join("")}
      ${list.length>1?`<tr><td><b>Canvi</b></td>${cols.map(([k])=>`<td class="r num"><b>${diff(k)}</b></td>`).join("")}<td></td></tr>`:""}
      </tbody></table></div>`;
  }
  if(first&&last&&first!==last) h+=`<p class="sub" style="font-size:12px">Des del ${esc(fdate(first.date,{day:"numeric",month:"long"}))}: ${list.length} registres.</p>`;
  el.innerHTML=h+`</div>`; ppHydrate(el);
}

function bodySave(){
  const date=($("#bd-date")||{}).value||todayISO(); const prev=bodyOf(date)||{};
  const out={date,photos:prev.photos||{},updatedAt:new Date().toISOString()}; let n=0;
  for(const [k,l] of BODY_M){const raw=(($("#bd-"+k)||{}).value||"").trim().replace(",","."); if(!raw) continue; const v=parseFloat(raw);
    if(!(v>=10&&v<=250)){toast(l+": escriu un valor en cm");return} out[k]=Math.round(v*10)/10; n++}
  if(!n&&!Object.values(out.photos).some(Boolean)){toast("Escriu alguna mesura");return}
  queueWrite("body",date,out); render(); flushPend().then(()=>toast("Mesures desades"));
}

document.addEventListener("click",async e=>{
  const b=e.target.closest("#v-cos button"); if(!b) return;
  if(b.id==="bd-save"){bodySave();return}
  if(b.dataset.pcmp){bodyCmp=b.dataset.pcmp;renderCos();return}
  if(b.dataset.bdate){bodyDate=b.dataset.bdate;bodyDel=null;renderCos();window.scrollTo(0,0);return}
  if(b.dataset.bdel){const id=b.dataset.bdel; if(bodyDel!==id){bodyDel=id;renderCos();return}
    bodyDel=null; const d=bodyOf(id), paths=Object.values((d&&d.photos)||{}).filter(Boolean);
    try{ if(db) await db.collection("body").doc(id).delete(); if(paths.length&&QStore.sb) await QStore.sb.storage.from("progres").remove(paths); toast("Registre esborrat")}catch(err){toast("No s'ha pogut esborrar: "+(err&&err.message||err))} return}
  if(b.dataset.pslot){bodySlot=b.dataset.pslot; $("#pp-in").click(); return}
});
document.addEventListener("change",e=>{if(e.target&&e.target.id==="bd-date"){bodyDate=e.target.value||todayISO();bodyDel=null;renderCos()}});

async function bodyPhoto(f){
  const slot=bodySlot, date=bodyDate||todayISO(); bodySlot=null; if(!f||!slot) return;
  const Q=window.QStore; if(!Q||!Q.sb||!Q.uid||Q.viewing){toast("En aquesta vista no es poden pujar fotos");return}
  if(navigator.onLine===false){toast("Cal connexió per pujar fotos");return}
  toast("Pujant foto…");
  try{
    const blob=await shrink(f), path=Q.uid+"/"+date+"-"+slot+"-"+Date.now().toString(36)+".jpg";
    const {error}=await Q.sb.storage.from("progres").upload(path,blob,{contentType:"image/jpeg",upsert:false}); if(error) throw error;
    const prev=bodyOf(date)||{date}, old=(prev.photos||{})[slot];
    queueWrite("body",date,{...prev,id:undefined,date,photos:{...(prev.photos||{}),[slot]:path},updatedAt:new Date().toISOString()});
    await flushPend(); if(old&&old!==path){try{await Q.sb.storage.from("progres").remove([old])}catch(_){}}
    toast("Foto desada"); render();
  }catch(err){toast("No s'ha pogut pujar la foto: "+(err&&err.message||err))}
}
document.addEventListener("change",e=>{if(e.target&&e.target.id==="pp-in"){const f=e.target.files&&e.target.files[0]; e.target.value=""; bodyPhoto(f)}});

/* ---------- Guia (visual) ---------- */
const GICO={avui:'<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',pes:'<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M9 9.5a4 4 0 0 1 6 0M12 12l1.5-2.5"/>',
  setmana:'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',nutricio:'<path d="M12 7c-1.5-2.5-6.5-2.5-7 2.5-.4 4.5 2.5 10.5 5 10.5 1 0 1.3-.6 2-.6s1 .6 2 .6c2.5 0 5.4-6 5-10.5C18.5 4.5 13.5 4.5 12 7z"/><path d="M12 7c0-2 1-3.5 3-4"/>',
  informes:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>'};
const gsvg=k=>`<svg viewBox="0 0 24 24" aria-hidden="true">${GICO[k]}</svg>`;
function renderGuia(){
  const el=$("#v-guia"), ai=((window.QStore||{}).AI||{name:"ELION"}).name;
  const set=(kg,r,ok)=>`<div class="gm-set ${ok?"ok":""}"><span>${kg} kg</span><span>× ${r}</span><i>${ok?"✓":""}</i></div>`;
  const slides=[
    ["1","Entrena","Començar → apunta kg i reps → toca ✓",`<div class="gm"><b class="gm-t">Press de banca</b><small>8–12 reps</small>${set("60","12",1)}${set("60","11",1)}${set("60","10",0)}<span class="gm-btn">Finalitzar</span></div>`,"#avui","Anar a Avui"],
    ["2","Pesa't","Cada matí, en dejú. Compta la mitjana.",`<div class="gm gm-c"><div class="gm-step"><span>−</span><b>78,4</b><span>+</span></div><small>kg · en dejú</small><svg class="gm-spark" viewBox="0 0 120 30" aria-hidden="true"><polyline points="0,8 20,10 40,9 60,14 80,15 100,19 120,21"/></svg></div>`,"#pes","Apuntar el pes"],
    ["3","Menja","Segueix la pauta. No cal apuntar res.",`<div class="gm"><b class="gm-t">🍽️ Dinar</b><div class="gm-row"><span>Arròs</span><b>80 g</b></div><div class="gm-eq">↔ pasta 80 g · patata 250 g</div><div class="gm-row"><span>Pollastre</span><b>150 g</b></div><div class="gm-row"><span>Verdura</span><b>lliure</b></div></div>`,"#nutricio","Veure la pauta"],
    ["4","Cada setmana","Diumenge: check-in. Cada 2-4 setmanes: fotos.",`<div class="gm"><div class="gm-ci"><span>⚡ Energia</span><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i></i></div><div class="gm-ci"><span>😴 Son</span><i class="on"></i><i class="on"></i><i class="on"></i><i></i><i></i></div><div class="gm-ph"><span>📷</span><span>📷</span><span>📷</span></div></div>`,"#cos","Fotos i mesures"]];
  const bar=[["avui","Avui","entrenar"],["pes","Pes","cada matí"],["setmana","Ritme","constància"],["nutricio","Menjar","la pauta"],["informes","Jo","informes i fotos"]];
  el.innerHTML=`<div class="stack"><div class="vhead"><span class="lbl">En 1 minut</span><h1>Guia <em>ràpida</em></h1></div>
    <div class="gcar" id="g-car">${slides.map(([n,t,txt,mock,href,cta])=>`<article class="gslide"><div class="gvis">${mock}</div><div class="gtx"><span class="gn">${n}</span><div><b>${t}</b><p>${txt}</p></div></div><a class="gbtn" href="${href}">${cta}</a></article>`).join("")}</div>
    <div class="gdots" id="g-dots">${slides.map((_,i)=>`<i class="${i?"":"on"}"></i>`).join("")}</div>
    <div class="card stack"><span class="lbl">La barra de baix</span>
      <div class="gbar">${bar.map(([k,l,d])=>`<a href="#${k}">${gsvg(k)}<b>${l}</b><small>${d}</small></a>`).join("")}</div></div>
    <div class="card stack"><span class="lbl">Com puges de pes</span>
      <div class="gprog"><div><small>Sessió 1</small><b>10 · 10 · 9</b><span>60 kg</span></div><i>→</i><div><small>Sessió 2</small><b>12 · 12 · 12</b><span>60 kg</span></div><i>→</i><div class="up"><small>Sessió 3</small><b>8 · 8 · 8</b><span>62,5 kg ⬆</span></div></div>
      <p class="sub" style="margin:0;font-size:13px">Quan fas el màxim del rang a totes les sèries, l'app et proposa pujar. Deixa sempre 2-3 repeticions a la recambra.</p></div>
    ${(window.QStore||{}).aiOn?`<div class="gai"><span class="gav">${esc(ai.charAt(0))}</span><div><b>${esc(ai)}</b> analitza les teves dades i proposa ajustos.<br><small>✓ El teu entrenador ho revisa sempre abans que t'arribi.</small></div></div>`:""}
    <div class="gtips"><span>🔔 Activa les notificacions a ⚙︎</span><span>📲 Afegeix l'app a la pantalla d'inici</span></div>
    ${typeof planDoc==="function"&&(planDoc()||{}).status==="provisional"?`<div class="note" style="margin:0">Els primers dies la rutina i la pauta són <b>provisionals</b>: el teu entrenador les revisa en menys de 24 h.</div>`:""}
  </div>`;
  const car=$("#g-car"), dots=[...document.querySelectorAll("#g-dots i")];
  if(car) car.addEventListener("scroll",()=>{const w=car.firstElementChild?car.firstElementChild.offsetWidth+12:1, i=Math.round(car.scrollLeft/w); dots.forEach((d,j)=>d.classList.toggle("on",j===i))},{passive:true});
  try{localStorage.setItem("guia_vista","1")}catch(e){}
}
/* Avís a Avui: les 2 primeres setmanes, fins que s'obre la guia o es tanca l'avís */
function guideCard(){
  if(window.QStore&&QStore.viewing) return "";
  let seen=null; try{seen=localStorage.getItem("guia_vista")}catch(e){} if(seen) return "";
  const st=typeof startISO==="function"?startISO():todayISO(); if(st<addDays(todayISO(),-14)) return "";
  return `<div class="card guidec"><span style="font-size:22px" aria-hidden="true">👋</span><div style="flex:1"><b>Nou a NEXFORM?</b><div class="sub" style="font-size:13px">Com funciona l'app, en 2 minuts.</div></div><a class="gbtn" href="#guia">Guia ràpida</a><button class="plain" data-gclose aria-label="Tancar l'avís">✕</button></div>`;
}
document.addEventListener("click",e=>{const b=e.target.closest("button[data-gclose]"); if(!b) return; try{localStorage.setItem("guia_vista","1")}catch(_){} const c=b.closest(".guidec"); if(c) c.remove();});
