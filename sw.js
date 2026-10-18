// One service worker for the whole Dash hub (scope = site root: hub, /nba/, /games/).
// VERSION is stamped automatically by the git pre-commit hook. Do not edit by hand.
const VERSION='2026.10.18-184457-b3407c8';
const C='dash-'+VERSION,IMG='dash-img';
const PRE=['./','index.html','hub.js','apps.js','manifest.json','shared/base.css','shared/update.js','shared/theme.js','shared/icons.svg','nba/','nba/index.html','nba/nba.js','nba/manifest.json','games/','games/index.html','games/manifest.json','games/games.css','games/common.js','games/orbit/','games/orbit/index.html','games/orbit/orbit.js','games/pilot/','games/pilot/index.html','games/pilot/pilot.js','games/bloom/','games/bloom/index.html','games/bloom/bloom.js','games/glimmer/','games/glimmer/index.html','games/glimmer/glimmer.js','games/glimmer/glimmer.css','games/lantern/','games/lantern/index.html','games/lantern/lantern.js','games/summit/','games/summit/index.html','games/summit/summit.js','icons/glimmer.svg','icons/lantern.svg','icons/summit.svg','games/reef/','games/reef/index.html','games/reef/reef.js','icons/reef.svg','games/firefly/','games/firefly/index.html','games/firefly/firefly.js','icons/firefly.svg','games/prism/','games/prism/index.html','games/prism/prism.js','icons/prism.svg','games/meadow/','games/meadow/index.html','games/meadow/meadow.js','icons/meadow.svg','games/putt/','games/putt/index.html','games/putt/putt.js','icons/putt.svg','games/canopy/','games/canopy/index.html','games/canopy/canopy.js','icons/canopy.svg','games/crestline/','games/crestline/index.html','games/crestline/config.js','games/crestline/run.js','games/crestline/meta.js','games/crestline/crestline.css','icons/crestline.svg','icons/dash.svg','icons/hoops.svg','icons/games.svg','icons/orbit.svg','icons/pilot.svg','icons/bloom.svg','icons/icon-192.png','icons/icon-512.png','icons/favicon-32.png','icons/apple-touch-icon.png','icons/nba-192.png','icons/nba-512.png','icons/games-192.png','icons/games-512.png'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>Promise.all(PRE.map(u=>c.add(new Request(u,{cache:'reload'})).catch(()=>{})))))});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C&&x!==IMG).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
const fresh=u=>u.pathname.endsWith('/')||/\.(html|js|json|css|svg)$/.test(u.pathname);
const put=(n,req,res)=>{if(res.ok||res.type==='opaque'){const cp=res.clone();caches.open(n).then(c=>c.put(req,cp))}return res};
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);if(r.method!=='GET')return;
 if(u.origin===location.origin){
  if(fresh(u)||r.mode==='navigate'){ // network-first, bypass HTTP cache (GitHub Pages max-age=600); cache fallback offline
   e.respondWith(fetch(r,{cache:'no-store'}).then(res=>put(C,r,res)).catch(()=>caches.match(r,{ignoreSearch:true}).then(x=>x||caches.match(new URL('./',self.registration.scope).href))));return}
  e.respondWith(caches.match(r).then(x=>x||fetch(r).then(res=>put(C,r,res))));return}
 if(u.hostname==='a.espncdn.com'&&r.destination==='image') // team logos: cache-first
  e.respondWith(caches.open(IMG).then(c=>c.match(r).then(x=>x||fetch(r).then(res=>{c.put(r,res.clone());return res}))));
 // live API data (site.api.espn.com) passes straight through to the network
});
