// Highway Rush: 3D highway racer rendered with a vendored three.js (lib/three-racer.js). Straight 4-lane one-way road,
// traffic to weave through, gas/brake pedals, tilt or touch steering, close-pass and high-speed bonuses.
// Models: Kenney Car Kit + Nature Kit (CC0), see models/CREDITS.md. Textures are generated in code.
import * as T from './lib/three-racer.js';
const{best,setBest,$}=G,cv=$('#cv');
// ---------- settings ----------
const PREF='dash-games-racer-prefs',COLORS=[['#d62828','#8f1414'],['#2d6fd6','#173f85'],['#ffd23f','#b38f12'],['#f2f2ee','#a9aaa4']];
const prefs={steer:'touch',autoGas:false,sound:false,color:0,cal:0,tip:false,gfx:'high',autoQ:true};try{Object.assign(prefs,JSON.parse(localStorage.getItem(PREF)||'{}'))}catch(e){}
const savePrefs=()=>{try{localStorage.setItem(PREF,JSON.stringify(prefs))}catch(e){}};
// ---------- world constants (meters, m/s) ----------
const LANE=3.6,LANES=4,ROAD=LANE*LANES/2,RAIL=ROAD+1.4,CAR_W=1.9,CAR_L=4.4,MAXV=71.5,MPH=2.23694;
const laneX=i=>-ROAD+LANE*(i+.5);
let camX=0,camZ=0;const CAMBACK=12,PLAYER_DIM={w:CAR_W,l:CAR_L,h:1.45};
// ---------- state ----------
let state='menu',raf=0,lastT=0,player=null,traffic=[],dist=0,hsDist=0,closePts=0,closeN=0,combo=0,comboT=0,shake=0,crashT=0,popups=[],spawnZ=0,ft=[],sparks=[];
const input={gas:false,brake:false,left:false,right:false,tilt:0},keys={};
function resetWorld(menu){player={x:laneX(1),z:0,v:menu?27:24,lat:0,brake:false,col:COLORS[prefs.color]||COLORS[0],w:PLAYER_DIM.w,l:PLAYER_DIM.l,h:PLAYER_DIM.h};
 traffic=[];dist=0;hsDist=0;closePts=0;closeN=0;combo=0;comboT=0;shake=0;crashT=0;popups=[];sparks=[];camX=player.x;camZ=player.z-CAMBACK;
 for(let i=0;i<5;i++)spawn(60+i*45)}
function pickType(){const tot=VEH.reduce((a,v)=>a+v.p,0);let r=Math.random()*tot;for(const v of VEH){if((r-=v.p)<0)return v}return VEH[0]}
function spawn(ahead){const zs=player.z+ahead,menu=state==='menu';
 for(let tries=0;tries<6;tries++){const lane=Math.floor(Math.random()*LANES);if(menu&&lane===laneOf(player.x))continue;
  const vt=pickType(),tp=templates[vt.id];if(!tp)return;const truck=!!vt.heavy,len=tp.L;
  if(traffic.some(c=>c.lane===lane&&Math.abs(c.z-zs)<len+c.l+14))continue;
  // never wall off the road: at most 2 vehicles side by side
  if(traffic.filter(c=>Math.abs(c.z-zs)<22).length>=2)continue;
  const v=truck?19+Math.random()*5:22+Math.random()*9;
  traffic.push({type:vt.id,lane,x:laneX(lane),z:zs,v,v0:v,l:len,w:tp.W,h:tp.H,truck,paint:vt.keep?null:TPAINT[Math.floor(Math.random()*TPAINT.length)],tx:null,blink:0,passed:false,braking:false});return}}
const laneOf=px=>Math.max(0,Math.min(LANES-1,Math.floor((px+ROAD)/LANE)));
// ---------- input ----------
function hold(el,key){const set=v=>{input[key]=v;el.classList.toggle('on',v)},ids=new Set();
 el.addEventListener('pointerdown',e=>{e.preventDefault();ids.add(e.pointerId);try{el.setPointerCapture(e.pointerId)}catch(_){}set(true);audioKick()});
 const up=e=>{ids.delete(e.pointerId);if(!ids.size)set(false)};['pointerup','pointercancel','lostpointercapture'].forEach(t=>el.addEventListener(t,up))}
hold($('#gas'),'gas');hold($('#brake'),'brake');hold($('#left'),'left');hold($('#right'),'right');
const KM={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'gas',KeyW:'gas',ArrowDown:'brake',KeyS:'brake',Space:'brake'};
addEventListener('keydown',e=>{if(KM[e.code]){keys[KM[e.code]]=true;e.preventDefault()}if((e.code==='KeyP'||e.code==='Escape')&&state==='play')pause();else if((e.code==='KeyP'||e.code==='Escape')&&state==='paused')resume();if(e.code==='Enter'&&state==='menu')play()});
addEventListener('keyup',e=>{if(KM[e.code])keys[KM[e.code]]=false});
document.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});
document.addEventListener('dblclick',e=>e.preventDefault());
// ---------- tilt ----------
let tiltRaw=null,tiltOn=false,tiltSeen=0;
const angle=()=>{const a=screen.orientation&&typeof screen.orientation.angle==='number'?screen.orientation.angle:(window.orientation||0);return((a%360)+360)%360};
function onOri(e){if(e.beta==null)return;let b=e.beta;if(b>90)b=180-b;else if(b<-90)b=-180-b; // unwrap flips past vertical
 const a=angle();tiltRaw=a===270?-b:a===90?b:(e.gamma||0);tiltSeen=performance.now()}
async function enableTilt(){if(tiltOn)return true;try{const D=window.DeviceOrientationEvent;if(!D)return false;
 if(typeof D.requestPermission==='function'){const r=await D.requestPermission();if(r!=='granted')return false}
 addEventListener('deviceorientation',onOri);tiltOn=true;return true}catch(e){return false}}
