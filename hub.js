(()=>{'use strict';const I=DASH_ICON,$=s=>document.querySelector(s);
// DashFit was retired: remove its data from this device once (user-confirmed deletion).
try{if(!localStorage.getItem('dash-fit-removed')){['fitness-tracker-entries-v1','im-tracker-settings-v1','dashfit-theme','dash-hub-intro'].forEach(k=>localStorage.removeItem(k));
 Object.keys(localStorage).filter(k=>/^(dashfit|im-tracker|fitness-tracker)/.test(k)).forEach(k=>localStorage.removeItem(k));localStorage.setItem('dash-fit-removed','1')}}catch(e){}
// Dash Notes and Dash Finance were retired: remove their data from this device once (user-confirmed deletion).
try{if(!localStorage.getItem('dash-nf-removed')){Object.keys(localStorage).filter(k=>/^dash-(notes|finance)/.test(k)).forEach(k=>localStorage.removeItem(k));
 if(window.indexedDB)Promise.all(['dash-notes','dash-finance'].map(n=>new Promise(r=>{const q=indexedDB.deleteDatabase(n);q.onsuccess=()=>r(true);q.onerror=q.onblocked=()=>r(false)}))).then(ok=>{if(ok.every(Boolean))localStorage.setItem('dash-nf-removed','1')});
 else localStorage.setItem('dash-nf-removed','1')}}catch(e){}
// theme toggle: auto -> light -> dark
const tb=$('#theme'),cur=()=>localStorage.getItem('dash-theme')||'auto';
const paintT=()=>{const t=cur(),dark=t==='dark'||(t==='auto'&&matchMedia('(prefers-color-scheme: dark)').matches);tb.innerHTML=I(dark?'moon':'sun');tb.setAttribute('aria-label',`Theme: ${t}. Tap to change`);document.querySelector('meta[name=theme-color]').content='#D62828'};
tb.onclick=()=>{const n={auto:'light',light:'dark',dark:'auto'}[cur()];localStorage.setItem('dash-theme',n);n==='auto'?delete document.documentElement.dataset.theme:document.documentElement.dataset.theme=n;paintT()};paintT();
const h=new Date().getHours();$('#greet').textContent=h<12?'Good morning':h<18?'Good afternoon':'Good evening';
$('#today').innerHTML=I('calendar','sm')+' '+new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
// stat chips in hero
const chips={};window.dashStat=(id,txt,hot)=>{chips[id]=[txt,hot];$('#chips').innerHTML=Object.entries(chips).map(([k,[t,h]])=>`<span class="chip${h?' hot':''}">${I(k==='nba'?'pulse':'trophy','sm')} ${t}</span>`).join('')};
const top=DASH_APPS.filter(a=>a.parent==='games').map(a=>[a,+localStorage.getItem('dash-games-'+a.id+'-best')||0]).sort((x,y)=>y[1]-x[1])[0];if(top&&top[1])dashStat('games',`Best: ${top[0].name} ${top[1].toLocaleString()}`);
$('#grid').innerHTML=DASH_APPS.filter(a=>!a.parent).map((a,i)=>`<a class="app rise" style="--d:${i}" href="${a.path}"><img src="${a.icon}" width="68" height="68" alt=""><span class="an"><b>${esc(a.name)}</b><small>${esc(a.tagline||'')}</small></span></a>`).join('');
$('#widgets').innerHTML=DASH_APPS.filter(a=>a.widget).map((a,i)=>`<section class="wcard rise" style="--d:${i+3}" aria-labelledby="wt-${a.id}"><header><img src="${a.icon}" width="28" height="28" alt=""><h2 id="wt-${a.id}">${esc(a.widgetTitle||a.name)}</h2><a class="more" href="${a.path}" aria-label="Open ${esc(a.name)}">Open ${I('next','sm')}</a></header><div class="widget" id="w-${a.id}" aria-live="polite"><p class="muted">Loading…</p></div></section>`).join('');
DASH_APPS.forEach(a=>a.widget&&a.widget(document.getElementById('w-'+a.id)));
})();
