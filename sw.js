/* Quadern · funciona sense connexió: guarda l'app i les llibreries al mòbil */
const V="quadern-v1";
const CORE=["./","index.html","store.js","manifest.webmanifest","icon-192.png","icon-512.png","apple-touch-icon.png",
 "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js","https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.js"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(c=>Promise.all(CORE.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  const r=e.request; if(r.method!=="GET") return;
  const u=new URL(r.url);
  if(u.hostname.endsWith("supabase.co")) return;              // dades: sempre a la xarxa
  const own=u.origin===location.origin;
  if(own&&(r.mode==="navigate"||/\.(html|js|webmanifest)$/.test(u.pathname))){
    // app: primer la xarxa (per rebre actualitzacions), si no hi ha connexió la còpia guardada
    e.respondWith(fetch(r).then(res=>{const c=res.clone();caches.open(V).then(x=>x.put(r,c));return res}).catch(()=>caches.match(r).then(m=>m||caches.match("index.html"))));
    return;
  }
  // llibreries, fonts i imatges: la còpia guardada primer
  e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{if(res.ok||res.type==="opaque"){const c=res.clone();caches.open(V).then(x=>x.put(r,c))}return res})));
});
