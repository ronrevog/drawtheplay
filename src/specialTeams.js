import {createRng} from './engine/rng.ts';
import {footballTraits,steer,distance,DT,clamp,separateBodies} from './footballPhysics.js';
import {orderedRoster} from './playbook.js';
import {toOffenseYards,fromOffenseYards,otherSide} from './engine/field.ts';
import {newSeries} from './engine/rules/downs.ts';
import {addPoints,toKickoff,scoreTouchdown,fieldGoalProbability} from './engine/rules/scoring.ts';
export const SPECIAL_PLAYS=[{id:'kickoff',name:'Dynamic kickoff',description:'Landing-zone kick · coverage and return'},{id:'punt',name:'Punt',description:'Long snap · protection · gunners and return'},{id:'fg',name:'Field goal',description:'Snap · hold · placekick'},{id:'pat',name:'Extra point',description:'15-yard snap · 33-yard attempt'}];
export function specialLineup(type,offense,defense,spot,depth={}){
 const used=new Set();const rosters={offense:orderedRoster(offense,depth),defense:orderedRoster(defense)};
 function make(slot,side,positions,x,y){const list=rosters[side];const p=list.find(p=>positions.includes(p.position)&&!used.has(`${side}/${p.id}`))||list.find(p=>!used.has(`${side}/${p.id}`));if(p)used.add(`${side}/${p.id}`);return {slot,side,id:p?.id||`${side}-${slot}`,name:p?.name||slot,number:p?.number||slot,traits:footballTraits(p,p?.position||'LB'),rating:p?.overall||65,x,y,vx:0,vy:0,status:'Set'};}
 const a=[],b=[];const unit=['WR','RB','TE','LB','DB'];
 if(type==='kickoff'){
 a.push(make('K','offense',['K'],24, -3));for(let i=0;i<10;i++)a.push(make(`C${i+1}`,'offense',unit,3+i*5.25,60-spot));
 for(let i=0;i<9;i++)b.push(make(`R${i+1}`,'defense',unit,4+i*5.65,(i<7?65:68)-spot));
 b.push(make('KR','defense',['WR','RB','DB'],26.65,93-spot),make('KR2','defense',['WR','RB','DB'],42,94-spot));
 }else{
 const punt=type==='punt';a.push(make('LS','offense',['LS'],26.65,-.75));
 for(let i=0;i<(punt?4:6);i++){const offsets=punt?[-3.6,-1.8,1.8,3.6]:[-5.4,-3.6,-1.8,1.8,3.6,5.4];a.push(make(`B${i+1}`,'offense',['OL','TE'],26.65+offsets[i],-.75))}
 a.push(make('WL','offense',['TE','LB'],19.5,-2.5),make('WR','offense',['TE','LB'],33.8,-2.5));
 if(punt){a.push(make('GL','offense',['WR','DB'],5,-.75),make('GR','offense',['WR','DB'],48,-.75),make('PP','offense',['RB','LB'],28,-5),make('P','offense',['P'],26.65,-Math.min(14,spot+8)))}
 else a.push(make('H','offense',['P','QB'],26.65,-8),make('K','offense',['K'],23.5,-11));
 const count=punt?8:11;for(let i=0;i<count;i++)b.push(make(`D${i+1}`,'defense',['DL','LB','DB'],punt?18+i*2.5:16+i*2.1,i<7?1.1:4));
 if(punt)b.push(make('JL','defense',['DB'],5,1.5),make('JR','defense',['DB'],48,1.5),make('KR','defense',['WR','RB','DB'],26.65,Math.min(43,98-spot)));
 }
 return [...a,...b];
}
export function resolveSpecialTeams({state,type,offense,defense,seed,depth={}}){
 const rng=createRng(seed),kickoff=type==='kickoff',punt=type==='punt',place=!kickoff&&!punt;
 const spot=type==='pat'?85:toOffenseYards(state.yardLine,state.possession),people=specialLineup(type,offense,defense,spot,depth),off=people.filter(p=>p.side==='offense'),def=people.filter(p=>p.side==='defense');
 const by=Object.fromEntries(people.map(p=>[p.slot,p])),kicker=by[punt?'P':'K'],returner=by.KR,origin=Object.fromEntries(people.map(p=>[p.slot,{x:p.x,y:p.y}]));
 const kickAt=kickoff?1.05:punt?2.05:1.25,launchY=kickoff?0:punt?origin.P.y:-8;
 const kickDistance=110-spot-launchY,ratings={kickPower:kicker.rating,kickAccuracy:kicker.rating};
 const make=place&&rng.chance(fieldGoalProbability(kickDistance,ratings));const maxDistance=clamp(62+(kicker.rating-75)*.3+rng.range(-3,3),48,74);const short=place&&!make&&kickDistance>maxDistance;
 const landing=place?{x:26.65+(make?rng.range(-2.6,2.6):rng.range(3.6,8)*(rng.chance(.5)?1:-1)),y:110-spot}:kickoff?{x:rng.range(12,41),y:clamp(rng.normal(94+(kicker.rating-75)*.14,5),80,109)-spot}:{x:rng.range(8,45),y:clamp(rng.normal(45+(kicker.rating-75)*.2,6),25,66)};
 if(short){landing.x=26.65+rng.range(-2,2);landing.y=launchY+maxDistance;}
 const hang=place?clamp(kickDistance/25,1.3,3.8):punt?clamp(4.4+(kicker.rating-75)*.012,3.8,5.2):3.6;
 const landAt=kickAt+hang,frames=[],events=[],blocks=new Map(),blockCooldown=new Map(),tackles=new Map();let kickLogged=false;let ball={x:26.65,y:kickoff?0:-.75,z:.25},t=0,phase=kickoff?'Kickoff setup':'Long snap',carrier=null,done=false,outcome='',caughtAt=null,good=false,blocked=false;
 const event=(type,details={})=>events.push({t:+t.toFixed(2),type,...details});
 function record(){frames.push({t:+t.toFixed(2),phase,players:people.map(p=>({slot:p.slot,side:p.side,x:+p.x.toFixed(3),y:+p.y.toFixed(3),vx:p.vx,vy:p.vy,status:p.status})),ball:{...ball},read:-1,carrier:carrier?.slot||null,blocks:[...blocks.values()].map(e=>({blocker:e.b.slot,defender:e.d.slot,mode:'Run block'}))})}
 function finish(value,details={}){outcome=value;phase=value;done=true;event(value,details)}
 function engage(blockers,targets){const held=new Set([...blocks.values()].flatMap(e=>[e.b.slot,e.d.slot]));
 for(const b of blockers){if(held.has(b.slot))continue;const d=targets.filter(d=>!held.has(d.slot)).sort((a,c)=>distance(a,b)-distance(c,b))[0];if(!d)continue;b.status='Blocking';steer(b,{x:d.x,y:d.y+(kickoff||carrier?1:-1)},b.traits.topSpeed*.65);
 if(distance(b,d)<1.4&&(blockCooldown.get(`${b.slot}/${d.slot}`)||0)<t){const len=Math.max(.01,distance(b,d));blocks.set(b.slot,{b,d,nx:(d.x-b.x)/len,ny:(d.y-b.y)/len,until:t+clamp(.6+(b.rating-d.rating)*.018+rng.range(0,.7),.25,2)});held.add(d.slot);held.add(b.slot);event('Block engaged',{by:b.slot,on:d.slot})}}
 const pairs=new Set();for(const [key,e] of blocks){if(t>e.until){blocks.delete(key);blockCooldown.set(`${e.b.slot}/${e.d.slot}`,t+1);event('Block shed',{by:e.d.slot});continue}const {b,d}=e,cx=(b.x+d.x)/2,cy=(b.y+d.y)/2;b.x=cx-e.nx*.52;b.y=cy-e.ny*.52;d.x=cx+e.nx*.52;d.y=cy+e.ny*.52;b.vx=b.vy=d.vx=d.vy=0;b.status='Engaged';d.status='Engaged';pairs.add(`${b.slot}/${d.slot}`)}return pairs;
 }
 event(kickoff?'Kickoff setup':'Snap');record();
 for(let tick=1;tick<=500&&!done;tick++){
 t=tick*DT;const kicked=t>=kickAt,landed=t>=(blocked?kickAt+.8:landAt);const held=new Set([...blocks.values()].flatMap(e=>[e.b.slot,e.d.slot]));
 if(!kicked){phase=kickoff?'Approach':t<.5?'Long snap':'Set and kick';if(kickoff){steer(kicker,{x:26.65,y:0},4);kicker.status='Approach'}else{const receiver=by[punt?'P':'H'];const fraction=clamp(t/.5,0,1);ball={x:26.65,y:-.75+(receiver.y+.75)*fraction,z:.5};receiver.status=punt?'Receive snap':'Hold';if(!punt)steer(kicker,{x:26.65,y:-8},4)}
 }
 if(t>=kickAt&&!kickLogged){kickLogged=true;event(punt?'Punt':place?'Placekick':'Kickoff',{by:kicker.slot});kicker.status='Kick';if(!kickoff){const rusher=def.find(d=>distance(d,{x:26.65,y:launchY})<1.6);if(rusher){blocked=true;event('Kick blocked',{by:rusher.slot});landing.x=rusher.x;landing.y=rusher.y+2}}}
 if(kicked&&!carrier){const f=clamp((t-kickAt)/(blocked?.8:hang),0,1);phase='Kick in flight';ball={x:26.65+(landing.x-26.65)*f,y:launchY+(landing.y-launchY)*f,z:.4+Math.sin(Math.PI*f)*(place?Math.min(12,kickDistance*.23):punt?14:10)};if(place&&f>=1)ball.z=blocked||short?0:make?4.5:4;}
 if(!kickoff&&!landed){
 for(const d of def){if(held.has(d.slot)||d.slot==='KR')continue;if(punt&&['JL','JR'].includes(d.slot)){d.status='Jam gunner';steer(d,by[d.slot==='JL'?'GL':'GR'],d.traits.topSpeed)}else if(punt&&['D7','D8'].includes(d.slot)){d.status='Return setup';steer(d,{x:landing.x+(d.slot==='D7'?-4:4),y:landing.y-6},d.traits.topSpeed)}else{d.status='Rush';steer(d,{x:26.65,y:launchY},d.traits.topSpeed)}}
 if(punt){for(const g of [by.GL,by.GR]){if(held.has(g.slot))continue;g.status='Gunner';steer(g,{x:g.slot==='GL'?landing.x-2:landing.x+2,y:landing.y},g.traits.topSpeed,DT,false)}}
 }
 // Dynamic kickoff lines remain set until the ball is touched or lands.
 if(returner&&!carrier){returner.status='Track kick';steer(returner,landing,returner.traits.topSpeed);if(by.KR2)steer(by.KR2,{x:landing.x+5,y:landing.y-2},by.KR2.traits.topSpeed*.8)}
 if(kickoff&&kicked&&!landed)steer(kicker,{x:26.65,y:Math.min(50-spot,15)},4);
 if(kicked&&landed&&!caughtAt&&!done){
 if(place){good=!blocked&&spot+ball.y>=110-.01&&Math.abs(ball.x-26.65)<18.5/6&&ball.z>10/3;finish(blocked?'Blocked kick':good?'GOOD':short?'Short':ball.x<26.65?'Wide left':'Wide right')}
 else if(blocked){finish('Blocked punt')}
 else if(spot+landing.y>=100){finish('Touchback')}
 else if(distance(returner,landing)>2){finish('Downed')}
 else {const nearest=Math.min(...off.filter(p=>p!==kicker).map(p=>distance(p,returner)));caughtAt=t;carrier=returner;event('Catch',{by:returner.slot});ball={x:carrier.x,y:carrier.y,z:.4};if(punt&&(nearest<4||spot+landing.y>92)){finish('Fair catch')}else event('Return',{by:returner.slot})}
 }
 if(carrier&&!done){phase='Return';carrier.status='Return';const threats=off.filter(p=>!held.has(p.slot));let best=null,score=-Infinity;
 for(const dx of [-3,0,3]){const goal={x:clamp(carrier.x+dx,1,52),y:carrier.y-5};const danger=threats.reduce((v,d)=>v+Math.max(0,4-distance(d,goal)),0);if(-danger-Math.abs(dx)*.2>score){score=-danger-Math.abs(dx)*.2;best=goal}}steer(carrier,best,carrier.traits.topSpeed*.92,DT,false);
 for(const p of threats){p.status='Coverage';const lead=clamp(distance(p,carrier)/p.traits.topSpeed*.8,.15,1.4);steer(p,{x:carrier.x+carrier.vx*lead,y:carrier.y+carrier.vy*lead},p.traits.topSpeed,DT,false)}
 if(spot+carrier.y<=0){carrier.y=-spot;finish('Return touchdown')}
 else if(carrier.x<=.25||carrier.x>=53.05)finish('Out of bounds');
 else for(const p of threats){if(distance(p,carrier)<1.55&&(tackles.get(p.slot)||0)<t){tackles.set(p.slot,t+1);if(rng.chance(clamp(.78+(p.rating-carrier.rating)*.005,.4,.95))){finish('Tackle',{by:p.slot});break}else event('Broken tackle',{against:p.slot})}}
 }
 const pairs=kickoff&&!landed?new Set():carrier?engage(def.filter(p=>p!==carrier),off.filter(p=>p!==kicker)):!kickoff?engage(off.filter(p=>!['K','P','H','GL','GR'].includes(p.slot)),def.filter(p=>p.slot!=='KR')):new Set();
 if(!kickoff||landed)separateBodies(people,pairs);
 for(const p of people){p.x=clamp(p.x,.1,53.2);p.y=clamp(p.y,-spot-9,109-spot)}
 if(carrier)ball={x:carrier.x,y:carrier.y,z:done?0:.4};record();
 }
 if(!done){finish('Tackle');record()}
 const receiving=otherSide(state.possession);let next=state;const finalY=carrier?carrier.y:landing.y;
 const receivingSpot=outcome==='Touchback'?(kickoff?(spot===50?20:35):20):clamp(Math.round(100-spot-finalY),1,99);
 const takeover=(side,own)=>({...state,...newSeries(side,fromOffenseYards(own,side)),phase:'Scrimmage',drive:state.drive+1,clockRunning:false});
 if(place){if(type==='pat')next=toKickoff(good?addPoints(state,state.possession,1):state,state.possession);else if(good)next=toKickoff(addPoints(state,state.possession,3),state.possession);else next=takeover(receiving,Math.max(20,100-spot-launchY));}
 else if(outcome==='Return touchdown')next={...scoreTouchdown(state,receiving,t,returner.id).state,drive:state.drive+1};else next=takeover(receiving,receivingSpot);
 const simulation={special:type,kind:'kick',spot,people:people.map(({slot,side,id,name,number,traits})=>({slot,side,id,name,number,traits})),frames,events,duration:t,coverage:'Special teams',outcome,kickDistance:place?kickDistance:landing.y-launchY,returnYards:carrier?Math.max(0,Math.round(landing.y-carrier.y)):0,good};
 return {state:next,simulation,seconds:type==='pat'?0:kickoff?(caughtAt?Math.ceil(t-caughtAt):0):Math.ceil(t),text:place?`${type==='pat'?'Extra point':`${kickDistance}-yard field goal`} · ${outcome}`:`${kickoff?'Kickoff':'Punt'} · ${outcome}${carrier?` · ${simulation.returnYards}-yard return`:''}${next.phase==='Scrimmage'?` · ball at own ${receivingSpot}`:''}`};
}
