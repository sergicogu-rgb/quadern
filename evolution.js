/* 2UP · Atlas Evolution: avatar evolutiu del client (5 nivells, home o dona).
   Les dades surten de l'RPC avatar_refresh (Supabase): el càlcul és al servidor i el nivell mai no baixa.
   Imatges: avatars/<model>/<variant>/<nivell>.webp; si no hi són, es dibuixa una silueta provisional en SVG.
   Depèn dels helpers globals de index.html i app.js (esc, fn, $, render, cur, toast, IS_COACH, IS_CLIENT). */

const EVO_NAMES=["","START","ACTIVE","PROGRESS","ATHLETE","ATLAS ELITE"];
const EVO_PARTS=[["train","Entrenament","🏋️"],["food","Alimentació","🍽️"],["body","Progrés físic","📈"],["consist","Constància","🔁"]];
let EVO=null, EVO_for=null, EVO_busy=false, EVO_t=0, EVO_open=false, EVO_cel=null, EVO_cfg=null;

const evoWho=()=>window.QStore&&(QStore.target||QStore.uid);
const evoMine=()=>window.QStore&&!QStore.target;
function evoLoad(force){
  const u=evoWho(); if(!u||!QStore.rpc) return;
  if(EVO_for!==u){ EVO_for=u; EVO_t=0; try{EVO=JSON.parse(localStorage.getItem("q_evo_"+u)||"null")}catch(_){EVO=null} }
  if(EVO_busy||(!force&&Date.now()-EVO_t<60000)) return;
  EVO_busy=true;
  QStore.rpc("avatar_refresh",{client:u}).then(d=>{
    if(evoWho()!==u) return;
    EVO=d; EVO_t=Date.now(); try{localStorage.setItem("q_evo_"+u,JSON.stringify(d))}catch(_){}
    if(cur==="avui"||cur==="resum") render();
    evoMaybeCelebrate();
  }).catch(()=>{ EVO_t=Date.now() }).finally(()=>{ EVO_busy=false });
}

/* ---------- avatar: imatge de la biblioteca o silueta provisional ---------- */
function evoSvg(variant,lv){
  const f=variant==="f", k=(lv-1)/4;                       // 0 (START) .. 1 (ELITE)
  const sh=f?30+k*5:34+k*9, wa=f?20+k*1:24+k*1, hip=f?28+k*2:24+k*1.5, arm=f?6.5+k*1.6:7.5+k*3, leg=f?10+k*2:10.5+k*3;
  const cx=60, top=38, wy=92, hy=108;
  const torso=`M${cx-sh} ${top+6} Q${cx} ${top-2} ${cx+sh} ${top+6} L${cx+wa} ${wy} L${cx+hip} ${hy} L${cx-hip} ${hy} L${cx-wa} ${wy} Z`;
  const armL=`M${cx-sh+2} ${top+8} Q${cx-sh-arm-4} ${top+40} ${cx-sh-2} ${wy+12}`, armR=`M${cx+sh-2} ${top+8} Q${cx+sh+arm+4} ${top+40} ${cx+sh+2} ${wy+12}`;
  const legL=`M${cx-hip+leg/1.3} ${hy-4} L${cx-10} 184`, legR=`M${cx+hip-leg/1.3} ${hy-4} L${cx+10} 184`;
  const id="eg"+variant+lv;
  return `<svg viewBox="0 0 120 190" class="evo-svg" role="img" aria-label="Avatar provisional, nivell ${lv}">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8fb4ff"/><stop offset=".55" stop-color="#3f6fe6"/><stop offset="1" stop-color="#1b2f8a"/></linearGradient></defs>
    <g fill="none" stroke="url(#${id})" stroke-linecap="round">
      <path d="${armL}" stroke-width="${arm*1.5}"/><path d="${armR}" stroke-width="${arm*1.5}"/>
      <path d="${legL}" stroke-width="${leg*1.6}"/><path d="${legR}" stroke-width="${leg*1.6}"/></g>
    <path d="${torso}" fill="url(#${id})"/>
    <rect x="${cx-5}" y="${top-12}" width="10" height="14" rx="4" fill="url(#${id})"/>
    <ellipse cx="${cx}" cy="${top-20}" rx="11" ry="13" fill="url(#${id})"/>
    ${lv>=3?`<path d="M${cx} ${top+12} L${cx} ${wy-4}" stroke="#ffffff" stroke-opacity=".18" stroke-width="1.4"/>`:""}
  </svg>`;
}
function evoAvatar(d,lv,cls){
  lv=lv||d.level||1; const v=d.variant==="f"?"f":"m", m=d.model||"base";
  return `<div class="evo-av ${cls||""}" data-lv="${lv}">${evoSvg(v,lv)}<img src="avatars/${esc(m)}/${v}/${lv}.webp" alt="" loading="lazy" onerror="this.remove()"></div>`;
}

