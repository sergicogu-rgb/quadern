/* Quadern · enganxar: salutació, missatge de Q en format xat, hàbits i ratxes, resum divertit i targeta per compartir.
   Depèn dels helpers globals de index.html (S, esc, fn, md, todayISO, addDays, weekStart, tplsSorted, bwData, vol...). */

/* ---------- salutació ---------- */
function greetHTML(){
  const h=new Date().getHours(), g=h<6?"Bona nit":h<14?"Bon dia":h<21?"Bona tarda":"Bona nit";
  const nm=((window.QStore&&QStore.profile&&QStore.profile.name)||"").trim().split(/\s+/)[0];
  return nm?`${g},<br><em>${esc(nm)}</em>`:`Avui <em>toca</em>`;
}

/* ---------- missatge de Q (format xat) ---------- */
const QNAME=()=>((window.QStore||{}).AI||{name:"Q"}).name;
const plain=t=>String(t||"").replace(/[*#_|>`]/g,"").replace(/\n{2,}/g,"\n").trim();
function lastQ(){
  const lim=addDays(todayISO(),-10);
  return (S.reports||[]).filter(r=>r.from==="ia"&&String(r.createdAt||r.week||"").slice(0,10)>=lim)
    .sort((a,b)=>String(b.createdAt||b.week).localeCompare(String(a.createdAt||a.week)))[0]||null;
}
function avuiTop(){
  const r=lastQ(); if(!r) return "";
  let seen=null; try{seen=localStorage.getItem("q_seen")}catch(e){}
  if(seen===r.id) return "";
  const t=plain(r.text), short=t.length>240?t.slice(0,235).replace(/\s+\S*$/,"")+"…":t;
  const when=r.createdAt?new Date(r.createdAt).toLocaleDateString("ca-ES",{weekday:"short",day:"numeric",month:"short"}):"";
  return `<div class="qchat"><div class="qav">${esc(QNAME())}</div><div class="qbody">
    <div class="qhead"><b>${esc(QNAME())}</b><span class="qia">IA</span><span class="sub" style="font-size:12px">${esc(when)}</span></div>
    <div class="qbub">${esc(short).replace(/\n/g,"<br>")}<span class="qtick">✓✓</span></div>
    <div class="qact"><a href="#informes">Llegir sencer ›</a><button class="plain" data-qseen="${esc(r.id)}">Entesos 👍</button></div>
    <div class="sub" style="font-size:11px">Revisat pel teu entrenador</div></div></div>`;
}
document.addEventListener("click",e=>{const b=e.target.closest("button[data-qseen]"); if(!b) return;
  try{localStorage.setItem("q_seen",b.dataset.qseen)}catch(_){} const el=b.closest(".qchat"); if(el) el.remove();});

/* ---------- hàbits i ratxes ---------- */
function weekTarget(){ const n=tplsSorted().length; return Math.min(7,Math.max(1,n||3)) }
function weekStreak(){
  const tgt=weekTarget(), cur=weekStart(todayISO());
  const cnt=ws=>{const we=addDays(ws,6); return S.sessions.filter(s=>s.date>=ws&&s.date<=we).length};
  let n=cnt(cur)>=tgt?1:0, ws=addDays(cur,-7);
  for(let i=0;i<104;i++){ if(cnt(ws)>=tgt){n++; ws=addDays(ws,-7)} else break }
  return {n,tgt,thisWeek:cnt(cur)};
}
function dayStreak(dates){
  const set=new Set(dates); let d=todayISO(); if(!set.has(d)) d=addDays(d,-1);
  let n=0; while(set.has(d)&&n<1000){n++; d=addDays(d,-1)} return n;
}
function habitsCard(){
  if(window.QStore&&QStore.viewing) return "";
  const today=todayISO(), yest=addDays(today,-1);
  const bw=bwData(), bwToday=bw.some(x=>x.date===today);
  const kc=(S.kcallog||[]), kcY=kc.some(x=>x.date===yest);
  const ws=weekStreak(), sesToday=S.sessions.some(s=>s.date===today);
  const bwN=dayStreak(bw.map(x=>x.date)), kcN=dayStreak(kc.map(x=>x.date));
  const item=(ok,ico,t,sub,href)=>`<a class="hab ${ok?"ok":""}" href="${href}"><span class="hi">${ok?"✓":ico}</span><span class="ht">${t}</span><span class="hs">${sub}</span></a>`;
  const best=Math.max(bwN,kcN);
  return `<div class="card stack habits">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span class="lbl">Hàbits d'avui</span>
      ${ws.n?`<span class="streak">🔥 ${ws.n} ${ws.n===1?"setmana":"setmanes"} complint</span>`:`<span class="sub" style="font-size:13px">Setmana ${ws.thisWeek}/${ws.tgt}</span>`}</div>
    <div class="hgrid">
      ${item(bwToday,"⚖️","Pes",bwToday?"fet":"en dejú","#pes")}
      ${item(kcY,"🍽️","Kcal d'ahir",kcY?"fet":"apunta-les","#nutricio")}
      ${item(sesToday,"🏋️","Setmana",`${ws.thisWeek}/${ws.tgt} sessions`,"#setmana")}
    </div>
    ${best>=3?`<div class="sub" style="font-size:13px">${bwN>=3?`⚖️ <b>${bwN} dies</b> seguits pesant-te`:""}${bwN>=3&&kcN>=3?" · ":""}${kcN>=3?`🍽️ <b>${kcN} dies</b> seguits apuntant kcal`:""}. No trenquis la ratxa!</div>`:""}
  </div>`;
}

/* ---------- resum divertit en acabar ---------- */
const THINGS=[["una balena orca",5500],["un elefant africà",6000],["un rinoceront",2300],["un hipopòtam",1500],["una girafa",1200],["un bisó",900],["un ós grizzly",600],["un cavall",500],["un ós polar",450],["un lleó",190],["un goril·la",160],["un cangur",85]];
function funFact(kg){
  if(!kg) return null; let best=null;
  THINGS.forEach(([t,w])=>{const r=kg/w; if(r>=1.5&&r<=12){const sc=Math.abs(Math.log(r/3)); if(!best||sc<best.sc) best={t,r,sc}}});
  if(!best){const [t,w]=THINGS.slice().sort((a,b)=>b[1]-a[1]).find(([_,w])=>kg>=w)||THINGS[THINGS.length-1]; best={t,r:kg/w}}
  const n=best.r>=10?Math.round(best.r):Math.round(best.r*10)/10;
  return {n,t:best.t,txt:`Com aixecar ${fn(n,1)} × ${best.t}`};
}
function funLine(kg){const f=funFact(kg); if(!f) return ""; return `<div class="card fun"><span class="lbl">Avui has mogut</span><div class="big" style="font-size:44px;line-height:1">${fn(Math.round(kg),0)} kg</div><div class="sub">${esc(f.txt)} 🔥</div></div>`}
function sessionPRs(s){let n=0; (s.items||[]).forEach(it=>{const best=bestE1(it.sets||[]); const hist=S.sessions.filter(o=>o.id!==s.id&&o.date<=s.date).flatMap(o=>(o.items||[]).filter(i=>i.exId===it.exId).flatMap(i=>i.sets||[])); const pb=hist.length?bestE1(hist):0; if(pb&&best>pb) n++}); return n}

/* ---------- imatges per compartir: story amb foto, sticker transparent o post ---------- */
const FD='"Inter","Inter Display",system-ui,sans-serif';
async function loadFonts(){try{ if(document.fonts&&document.fonts.load) await Promise.all([document.fonts.load(`800 120px Inter`),document.fonts.load(`italic 800 120px Inter`),document.fonts.load(`600 40px Inter`)]) }catch(e){}}
// Bloc de contingut (~830 px d'alt) a partir de (X,Y), amplada CW
function drawBlock(x,s,X,Y,CW){
  const LS=v=>{try{x.letterSpacing=v}catch(e){}};
  const acc=x.createLinearGradient(X,0,X+CW,0); acc.addColorStop(0,"#6f9bff"); acc.addColorStop(1,"#34d4ff");
  const all=(s.items||[]).flatMap(i=>i.sets||[]), kg=vol(all), prs=sessionPRs(s), f=funFact(kg);
  x.textBaseline="alphabetic"; x.textAlign="left";
  LS("-1px"); x.fillStyle="#fff"; x.font=`800 44px ${FD}`; x.fillText("Quadern",X,Y+44);
  x.fillStyle=acc; x.fillRect(X,Y+60,60,5);
  LS("0px"); x.fillStyle="rgba(255,255,255,.75)"; x.font=`600 28px ${FD}`;
  const ds=dt(s.date).toLocaleDateString("ca-ES",{weekday:"long",day:"numeric",month:"long"}); x.textAlign="right"; x.fillText(ds.charAt(0).toUpperCase()+ds.slice(1),X+CW,Y+44); x.textAlign="left";
  const {tag,title}=(typeof splitName==="function"?splitName(s.name):{tag:"",title:s.name});
  let fs=100; LS("-4px"); x.fillStyle="#fff";
  do{ x.font=`800 ${fs}px ${FD}`; fs-=4 }while(x.measureText(title||s.name||"Sessió").width>CW&&fs>56);
  x.fillText(title||s.name||"Sessió",X,Y+180);
  if(tag){LS("-2px"); x.font=`italic 800 46px ${FD}`; x.fillStyle=acc; x.fillText(String(tag),X,Y+240)}
  const stats=[[s.durationSec?String(Math.round(s.durationSec/60)):"–","MINUTS"],[fn(Math.round(kg),0),"KG TOTALS"],[String(prs),prs===1?"RÈCORD":"RÈCORDS"]];
  const top=Y+290, gap=18, cw=(CW-gap*2)/3;
  stats.forEach(([v,l],i)=>{const cx=X+i*(cw+gap);
    x.fillStyle=i===2&&prs?"rgba(62,207,142,.16)":"rgba(255,255,255,.08)"; roundRect(x,cx,top,cw,200,26); x.fill();
    x.strokeStyle=i===2&&prs?"rgba(62,207,142,.55)":"rgba(255,255,255,.16)"; x.lineWidth=2; x.stroke();
    let vx=cx+26; if(i===2&&prs){LS("0px"); x.font=`56px ${FD}`; x.fillText("🏆",vx,top+112); vx+=x.measureText("🏆").width+10}
    LS("-4px"); x.fillStyle=i===2&&prs?"#5ff0ad":"#fff"; x.font=`800 ${v.length>5?72:88}px ${FD}`; x.fillText(v,vx,top+118);
    LS("2px"); x.fillStyle="rgba(255,255,255,.65)"; x.font=`600 22px ${FD}`; x.fillText(l,cx+28,top+168)});
  if(f){LS("0px"); x.fillStyle="rgba(255,255,255,.8)"; x.font=`500 32px ${FD}`; x.fillText(`Avui he aixecat l'equivalent a`,X,Y+570);
    LS("-3px"); x.fillStyle=acc; x.font=`italic 800 84px ${FD}`; wrap(x,`${fn(f.n,1)} × ${f.t}`,X,Y+660,CW,82)}
  LS("-1px"); x.textAlign="right"; x.fillStyle="#fff"; x.font=`italic 800 34px ${FD}`; x.fillText("Una més.",X+CW,Y+820); x.textAlign="left";
  LS("0px"); x.fillStyle="rgba(255,255,255,.6)"; x.font=`600 24px ${FD}`; x.fillText(`${all.length} sèries · ${(s.items||[]).length} exercicis`,X,Y+820);
  return {kg,f};
}
function bgNavy(x,W,H){let g=x.createLinearGradient(0,0,W,H); g.addColorStop(0,"#0d0f45"); g.addColorStop(1,"#05051c"); x.fillStyle=g; x.fillRect(0,0,W,H);
  const rg=x.createRadialGradient(W*.9,H*.05,0,W*.9,H*.05,W*.9); rg.addColorStop(0,"rgba(91,140,255,.45)"); rg.addColorStop(1,"rgba(91,140,255,0)"); x.fillStyle=rg; x.fillRect(0,0,W,H);
  x.strokeStyle="rgba(52,212,255,.16)"; x.lineWidth=60; x.beginPath(); x.arc(W-60,160,260,0,Math.PI*2); x.stroke()}
async function makeImage(s,mode,photo){
  await loadFonts();
  const c=document.createElement("canvas"), x=c.getContext("2d"); let info;
  if(mode==="sticker"){ c.width=1080;c.height=1000;
    x.fillStyle="rgba(8,9,40,.80)"; roundRect(x,30,30,1020,940,52); x.fill(); x.strokeStyle="rgba(120,160,255,.35)"; x.lineWidth=3; x.stroke();
    info=drawBlock(x,s,90,80,900);
  } else if(mode==="story"){ c.width=1080;c.height=1920;
    if(photo){ const sc=Math.max(1080/photo.width,1920/photo.height), w=photo.width*sc, h=photo.height*sc; x.drawImage(photo,(1080-w)/2,(1920-h)/2,w,h);
      const g=x.createLinearGradient(0,820,0,1920); g.addColorStop(0,"rgba(5,5,28,0)"); g.addColorStop(.35,"rgba(5,5,28,.72)"); g.addColorStop(1,"rgba(5,5,28,.92)"); x.fillStyle=g; x.fillRect(0,820,1080,1100);
      info=drawBlock(x,s,80,1920-830-150,920);
    } else { bgNavy(x,1080,1920); info=drawBlock(x,s,80,520,920) }
  } else { c.width=1080;c.height=1350; bgNavy(x,1080,1350); info=drawBlock(x,s,80,260,920) }
  const blob=await new Promise(r=>c.toBlob(r,"image/png"));
  return {blob,info};
}
async function shareBlob(blob,name,text){
  const file=new File([blob],name,{type:"image/png"});
  try{ if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],text});return} }catch(e){ if(e&&e.name==="AbortError") return }
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},2000);
  toast("Imatge desada");
}
let shareFor=null;
function shareSession(s){ shareFor=s; openShareSheet() }
function openShareSheet(){
  let el=document.getElementById("shsheet"); if(el) el.remove();
  el=document.createElement("div"); el.id="shsheet";
  el.innerHTML=`<div class="shbg" data-shx></div><div class="shbox stack">
    <div><span class="lbl">Compartir la sessió</span><h2 style="margin:4px 0 0">Per a la teva <em>story</em></h2></div>
    <button class="go" data-sh="photo" style="font-size:18px!important">📸 Story amb una foto teva</button>
    <button data-sh="sticker" class="shopt"><b>🏷️ Sticker transparent</b><span>Per posar a sobre d'un vídeo o foto a Instagram: copia'l i enganxa'l a la story</span></button>
    <button data-sh="story" class="shopt"><b>📱 Story sense foto</b><span>Fons blau del Quadern (9:16)</span></button>
    <button data-sh="post" class="shopt"><b>🖼️ Post (4:5)</b><span>Per al feed</span></button>
    <button class="plain" data-shx>Cancel·lar</button>
    <input type="file" id="sh-file" accept="image/*" hidden></div>`;
  document.body.appendChild(el);
}
document.addEventListener("click",async e=>{
  const sv=e.target.closest("[data-share-s]"); if(sv){const s=S.sessions.find(o=>o.id===sv.dataset.shareS); if(s) shareSession(s); return}
  if(e.target.closest("[data-shx]")){const el=document.getElementById("shsheet"); if(el) el.remove(); return}
  const b=e.target.closest("button[data-sh]"); if(!b||!shareFor) return;
  const m=b.dataset.sh;
  if(m==="photo"){ document.getElementById("sh-file").click(); return }
  b.disabled=true; try{ const {blob,info}=await makeImage(shareFor,m); await shareBlob(blob,`quadern-${shareFor.date}-${m}.png`,info.f?`${fn(Math.round(info.kg),0)} kg avui 💪 ${info.f.txt}`:"") }
  catch(err){toast("No s'ha pogut crear la imatge")} b.disabled=false;
});
document.addEventListener("change",async e=>{
  if(e.target.id!=="sh-file"||!e.target.files||!e.target.files[0]||!shareFor) return;
  const f=e.target.files[0]; e.target.value="";
  try{
    const img=await new Promise((res,rej)=>{const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=URL.createObjectURL(f)});
    const {blob,info}=await makeImage(shareFor,"story",img);
    await shareBlob(blob,`quadern-${shareFor.date}-story.png`,info.f?`${fn(Math.round(info.kg),0)} kg avui 💪`:"");
  }catch(err){toast("No s'ha pogut fer servir aquesta foto")}
});
function roundRect(x,X,Y,w,h,r){x.beginPath();x.moveTo(X+r,Y);x.arcTo(X+w,Y,X+w,Y+h,r);x.arcTo(X+w,Y+h,X,Y+h,r);x.arcTo(X,Y+h,X,Y,r);x.arcTo(X,Y,X+w,Y,r);x.closePath()}
function wrap(x,t,X,Y,maxW,lh){const ws=t.split(" ");let l="";for(const w of ws){const tt=l?l+" "+w:w; if(x.measureText(tt).width>maxW&&l){x.fillText(l,X,Y);Y+=lh;l=w}else l=tt} x.fillText(l,X,Y)}