function calibrate(){if(tiltRaw==null){toast('No tilt reading yet. Move the phone a little and try again.');return}prefs.cal=tiltRaw;savePrefs();toast('Tilt calibrated')}
// ---------- audio (generated; off by default) ----------
let ac=null,eng=null;
function audioKick(){if(!prefs.sound)return;try{ac=ac||new(window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume();
 if(!eng){const o1=ac.createOscillator(),o2=ac.createOscillator(),lp=ac.createBiquadFilter(),g=ac.createGain();o1.type='sawtooth';o2.type='square';lp.type='lowpass';lp.frequency.value=420;g.gain.value=0;
  o1.connect(lp);o2.connect(lp);lp.connect(g).connect(ac.destination);o1.start();o2.start();eng={o1,o2,g,lp}}}catch(e){}}
function engineSound(v,on){if(!eng||!ac)return;const t=ac.currentTime,fr=38+v*1.9+(input.gas?12:0);eng.o1.frequency.setTargetAtTime(fr,t,.08);eng.o2.frequency.setTargetAtTime(fr*.5,t,.08);
 eng.g.gain.setTargetAtTime(on&&prefs.sound?.035:0,t,.1);eng.lp.frequency.setTargetAtTime(300+v*12,t,.1)}
function blip(fq,d=.08,type='triangle',vol=.08){if(!prefs.sound||!ac)return;try{const t=ac.currentTime,o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(fq,t);o.frequency.exponentialRampToValueAtTime(fq*1.5,t+d);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0005,t+d);o.connect(g).connect(ac.destination);o.start(t);o.stop(t+d+.02)}catch(e){}}
function crashSound(){if(!prefs.sound||!ac)return;try{const t=ac.currentTime,n=ac.sampleRate*.6,buf=ac.createBuffer(1,n,ac.sampleRate),d=buf.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,2.2);
 const s=ac.createBufferSource(),lp=ac.createBiquadFilter(),g=ac.createGain();s.buffer=buf;lp.type='lowpass';lp.frequency.value=1400;g.gain.value=.5;s.connect(lp).connect(g).connect(ac.destination);s.start(t);
 const o=ac.createOscillator(),og=ac.createGain();o.frequency.setValueAtTime(110,t);o.frequency.exponentialRampToValueAtTime(30,t+.4);og.gain.setValueAtTime(.4,t);og.gain.exponentialRampToValueAtTime(.001,t+.45);o.connect(og).connect(ac.destination);o.start(t);o.stop(t+.5)}catch(e){}}
// ---------- screens ----------
const scr=id=>['menu','settings','pauseScr','results','tip'].forEach(s=>$('#'+s).hidden=s!==id);
let toastT=0;function toast(m){const t=$('#toast');t.textContent=m;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,2200)}
function showCtl(on){const touch=prefs.steer==='touch'||!tiltOn;$('#gas').hidden=!on;$('#brake').hidden=!on;$('#left').hidden=!on||!touch;$('#right').hidden=!on||!touch;$('#hud').hidden=!on;$('#back').hidden=on}
function paintMenu(){const b=best();$('#mBest').textContent=b?`Best ${b.toLocaleString()}`:'Weave through traffic. Pass close for bonus points.';
 $('#colors').innerHTML=COLORS.map((c,i)=>`<button class="sw" style="background:${c[0]}" data-c="${i}" aria-label="Car color ${i+1}" aria-pressed="${i===prefs.color}"></button>`).join('')}
