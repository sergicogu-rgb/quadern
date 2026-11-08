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
const THINGS=[["un elefant africà",6000],["un rinoceront",2300],["un Seat Ibiza",1150],["una girafa adulta",1200],["un piano de cua",480],["un cavall",500],["una vaca",650],["un ós polar",450],["una moto",200],["una nevera",80]];
function funFact(kg){
  if(!kg) return null; let best=null;
  THINGS.forEach(([t,w])=>{const r=kg/w; if(r>=1.5&&r<=12){const sc=Math.abs(Math.log(r/3)); if(!best||sc<best.sc) best={t,r,sc}}});
  if(!best){const [t,w]=THINGS.find(([_,w])=>kg>=w)||THINGS[THINGS.length-1]; best={t,r:kg/w}}
  const n=best.r>=10?Math.round(best.r):Math.round(best.r*10)/10;
  return {n,t:best.t,txt:`Com aixecar ${fn(n,1)} × ${best.t}`};
}
function funLine(kg){const f=funFact(kg); if(!f) return ""; return `<div class="card fun"><span class="lbl">Avui has mogut</span><div class="big" style="font-size:44px;line-height:1">${fn(Math.round(kg),0)} kg</div><div class="sub">${esc(f.txt)} 🔥</div></div>`}

/* ---------- targeta per compartir (imatge 1080×1350 per a Instagram) ---------- */
async function shareSession(s){
  try{ if(document.fonts&&document.fonts.load){await Promise.all([document.fonts.load('800 120px "Barlow Condensed"'),document.fonts.load('italic 800 120px "Barlow Condensed"'),document.fonts.load('600 40px "Barlow"')])} }catch(e){}
  const W=1080,H=1350,c=document.createElement("canvas"); c.width=W;c.height=H; const x=c.getContext("2d");
  const D='"Barlow Condensed","Arial Narrow",Arial,sans-serif', B='"Barlow",system-ui,sans-serif';
  // fons
  let g=x.createLinearGradient(0,0,W,H); g.addColorStop(0,"#0d0f45"); g.addColorStop(1,"#05051c"); x.fillStyle=g; x.fillRect(0,0,W,H);
  const rg=x.createRadialGradient(W*.9,H*.05,0,W*.9,H*.05,W*.9); rg.addColorStop(0,"rgba(91,140,255,.45)"); rg.addColorStop(1,"rgba(91,140,255,0)"); x.fillStyle=rg; x.fillRect(0,0,W,H);
  x.strokeStyle="rgba(52,212,255,.18)"; x.lineWidth=60; x.beginPath(); x.arc(W-60,140,260,0,Math.PI*2); x.stroke();
  const acc=x.createLinearGradient(0,0,W,0); acc.addColorStop(0,"#5b8cff"); acc.addColorStop(1,"#34d4ff");
  // capçalera
  x.fillStyle="#fff"; x.font=`800 44px ${D}`; x.textBaseline="alphabetic"; x.fillText("QUADERN",80,120);
  x.fillStyle=acc; x.fillRect(80,138,64,5);
  x.fillStyle="rgba(255,255,255,.6)"; x.font=`600 30px ${B}`;
  const dstr=dt(s.date).toLocaleDateString("ca-ES",{weekday:"long",day:"numeric",month:"long"}); x.fillText(dstr.charAt(0).toUpperCase()+dstr.slice(1),80,190);
  // títol
  const {tag,title}=(typeof splitName==="function"?splitName(s.name):{tag:"",title:s.name});
  x.fillStyle="#fff"; x.font=`800 104px ${D}`;
  const words=String(title||s.name||"Sessió").toUpperCase().split(" "); let line="",y=330; const lines=[];
  words.forEach(w=>{const t=line?line+" "+w:w; if(x.measureText(t).width>W-160&&line){lines.push(line);line=w}else line=t}); lines.push(line);
  lines.slice(0,2).forEach((l,i)=>x.fillText(l,80,y+i*100));
  y+=Math.min(lines.length,2)*100+10;
  if(tag){x.font=`italic 800 56px ${D}`; x.fillStyle=acc; x.fillText(String(tag).toUpperCase(),80,y); y+=30}
  // xifres
  const all=s.items.flatMap(i=>i.sets), kg=vol(all);
  let prs=0; s.items.forEach(it=>{const best=bestE1(it.sets); const hist=S.sessions.filter(o=>o.id!==s.id&&o.date<=s.date).flatMap(o=>(o.items||[]).filter(i=>i.exId===it.exId).flatMap(i=>i.sets)); const pb=hist.length?bestE1(hist):0; if(pb&&best>pb) prs++});
  const stats=[[s.durationSec?Math.round(s.durationSec/60)+"":"–","MIN"],[fn(Math.round(kg),0),"KG"],[String(all.length),"SÈRIES"]];
  const top=y+90, cw=(W-160-40)/3;
  stats.forEach(([v,l],i)=>{const cx=80+i*(cw+20);
    x.fillStyle="rgba(255,255,255,.06)"; roundRect(x,cx,top,cw,230,28); x.fill(); x.strokeStyle="rgba(255,255,255,.12)"; x.lineWidth=2; x.stroke();
    x.fillStyle="#fff"; x.font=`800 ${v.length>5?84:100}px ${D}`; x.fillText(v,cx+30,top+140);
    x.fillStyle="rgba(255,255,255,.6)"; x.font=`700 30px ${D}`; x.fillText(l,cx+32,top+192)});
  // frase divertida
  const f=funFact(kg); let fy=top+330;
  if(f){x.fillStyle="rgba(255,255,255,.7)"; x.font=`600 34px ${B}`; x.fillText("Com aixecar",80,fy);
    x.fillStyle=acc; x.font=`italic 800 92px ${D}`; const ft=`${fn(f.n,1)} × ${f.t}`.toUpperCase();
    wrap(x,ft,80,fy+95,W-160,88)}
  if(prs){x.fillStyle="#3ecf8e"; x.font=`800 40px ${D}`; x.fillText(`🏆 ${prs} ${prs===1?"RÈCORD NOU":"RÈCORDS NOUS"}`,80,H-170)}
  // peu
  x.fillStyle=acc; roundRect(x,80,H-110,W-160,6,3); x.fill();
  x.fillStyle="rgba(255,255,255,.55)"; x.font=`600 28px ${B}`; x.fillText("Entrenat amb el Quadern",80,H-60);
  x.textAlign="right"; x.fillStyle="#fff"; x.font=`italic 800 34px ${D}`; x.fillText("UNA MÉS.",W-80,H-60); x.textAlign="left";
  const blob=await new Promise(r=>c.toBlob(r,"image/png"));
  const file=new File([blob],"quadern-"+s.date+".png",{type:"image/png"});
  try{
    if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:"La meva sessió",text:f?`${fn(Math.round(kg),0)} kg avui 💪 ${f.txt}`:""});return}
  }catch(e){ if(e&&e.name==="AbortError") return }
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=file.name; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},2000);
  toast("Imatge desada");
}
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
.fun .big{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
</style>`);
