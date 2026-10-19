// S001 Chess: play Stockfish (lite, single-threaded WASM in a Web Worker) at seven levels. Rules live in rules.js.
(()=>{'use strict';const R=ChessRules,{tone,buzz,best,setBest,$}=G;
// Levels. Stockfish's UCI_Elo only goes down to 1320, so the lower levels use Skill Level + shallow depth,
// and the two easiest also play a share of random legal moves.
const LEVELS=[
 {name:'Beginner',elo:400,skill:0,depth:1,rand:.45},
 {name:'Novice',elo:800,skill:0,depth:2,rand:.15},
 {name:'Club',elo:1200,skill:3,depth:5,time:300},
 {name:'Intermediate',elo:1600,uciElo:1600,time:400},
 {name:'Expert',elo:2000,uciElo:2000,time:600},
 {name:'Master',elo:2200,uciElo:2200,time:800},
 {name:'Grandmaster',elo:2500,uciElo:2500,time:1000}];
const GLYPH={k:'\u265A',q:'\u265B',r:'\u265C',b:'\u265D',n:'\u265E',p:'\u265F'},VS='\uFE0E';
const KEY='dash-games-chess-game',PREF='dash-games-chess-prefs';
const lvName=e=>{const l=LEVELS.find(x=>x.elo===e);return l?l.name:'Elo'};
let game=null,states=[],sel=-1,targets=[],st={over:false},thinking=false,tok=0,pendQ=[],queued=false,eng=null,engTimer=0;
let prefs={level:2,side:'w'};try{Object.assign(prefs,JSON.parse(localStorage.getItem(PREF)||'{}'))}catch(e){}
const board=$('#board'),status=$('#status');
// ---------- engine ----------
function startEngine(){try{eng=new Worker('engine/stockfish-19-lite-single.js');
 eng.onmessage=e=>{const l=String(e.data);if(!l.startsWith('bestmove'))return;const t=pendQ.shift();
  if(t===tok){clearTimeout(engTimer);gotMove(l.split(' ')[1])}else if(!pendQ.length&&queued){queued=false;askEngine()}};
 eng.onerror=()=>{eng=null;if(thinking){tok++;gotMove(fallback(cur()))}};eng.postMessage('uci');eng.postMessage('isready')}catch(e){eng=null}}
const send=c=>eng&&eng.postMessage(c);
function askEngine(){const L=LEVELS[game.level],s=cur(),my=++tok;thinking=true;render();
 const t0=Date.now(),reply=u=>{if(my!==tok)return;const wait=Math.max(0,350-(Date.now()-t0));setTimeout(()=>{if(my===tok)gotMove(u)},wait)};
 if(L.rand&&Math.random()<L.rand){const ms=R.legal(s);return reply(R.uci(ms[Math.floor(Math.random()*ms.length)]))}
 if(!eng)return reply(fallback(s));
 if(pendQ.length){queued=true;return} // a cancelled search is still finishing; ask again when it reports
 if(L.uciElo){send('setoption name Skill Level value 20');send('setoption name UCI_LimitStrength value true');send('setoption name UCI_Elo value '+L.uciElo)}
 else{send('setoption name UCI_LimitStrength value false');send('setoption name Skill Level value '+L.skill)}
 send('position fen '+game.start+(game.moves.length?' moves '+game.moves.join(' '):''));
 pendQ.push(my);send(L.uciElo?`go movetime ${L.time}`:`go depth ${L.depth}${L.time?' movetime '+L.time:''}`);
 // safety net: if the engine never answers, play a simple move so the game can't hang
 clearTimeout(engTimer);engTimer=setTimeout(()=>{if(my===tok&&thinking){send('stop');tok++;gotMove(fallback(cur()))}},8000)}
// tiny fallback player: take the most valuable capture, otherwise a random move
function fallback(s){const V={p:1,n:3,b:3,r:5,q:9,k:0},ms=R.legal(s);let bestM=ms[Math.floor(Math.random()*ms.length)],bv=0;
 for(const m of ms){const c=s.b[m.to];if(c&&V[c.toLowerCase()]>bv){bv=V[c.toLowerCase()];bestM=m}}return R.uci(bestM)}
function gotMove(u){thinking=false;const m=u&&u!=='(none)'?R.fromUci(cur(),u):null;if(!m){render();return}play(m)}
function cancelThink(){if(thinking){tok++;queued=false;if(pendQ.length)send('stop');thinking=false;clearTimeout(engTimer)}}
// ---------- game state ----------
const cur=()=>states[states.length-1];
function rebuild(){states=[R.parseFEN(game.start)];for(const u of game.moves){const m=R.fromUci(cur(),u);if(!m)throw Error('bad move '+u);states.push(R.make(cur(),m))}st=R.status(states)}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(game))}catch(e){}};
function newGame(level,side){cancelThink();const color=side==='r'?(Math.random()<.5?'w':'b'):side;
 game={v:1,level,color,start:R.START,moves:[],last:null,done:false};send('ucinewgame');rebuild();sel=-1;targets=[];save();render();if(cur().turn!==game.color)askEngine()}