$('#colors').onclick=e=>{const b=e.target.closest('[data-c]');if(!b)return;prefs.color=+b.dataset.c;savePrefs();if(player)player.col=COLORS[prefs.color];setPlayerColor();paintMenu()};
function paintSet(){document.querySelectorAll('[data-steer]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.steer===prefs.steer)));
 document.querySelectorAll('[data-auto]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.auto===+prefs.autoGas)));
 document.querySelectorAll('[data-snd]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.snd===+prefs.sound)));$('#calBtn').disabled=prefs.steer!=='tilt';
 document.querySelectorAll('[data-gfx]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.gfx===qName)));document.querySelectorAll('[data-aq]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.aq===+prefs.autoQ)))}
document.querySelectorAll('[data-gfx]').forEach(b=>b.onclick=()=>{prefs.gfx=qName=b.dataset.gfx;savePrefs();applyQuality();paintSet()});
document.querySelectorAll('[data-aq]').forEach(b=>b.onclick=()=>{prefs.autoQ=b.dataset.aq==='1';savePrefs();paintSet()});
let setFrom='menu';
function openSet(from){setFrom=from;paintSet();scr('settings')}
$('#setBtn').onclick=()=>openSet('menu');$('#pSet').onclick=()=>openSet('pauseScr');
$('#setDone').onclick=()=>{scr(setFrom);if(setFrom==='menu')paintMenu()};
document.querySelectorAll('[data-steer]').forEach(b=>b.onclick=async()=>{if(b.dataset.steer==='tilt'){const ok=await enableTilt();if(!ok){prefs.steer='touch';toast('Tilt is not available or was not allowed. Using touch steering.')}else{prefs.steer='tilt';toast('Tilt on. Hold the phone how you play, then tap Calibrate.')}}else prefs.steer='touch';savePrefs();paintSet()});
document.querySelectorAll('[data-auto]').forEach(b=>b.onclick=()=>{prefs.autoGas=b.dataset.auto==='1';savePrefs();paintSet()});
document.querySelectorAll('[data-snd]').forEach(b=>b.onclick=()=>{prefs.sound=b.dataset.snd==='1';savePrefs();paintSet();if(prefs.sound){audioKick();blip(660)}else engineSound(0,false)});
$('#calBtn').onclick=calibrate;
// full screen (Fullscreen API where supported; iPhone gets a one-time Home Screen tip instead)
const isIOS=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const standalone=()=>navigator.standalone===true||matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches;
const fsEl=()=>document.fullscreenElement||document.webkitFullscreenElement;
async function goFull(){const el=document.documentElement,req=el.requestFullscreen||el.webkitRequestFullscreen;
 if(req&&!fsEl()){try{await req.call(el,{navigationUI:'hide'})}catch(e){}}
 try{if(screen.orientation&&screen.orientation.lock)await screen.orientation.lock('landscape')}catch(e){}
 return!!fsEl()}
function fsAvailable(){const el=document.documentElement;return!!(el.requestFullscreen||el.webkitRequestFullscreen)&&!isIOS}
$('#fsBtn').onclick=async()=>{if(fsEl()){(document.exitFullscreen||document.webkitExitFullscreen).call(document);return}
 if(fsAvailable())await goFull();else if(standalone())toast('Already full screen');else scr('tip')};
const paintFs=()=>{$('#fsBtn').textContent=fsEl()?'Exit full screen':'Full screen';$('#fsBtn').hidden=standalone()};
document.addEventListener('fullscreenchange',paintFs);document.addEventListener('webkitfullscreenchange',paintFs);
$('#tipOk').onclick=()=>{prefs.tip=true;savePrefs();scr('menu')};
// ---------- flow ----------
async function play(){if(!loaded)return;audioKick();qWait=2.5;
 if(prefs.steer==='tilt'&&!(await enableTilt())){prefs.steer='touch';savePrefs();toast('Tilt not allowed. Using touch steering.')}
 if(fsAvailable()&&!fsEl())goFull();
 resetWorld(false);state='play';scr(null);showCtl(true);lastT=0;
 if(prefs.steer==='tilt')setTimeout(()=>{if(state==='play'&&performance.now()-tiltSeen>1500){tiltOn=false;showCtl(true);toast('No tilt sensor found. Using touch steering.')}},1600)}
$('#play').onclick=()=>{if(isIOS&&!standalone()&&!prefs.tip){prefs.tip=true;savePrefs();scr('tip');$('#tipOk').onclick=()=>{$('#tipOk').onclick=()=>{scr('menu')};play()};return}play()};
function pause(){if(state!=='play')return;state='paused';engineSound(0,false);scr('pauseScr');Object.keys(input).forEach(k=>k!=='tilt'&&(input[k]=false));document.querySelectorAll('.ctl.on').forEach(e=>e.classList.remove('on'))}
function resume(){if(state!=='paused')return;state='play';scr(null);lastT=0}
function toMenu(){state='menu';resetWorld(true);scr('menu');showCtl(false);paintMenu();engineSound(0,false)}
$('#pauseBtn').onclick=pause;$('#resume').onclick=resume;$('#pMenu').onclick=toMenu;$('#pRestart').onclick=play;$('#rRestart').onclick=play;$('#rMenu').onclick=toMenu;
G.onHide(()=>pause());
matchMedia('(orientation: portrait)').addEventListener('change',e=>{if(e.matches)pause()});
const score=()=>Math.floor(dist+hsDist+closePts);
function crash(){state='crash';crashT=0;shake=.6;crashSound();engineSound(0,false);G.buzz([60,40,120]);
 const s=score(),nb=setBest(s);setTimeout(()=>{if(state!=='crash')return;state='over';showCtl(false);$('#back').hidden=true;
  $('#rScore').textContent=s.toLocaleString();$('#rBest').textContent=nb?'New best!':`Best ${best().toLocaleString()}`;
  $('#rRows').innerHTML=[['Distance',(dist/1609.34).toFixed(2)+' mi',Math.floor(dist)],['Close passes',closeN,Math.floor(closePts)],['Above 60 mph',(hsDist/1609.34).toFixed(2)+' mi',Math.floor(hsDist)]].map(([a,b,c])=>`<span>${a}</span><i>${b}</i><b>${c.toLocaleString()}</b>`).join('');
  scr('results')},1100)}
// ---------- simulation ----------
function steerInput(){if(prefs.steer==='tilt'&&tiltOn&&tiltRaw!=null){const d=tiltRaw-prefs.cal,dz=2.5;const v=Math.abs(d)<dz?0:(d-Math.sign(d)*dz)/16;return Math.max(-1,Math.min(1,v))}
 return((input.right||keys.right)?1:0)-((input.left||keys.left)?1:0)}
function update(dt){const p=player,play=state==='play';
 if(play){const gas=input.gas||keys.gas||(prefs.autoGas&&!(input.brake||keys.brake)),brk=input.brake||keys.brake;p.brake=brk;
  const top=MAXV,acc=gas?(9.5*(1-p.v/top)+1.2):0;p.v+=(acc-(brk?22:0)-(gas?0:1.6)-p.v*p.v*.00035)*dt;p.v=Math.max(0,Math.min(top,p.v));
  const st=steerInput(),grip=Math.min(1,p.v/8);p.lat+=((st*8.5*grip)-p.lat)*Math.min(1,dt*9);p.x+=p.lat*dt;
  const lim=RAIL-p.w/2-.15;if(Math.abs(p.x)>lim){p.x=Math.sign(p.x)*lim;p.v*=Math.pow(.55,dt);if(p.v>6&&Math.random()<.6)sparks.push({x:p.x+Math.sign(p.x)*p.w/2,z:p.z+1+Math.random()*3,y:.4,vx:-Math.sign(p.x)*2,vy:2+Math.random()*2,l:.4});if(Math.random()<.1)G.buzz(8)}
  const mph=p.v*MPH,dd=p.v*dt;dist+=dd;if(mph>60)hsDist+=dd;engineSound(p.v,true);
  hud(mph)}else if(state==='menu'){p.brake=false;p.x+=(laneX(1)-p.x)*dt}else if(state==='crash'){p.v*=Math.pow(.05,dt);crashT+=dt}
 if(state!=='paused'&&state!=='over'){p.z+=p.v*dt}
 // traffic
 for(const c of traffic){if(state==='paused'||state==='over')break;if(c.pv==null)c.pv=c.v;
  const ahead=traffic.find(o=>o!==c&&(o.lane===c.lane||(o.tx!=null&&laneOf(o.tx)===c.lane))&&o.z>c.z&&o.z-c.z<c.l+14);c.v+=((ahead?Math.min(c.v0,ahead.v):c.v0)-c.v)*Math.min(1,dt*2);
  if(c.tx==null&&!c.truck&&Math.random()<dt*.05&&c.z-p.z>25){const nl=c.lane+(Math.random()<.5?-1:1);
   if(nl>=0&&nl<LANES&&!traffic.some(o=>o!==c&&o.lane===nl&&Math.abs(o.z-c.z)<22)){c.tx=laneX(nl);c.blink=1.2;c.lane=nl}}
  if(c.blink>0)c.blink-=dt;else if(c.tx!=null){c.x+=Math.sign(c.tx-c.x)*Math.min(Math.abs(c.tx-c.x),2.2*dt);if(Math.abs(c.tx-c.x)<.01){c.x=c.tx;c.tx=null}}
  c.braking=c.v<c.pv-.03;c.pv=c.v;c.z+=c.v*dt}
 if(state==='play'||state==='menu'){
  // collisions & close passes
  for(const c of traffic){const dx=Math.abs(c.x-p.x),dzc=(c.z+c.l/2)-(p.z+p.l/2);
   if(state==='play'&&dx<(c.w+p.w)/2-.12&&Math.abs(dzc)<(c.l+p.l)/2-.15){crash();break}
   if(!c.passed&&dzc<0){c.passed=true;const gap=dx-(c.w+p.w)/2;
    if(state==="play"&&gap<1.3&&p.v*MPH>=45){combo=comboT>0?Math.min(5,combo+1):1;comboT=4;const pts=200*combo;closePts+=pts;closeN++;popup(combo>1?`Close! x${combo}  +${pts}`:`Close!  +${pts}`);blip(720+combo*90);G.buzz(15)}}}
  traffic=traffic.filter(c=>c.z>p.z-30&&c.z<p.z+460);
  const want=state==='menu'?6:Math.min(16,6+Math.floor(dist/700));if(traffic.length<want&&Math.random()<dt*4)spawn(230+Math.random()*120)}
 if(comboT>0){comboT-=dt;if(comboT<=0)combo=0}
 for(const s of sparks){s.x+=s.vx*dt;s.y+=s.vy*dt;s.vy-=12*dt;s.l-=dt}sparks=sparks.filter(s=>s.l>0);
 camX+=(p.x*.82-camX)*Math.min(1,dt*6);camZ=p.z-CAMBACK;if(shake>0)shake-=dt}
let comboEl=$('#combo'),comboHide=0;function popup(t){comboEl.textContent=t;comboEl.classList.add('on');clearTimeout(comboHide);comboHide=setTimeout(()=>comboEl.classList.remove('on'),900)}
let hudLast=0;function hud(mph){const n=performance.now();if(n-hudLast<80)return;hudLast=n;$('#hScore').textContent=score().toLocaleString();
 $('#hSpeed').firstChild.nodeValue=Math.round(mph);$('#hDist').firstChild.nodeValue=(dist/1609.34).toFixed(2)}
// ---------- 3D renderer (three.js) ----------
// Game coordinates: x = lateral (m, right +), z = distance travelled forward (m). three.js: forward is -z, so worldZ = -z.
const Q={high:{pr:2,shadow:1024,density:1},medium:{pr:1.5,shadow:512,density:.75},low:{pr:1,shadow:0,density:.5}},QORDER=['high','medium','low'];
let renderer=null,scene,camera,sun,hemi,qName=QORDER.includes(prefs.gfx)?prefs.gfx:'high',loaded=false,glOk=true;
const loadState={cars:null,nature:null};
try{renderer=new T.WebGLRenderer({canvas:cv,antialias:true,powerPreference:'high-performance',stencil:false});}catch(e){glOk=false}
const tex=(w,h,fn,srgb=true)=>{const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);if(srgb)t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=renderer?Math.min(8,renderer.capabilities.getMaxAnisotropy()):1;return t};
const noise=(g,w,h,n,cols,sz=1)=>{for(let i=0;i<n;i++){g.fillStyle=cols[(Math.random()*cols.length)|0];g.fillRect(Math.random()*w,Math.random()*h,sz,sz)}};
// procedural textures
function asphaltTex(){const RW=2*ROAD+.6,PX=512/RW;return tex(512,1024,(g,w,h)=>{g.fillStyle='#4b4e52';g.fillRect(0,0,w,h);
 noise(g,w,h,26000,['#55585c','#43464a','#5d6064','#3e4144','#505357'],2);noise(g,w,h,5000,['#6a6d70','#36393c'],1);
 for(let l=0;l<LANES;l++){const cxp=(laneX(l)+RW/2)*PX;for(const o of[-.9,.9]){g.fillStyle='rgba(20,22,24,.16)';g.fillRect(cxp+o*PX-.35*PX,0,.7*PX,h)}}
 g.fillStyle='#ecebe4';for(let l=1;l<LANES;l++){const lx=(-ROAD+l*LANE+RW/2)*PX;g.fillRect(lx-.075*PX,0,.15*PX,h/3)}
 for(const s of[-1,1]){const lx=(s*(ROAD-.2)+RW/2)*PX;g.fillRect(lx-.1*PX,0,.2*PX,h)}
 noise(g,w,h,3000,['rgba(75,78,82,.8)'],2)})}