/* ---------- estils ---------- */
document.head.insertAdjacentHTML("beforeend",`<style>
.hello h1{font-size:44px}
.qchat{display:flex;gap:10px;align-items:flex-start}
.qav{flex-shrink:0;width:42px;height:42px;border-radius:50%;background:var(--grad);display:flex;align-items:center;justify-content:center;font-family:var(--display);font-weight:800;font-style:italic;font-size:22px;color:#fff;box-shadow:0 6px 18px -6px var(--accent)}
.qbody{min-width:0;flex:1;display:flex;flex-direction:column;gap:5px}
.qhead{display:flex;align-items:center;gap:8px}
.qia{font-size:10px;font-weight:700;letter-spacing:.08em;padding:2px 6px;border-radius:6px;background:var(--accent-soft);color:var(--accent)}
.qbub{position:relative;background:var(--raise);border:1px solid var(--line);border-radius:4px 18px 18px 18px;padding:11px 14px 18px;font-size:15px;line-height:1.4}
.qtick{position:absolute;right:10px;bottom:4px;font-size:11px;color:var(--accent-2)}
.qact{display:flex;align-items:center;justify-content:space-between;gap:8px}
.qact a{color:var(--accent);text-decoration:none;font-weight:600;font-size:14px}
.habits .streak{font-family:var(--display);font-weight:700;font-size:17px;padding:4px 10px;border-radius:999px;background:color-mix(in srgb,#ff8a3d 18%,transparent);color:#ffb37a}
.hgrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.hab{display:flex;flex-direction:column;align-items:center;gap:3px;text-decoration:none;color:var(--fg);background:var(--raise);border:1px solid var(--line);border-radius:14px;padding:12px 6px;text-align:center}
.hab .hi{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;background:var(--surface)}
.hab.ok{border-color:color-mix(in srgb,var(--good) 55%,transparent);background:var(--good-soft)}
.hab.ok .hi{background:var(--good);color:var(--good-ink);font-weight:800}
.hab .ht{font-weight:700;font-size:14px}.hab .hs{font-size:12px;color:var(--muted)}
.fun{text-align:center;display:flex;flex-direction:column;gap:6px;align-items:center;background:linear-gradient(160deg,var(--accent-soft),var(--surface))}
#shsheet{position:fixed;inset:0;z-index:80}
#shsheet .shbg{position:absolute;inset:0;background:rgba(0,0,0,.55)}
#shsheet .shbox{position:absolute;left:0;right:0;bottom:0;background:var(--surface);border-top:1px solid var(--line);border-radius:24px 24px 0 0;padding:20px 16px calc(20px + env(safe-area-inset-bottom));max-width:640px;margin:0 auto}
.shopt{display:flex;flex-direction:column;align-items:flex-start;gap:2px;text-align:left;padding:14px 16px}
.shopt span{font-size:13px;color:var(--muted);font-weight:500}
.fun .big{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
</style>`);
