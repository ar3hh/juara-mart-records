// Change CACHE name (v3 -> v4) whenever you update any app file. Stored records are never touched.
const CACHE='juara-v3',FILES=['./','index.html','css/styles.css','js/calc.js','js/db.js','js/backup.js','js/app.js','manifest.webmanifest','assets/logo.png','assets/icons/icon-192.png','assets/icons/icon-512.png','assets/icons/apple-touch-icon.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n!==CACHE).map(n=>caches.delete(n)))));self.clients.claim()});
self.addEventListener('fetch',e=>{if(e.request.method==='GET')e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request)))});