const grassTex=()=>tex(256,256,(g,w,h)=>{g.fillStyle='#5b8636';g.fillRect(0,0,w,h);noise(g,w,h,9000,['#4f7a2e','#679440','#73a04a','#476f29','#5e8a38','#7b9a45'],2);
 for(let i=0;i<500;i++){g.strokeStyle=['#3f6a24','#82ab52','#6b9640'][i%3];g.beginPath();const x0=Math.random()*w,y0=Math.random()*h;g.moveTo(x0,y0);g.lineTo(x0+(Math.random()-.5)*4,y0-4-Math.random()*5);g.stroke()}});
const gravelTex=()=>tex(256,256,(g,w,h)=>{g.fillStyle='#9d8f74';g.fillRect(0,0,w,h);noise(g,w,h,12000,['#8a7d63','#b0a286','#7a6e57','#c2b597','#958870'],2)});
const signTex=()=>{const t=tex(512,192,(g,w,h)=>{g.fillStyle='#14683f';g.fillRect(0,0,w,h);g.strokeStyle='#fff';g.lineWidth=8;g.strokeRect(10,10,w-20,h-20);g.fillStyle='#fff';g.font='bold 64px system-ui,sans-serif';g.fillText('Palm Coast',36,92);g.font='bold 48px system-ui,sans-serif';g.fillText('Exit 12  ↗',36,160)});t.wrapS=t.wrapT=T.ClampToEdgeWrapping;return t};
const glowTex=()=>{const t=tex(64,64,(g,w,h)=>{const r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.25,'rgba(255,255,255,.55)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,64,64)});return t};
// static world pieces
const SNAP={road:12,grass:6,posts:4},LEN=480,BEHIND=40;
let road,grass,shoulders,rails,posts,overpass,gantry,hills,sparkMesh,glowMat,brakeOnMat,brakeOffMat,tailMat,headMat;
const nat=[]; // instanced scenery types: {meshes:[InstancedMesh], slots:[{x,z,r,s}], span, scale}
function buildWorld(){scene=new T.Scene();scene.fog=new T.Fog(0xc9dde3,140,380);
 scene.background=tex(4,256,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#5d9bd0');gr.addColorStop(.7,'#bcd9e8');gr.addColorStop(1,'#c9dde3');g.fillStyle=gr;g.fillRect(0,0,w,h)});
 const pm=new T.PMREMGenerator(renderer);scene.environment=pm.fromScene(new T.RoomEnvironment(),.04).texture;scene.environmentIntensity=.7;pm.dispose();
 camera=new T.PerspectiveCamera(52,1,.5,520);
 hemi=new T.HemisphereLight(0xe3f0ff,0x4d6b33,.9);scene.add(hemi);
 sun=new T.DirectionalLight(0xfff0d8,2.7);sun.castShadow=true;const sc=sun.shadow.camera;sc.left=-24;sc.right=24;sc.top=46;sc.bottom=-26;sc.near=1;sc.far=160;sun.shadow.bias=-.0006;sun.shadow.normalBias=.03;scene.add(sun,sun.target);
 // grass, road, shoulders
 const gt=grassTex();gt.repeat.set(600/SNAP.grass,LEN/SNAP.grass);grass=new T.Mesh(new T.PlaneGeometry(600,LEN),new T.MeshStandardMaterial({map:gt,roughness:1}));grass.rotation.x=-Math.PI/2;grass.position.y=-.03;grass.receiveShadow=true;scene.add(grass);
 const at=asphaltTex();at.wrapS=T.ClampToEdgeWrapping;at.repeat.set(1,LEN/SNAP.road);road=new T.Mesh(new T.PlaneGeometry(2*ROAD+.6,LEN),new T.MeshStandardMaterial({map:at,roughness:.82,metalness:0}));road.rotation.x=-Math.PI/2;road.receiveShadow=true;scene.add(road);
 const gv=gravelTex();gv.repeat.set(1,LEN/SNAP.grass);const sm=new T.MeshStandardMaterial({map:gv,roughness:1});shoulders=new T.Group();
 for(const s of[-1,1]){const m=new T.Mesh(new T.PlaneGeometry(RAIL-ROAD+1.2,LEN),sm);m.rotation.x=-Math.PI/2;m.position.set(s*(ROAD+.3+(RAIL-ROAD+1.2)/2-.3),.004,0);m.receiveShadow=true;shoulders.add(m)}scene.add(shoulders);
 // guardrails (W-beam look: two rails) + instanced posts
 const metal=new T.MeshStandardMaterial({color:0xc4c9cf,metalness:.85,roughness:.32});rails=new T.Group();
 for(const s of[-1,1])for(const y of[.62,.82]){const m=new T.Mesh(new T.BoxGeometry(.07,.16,LEN),metal);m.position.set(s*RAIL,y,0);m.castShadow=true;m.receiveShadow=true;rails.add(m)}scene.add(rails);
 const nP=Math.ceil(LEN/SNAP.posts)*2;posts=new T.InstancedMesh(new T.BoxGeometry(.13,.95,.13),new T.MeshStandardMaterial({color:0x8a8f95,metalness:.6,roughness:.5}),nP);posts.castShadow=true;
 const m4=new T.Matrix4();let k=0;for(const s of[-1,1])for(let i=0;i<nP/2;i++){m4.makeTranslation(s*(RAIL+.09),.475,LEN/2-i*SNAP.posts);posts.setMatrixAt(k++,m4)}scene.add(posts);
 // overpass + sign gantry (recycled far ahead)
 const conc=new T.MeshStandardMaterial({color:0xb9b6ae,roughness:.9});overpass=new T.Group();
 const deck=new T.Mesh(new T.BoxGeometry(60,1.3,9),conc);deck.position.y=7.2;overpass.add(deck);const lip=new T.Mesh(new T.BoxGeometry(60,.9,.3),new T.MeshStandardMaterial({color:0x9d9a92,roughness:.9}));lip.position.set(0,8.3,4.4);overpass.add(lip);
 for(const s of[-1,1]){const p=new T.Mesh(new T.BoxGeometry(1.4,6.6,6),conc);p.position.set(s*(RAIL+3.2),3.3,0);overpass.add(p)}
 overpass.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});overpass.userData.z=520;scene.add(overpass);
 gantry=new T.Group();const pole=new T.MeshStandardMaterial({color:0x8e939a,metalness:.7,roughness:.4});
 for(const s of[-1,1]){const p=new T.Mesh(new T.CylinderGeometry(.18,.22,7.4,10),pole);p.position.set(s*(RAIL+1.4),3.7,0);gantry.add(p)}
 const beam=new T.Mesh(new T.BoxGeometry(2*RAIL+3,.35,.35),pole);beam.position.y=7.1;gantry.add(beam);
 const board=new T.Mesh(new T.BoxGeometry(6.4,2.4,.15),[new T.MeshStandardMaterial({color:0x14683f}),new T.MeshStandardMaterial({color:0x14683f}),new T.MeshStandardMaterial({color:0x14683f}),new T.MeshStandardMaterial({color:0x14683f}),new T.MeshStandardMaterial({map:signTex(),roughness:.5}),new T.MeshStandardMaterial({color:0x1a5c3a})]);
 board.position.set(LANE,5.9,.1);board.rotation.y=Math.PI;gantry.add(board);gantry.traverse(o=>{if(o.isMesh)o.castShadow=true});gantry.userData.z=260;scene.add(gantry);
 // distant hills (follow the camera, softened by fog)
 hills=new T.Group();const hm=new T.MeshStandardMaterial({color:0x6f8f5a,roughness:1,flatShading:true});
 for(let i=0;i<14;i++){const g=new T.IcosahedronGeometry(1,1);const h=new T.Mesh(g,hm);const side=i%2?1:-1;h.scale.set(40+Math.random()*50,12+Math.random()*22,40+Math.random()*40);h.position.set(side*(90+Math.random()*120),-4,-(260+Math.random()*120)+i*6);hills.add(h)}scene.add(hills);
 // sparks + light materials
 sparkMesh=new T.InstancedMesh(new T.BoxGeometry(.08,.08,.08),new T.MeshBasicMaterial({color:0xffd84a}),40);sparkMesh.count=0;sparkMesh.frustumCulled=false;scene.add(sparkMesh);
 glowMat=new T.SpriteMaterial({map:glowTex(),color:0xff2a1a,transparent:true,depthWrite:false,blending:T.AdditiveBlending,fog:true});
 tailMat=new T.MeshStandardMaterial({color:0x5a0b08,emissive:0xff2a1a,emissiveIntensity:.9,roughness:.3});brakeOnMat=new T.MeshStandardMaterial({color:0x7a0d0a,emissive:0xff2a1a,emissiveIntensity:4,roughness:.3});
 headMat=new T.MeshStandardMaterial({color:0xffffff,emissive:0xfff6dc,emissiveIntensity:1.6,roughness:.2});
 applyQuality()}
function applyQuality(){if(!renderer)return;const q=Q[qName];renderer.setPixelRatio(Math.min(q.pr,devicePixelRatio||1));
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;sun.castShadow=q.shadow>0;
 if(q.shadow){if(sun.shadow.mapSize.x!==q.shadow){sun.shadow.mapSize.set(q.shadow,q.shadow);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null}}}
 for(const n of nat)for(const m of n.meshes)m.count=Math.round(n.slots.length*q.density);onResize()}
function onResize(){if(!renderer)return;const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}
// ---------- models ----------
const loader=new T.GLTFLoader();
const VEH=[ // traffic types: scale xyz applied to Kenney Car Kit models (toy proportions -> road-ish proportions)
 {id:'sedan',s:[1.25,1.2,1.55],p:3},{id:'hatchback-sports',s:[1.3,1.25,1.5],p:2},{id:'suv',s:[1.28,1.3,1.6],p:2},{id:'suv-luxury',s:[1.28,1.25,1.6],p:2},
 {id:'van',s:[1.3,1.4,1.7],p:2},{id:'taxi',s:[1.25,1.2,1.55],p:1,keep:true},{id:'truck',s:[1.3,1.3,1.6],p:1},
 {id:'delivery',s:[1.65,1.85,2.5],p:1.5,heavy:true},{id:'truck-flat',s:[1.55,1.45,2.1],p:1,heavy:true}];
const PLAYER_ID='sedan-sports',PLAYER_S=[1.3,1.25,1.6];
const TPAINT=[0xe9e6dc,0x2b2e33,0x7d8a96,0xa32b2b,0x2b5ea3,0xd98c1e,0x3f7d4f,0xc9c2a8,0x5a3f7a,0xb0b5ba,0x8a1c1c,0x1f3d6b];
const templates={},paintCache=new Map(),pool={};
const paintMat=c=>{if(!paintCache.has(c))paintCache.set(c,new T.MeshPhysicalMaterial({color:c,metalness:.2,roughness:.38,clearcoat:1,clearcoatRoughness:.08,envMapIntensity:.8}));return paintCache.get(c)};
let atlasData=null;
function atlasColor(map,u,v){if(!atlasData){const img=map.image,c=document.createElement('canvas');c.width=img.width;c.height=img.height;const g=c.getContext('2d');g.drawImage(img,0,0);atlasData={d:g.getImageData(0,0,c.width,c.height).data,w:c.width,h:c.height}}
 const x=Math.min(atlasData.w-1,Math.max(0,Math.floor(u*atlasData.w))),y=Math.min(atlasData.h-1,Math.max(0,Math.floor(v*atlasData.h))),i=(y*atlasData.w+x)*4;return[atlasData.d[i]/255,atlasData.d[i+1]/255,atlasData.d[i+2]/255]}
// split a car body into "paint" (largest bright colour block of the atlas) and the rest, so paint gets a glossy clearcoat material
const TRIM_CELL=19; // Kenney atlas cell (col 3,row 2) = grey trim/glass, never paint
function splitPaint(mesh){const g=mesh.geometry,mat=mesh.material,map=mat.map,uv=g.attributes.uv,pos=g.attributes.position,idx=g.index;if(!map||!uv||!idx)return null;
 map.updateMatrix();const M=map.matrix,v3=new T.Vector3(),tri=idx.count/3,cell=new Int32Array(tri),area={},a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
 for(let t=0;t<tri;t++){let su=0,sv=0;for(let k=0;k<3;k++){const i=idx.getX(t*3+k);v3.set(uv.getX(i),uv.getY(i),1).applyMatrix3(M);su+=v3.x;sv+=v3.y}su/=3;sv/=3;
  const key=Math.floor(((su%1)+1)%1*8)+8*Math.floor(((sv%1)+1)%1*4);cell[t]=key;a.fromBufferAttribute(pos,idx.getX(t*3));b.fromBufferAttribute(pos,idx.getX(t*3+1));c.fromBufferAttribute(pos,idx.getX(t*3+2));
  area[key]=(area[key]||0)+b.sub(a).cross(c.sub(a)).length()}
 let bestK=-1,bestA=0,col=null;for(const k in area){const cx=(k%8+.5)/8,cy=(Math.floor(k/8)+.5)/4,rgb=atlasColor(map,cx,cy),lum=.3*rgb[0]+.59*rgb[1]+.11*rgb[2];if(lum<.3||+k===TRIM_CELL)continue;if(area[k]>bestA){bestA=area[k];bestK=+k;col=rgb}}
 if(bestK<0)return null;const pa=[],ot=[];for(let t=0;t<tri;t++)(cell[t]===bestK?pa:ot).push(idx.getX(t*3),idx.getX(t*3+1),idx.getX(t*3+2));
 const ng=g.clone();ng.setIndex(pa.concat(ot));ng.clearGroups();ng.addGroup(0,pa.length,0);ng.addGroup(pa.length,ot.length,1);return{geo:ng,color:new T.Color().setRGB(col[0],col[1],col[2],T.SRGBColorSpace)}}
function makeTemplate(gltf,id,s){const src=gltf.scenes.find(x=>x.name===id);if(!src)throw Error('missing model '+id);const root=src.clone(true);root.updateMatrixWorld(true);let body=null,wheels=[],front=0;
 const other=new T.MeshStandardMaterial({roughness:.5,metalness:.15});
 root.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=false;
  if(/wheel/.test(o.name)){wheels.push(o);if(/front/.test(o.name))front+=o.position.z}
  else{const om=o.material.map,sp=splitPaint(o);other.map=other.map||om;if(sp){o.geometry=sp.geo;o.userData.paint=sp.color;o.material=[paintMat(sp.color.getHex()),other];body=o}else o.material=other}
  });
 const box=new T.Box3().setFromObject(root),size=box.getSize(new T.Vector3()),ctr=box.getCenter(new T.Vector3());
 const inner=new T.Group();root.position.set(-ctr.x,-box.min.y,-ctr.z);inner.add(root);inner.scale.set(s[0],s[1],s[2]);if(front>0)inner.rotation.y=Math.PI; // front -> -z
 const W=size.x*s[0],H=size.y*s[1],L=size.z*s[2];
 // tail/brake lights, head lights and glow sprites
 const lights=new T.Group(),lw=Math.min(.42,W*.2);
 for(const sx of[-1,1]){const t=new T.Mesh(new T.BoxGeometry(lw,.13,.06),tailMat);t.position.set(sx*(W/2-lw/2-.08),H*.42,L/2+.02);t.name='tail';lights.add(t);
  const sp=new T.Sprite(glowMat);sp.position.set(sx*(W/2-lw/2-.08),H*.42,L/2+.25);sp.scale.set(.9,.9,.9);sp.name='glow';sp.visible=false;lights.add(sp);
  const h=new T.Mesh(new T.BoxGeometry(lw*.8,.12,.06),headMat);h.position.set(sx*(W/2-lw/2-.1),H*.38,-L/2-.02);lights.add(h)}
 templates[id]={inner,lights,W,H,L,wheels:wheels.map(w=>w.name),paint:body&&body.userData.paint,r:.33*s[1]};return templates[id]}
