// Shared by every Dash app: version display + fast service-worker auto-update.
// DASH_VERSION is stamped automatically by the git pre-commit hook (scripts/stamp-version.sh). Do not edit by hand.
const DASH_VERSION='2026.10.19-044819-a2f5e09';
(()=>{'use strict';window.DASH_VERSION=DASH_VERSION;
const root=new URL('../',document.currentScript.src);
// shared SVG icon helper: DASH_ICON('star','sm')
window.DASH_ICON=(n,c)=>`<svg class="i${c?' '+c:''}" aria-hidden="true"><use href="${root.href}shared/icons.svg#${n}"/></svg>`;
const show=()=>document.querySelectorAll('[data-version]').forEach(e=>e.textContent=DASH_VERSION);
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',show):show();
if(!('serviceWorker'in navigator)||!location.protocol.startsWith('http'))return;
const sw=navigator.serviceWorker,hadCtrl=!!sw.controller;let reloading=false;
const busy=()=>{try{if(window.dashBusy&&window.dashBusy())return true}catch(e){}const a=document.activeElement;return!!(a&&/INPUT|SELECT|TEXTAREA/.test(a.tagName)&&a.type!=='button')};
const reload=()=>{if(!reloading){reloading=true;location.reload()}};
function toast(){if(document.getElementById('dashToast'))return;const t=document.createElement('button');t.id='dashToast';t.type='button';t.textContent='Updated — tap to reload';t.setAttribute('aria-live','polite');
 t.style.cssText='position:fixed;left:50%;bottom:calc(16px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:50;background:#0b6e4f;color:#fff;border:0;border-radius:99px;padding:12px 20px;min-height:44px;font:600 15px system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.25);cursor:pointer';
 t.onclick=reload;document.body.appendChild(t)}
sw.addEventListener('controllerchange',()=>{if(!hadCtrl||reloading)return;busy()?toast():reload()});
addEventListener('load',()=>sw.register(new URL('sw.js',root).href,{scope:root.href,updateViaCache:'none'}).then(reg=>{const up=()=>reg.update().catch(()=>{});up();
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')up()});setInterval(up,60000)}).catch(()=>{}));
})();
