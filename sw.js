// One service worker for the whole Dash hub (scope = site root: hub, /nba/, /games/).
// VERSION is stamped automatically by the git pre-commit hook. Do not edit by hand.
const VERSION='2026.10.19-044819-a2f5e09';
const C='dash-'+VERSION,IMG='dash-img',ENG='dash-engine'; // ENG: chess engine WASM (~1.8 MB), cached on first use and kept across versions
const PRE=['./','index.html','hub.js','apps.js','manifest.json','shared/base.css','shared/update.js','shared/theme.js','shared/icons.svg','nba/','nba/index.html','nba/nba.js','nba/manifest.json','games/','games/index.html','games/manifest.json','games/games.css','games/common.js','games/orbit/','games/orbit/index.html','games/orbit/orbit.js','games/bloom/','games/bloom/index.html','games/bloom/bloom.js','games/lantern/','games/lantern/index.html','games/lantern/lantern.js','games/summit/','games/summit/index.html','games/summit/summit.js','icons/lantern.svg','icons/summit.svg','games/reef/','games/reef/index.html','games/reef/reef.js','icons/reef.svg','games/firefly/','games/firefly/index.html','games/firefly/firefly.js','icons/firefly.svg','games/prism/','games/prism/index.html','games/prism/prism.js','icons/prism.svg','icons/dash.svg','icons/hoops.svg','icons/games.svg','icons/orbit.svg','icons/bloom.svg','icons/icon-192.png','icons/icon-512.png','icons/favicon-32.png','icons/apple-touch-icon.png','icons/nba-192.png','icons/nba-512.png','icons/games-192.png','icons/games-512.png','games/chess/','games/chess/index.html','games/chess/rules.js','games/chess/chess.js','games/chess/engine/stockfish-19-lite-single.js','icons/chess.svg','games/racer/','games/racer/index.html','games/racer/racer.js','icons/racer.svg'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>Promise.all(PRE.map(u=>c.add(new Request(u,{cache:'reload'})).catch(()=>{})))))});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C&&x!==IMG&&x!==ENG).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
const fresh=u=>u.pathname.endsWith('/')||/\.(html|js|json|css|svg)$/.test(u.pathname);
const put=(n,req,res)=>{if(res.ok||res.type==='opaque'){const cp=res.clone();caches.open(n).then(c=>c.put(req,cp))}return res};
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);if(r.method!=='GET')return;
 if(u.origin===location.origin){
  // big, rarely-changing files (chess engine wasm, racer 3D models + three.js bundle): cache-first in the persistent engine cache on first use; rename the file to ship a new one
  if(u.pathname.endsWith('.wasm')||u.pathname.endsWith('.glb')||u.pathname.includes('/games/racer/lib/')){e.respondWith(caches.open(ENG).then(c=>c.match(r).then(x=>x||fetch(r).then(res=>{if(res.ok)c.put(r,res.clone());return res}))));return}
  if(fresh(u)||r.mode==='navigate'){ // network-first, bypass HTTP cache (GitHub Pages max-age=600); cache fallback offline
   e.respondWith(fetch(r,{cache:'no-store'}).then(res=>put(C,r,res)).catch(()=>caches.match(r,{ignoreSearch:true}).then(x=>x||caches.match(new URL('./',self.registration.scope).href))));return}
  e.respondWith(caches.match(r).then(x=>x||fetch(r).then(res=>put(C,r,res))));return}
 if(u.hostname==='a.espncdn.com'&&r.destination==='image') // team logos: cache-first
  e.respondWith(caches.open(IMG).then(c=>c.match(r).then(x=>x||fetch(r).then(res=>{c.put(r,res.clone());return res}))));
 // live API data (site.api.espn.com) passes straight through to the network
});