function instCar(id,color){const tp=templates[id],g=new T.Group(),inner=tp.inner.clone(true),lights=tp.lights.clone(true);g.add(inner,lights);
 const wheels=[];inner.traverse(o=>{if(o.isMesh&&/wheel/.test(o.name))wheels.push(o);if(o.isMesh&&Array.isArray(o.material)&&color!=null)o.material=[paintMat(color),o.material[1]]});
 const tails=[],glows=[];lights.traverse(o=>{if(o.name==='tail')tails.push(o);if(o.name==='glow')glows.push(o)});
 g.userData={id,wheels,tails,glows,braking:false};scene.add(g);return g}
function setBraking(g,on){if(g.userData.braking===on)return;g.userData.braking=on;for(const t of g.userData.tails)t.material=on?brakeOnMat:tailMat;for(const s of g.userData.glows)s.visible=on}
let playerMesh=null;
function setPlayerColor(){if(!playerMesh)return;const c=new T.Color(COLORS[prefs.color][0]).getHex();playerMesh.traverse(o=>{if(o.isMesh&&Array.isArray(o.material))o.material=[paintMat(c),o.material[1]]})}
function acquire(c){const list=pool[c.type]||(pool[c.type]=[]);const g=list.pop()||instCar(c.type,c.paint);g.visible=true;
 if(c.paint!=null)g.traverse(o=>{if(o.isMesh&&Array.isArray(o.material))o.material=[paintMat(c.paint),o.material[1]]});setBraking(g,false);return g}
