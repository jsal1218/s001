// Highway Rush: pseudo-3D highway racer on Canvas 2D. Straight 4-lane one-way road, traffic to weave through,
// gas/brake pedals, tilt or touch steering, close-pass and high-speed bonuses. All art is drawn in code.
(()=>{'use strict';const{best,setBest,$}=G,cv=$('#cv'),x=cv.getContext('2d');
// ---------- settings ----------
const PREF='dash-games-racer-prefs',COLORS=[['#d62828','#8f1414'],['#2d6fd6','#173f85'],['#ffd23f','#b38f12'],['#f2f2ee','#a9aaa4']];
const prefs={steer:'touch',autoGas:false,sound:false,color:0,cal:0,tip:false};try{Object.assign(prefs,JSON.parse(localStorage.getItem(PREF)||'{}'))}catch(e){}
const savePrefs=()=>{try{localStorage.setItem(PREF,JSON.stringify(prefs))}catch(e){}};
// ---------- world constants (meters, m/s) ----------
const LANE=3.6,LANES=4,ROAD=LANE*LANES/2,RAIL=ROAD+1.4,CAR_W=1.9,CAR_L=4.4,MAXV=71.5,MPH=2.23694;
const laneX=i=>-ROAD+LANE*(i+.5);
let W=0,H=0,DPR=1,f=1,hor=0,cx=0,camX=0,camZ=0,camH=12,CAMBACK=12;
function size(){DPR=Math.min(2,devicePixelRatio||1);W=innerWidth;H=innerHeight;cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);x.setTransform(DPR,0,0,DPR,0,0);
 hor=-Math.round(H*.04);cx=W/2;f=Math.min(.68*W*CAMBACK/(2*RAIL+2),(.75*H-hor)*CAMBACK/camH)} // high camera, horizon just above the screen
addEventListener('resize',()=>{size();if(state==='play')pause()});
// ---------- state ----------
let state='menu',raf=0,lastT=0,player,traffic=[],scen=[],dist=0,hsDist=0,closePts=0,closeN=0,combo=0,comboT=0,shake=0,crashT=0,popups=[],spawnZ=0,ft=[],sparks=[];
const input={gas:false,brake:false,left:false,right:false,tilt:0},keys={};
function resetWorld(menu){player={x:laneX(1),z:0,v:menu?27:24,lat:0,brake:false,col:COLORS[prefs.color]||COLORS[0],w:CAR_W,l:CAR_L,h:1.45};
 traffic=[];dist=0;hsDist=0;closePts=0;closeN=0;combo=0;comboT=0;shake=0;crashT=0;popups=[];sparks=[];camX=player.x;camZ=player.z-CAMBACK;
 scen=[];for(let z=0;z<420;z+=9)addScen(z);for(let i=0;i<5;i++)spawn(60+i*45)}
function addScen(z){const side=Math.random()<.5?-1:1,t=Math.random();scen.push({z:z+Math.random()*6,x:side*(RAIL+2+Math.random()*16),k:t<.45?'palm':t<.7?'rock':t<.92?'bush':'sign',s:.8+Math.random()*.5})}
const TCOL=['#e9e6dc','#30343a','#7d8a96','#a32b2b','#2b5ea3','#d98c1e','#3f7d4f','#c9c2a8','#5a3f7a'];
function spawn(ahead){const zs=player.z+ahead,menu=state==='menu';
 for(let tries=0;tries<6;tries++){const lane=Math.floor(Math.random()*LANES);if(menu&&lane===laneOf(player.x))continue;
  const truck=Math.random()<.22,len=truck?11:4.3+Math.random()*.5;
  if(traffic.some(c=>c.lane===lane&&Math.abs(c.z-zs)<len+c.l+14))continue;
  // never wall off the road: at most 2 vehicles side by side
  if(traffic.filter(c=>Math.abs(c.z-zs)<22).length>=2)continue;
  const v=truck?19+Math.random()*5:22+Math.random()*9;
  traffic.push({lane,x:laneX(lane),z:zs,v,v0:v,l:len,w:truck?2.5:1.85,h:truck?3.4:1.4,truck,col:truck?'#eeeeea':TCOL[Math.floor(Math.random()*TCOL.length)],cab:TCOL[Math.floor(Math.random()*TCOL.length)],tx:null,blink:0,passed:false});return}}
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
$('#colors').onclick=e=>{const b=e.target.closest('[data-c]');if(!b)return;prefs.color=+b.dataset.c;savePrefs();player.col=COLORS[prefs.color];paintMenu()};
function paintSet(){document.querySelectorAll('[data-steer]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.steer===prefs.steer)));
 document.querySelectorAll('[data-auto]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.auto===+prefs.autoGas)));
 document.querySelectorAll('[data-snd]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.snd===+prefs.sound)));$('#calBtn').disabled=prefs.steer!=='tilt'}
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
async function play(){audioKick();
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
 for(const c of traffic){if(state==='paused'||state==='over')break;
  const ahead=traffic.find(o=>o!==c&&(o.lane===c.lane||(o.tx!=null&&laneOf(o.tx)===c.lane))&&o.z>c.z&&o.z-c.z<c.l+14);c.v+=((ahead?Math.min(c.v0,ahead.v):c.v0)-c.v)*Math.min(1,dt*2);
  if(c.tx==null&&!c.truck&&Math.random()<dt*.05&&c.z-p.z>25){const nl=c.lane+(Math.random()<.5?-1:1);
   if(nl>=0&&nl<LANES&&!traffic.some(o=>o!==c&&o.lane===nl&&Math.abs(o.z-c.z)<22)){c.tx=laneX(nl);c.blink=1.2;c.lane=nl}}
  if(c.blink>0)c.blink-=dt;else if(c.tx!=null){c.x+=Math.sign(c.tx-c.x)*Math.min(Math.abs(c.tx-c.x),2.2*dt);if(Math.abs(c.tx-c.x)<.01){c.x=c.tx;c.tx=null}}
  c.z+=c.v*dt}
 if(state==='play'||state==='menu'){
  // collisions & close passes
  for(const c of traffic){const dx=Math.abs(c.x-p.x),dzc=(c.z+c.l/2)-(p.z+p.l/2);
   if(state==='play'&&dx<(c.w+p.w)/2-.12&&Math.abs(dzc)<(c.l+p.l)/2-.15){crash();break}
   if(!c.passed&&dzc<0){c.passed=true;const gap=dx-(c.w+p.w)/2;
    if(state==="play"&&gap<1.3&&p.v*MPH>=45){combo=comboT>0?Math.min(5,combo+1):1;comboT=4;const pts=200*combo;closePts+=pts;closeN++;popup(combo>1?`Close! x${combo}  +${pts}`:`Close!  +${pts}`);blip(720+combo*90);G.buzz(15)}}}
  traffic=traffic.filter(c=>c.z>p.z-30&&c.z<p.z+460);
  const want=state==='menu'?6:Math.min(16,6+Math.floor(dist/700));if(traffic.length<want&&Math.random()<dt*4)spawn(230+Math.random()*120)}
 if(comboT>0){comboT-=dt;if(comboT<=0)combo=0}
 for(const s of scen)if(s.z<camZ+1){s.z+=420;s.x=(Math.random()<.5?-1:1)*(RAIL+2+Math.random()*16)}
 for(const s of sparks){s.x+=s.vx*dt;s.y+=s.vy*dt;s.vy-=12*dt;s.l-=dt}sparks=sparks.filter(s=>s.l>0);
 camX+=(p.x*.82-camX)*Math.min(1,dt*6);camZ=p.z-CAMBACK;if(shake>0)shake-=dt}
let comboEl=$('#combo'),comboHide=0;function popup(t){comboEl.textContent=t;comboEl.classList.add('on');clearTimeout(comboHide);comboHide=setTimeout(()=>comboEl.classList.remove('on'),900)}
let hudLast=0;function hud(mph){const n=performance.now();if(n-hudLast<80)return;hudLast=n;$('#hScore').textContent=score().toLocaleString();
 $('#hSpeed').firstChild.nodeValue=Math.round(mph);$('#hDist').firstChild.nodeValue=(dist/1609.34).toFixed(2)}
// ---------- drawing ----------
const P=(X,Y,Z)=>{const s=f/(Z-camZ);return[cx+(X-camX)*s,hor+(camH-Y)*s]};
const yAt=Z=>hor+camH*f/(Z-camZ);
function poly(pts,fill){x.beginPath();x.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)x.lineTo(pts[i][0],pts[i][1]);x.closePath();x.fillStyle=fill;x.fill()}
const NEAR=1.2,FAR=360;
function draw(){const sx=shake>0?(Math.random()-.5)*shake*14:0,sy=shake>0?(Math.random()-.5)*shake*10:0;x.save();x.translate(sx,sy);
 // sky + distant hills
 if(hor>0){const g=x.createLinearGradient(0,0,0,hor);g.addColorStop(0,'#6fb3e0');g.addColorStop(1,'#cfe8f2');x.fillStyle=g;x.fillRect(-20,-20,W+40,hor+21);
 x.fillStyle='#7fa58a';x.beginPath();x.moveTo(-20,hor);for(let i=0;i<=12;i++){const hx=i*(W+40)/12-20-camX*2;x.lineTo(hx,hor-10-14*Math.abs(Math.sin(i*1.7)))}x.lineTo(W+20,hor);x.fill()}
 // grass with speed bands (ground depth z maps to a horizontal line)
 x.fillStyle='#6f9a3e';x.fillRect(-20,hor,W+40,H-hor+20);x.fillStyle='#7aa646';
 const B=10,z0=Math.floor((camZ+NEAR)/B)*B;for(let z=z0;z<camZ+FAR;z+=B){if(Math.floor(z/B)%2)continue;const ya=yAt(Math.max(z,camZ+NEAR)),yb=yAt(z+B);x.fillRect(-20,yb,W+40,ya-yb)}
 // shoulders + road
 const zn=camZ+NEAR,zf=camZ+FAR;
 poly([P(-RAIL-.6,0,zn),P(RAIL+.6,0,zn),P(RAIL+.6,0,zf),P(-RAIL-.6,0,zf)],'#b9a77e');
 poly([P(-ROAD-.3,0,zn),P(ROAD+.3,0,zn),P(ROAD+.3,0,zf),P(-ROAD-.3,0,zf)],'#55585c');
 x.fillStyle='rgba(0,0,0,.06)';for(let z=Math.floor(zn/14)*14;z<camZ+FAR;z+=28){const a=Math.max(z,zn);const q=[P(-ROAD,0,a),P(ROAD,0,a),P(ROAD,0,z+14),P(-ROAD,0,z+14)];poly(q,'rgba(0,0,0,.07)')}
 // edge lines and lane dashes
 for(const s of[-1,1]){poly([P(s*ROAD-.15,0,zn),P(s*ROAD+.0,0,zn),P(s*ROAD+.0,0,zf),P(s*ROAD-.15,0,zf)].map(p=>p),'#f4f1e6')}
 for(let l=1;l<LANES;l++){const lx=-ROAD+l*LANE;for(let z=Math.floor(zn/12)*12;z<camZ+FAR;z+=12){const a=Math.max(z,zn),b=z+4;if(b<=a)continue;poly([P(lx-.08,0,a),P(lx+.08,0,a),P(lx+.08,0,b),P(lx-.08,0,b)],'#f4f1e6')}}
 // guardrails: posts + rail strip
 for(const s of[-1,1]){const rx=s*RAIL;x.fillStyle='#6d7176';for(let z=Math.floor(zn/4)*4+4;z<camZ+FAR;z+=4){const a=P(rx,0,z),b=P(rx,.75,z),w=Math.max(1,.12*f/(z-camZ));x.fillRect(a[0]-w/2,b[1],w,a[1]-b[1])}
  poly([P(rx,.55,zn),P(rx,.85,zn),P(rx,.85,zf),P(rx,.55,zf)],'#c9ccd0');poly([P(rx,.55,zn),P(rx,.62,zn),P(rx,.62,zf),P(rx,.55,zf)],'#8d9196')}
 // scenery far -> near
 const sc=scen.filter(s=>s.z>camZ+NEAR&&s.z<camZ+FAR).sort((a,b)=>b.z-a.z);for(const s of sc)drawScen(s);
 // vehicles far -> near
 const cars=traffic.concat([player]).filter(c=>c.z+c.l>camZ+NEAR+.5&&c.z<camZ+FAR).sort((a,b)=>b.z-a.z);for(const c of cars)drawCar(c,c===player);
 for(const s of sparks){const p=P(s.x,s.y,s.z);x.fillStyle='#ffd84a';x.fillRect(p[0]-2,p[1]-2,4,4)}
 if(state==='crash'||state==='over'){const p=P(player.x,1,player.z+player.l);x.fillStyle=`rgba(255,180,60,${Math.max(0,.6-crashT*.4)})`;x.beginPath();x.arc(p[0],p[1],40+crashT*60,0,7);x.fill()}
 x.restore()}
function drawScen(s){const d=s.z-camZ,k=f/d,[px,py]=P(s.x,0,s.z);if(px<-200||px>W+200)return;const m=k*s.s;
 x.fillStyle='rgba(20,40,10,.25)';x.beginPath();x.ellipse(px+m*.6,py,m*1.6,m*.35,0,0,7);x.fill();
 if(s.k==='palm'){const h=7*m,lean=(s.x>0?1:-1)*m*.6;x.strokeStyle='#7a5a36';x.lineWidth=Math.max(1,.32*m);x.beginPath();x.moveTo(px,py);x.quadraticCurveTo(px+lean*.2,py-h*.5,px+lean,py-h);x.stroke();
  x.fillStyle='#2f7d32';const tx=px+lean,ty=py-h;for(let i=0;i<7;i++){const a=i/7*Math.PI*2,lx=Math.cos(a)*3*m,ly=Math.sin(a)*1.1*m+1.2*m;x.beginPath();x.moveTo(tx,ty);x.quadraticCurveTo(tx+lx*.6,ty-1.4*m+ly*.2,tx+lx,ty+ly);x.quadraticCurveTo(tx+lx*.5,ty+ly*.2-.3*m,tx,ty);x.fill()}
  x.fillStyle='#5b3f22';x.beginPath();x.arc(tx,ty,.35*m,0,7);x.fill()}
 else if(s.k==='rock'){x.fillStyle='#8a8580';x.beginPath();x.ellipse(px,py-.6*m,1.3*m,.8*m,0,Math.PI,0);x.lineTo(px+1.3*m,py);x.lineTo(px-1.3*m,py);x.fill();x.fillStyle='#a7a29c';x.beginPath();x.ellipse(px-.3*m,py-.9*m,.6*m,.3*m,0,0,7);x.fill()}
 else if(s.k==='bush'){x.fillStyle='#3e7a2e';for(const[a,b,r]of[[-.7,.5,.7],[.6,.5,.7],[0,.9,.9]]){x.beginPath();x.arc(px+a*m,py-b*m,r*m,0,7);x.fill()}x.fillStyle='#4f9139';x.beginPath();x.arc(px-.2*m,py-1.1*m,.45*m,0,7);x.fill()}
 else{x.fillStyle='#6d7176';x.fillRect(px-.08*m,py-3*m,.16*m,3*m);x.fillStyle='#1f7a4a';x.fillRect(px-1.2*m,py-4.2*m,2.4*m,1.4*m);x.fillStyle='#fff';x.fillRect(px-.9*m,py-3.7*m,1.8*m,.12*m);x.fillRect(px-.9*m,py-3.4*m,1.2*m,.12*m)}}
function shade(hex,k){const n=parseInt(hex.slice(1),16),r=n>>16,g=n>>8&255,b=n&255,c=v=>Math.max(0,Math.min(255,Math.round(v*k)));return`rgb(${c(r)},${c(g)},${c(b)})`}
function box(x0,x1,y0,y1,z0,z1,col){if(z0-camZ<NEAR)z0=camZ+NEAR;if(z1<=z0)return;
 if(x0>camX)poly([P(x0,y0,z0),P(x0,y0,z1),P(x0,y1,z1),P(x0,y1,z0)],shade(col,.72));
 if(x1<camX)poly([P(x1,y0,z0),P(x1,y0,z1),P(x1,y1,z1),P(x1,y1,z0)],shade(col,.72));
 if(y1<camH)poly([P(x0,y1,z0),P(x1,y1,z0),P(x1,y1,z1),P(x0,y1,z1)],shade(col,1.08));
 poly([P(x0,y0,z0),P(x1,y0,z0),P(x1,y1,z0),P(x0,y1,z0)],shade(col,.88))}
function drawCar(c,me){const hw=c.w/2,x0=c.x-hw,x1=c.x+hw,z0=c.z,z1=c.z+c.l;
 poly([P(x0-.15,0,Math.max(z0-.3,camZ+NEAR)),P(x1+.15,0,Math.max(z0-.3,camZ+NEAR)),P(x1+.15,0,z1+.2),P(x0-.15,0,z1+.2)],'rgba(0,0,0,.28)');
 if(c.truck){const cl=2.6;box(x0+.05,x1-.05,.35,c.h,z0,z1-cl-.3,c.col);box(x0+.1,x1-.1,.35,2.6,z1-cl,z1,c.cab);
  if(z0-camZ>NEAR){const a=P(x0,.35,z0),b=P(x1,c.h,z0);x.fillStyle='rgba(0,0,0,.12)';x.fillRect(a[0]+(b[0]-a[0])*.49,b[1],(b[0]-a[0])*.02,a[1]-b[1]);lights(c,x0,x1,.5,z0,false)}
  wheels(x0,x1,z0+.8);wheels(x0,x1,z1-cl*.5);return}
 const col=me?c.col[0]:c.col;wheels(x0,x1,z0+.7);wheels(x0,x1,z1-.8);
 box(x0,x1,.28,.95,z0,z1,col);
 const cz0=z0+c.l*.32,cz1=z0+c.l*.72;box(x0+.16,x1-.16,.95,1.42,cz0,cz1,col);
 if(cz0-camZ>NEAR){poly([P(x0+.22,.98,cz0-.02),P(x1-.22,.98,cz0-.02),P(x1-.24,1.36,cz0-.02),P(x0+.24,1.36,cz0-.02)],'#1d2a33')} // rear window
 if(z0-camZ>NEAR)lights(c,x0,x1,.62,z0,me&&c.brake);
 if(c.blink>0&&Math.floor(c.blink*4)%2&&z0-camZ>NEAR){const side=c.tx<c.x?x0:x1,p=P(side,.7,z0);x.fillStyle='#ffb21f';x.beginPath();x.arc(p[0],p[1],Math.max(2,.18*f/(z0-camZ)),0,7);x.fill()}}
function lights(c,x0,x1,y,z,on){const k=f/(z-camZ),r=Math.max(1.5,.16*k);for(const lx of[x0+.25,x1-.25]){const p=P(lx,y,z);x.fillStyle=on?'#ff3b30':'#b3261e';x.fillRect(p[0]-r*1.4,p[1]-r*.6,r*2.8,r*1.2);if(on){x.fillStyle='rgba(255,60,40,.35)';x.beginPath();x.arc(p[0],p[1],r*3,0,7);x.fill()}}}
function wheels(x0,x1,z){if(z-camZ<NEAR)return;for(const wx of[x0+.05,x1-.3]){const a=P(wx,0,z),b=P(wx+.25,.55,z);x.fillStyle='#16181a';x.fillRect(a[0],b[1],b[0]-a[0],a[1]-b[1])}}
// ---------- loop ----------
function frame(t){raf=requestAnimationFrame(frame);const dt=lastT?Math.min(.05,(t-lastT)/1000):.016;lastT=t;const t0=performance.now();
 if(state!=='paused')update(dt);draw();ft.push(performance.now()-t0);if(ft.length>120)ft.shift()}
window.__racer={get state(){return state},get speed(){return player.v*MPH},get score(){return score()},get x(){return player.x},get frameMs(){return ft.reduce((a,b)=>a+b,0)/Math.max(1,ft.length)},crashNow(){if(state==='play')crash()},spawnAhead(dz,dx=0){const lane=laneOf(player.x+dx);traffic.push({lane,x:player.x+dx,z:player.z+dz,v:5,v0:5,l:4.4,w:1.85,h:1.4,truck:false,col:'#30343a',cab:'#30343a',tx:null,blink:0,passed:false})}};
size();resetWorld(true);paintMenu();paintFs();showCtl(false);if(prefs.steer==='tilt'&&!(window.DeviceOrientationEvent&&typeof DeviceOrientationEvent.requestPermission==='function'))enableTilt();raf=requestAnimationFrame(frame);
})();