/* ---------- targeta d'Avui (i del Resum, per a l'entrenador) ---------- */
function evoBar(d){
  const t=d.thresholds||[0,300,900,2000,3600], lv=d.level||1;
  if(lv>=5) return {pct:100,txt:`${fn(d.points,0)} punts · nivell màxim`};
  const a=t[lv-1]||0, b=t[lv]||a+1, pct=Math.max(0,Math.min(100,(d.points-a)/(b-a)*100));
  return {pct,txt:`${fn(d.points,0)} / ${fn(b,0)} punts · falten ${fn(Math.max(0,b-d.points),0)} per a ${EVO_NAMES[lv+1]}`};
}
function evoSpark(h,curScore){
  const pts=(h||[]).map(x=>x.score); if(curScore!=null) pts.push(curScore);
  if(!pts.length) return "";
  const W=120,H=28,n=pts.length,bw=W/Math.max(8,n);
  return `<svg class="evo-spark" viewBox="0 0 ${W} ${H}" aria-label="Puntuació de les últimes setmanes">${pts.map((p,i)=>{const hh=Math.max(2,p/100*(H-2));
    return `<rect x="${i*bw+1}" y="${H-hh}" width="${bw-2}" height="${hh}" rx="1.5" class="${i===n-1&&curScore!=null?"cur":""}"/>`}).join("")}</svg>`;
}
function evoCard(){
  if(!window.QStore||!evoWho()) return "";
  evoLoad();
  const d=EVO;
  if(!d) return `<div class="card evo"><div class="evo-av">${evoSvg("m",1)}</div><div class="evo-txt"><span class="lbl">Atlas Evolution</span><b>Calculant la teva evolució…</b></div></div>`;
  const c=d.current||{}, b=evoBar(d);
  const kcal=c.kcal_target!=null?`${c.kcal_ok||0}/7 dies dins de les kcal`:`${c.kcal_days||0}/7 dies apuntats`;
  return `<button class="card evo" id="evo-open" type="button">
    ${evoAvatar(d)}
    <span class="evo-txt"><span class="lbl">Atlas Evolution</span>
      <span class="evo-lv">Nivell ${d.level} · ${EVO_NAMES[d.level]}</span>
      <span class="evo-bar"><i style="width:${b.pct.toFixed(1)}%"></i></span>
      <span class="evo-sub">${esc(b.txt)}</span>
      <span class="evo-kpi"><span>🏋️ ${c.sessions||0}/${c.planned||"–"} sessions</span><span>🍽️ ${esc(kcal)}</span></span>
      <span class="evo-foot"><span class="evo-sc">Setmana <b>${c.score!=null?c.score:"–"}</b>/100</span>${evoSpark(d.history,c.score)}</span>
    </span></button>`;
}