function release(g){g.visible=false;(pool[g.userData.id]||(pool[g.userData.id]=[])).push(g)}
// scenery from the Kenney Nature Kit, recoloured toward natural tones, drawn as InstancedMeshes
const NAT=[{id:'tree_palmDetailedTall',h:[9,12],n:44,near:2.5,far:22},{id:'tree_palmDetailedShort',h:[6,8],n:30,near:2.5,far:24},{id:'tree_palmBend',h:[7,10],n:24,near:3,far:24},
 {id:'stone_largeA',h:[1.2,2.6],n:22,near:1.8,far:26},{id:'stone_largeC',h:[.9,2],n:22,near:1.6,far:26},{id:'plant_bushDetailed',h:[.9,1.6],n:44,near:1.4,far:20},{id:'grass_leafsLarge',h:[.6,1.1],n:90,near:.9,far:14}];
const RECOL={woodBark:[0x6e5238,.95],leafsGreen:[0x3c7a2c,.8],stone:[0x8b8781,.95],grass:[0x4e8a33,.9],dirt:[0x7a6248,1],_defaultMat:[0x8b8781,.95]};
const SPAN=440;
function buildNature(gltf){for(const d of NAT){const src=gltf.scenes.find(x=>x.name===d.id);if(!src)continue;src.updateMatrixWorld(true);const box=new T.Box3().setFromObject(src),hgt=box.max.y-box.min.y||1;
 const parts=[];src.traverse(o=>{if(!o.isMesh)return;const rc=RECOL[o.material.name]||[0x777777,.9];const m=new T.MeshStandardMaterial({color:rc[0],roughness:rc[1],side:/leaf|grass/i.test(o.material.name)?T.DoubleSide:T.FrontSide,flatShading:false});parts.push({geo:o.geometry,mat:m,local:o.matrixWorld.clone()})});
 const slots=[];for(let i=0;i<d.n;i++)slots.push(randSlot(d,Math.random()*SPAN-BEHIND,hgt));
 const meshes=parts.map(p=>{const im=new T.InstancedMesh(p.geo,p.mat,d.n);im.castShadow=!/grass/.test(d.id);im.receiveShadow=false;im.frustumCulled=false;scene.add(im);return im});
 const n={d,slots,meshes,parts,hgt};nat.push(n);for(let i=0;i<d.n;i++)writeSlot(n,i)}}
