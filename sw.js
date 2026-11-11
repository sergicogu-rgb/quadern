/* 2UP · funciona sense connexió: guarda l'app i les llibreries al mòbil */
const V="quadern-v19";
const CORE=["./","index.html","store.js","coach.js","engage.js","app.js","manifest.webmanifest","icon-192.png","icon-512.png","apple-touch-icon.png",
 "vendor/supabase-2.45.4.js","vendor/chart-4.4.1.umd.js"];
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

/* notificacions */
self.addEventListener("push",e=>{
  let d={}; try{d=e.data?e.data.json():{}}catch(_){d={title:"2UP",body:e.data?e.data.text():""}}
  const n=self.registration.showNotification(d.title||"2UP",{body:d.body||"",icon:"icon-192.png",badge:"icon-192.png",tag:"q-"+(d.id||Date.now()),data:{url:d.url||"./"}});
  const b=(self.navigator&&self.navigator.setAppBadge)?self.navigator.setAppBadge(d.badge||1).catch(()=>{}):Promise.resolve();
  e.waitUntil(Promise.all([n,b]));
});
self.addEventListener("notificationclick",e=>{
  e.notification.close();
  const url=new URL((e.notification.data&&e.notification.data.url)||"./",self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(cs=>{
    for(const c of cs){ if(c.url.startsWith(self.registration.scope)) return c.focus().then(w=>w&&w.navigate?w.navigate(url).catch(()=>w):w) }
    return self.clients.openWindow(url);
  }));
});