function play(m){const s=cur(),cap=!!s.b[m.to]||m.ep,sanTxt=R.san(s,m);game.moves.push(R.uci(m));states.push(R.make(s,m));game.last=sanTxt;st=R.status(states);sel=-1;targets=[];
 st.check?tone(880,.12,'square',.05):cap?tone(330,.08,'triangle',.08):tone(560,.05,'sine',.07);buzz(cap?20:10);
 if(st.over)finish();save();render();if(!st.over&&cur().turn!==game.color)askEngine()}
function finish(){if(game.done)return;game.done=true;
 if(st.result===game.color){const L=LEVELS[game.level],nb=setBest(L.elo);game.newBest=nb;tone(523,.15,'triangle',.07);tone(659,.15,'triangle',.07,0,.12);tone(784,.3,'triangle',.07,0,.24);buzz([30,40,30])}
 else{game.newBest=false;tone(300,.3,'sawtooth',.06,120)}}
function undo(){if(!game||!game.moves.length)return;cancelThink();
 do{game.moves.pop()}while(game.moves.length&&replayTurn()!==game.color);
 game.done=false;game.newBest=false;game.last=null;rebuild();sel=-1;targets=[];save();tone(440,.06);render();if(!st.over&&cur().turn!==game.color)askEngine()}
function replayTurn(){const startTurn=R.parseFEN(game.start).turn;return game.moves.length%2?R.other(startTurn):startTurn}
const myMoves=()=>{if(!game)return 0;const startTurn=R.parseFEN(game.start).turn;let n=0;game.moves.forEach((_,i)=>{const t=i%2?R.other(startTurn):startTurn;if(t===game.color)n++});return n};
// ---------- input ----------
board.addEventListener('click',e=>{const el=e.target.closest('.sq');if(!el||!game||st.over||thinking||cur().turn!==game.color)return;const sq=+el.dataset.sq,s=cur(),p=s.b[sq];
 if(sel>=0&&targets.some(m=>m.to===sq)){const ms=targets.filter(m=>m.to===sq);if(ms.length>1&&ms[0].promo)return askPromo(ms);return play(ms[0])}
 if(p&&R.colorOf(p)===game.color&&sq!==sel){sel=sq;targets=R.legal(s).filter(m=>m.from===sq);tone(700,.03,'sine',.04)}else{sel=-1;targets=[]}render()});
function askPromo(ms){const o=$('#promo'),c=game.color;$('#promoBtns').innerHTML='qrbn'.split('').map(t=>`<button class="gbtn" data-p="${t}" aria-label="${{q:'Queen',r:'Rook',b:'Bishop',n:'Knight'}[t]}"><span class="pc ${c}">${GLYPH[t]+VS}</span></button>`).join('');
 o.hidden=false;o.querySelectorAll('button').forEach(b=>b.onclick=()=>{o.hidden=true;play(ms.find(m=>m.promo===b.dataset.p))});o.onclick=e=>{if(e.target===o){o.hidden=true;sel=-1;targets=[];render()}}}