function randSlot(d,z,hgt){const side=Math.random()<.5?-1:1,x=side*(RAIL+d.near+Math.random()*(d.far-d.near)),hh=d.h[0]+Math.random()*(d.h[1]-d.h[0]);return{x,z,r:Math.random()*Math.PI*2,s:hh/hgt}}
const _m=new T.Matrix4(),_q=new T.Quaternion(),_v=new T.Vector3(),_s=new T.Vector3(),_e=new T.Euler(),_mm=new T.Matrix4();
function writeSlot(n,i){const s=n.slots[i];_e.set(0,s.r,0);_q.setFromEuler(_e);_m.compose(_v.set(s.x,0,-s.z),_q,_s.set(s.s,s.s,s.s));
 n.meshes.forEach((im,k)=>{_mm.multiplyMatrices(_m,n.parts[k].local);im.setMatrixAt(i,_mm);im.instanceMatrix.needsUpdate=true})}
// ---------- per-frame sync ----------
const live=new Map();let fovK=0;
function render(dt){if(!renderer||!scene)return;const p=player;
 const snap=(per)=>Math.floor((camZ)/per)*per;
 road.position.z=-(snap(SNAP.road)+LEN/2-BEHIND);grass.position.z=-(snap(SNAP.grass)+LEN/2-BEHIND);grass.position.x=Math.round(camX/SNAP.grass)*SNAP.grass;
 shoulders.position.z=-(snap(SNAP.grass)+LEN/2-BEHIND);rails.position.z=-(camZ+LEN/2-BEHIND);posts.position.z=-(snap(SNAP.posts)+LEN/2-BEHIND);
 for(const o of[overpass,gantry]){if(o.userData.z<camZ-20)o.userData.z+=(o===overpass?1100:700)+Math.random()*500;o.position.z=-o.userData.z}
 hills.position.z=-camZ;
 for(const n of nat){let ch=false;for(let i=0;i<n.slots.length;i++){if(n.slots[i].z<camZ-8){n.slots[i]=randSlot(n.d,n.slots[i].z+SPAN,n.hgt);writeSlot(n,i)}}}
 // vehicles
 const seen=new Set();
 for(const c of traffic){let g=live.get(c);if(!g){g=acquire(c);live.set(c,g)}seen.add(c);place(g,c,dt);setBraking(g,c.braking)}
 for(const [c,g] of live)if(!seen.has(c)){release(g);live.delete(c)}
 if(playerMesh){place(playerMesh,p,dt);setBraking(playerMesh,!!p.brake&&state==='play');playerMesh.rotation.y=-p.lat*.03;playerMesh.rotation.z=state==='crash'||state==='over'?Math.min(.5,crashT*.8)*(p.x>0?-1:1):0}
 // sparks
 sparkMesh.count=Math.min(40,sparks.length);sparks.slice(0,40).forEach((s,i)=>{_m.makeTranslation(s.x,s.y,-s.z);sparkMesh.setMatrixAt(i,_m)});sparkMesh.instanceMatrix.needsUpdate=true;
 // camera: high chase cam, FOV opens with speed, subtle shake at high speed / on crash
 const sp=Math.min(1,p.v/MAXV);fovK+=(sp-fovK)*Math.min(1,dt*2);camera.fov=50+12*fovK*fovK;camera.updateProjectionMatrix();
 const sh=(shake>0?shake*.5:0)+(sp>.75&&state==='play'?(sp-.75)*.06:0);
 camera.position.set(camX+(Math.random()-.5)*sh,7.2+(Math.random()-.5)*sh,-(p.z-10.5));camera.lookAt(camX*.85+p.x*.15,.4,-(p.z+16));
 sun.position.set(p.x-18,42,-(p.z+6)+22);sun.target.position.set(p.x,0,-(p.z+12));
 renderer.render(scene,camera)}
