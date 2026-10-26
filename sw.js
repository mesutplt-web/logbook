// EASA Logbook — offline önbellek (v7.20)
const CACHE='logbook-v720-v1';
const LOCAL=['./','./index.html','./manifest.json','./icon-32.png','./icon-180.png','./icon-192.png','./icon-512.png'];
const LIBS=[
  'https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.2/babel.min.js'
];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(async c=>{
    await c.addAll(LOCAL);
    // Kütüphaneler: biri indirilemezse kurulum yine de tamamlanır, sonraki açılışta tekrar denenir
    await Promise.all(LIBS.map(u=>c.add(new Request(u,{mode:'no-cors'})).catch(()=>{})));
  }).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const url=e.request.url;
  const isLib=LIBS.includes(url);
  const isLocal=url.startsWith(self.location.origin);
  if(isLib){ // cache-first
    e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).then(r=>{const cp=r.clone();caches.open(CACHE).then(x=>x.put(e.request,cp));return r;})));
    return;
  }
  if(isLocal){ // önce önbellek, arkada güncelle (stale-while-revalidate)
    e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(c=>{
      const net=fetch(e.request).then(r=>{if(r&&r.ok){const cp=r.clone();caches.open(CACHE).then(x=>x.put(e.request,cp));}return r;}).catch(()=>c||caches.match('./index.html'));
      return c||net;
    }));
    return;
  }
  // OCR/PDF kütüphaneleri vb.: ağ, olmazsa önbellek
  e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));
});