/* ---------- detall ---------- */
function evoDetail(){
  const d=EVO; if(!d) return "";
  const c=d.current||{}, b=evoBar(d), w=d.weights||{}, nx=d.next;
  const parts=EVO_PARTS.map(([k,t,ic])=>{const v=c[k];
    return `<div class="evo-part"><span>${ic} ${t} <small>${w[k]!=null?w[k]+" %":""}</small></span><span class="evo-bar sm"><i style="width:${v==null?0:v}%"></i></span><b>${v==null?"sense dades":v}</b></div>`}).join("");
  const why=[];
  if(c.sessions!=null) why.push(`${c.sessions} de ${c.planned} sessions fetes aquesta setmana`);
  if(c.kcal_target!=null) why.push(`${c.kcal_days||0} dies amb kcal apuntades, ${c.kcal_ok||0} dins de l'objectiu (${fn(c.kcal_target,0)} kcal)`);
  if(c.weight_chg_pct!=null) why.push(`pes mitjà ${c.weight_chg_pct>0?"+":""}${fn(c.weight_chg_pct,2)} % respecte a la setmana anterior`);
  if(c.strength_ok!=null&&c.sessions) why.push(`${c.strength_ok} % dels exercicis mantenen o milloren la força`);
  const goal=nx?(nx.sessions_left?`Fes ${nx.sessions_left} ${nx.sessions_left===1?"sessió":"sessions"} més aquesta setmana i apunta les kcal cada dia.`:`Pla de la setmana complert: ara toca apuntar les kcal i pesar-te.`):"Has arribat al nivell màxim: mantén la constància.";
  const vsel=evoMine()?`<div class="stack" style="gap:6px"><span class="lbl">Avatar</span><div class="chips">${[["auto","Segons el perfil"],["m","Masculí"],["f","Femení"]].map(([k,t])=>`<button data-evo-var="${k}" class="${(d.variant_pref||"auto")===k?"on":""}">${t}</button>`).join("")}</div></div>`:"";
  return `<div id="evo-ov" class="evo-ov"><div class="evo-bg" data-evo-close></div><div class="evo-box">
    <button class="plain evo-x" data-evo-close aria-label="Tancar">✕</button>
    ${evoAvatar(d,d.level,"big")}
    <div style="text-align:center"><span class="lbl">Atlas Evolution</span><h2>Nivell ${d.level} · ${EVO_NAMES[d.level]}</h2></div>
    <span class="evo-bar"><i style="width:${b.pct.toFixed(1)}%"></i></span><span class="evo-sub" style="text-align:center">${esc(b.txt)}</span>
    <div class="card stack" style="gap:10px"><span class="lbl">Aquesta setmana · ${c.score!=null?c.score:"–"}/100</span>${parts}
      ${why.length?`<ul class="evo-why">${why.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:""}</div>
    <div class="card stack" style="gap:6px"><span class="lbl">Objectiu següent</span><b>${nx?`Nivell ${nx.level} · ${EVO_NAMES[nx.level]}`:"ATLAS ELITE"}</b><span class="sub">${esc(goal)}</span></div>
    <div class="card stack" style="gap:6px"><span class="lbl">Últimes setmanes</span>${evoSpark(d.history,c.score)||'<span class="sub">Encara no hi ha cap setmana tancada.</span>'}</div>
    ${vsel}
    <p class="sub" style="font-size:12px">Cada setmana tancada suma punts segons el compliment del pla. El nivell no baixa mai: una setmana complicada només fa avançar menys. ${d.model==="base"?"Les imatges definitives de l'avatar estan en preparació.":""}</p>
  </div></div>`;
}
function evoShow(){ const o=$("#evo-ov"); if(o) o.remove(); document.body.insertAdjacentHTML("beforeend",evoDetail()); EVO_open=true }
function evoHide(){ const o=$("#evo-ov"); if(o) o.remove(); EVO_open=false }

/* ---------- celebració: transformació en pujar de nivell o en tancar una setmana de 90 o més ---------- */
function evoMaybeCelebrate(){
  const d=EVO; if(!d||!evoMine()||EVO_cel||$("#evo-cel")) return;
  const lastW=(d.history||[])[ (d.history||[]).length-1 ];
  let msg=null, from=d.level;
  if(d.level>(d.seen_level||1)){ from=d.seen_level||1; msg=`Has arribat al nivell ${d.level} · ${EVO_NAMES[d.level]}. El teu progrés Atlas continua avançant.` }
  else if(lastW&&lastW.score>=90&&(!d.seen_week||d.seen_week<lastW.week)) msg=`La teva setmana ha puntuat ${lastW.score}/100: has complert el teu pla. El teu progrés Atlas continua avançant.`;
  if(!msg) return;
  EVO_cel={level:d.level,week:lastW?lastW.week:d.week};
  document.body.insertAdjacentHTML("beforeend",`<div id="evo-cel" class="evo-ov cel"><div class="evo-bg"></div><div class="evo-box" style="align-items:center;text-align:center">
    <div class="evo-morph">${evoAvatar(d,from,"big from")}${evoAvatar(d,d.level,"big to")}<span class="evo-ring"></span></div>
    <h2 class="evo-wow">ENHORABONA!</h2><p>${esc(msg)}</p>
    <button class="primary" data-evo-celok style="min-width:200px">Som-hi!</button></div></div>`);
}
async function evoCelebrated(){
  const c=EVO_cel, o=$("#evo-cel"); if(o) o.remove(); if(!c) return;
  try{ await QStore.rpc("avatar_mark_seen",{lvl:c.level,wk:c.week}); if(EVO){EVO.seen_level=c.level; EVO.seen_week=c.week} }catch(_){}
  EVO_cel=null;
}

/* ---------- configuració de l'entrenador (pantalla Clients) ---------- */
function evoConfigCard(){
  if(!IS_COACH()) return "";
  if(EVO_cfg===null){ EVO_cfg=false;
    QStore.sb.from("avatar_config").select("*").eq("coach_id",QStore.uid).maybeSingle()
      .then(({data})=>{EVO_cfg=data||{}; if(cur==="clients") render()}).catch(()=>{EVO_cfg={}}); }
  const c=EVO_cfg||{}, w=c.weights||{train:40,food:30,body:20,consist:10}, t=c.thresholds||[0,300,900,2000,3600], p=c.params||{kcal_tol_pct:10,good_week_pct:75};
  const num=(id,v,lbl)=>`<label class="f"><span class="lbl">${lbl}</span><input id="${id}" type="number" inputmode="numeric" min="0" value="${esc(String(v))}"></label>`;
  return `<details class="card stack"><summary class="lbl" style="cursor:pointer">Atlas Evolution · criteris de l'avatar</summary>
    <div class="stack" style="margin-top:10px">
      <span class="sub" style="font-size:13px">Pes de cada variable a la puntuació setmanal (en %). Si un client no té dades d'una variable, el seu pes es reparteix entre les altres.</span>
      <div class="row">${num("ec-train",w.train,"Entrenament")}${num("ec-food",w.food,"Alimentació")}</div>
      <div class="row">${num("ec-body",w.body,"Progrés físic")}${num("ec-consist",w.consist,"Constància")}</div>
      <span class="sub" style="font-size:13px">Punts acumulats per pujar de nivell (cada setmana suma de 0 a 100).</span>
      <div class="row">${num("ec-t2",t[1],"ACTIVE")}${num("ec-t3",t[2],"PROGRESS")}</div>
      <div class="row">${num("ec-t4",t[3],"ATHLETE")}${num("ec-t5",t[4],"ATLAS ELITE")}</div>
      <div class="row">${num("ec-tol",p.kcal_tol_pct,"Marge de kcal (±%)")}${num("ec-good",p.good_week_pct,"Setmana complerta (% sessions)")}</div>
      <button class="primary" id="ec-save" type="button">Desar criteris</button>
    </div></details>`;
}
async function evoSaveConfig(){
  const g=id=>Math.max(0,parseInt(($("#"+id)||{}).value,10)||0);
  const weights={train:g("ec-train"),food:g("ec-food"),body:g("ec-body"),consist:g("ec-consist")};
  const thresholds=[0,g("ec-t2"),g("ec-t3"),g("ec-t4"),g("ec-t5")];
  if(!(weights.train+weights.food+weights.body+weights.consist)) return toast("Cal que alguna variable tingui pes");
  if(thresholds.some((x,i)=>i&&x<=thresholds[i-1])) return toast("Els punts de cada nivell han de ser més alts que els de l'anterior");
  const params={kcal_tol_pct:g("ec-tol")||10,good_week_pct:Math.min(100,g("ec-good")||75)};
  const {error}=await QStore.sb.from("avatar_config").upsert({coach_id:QStore.uid,weights,thresholds,params,updated_at:new Date().toISOString()},{onConflict:"coach_id"});
  if(error) return toast("No s'ha pogut desar: "+error.message);
  EVO_cfg={weights,thresholds,params}; EVO_t=0; toast("Criteris desats");
}

document.addEventListener("click",async e=>{
  const t=e.target;
  if(t.closest("#evo-open")){ evoShow(); return }
  if(t.closest("[data-evo-close]")){ evoHide(); return }
  if(t.closest("[data-evo-celok]")){ evoCelebrated(); return }
  if(t.closest("#ec-save")){ evoSaveConfig(); return }
  const v=t.closest("[data-evo-var]");
  if(v){ try{ await QStore.rpc("avatar_set_variant",{v:v.dataset.evoVar}); EVO.variant_pref=v.dataset.evoVar; EVO_t=0; evoHide(); evoLoad(true) }catch(err){ toast("No s'ha pogut canviar l'avatar") } }
});
document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&EVO_open) evoHide() });

document.head.insertAdjacentHTML("beforeend",`<style>
.evo{display:flex;gap:14px;align-items:center;text-align:left;width:100%;color:var(--fg);font:inherit;cursor:pointer;
  background:linear-gradient(150deg,color-mix(in srgb,var(--accent) 16%,var(--surface)),var(--surface));border:1px solid color-mix(in srgb,var(--accent) 35%,var(--line))}
.evo-av{position:relative;flex-shrink:0;width:84px;height:132px;border-radius:16px;background:radial-gradient(80% 60% at 50% 40%,color-mix(in srgb,var(--accent-2) 22%,transparent),transparent 70%)}
.evo-av svg,.evo-av img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}
.evo-av.big{width:180px;height:270px;margin:0 auto}
.evo-txt{display:flex;flex-direction:column;gap:5px;min-width:0;flex:1}
.evo-lv{font-family:var(--display);font-weight:800;font-size:19px;letter-spacing:-.01em}
.evo-bar{display:block;height:9px;border-radius:999px;background:var(--raise);overflow:hidden}
.evo-bar i{display:block;height:100%;border-radius:inherit;background:var(--grad,linear-gradient(90deg,var(--accent),var(--accent-2)));transition:width .6s}
.evo-bar.sm{height:7px;flex:1}
.evo-sub{font-size:12.5px;color:var(--muted)}
.evo-kpi{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:13px}
.evo-foot{display:flex;align-items:flex-end;justify-content:space-between;gap:8px}
.evo-sc{font-size:13px;color:var(--muted)}.evo-sc b{color:var(--fg);font-size:16px}
.evo-spark{width:120px;height:28px}.evo-spark rect{fill:color-mix(in srgb,var(--accent) 45%,transparent)}.evo-spark rect.cur{fill:var(--accent-2)}
.evo-ov{position:fixed;inset:0;z-index:90;display:flex;align-items:flex-end;justify-content:center}
.evo-bg{position:absolute;inset:0;background:rgba(0,0,0,.6)}
.evo-box{position:relative;width:100%;max-width:520px;max-height:92vh;overflow:auto;background:var(--surface);border-top:1px solid var(--line);border-radius:24px 24px 0 0;
  padding:22px 16px calc(22px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:12px}
.evo-box>*{flex-shrink:0}
.evo-x{position:absolute;top:10px;right:12px;font-size:18px}
.evo-part{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr) auto;gap:10px;align-items:center;font-size:14px}
.evo-part small{color:var(--muted)}.evo-part b{font-size:13px;min-width:30px;text-align:right}
.evo-why{margin:0;padding-left:18px;font-size:13px;color:var(--muted);display:flex;flex-direction:column;gap:3px}
.evo-ov.cel{align-items:center}.evo-ov.cel .evo-box{border-radius:24px;margin:16px;width:calc(100% - 32px)}
.evo-morph{position:relative;width:180px;height:270px}
.evo-morph .evo-av{position:absolute;inset:0}
.evo-morph .from{animation:evoOut 1.6s ease-in forwards}
.evo-morph .to{opacity:0;animation:evoIn 1.4s 1.1s ease-out forwards}
.evo-ring{position:absolute;left:50%;top:50%;width:40px;height:40px;margin:-20px;border-radius:50%;border:3px solid var(--accent-2);opacity:0;animation:evoRing 1.2s .9s ease-out forwards}
.evo-wow{font-family:var(--display);font-weight:800;font-size:30px;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
@keyframes evoOut{0%{opacity:1;filter:none}70%{opacity:.8;filter:brightness(2.2) blur(2px);transform:scale(1.04)}100%{opacity:0;filter:brightness(3) blur(6px)}}
@keyframes evoIn{0%{opacity:0;filter:brightness(3) blur(6px);transform:scale(.96)}100%{opacity:1;filter:none;transform:none}}
@keyframes evoRing{0%{opacity:.9;transform:scale(.5)}100%{opacity:0;transform:scale(6)}}
@media (prefers-reduced-motion:reduce){.evo-morph .from{animation:none;opacity:0}.evo-morph .to{animation:none;opacity:1}.evo-ring{display:none}}
</style>`);