function place(g,c,dt){g.position.set(c.x,0,-(c.z+c.l/2));const tp=templates[g.userData.id],rot=(c.v*dt)/(tp?tp.r:.35);for(const w of g.userData.wheels)w.rotation.x-=rot;
 if(c.tx!=null){g.rotation.y=-(Math.sign(c.tx-c.x))*.06}else if(c!==player)g.rotation.y=0}
// ---------- loading ----------
function loadGLB(url){return new Promise((res,rej)=>loader.load(url,res,undefined,rej))}
async function loadAll(){if(!glOk||!renderer){$('#mBest').textContent='3D graphics are not available on this device or browser.';$('#play').disabled=true;return}
 renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.outputColorSpace=T.SRGBColorSpace;
 buildWorld();onResize();$('#play').disabled=true;$('#play').textContent='Loading…';
 try{const[cars,natg]=await Promise.all([loadGLB('models/cars.glb'),loadGLB('models/nature.glb')]);
  for(const v of VEH)makeTemplate(cars,v.id,v.s);makeTemplate(cars,PLAYER_ID,PLAYER_S);buildNature(natg);applyQuality();
  const pt=templates[PLAYER_ID];PLAYER_DIM.w=pt.W;PLAYER_DIM.l=pt.L;PLAYER_DIM.h=pt.H;playerMesh=instCar(PLAYER_ID,new T.Color(COLORS[prefs.color][0]).getHex());
  loaded=true;resetWorld(true);$('#play').disabled=false;$('#play').textContent='Play'}
 catch(e){console.warn('model load failed',e);$('#play').textContent='Retry';$('#play').disabled=false;$('#mBest').textContent='Could not load the 3D models. Check your connection and tap Retry.';$('#play').onclick=()=>location.reload()}}
// ---------- quality auto-scaler ----------
let qAcc=0,qN=0,qWait=2.5;
function autoQuality(dt){if(!prefs.autoQ||state!=='play'){qAcc=qN=0;return}if(qWait>0){qWait-=dt;return}qAcc+=dt;qN++;
 if(qAcc>=2&&qN>=20){const avg=qAcc/qN;qAcc=qN=0;const i=QORDER.indexOf(qName);if(avg>1/45&&i<QORDER.length-1){qName=QORDER[i+1];applyQuality();qWait=2.5;toast(`Graphics lowered to ${qName[0].toUpperCase()+qName.slice(1)} for smoother play`)}}}
// ---------- loop ----------
let lastFrameMs=0;
function frame(t){raf=requestAnimationFrame(frame);const raw=lastT?Math.min(.25,(t-lastT)/1000):.016,dt=Math.min(.05,raw);lastT=t;const t0=performance.now();
 if(loaded&&state!=='paused')update(dt);if(loaded)render(state==='paused'?0:dt);ft.push(performance.now()-t0);if(ft.length>120)ft.shift();if(loaded)autoQuality(raw)}
window.__racer={get state(){return state},get speed(){return player?player.v*MPH:0},get score(){return score()},get x(){return player.x},get frameMs(){return ft.reduce((a,b)=>a+b,0)/Math.max(1,ft.length)},get quality(){return qName},get loaded(){return loaded},
 get info(){return renderer?{calls:renderer.info.render.calls,tris:renderer.info.render.triangles,pr:renderer.getPixelRatio(),shadows:sun.castShadow}:null},crashNow(){if(state==='play')crash()},
 spawnAhead(dz,dx=0,type='sedan'){const lane=laneOf(player.x+dx),t=templates[type];traffic.push({type,lane,x:player.x+dx,z:player.z+dz,v:5,v0:5,l:t.L,w:t.W,h:t.H,truck:false,paint:0x30343a,tx:null,blink:0,passed:false,braking:false})}};
addEventListener('resize',()=>{onResize();if(state==='play')pause()});
paintMenu();paintFs();showCtl(false);if(prefs.steer==='tilt'&&!(window.DeviceOrientationEvent&&typeof DeviceOrientationEvent.requestPermission==='function'))enableTilt();
loadAll();raf=requestAnimationFrame(frame);
