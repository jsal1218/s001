// Chess rules for S001 Chess: legal moves (castling, en passant, promotion), FEN, SAN, check/mate/stalemate and draws.
// Board: array of 64, index = rank*8+file (a1=0, h8=63). Pieces: 'PNBRQK' white, 'pnbrqk' black, null empty.
(function(root){'use strict';
const FILES='abcdefgh',START='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const sqName=s=>FILES[s&7]+((s>>3)+1),sqIdx=n=>FILES.indexOf(n[0])+8*(+n[1]-1);
const colorOf=p=>p?(p===p.toUpperCase()?'w':'b'):null,other=c=>c==='w'?'b':'w';
const KN=[[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]],KG=[[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
const BD=[[1,1],[1,-1],[-1,1],[-1,-1]],RD=[[1,0],[-1,0],[0,1],[0,-1]];
const on=(f,r)=>f>=0&&f<8&&r>=0&&r<8;
function parseFEN(fen){const[pl,turn,cas,ep,half,full]=fen.trim().split(/\s+/),b=new Array(64).fill(null);let r=7,c=0;
 for(const ch of pl){if(ch==='/'){r--;c=0}else if(/\d/.test(ch))c+=+ch;else{b[r*8+c]=ch;c++}}
 return{b,turn:turn==='b'?'b':'w',castle:cas&&cas!=='-'?cas:'',ep:ep&&ep!=='-'?sqIdx(ep):-1,half:+half||0,full:+full||1}}
function placement(b){let o='';for(let r=7;r>=0;r--){let e=0;for(let c=0;c<8;c++){const p=b[r*8+c];if(!p)e++;else{if(e){o+=e;e=0}o+=p}}if(e)o+=e;if(r)o+='/'}return o}
const toFEN=s=>`${placement(s.b)} ${s.turn} ${s.castle||'-'} ${s.ep>=0?sqName(s.ep):'-'} ${s.half} ${s.full}`;
function attacked(b,sq,by){const f=sq&7,r=sq>>3,w=by==='w',P=w?'P':'p',N=w?'N':'n',B=w?'B':'b',R=w?'R':'r',Q=w?'Q':'q',K=w?'K':'k',pr=w?r-1:r+1;
 for(const df of[-1,1])if(on(f+df,pr)&&b[pr*8+f+df]===P)return true;
 for(const[x,y]of KN)if(on(f+x,r+y)&&b[(r+y)*8+f+x]===N)return true;
 for(const[x,y]of KG)if(on(f+x,r+y)&&b[(r+y)*8+f+x]===K)return true;
 for(const[x,y]of BD){let ff=f+x,rr=r+y;while(on(ff,rr)){const p=b[rr*8+ff];if(p){if(p===B||p===Q)return true;break}ff+=x;rr+=y}}
 for(const[x,y]of RD){let ff=f+x,rr=r+y;while(on(ff,rr)){const p=b[rr*8+ff];if(p){if(p===R||p===Q)return true;break}ff+=x;rr+=y}}
 return false}
const kingSq=(b,c)=>b.indexOf(c==='w'?'K':'k');
const inCheck=(s,c=s.turn)=>{const k=kingSq(s.b,c);return k>=0&&attacked(s.b,k,other(c))};
function pseudo(s){const b=s.b,me=s.turn,op=other(me),mv=[];
 const addP=(a,c,last)=>{if((c>>3)===last)for(const pr of'qrbn')mv.push({from:a,to:c,promo:pr});else mv.push({from:a,to:c})};
 for(let sq=0;sq<64;sq++){const p=b[sq];if(!p||colorOf(p)!==me)continue;const t=p.toLowerCase(),f=sq&7,r=sq>>3;
  if(t==='p'){const d=me==='w'?1:-1,start=me==='w'?1:6,last=me==='w'?7:0,r1=r+d;if(!on(f,r1))continue;
   if(!b[r1*8+f]){addP(sq,r1*8+f,last);if(r===start&&!b[(r+2*d)*8+f])mv.push({from:sq,to:(r+2*d)*8+f,dbl:true})}
   for(const df of[-1,1]){if(!on(f+df,r1))continue;const to=r1*8+f+df;if(b[to]&&colorOf(b[to])===op)addP(sq,to,last);else if(to===s.ep)mv.push({from:sq,to,ep:true})}
  }else if(t==='n'||t==='k'){for(const[x,y]of(t==='n'?KN:KG)){if(!on(f+x,r+y))continue;const to=(r+y)*8+f+x;if(!b[to]||colorOf(b[to])===op)mv.push({from:sq,to})}
   if(t==='k'){const home=me==='w'?4:60,R=me==='w'?'R':'r';
    if(sq===home&&!attacked(b,home,op)){
     if(s.castle.includes(me==='w'?'K':'k')&&!b[home+1]&&!b[home+2]&&b[home+3]===R&&!attacked(b,home+1,op)&&!attacked(b,home+2,op))mv.push({from:home,to:home+2,castle:'k'});
     if(s.castle.includes(me==='w'?'Q':'q')&&!b[home-1]&&!b[home-2]&&!b[home-3]&&b[home-4]===R&&!attacked(b,home-1,op)&&!attacked(b,home-2,op))mv.push({from:home,to:home-2,castle:'q'})}}
  }else{const dirs=t==='b'?BD:t==='r'?RD:BD.concat(RD);
   for(const[x,y]of dirs){let ff=f+x,rr=r+y;while(on(ff,rr)){const to=rr*8+ff,q=b[to];if(!q)mv.push({from:sq,to});else{if(colorOf(q)===op)mv.push({from:sq,to});break}ff+=x;rr+=y}}}}
 return mv}
function make(s,m){const b=s.b.slice(),p=b[m.from],me=s.turn,t=p.toLowerCase();let cap=b[m.to];
 b[m.to]=m.promo?(me==='w'?m.promo.toUpperCase():m.promo):p;b[m.from]=null;
 if(m.ep){const cs=m.to+(me==='w'?-8:8);cap=b[cs];b[cs]=null}
 if(m.castle==='k'){b[m.from+1]=b[m.from+3];b[m.from+3]=null}else if(m.castle==='q'){b[m.from-1]=b[m.from-4];b[m.from-4]=null}
 let c=s.castle;if(t==='k')c=c.replace(me==='w'?/[KQ]/g:/[kq]/g,'');
 for(const q of[m.from,m.to]){if(q===0)c=c.replace('Q','');else if(q===7)c=c.replace('K','');else if(q===56)c=c.replace('q','');else if(q===63)c=c.replace('k','')}
 return{b,turn:other(me),castle:c,ep:m.dbl?(m.from+m.to)/2:-1,half:(t==='p'||cap)?0:s.half+1,full:s.full+(me==='b'?1:0)}}
const legal=s=>pseudo(s).filter(m=>!inCheck(make(s,m),s.turn));
function perft(s,d){if(!d)return 1;const ms=legal(s);if(d===1)return ms.length;let n=0;for(const m of ms)n+=perft(make(s,m),d-1);return n}
const uci=m=>sqName(m.from)+sqName(m.to)+(m.promo||'');
const fromUci=(s,u)=>legal(s).find(m=>uci(m)===u.toLowerCase().slice(0,5))||legal(s).find(m=>uci(m)===u.toLowerCase().slice(0,4)+'q');
function san(s,m){const p=s.b[m.from],t=p.toLowerCase();let o;
 if(m.castle)o=m.castle==='k'?'O-O':'O-O-O';
 else{const cap=!!s.b[m.to]||m.ep;
  if(t==='p')o=(cap?FILES[m.from&7]+'x':'')+sqName(m.to)+(m.promo?'='+m.promo.toUpperCase():'');
  else{const amb=legal(s).filter(x=>x.to===m.to&&x.from!==m.from&&s.b[x.from]===p);let dis='';
   if(amb.length){const sf=amb.some(x=>(x.from&7)===(m.from&7)),sr=amb.some(x=>(x.from>>3)===(m.from>>3));dis=!sf?FILES[m.from&7]:!sr?String((m.from>>3)+1):sqName(m.from)}
   o=t.toUpperCase()+dis+(cap?'x':'')+sqName(m.to)}}
 const n=make(s,m);if(inCheck(n))o+=legal(n).length?'+':'#';return o}
// repetition key: placement, side, castling, and en passant only when an en passant capture is actually legal
const posKey=s=>`${placement(s.b)} ${s.turn} ${s.castle||'-'} ${s.ep>=0&&legal(s).some(m=>m.ep)?sqName(s.ep):'-'}`;
function insufficient(b){const ps=[];b.forEach((p,i)=>{if(p&&p.toLowerCase()!=='k')ps.push([p.toLowerCase(),i])});
 if(!ps.length)return true;if(ps.length===1&&(ps[0][0]==='n'||ps[0][0]==='b'))return true;
 if(ps.every(([t])=>t==='b')){const col=i=>((i&7)+(i>>3))&1;return ps.every(([,i])=>col(i)===col(ps[0][1]))}return false}
// status of a game given its list of states (oldest first); returns {over, result:'w'|'b'|'d', reason, check}
function status(states){const s=states[states.length-1],ms=legal(s),chk=inCheck(s);
 if(!ms.length)return chk?{over:true,result:other(s.turn),reason:'checkmate',check:true}:{over:true,result:'d',reason:'stalemate'};
 if(insufficient(s.b))return{over:true,result:'d',reason:'insufficient material',check:chk};
 if(s.half>=100)return{over:true,result:'d',reason:'50-move rule',check:chk};
 const k=posKey(s);let n=0;for(const x of states)if(posKey(x)===k)n++;
 if(n>=3)return{over:true,result:'d',reason:'threefold repetition',check:chk};
 return{over:false,check:chk}}
const api={START,sqName,sqIdx,colorOf,other,parseFEN,toFEN,attacked,inCheck,pseudo,make,legal,perft,uci,fromUci,san,posKey,insufficient,status};
if(typeof module==='object'&&module.exports)module.exports=api;else root.ChessRules=api;
})(typeof self!=='undefined'?self:this);