// ---------- drawing ----------
function render(){const s=game?cur():R.parseFEN(R.START),flip=game&&game.color==='b',last=game&&game.moves.length?game.moves[game.moves.length-1]:null;
 const lf=last?R.sqIdx(last.slice(0,2)):-1,lt=last?R.sqIdx(last.slice(2,4)):-1,ck=game&&st.check?s.b.indexOf(s.turn==='w'?'K':'k'):-1;let h='';
 for(let row=0;row<8;row++)for(let col=0;col<8;col++){const r=flip?row:7-row,f=flip?7-col:col,sq=r*8+f,p=s.b[sq],light=(r+f)%2===1;
  const tg=targets.find(m=>m.to===sq),cls=['sq',light?'l':'d',sq===lf||sq===lt?'last':'',sq===sel?'sel':'',sq===ck?'chk':''].join(' ');
  h+=`<div class="${cls}" data-sq="${sq}" role="gridcell" aria-label="${R.sqName(sq)}${p?' '+(R.colorOf(p)==='w'?'white ':'black ')+{k:'king',q:'queen',r:'rook',b:'bishop',n:'knight',p:'pawn'}[p.toLowerCase()]:''}">`+
   (p?`<span class="pc ${R.colorOf(p)}">${GLYPH[p.toLowerCase()]+VS}</span>`:'')+(tg?(p||tg.ep?'<i class="ring"></i>':'<i class="dot"></i>'):'')+
   (row===7?`<span class="co f">${'abcdefgh'[f]}</span>`:'')+(col===0?`<span class="co r">${r+1}</span>`:'')+'</div>'}
 board.innerHTML=h;
 const b=best();$('#best').textContent=b?`beat ${lvName(b)} (${b})`:'–';$('#lvl').textContent=game?`${LEVELS[game.level].name} ${LEVELS[game.level].elo}`:'–';
 $('#undo').disabled=!game||!myMoves();status.textContent=statusText()}
function statusText(){if(!game)return'Pick a level to start.';const lm=game.last?`${game.last} · `:'';
 if(st.over){const L=LEVELS[game.level];if(st.result==='d')return`Draw by ${st.reason}.`;
  return st.result===game.color?`Checkmate — you beat ${L.name} (${L.elo})!${game.newBest?' New best!':''}`:`Checkmate — ${L.name} wins. Try Undo or a New game.`}
 if(thinking)return lm+'Computer is thinking…';if(cur().turn===game.color)return lm+(st.check?'Check! Your move.':'Your move.');return lm+'…'}
// ---------- setup panel ----------
const setup=$('#setup'),lvSel=$('#level');lvSel.innerHTML=LEVELS.map((l,i)=>`<option value="${i}">${l.name} · ${l.elo}${i===LEVELS.length-1?'+':''}</option>`).join('');
const paintSide=()=>$('#side').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.s===prefs.side)));
$('#side').onclick=e=>{const b=e.target.closest('button');if(b){prefs.side=b.dataset.s;paintSide()}};
function openSetup(){lvSel.value=String(prefs.level);paintSide();$('#cancel').hidden=!game;setup.hidden=false}
$('#start').onclick=()=>{prefs.level=+lvSel.value;try{localStorage.setItem(PREF,JSON.stringify(prefs))}catch(e){}setup.hidden=true;newGame(prefs.level,prefs.side)};
$('#cancel').onclick=()=>{setup.hidden=true};
$('#newBtn').onclick=openSetup;$('#undo').onclick=undo;
window.dashBusy=()=>thinking;
// ---------- boot ----------
startEngine();
try{const g=JSON.parse(localStorage.getItem(KEY)||'null');if(g&&g.v===1&&LEVELS[g.level]&&Array.isArray(g.moves)&&(g.color==='w'||g.color==='b')){game=g;rebuild()}}catch(e){game=null;st={over:false}}
render();if(!game)openSetup();else if(!st.over&&cur().turn!==game.color)askEngine();
})();
