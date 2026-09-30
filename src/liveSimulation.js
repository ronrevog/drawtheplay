import {normalizeDefense} from './defensivePlan.js';
import {DT,distance as dist,footballTraits,steer,followRoute,separateBodies,segmentDistance} from './footballPhysics.js';
import {FORMATIONS,ELIGIBLE,fieldPlayers,orderedRoster} from './playbook.js';
import {createRng} from './engine/rng.ts';
export const LINE=['LT','LG','C','RG','RT'];
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const worldPoint=([x,y])=>({x:x*53.3/100,y:(60-y)*.75});
export const designPoint=({x,y})=>[clamp(x/53.3*100,0,100),clamp(60-y/.75,0,100)];
export function blockType(play,slot){const path=play.routes[slot];if(!path||path.length<2)return play.type==='run'?'Run block':'Pass block';return path.at(-1)[1]<=path[0][1]?'Run block':'Pass block';}
export function progression(play){const valid=(play.reads||[play.target,...ELIGIBLE.filter(s=>s!==play.target)]).filter(s=>ELIGIBLE.includes(s));return [...new Set([...valid,...ELIGIBLE])];}
export function defensiveAlignment(coverage){
 const front=[['DE1',21,1.1],['DT1',24.8,1.1],['DT2',28.5,1.1],['DE2',32.3,1.1]];
 const linebackers=coverage==='Blitz'?[['LB1',19,2],['LB2',27,4],['LB3',35,2]]:[['LB1',17,6],['LB2',27,7],['LB3',36,6]];
 const backs=coverage==='Man'?[['CB1',6,2],['CB2',47,2],['S1',19,10],['S2',36,11]]:coverage==='Cover 3'?[['CB1',8,9],['CB2',45,9],['S1',27,16],['S2',34,6]]:[['CB1',6,5],['CB2',47,5],['S1',16,15],['S2',38,15]];
 return [...front,...linebackers,...backs].map(([slot,x,y])=>({slot,x,y}));
}
export function lineup(play,coverage,offense,defense,offDepth={},defDepth={},defensePlan={},spot=25){
 const plan=normalizeDefense(defensePlan,spot);const f=fieldPlayers(offense,offDepth),order=orderedRoster(defense,defDepth);const get=(pos,n)=>order.filter(p=>p.position===pos)[n];const d={DE1:get('DL',0),DT1:get('DL',1),DT2:get('DL',2),DE2:get('DL',3),LB1:get('LB',0),LB2:get('LB',1),LB3:get('LB',2),CB1:get('DB',0),CB2:get('DB',1),S1:get('DB',2),S2:get('DB',3)};
 const make=(slot,side,p,xy)=>({slot,side,id:p?.id||`${side}-${slot}`,name:p?.name||slot,number:p?.number||slot,rating:p?.overall||60,traits:footballTraits(p,side==='offense'?(LINE.includes(slot)?'OL':slot.startsWith('WR')?'WR':slot):(slot.startsWith('D')?'DL':slot.startsWith('LB')?'LB':'DB')),vx:0,vy:0,distance:0,status:'Set',...xy});
 return [...FORMATIONS[play.formation].map(([slot,x,y])=>make(slot,'offense',f[slot],worldPoint([x,y]))),...defensiveAlignment(coverage).map(({slot,x,y})=>make(slot,'defense',d[slot],plan[slot]?.start||{x,y}))];
}
/** Fixed-step football simulation. Every result is resolved from these same replay frames. */
export function resolveLivePlay({play,coverage,offense,defense,offDepth={},defDepth={},seed,spot=25,defensePlan={}}){
 const plan=normalizeDefense(defensePlan,spot);const rng=createRng(seed),people=lineup(play,coverage,offense,defense,offDepth,defDepth,plan,spot);
 const off=people.filter(p=>p.side==='offense'),def=people.filter(p=>p.side==='defense'),by=Object.fromEntries(off.map(p=>[p.slot,p]));
 for(const p of people){const execution=rng.fork(`execution/${p.side}/${p.slot}`);p.traits={...p.traits,topSpeed:p.traits.topSpeed*execution.range(.97,1.03),acceleration:p.traits.acceleration*execution.range(.95,1.05),reaction:p.traits.reaction*execution.range(.9,1.12)}}
 const origin=Object.fromEntries(people.map(p=>[p.slot,{x:p.x,y:p.y}]));
 // Re-anchor legacy saved routes to the current formation without changing the drawn destination.
 const paths=Object.fromEntries(Object.entries(play.routes||{}).filter(([s])=>by[s]).map(([s,pts])=>[s,[origin[s],...pts.slice(1).map(worldPoint)]]));
 const reads=progression(play),run=play.type==='run',runner=by[play.runner||'RB']||by.RB;
 const frames=[],events=[],engagements=new Map(),cooldown=new Map(),tackleCooldown=new Map();
 let t=0,phase='Snap',ball={...origin.C,z:.35},carrier=by.QB,flight=null,release=null,done=false,caught=false,handed=false,kind=run?'run':'incomplete',target=null,readIndex=-1,nextRead=0,readSince=0,pressureLogged=false,contact=null,catchTime=Infinity;
 const metrics={firstPressure:null,timeToThrow:null,blockedSeconds:0,blockWins:0,blockLosses:0,readWindows:[],maxSeparation:0};
 const event=(type,details={})=>events.push({t:+t.toFixed(2),type,...details});
 const pressureCall=rng.fork('pressure-call');const blitzSlots=pressureCall.chance(.4)?['LB1','LB3']:[pressureCall.pick(['LB1','LB2','LB3'])];
 const rushers=def.filter((p,i)=>plan[p.slot]?.type?plan[p.slot].type==='blitz':i<4||(coverage==='Blitz'&&blitzSlots.includes(p.slot)));
 const blockers=off.filter(p=>LINE.includes(p.slot)||(!run&&p!==by.QB&&paths[p.slot]&&paths[p.slot].at(-1).y<=origin[p.slot].y));
 // One initial responsibility per blocker. The spare OL helps inside, then picks up leaks.
 const assignments=new Map(),claimed=new Set();
 for(const d of [...rushers].sort((a,b)=>Math.abs(b.x-26.65)-Math.abs(a.x-26.65))){const b=blockers.filter(b=>!assignments.has(b.slot)).sort((a,b)=>dist(a,d)-dist(b,d))[0];if(b){assignments.set(b.slot,d.slot);claimed.add(d.slot)}}
 for(const b of blockers.filter(b=>!assignments.has(b.slot))){const d=(run?def:rushers).filter(d=>!claimed.has(d.slot)).sort((a,c)=>dist(b,a)-dist(b,c))[0]||rushers.slice().sort((a,c)=>dist(b,a)-dist(b,c))[0];if(d){assignments.set(b.slot,d.slot);claimed.add(d.slot)}}
 const manAssignments=new Map(),uncovered=new Set(ELIGIBLE);
 for(const d of def.filter(d=>!rushers.includes(d)).sort((a,b)=>a.slot.startsWith('CB')?-1:b.slot.startsWith('CB')?1:0)){
 const receiver=[...uncovered].map(s=>by[s]).sort((a,b)=>Math.abs(d.x-a.x)-Math.abs(d.x-b.x))[0];if(receiver){manAssignments.set(d.slot,receiver.slot);uncovered.delete(receiver.slot)}
 }
 for(const d of def){if(plan[d.slot]?.type==='man'&&by[plan[d.slot].target])manAssignments.set(d.slot,plan[d.slot].target)}
 const reactionGoals=new Map();
 function snapshot(){frames.push({t:+t.toFixed(2),phase,players:people.map(p=>({slot:p.slot,side:p.side,x:+p.x.toFixed(3),y:+p.y.toFixed(3),vx:+p.vx.toFixed(2),vy:+p.vy.toFixed(2),status:p.status,assignment:assignments.get(p.slot)||manAssignments.get(p.slot)||null})),ball:{...ball},read:readIndex,carrier:carrier?.slot||null,blocks:[...engagements.values()].map(e=>({blocker:e.b.slot,defender:e.d.slot,mode:e.mode,advantage:+e.advantage.toFixed(2)}))})}
 function end(type,details={}){done=true;phase='Dead ball';event(type,details)}
 function predict(receiver,seconds){const path=paths[receiver.slot];if(!path)return {x:receiver.x+receiver.vx*seconds,y:receiver.y+receiver.vy*seconds};const projected={...receiver};for(let n=0;n<Math.ceil(seconds/DT);n++)followRoute(projected,path,receiver.traits.topSpeed*.93);return {x:projected.x,y:projected.y};}
 function windowFor(receiver){
 let travel=clamp(dist(by.QB,receiver)/24,.3,1.5);let aim=predict(receiver,travel);travel=clamp(dist(by.QB,aim)/24,.3,1.8);aim=predict(receiver,travel);
 let separation=99,laneRisk=0;
 for(const d of def){if(rushers.includes(d))continue;const anticipate={x:d.x+d.vx*Math.min(.4,travel),y:d.y+d.vy*Math.min(.4,travel)};
 separation=Math.min(separation,dist(anticipate,aim));const lane=segmentDistance(anticipate,by.QB,aim);if(lane.fraction>.18&&lane.fraction<.95)laneRisk=Math.max(laneRisk,clamp((1.9-lane.distance)/1.9,0,1));}
 return {aim,travel,separation,laneRisk,score:separation-laneRisk*2.8};
 }
 function nearestThreat(p){return def.filter(d=>![...engagements.values()].some(e=>e.d===d)).sort((a,b)=>dist(a,p)-dist(b,p))[0]}
 function runnerGoal(p){
 const path=paths[p.slot],next=path?.[p.waypoint||1];
 if(next&&dist(p,next)<1.4&&p.waypoint<path.length-1)p.waypoint++;
 const authored=path?.[p.waypoint||1];const forward=authored&&authored.y>p.y+.3?authored:{x:p.x,y:p.y+7};
 const desiredX=p.x+(forward.x-p.x)*Math.min(1,4/Math.max(.1,dist(p,forward)));
 let best=null,bestScore=-Infinity;
 // Vision picks a nearby open lane while staying biased toward the authored run.
 for(const offset of [-3,-1.5,0,1.5,3]){const goal={x:clamp(desiredX+offset,.3,53),y:p.y+4};let risk=0;
 for(const d of def){if([...engagements.values()].some(e=>e.d===d))continue;const projected={x:d.x+d.vx*.25,y:d.y+d.vy*.25};if(d.y<p.y-1.5)continue;const lane=segmentDistance(projected,p,goal);risk+=Math.max(0,3-lane.distance)*(d.y<p.y+6?1:.35)}
 const crowd=off.filter(o=>o!==p&&o!==by.QB).reduce((n,o)=>n+Math.max(0,1.5-segmentDistance(o,p,goal).distance),0);
 const score=-risk*(.5+p.traits.vision/100)-Math.abs(offset)*.32-crowd*.75;
 if(score>bestScore){bestScore=score;best=goal}}
 return best;
 }
 function blocking(){
 const activeBlockers=caught?off.filter(p=>p!==carrier&&p!==by.QB):blockers;
 for(const b of activeBlockers){if([...engagements.values()].some(e=>e.b===b))continue;
 let d=def.find(d=>d.slot===assignments.get(b.slot));
 if(!d||d.y<b.y-1.6||dist(b,d)>9||(!LINE.includes(b.slot)&&caught)){d=(caught?def:rushers).filter(d=>![...engagements.values()].some(e=>e.d===d)).sort((a,c)=>dist(b,a)-dist(b,c))[0]||d;if(d)assignments.set(b.slot,d.slot)}
 if(!d){steer(b,b,0);continue;}const mode=caught?'Run block':blockType(play,b.slot),forward=mode==='Run block';
 b.status=forward?'Run fit':'Pass set';
 const route=paths[b.slot],end=route?.at(-1);const lateral=end?clamp(end.x-origin[b.slot].x,-5,5):0;
 let goal=forward?{x:d.x+lateral*.2,y:d.y-.95}:{x:d.x*.72+by.QB.x*.28,y:Math.max(by.QB.y+2.3,Math.min(origin[b.slot].y-.65,d.y-1.05))};
 // Authored line paths define the approach and drive direction; nearby threats still engage.
 const authored=LINE.includes(b.slot)&&route?.length>1;
 if(authored&&forward&&!caught){const ahead=route.find(pt=>dist(b,pt)>.7&&((pt.x-b.x)*(end.x-b.x)+(pt.y-b.y)*(end.y-b.y)>0))||end;goal=ahead;
 const threats=def.filter(r=>![...engagements.values()].some(e=>e.d===r)&&dist(b,r)<2.3);if(threats.length){d=threats.sort((a,c)=>dist(b,a)-dist(b,c))[0];assignments.set(b.slot,d.slot);}}
 if(authored&&!forward)goal.x=clamp(goal.x+lateral,1,52.3);
 steer(b,goal,b.traits.topSpeed*(forward?.65:.57));
 if(dist(b,d)<1.65&&(authored&&forward&&!caught||b.y<d.y+.15)&&(cooldown.get(`${b.slot}/${d.slot}`)||0)<=t&&![...engagements.values()].some(e=>e.d===d)){
 const leverage=clamp((b.x-by.QB.x)*(d.x-b.x)*.04,-.18,.18);
 const advantage=(b.traits.blocking-d.traits.rush)*.018+(b.traits.strength-d.traits.strength)*.008+(b.traits.mass-d.traits.mass)*.002-leverage+(forward===run?.16:-.48);
 const contest=rng.fork(`block/${b.slot}/${d.slot}/${Math.round(t*20)}`);
 const hold=clamp((LINE.includes(b.slot)?1.35:.35)+advantage*1.1+contest.range(-.5,.8),.25,4.3);
 const separation=Math.max(.01,dist(b,d));const normal={x:(d.x-b.x)/separation,y:Math.max(.1,(d.y-b.y)/separation)};const length=Math.hypot(normal.x,normal.y);normal.x/=length;normal.y/=length;engagements.set(b.slot,{b,d,mode,advantage,normal,driveDirection:authored&&forward&&!caught&&end?{x:end.x-origin[b.slot].x,y:end.y-origin[b.slot].y}:null,start:t,until:t+hold});event('Block engaged',{by:b.slot,on:d.slot,mode});
 }
 }
 const pairs=new Set();
 for(const [key,e] of engagements){const {b,d,advantage,mode}=e;if(t>e.until){engagements.delete(key);cooldown.set(`${b.slot}/${d.slot}`,t+1);d.status='Shed';d.vx+=(d.x<by.QB.x?-1.3:1.3);event('Block shed',{by:d.slot,against:b.slot});metrics.blockLosses++;continue}
 b.status=mode==='Run block'?'Driving':'Protecting';d.status='Engaged';pairs.add(`${b.slot}/${d.slot}`);
 // Contact constraint: the rusher cannot pass through the blocker while engaged.
 const drive=mode==='Run block'?clamp(.4+advantage*1.2,-.65,1.7):clamp(-.25+advantage*.5,-1.1,.25);
 const direction=e.driveDirection;const length=direction?Math.max(.01,Math.hypot(direction.x,direction.y)):1;const dy=direction?direction.y/length:1;
 const midpoint={x:(b.x+d.x)/2,y:(b.y+d.y)/2+drive*dy*DT};
 const lateral=(direction?drive*direction.x/length:clamp((d.x-by.QB.x)*.015,-.2,.2))*DT;
 b.x=midpoint.x+lateral-e.normal.x*.57;b.y=midpoint.y-e.normal.y*.57;d.x=midpoint.x+lateral+e.normal.x*.57;d.y=midpoint.y+e.normal.y*.57;
 b.vx=d.vx=lateral/DT;b.vy=d.vy=drive*dy;metrics.blockedSeconds+=DT;
 }
 return pairs;
 }
 event('Snap');snapshot();
 for(let tick=1;tick<=440&&!done;tick++){
 t=tick*DT;const qb=by.QB;phase=t<.3?'Snap':run&&!handed?'Mesh':flight?'Ball in flight':release?'Release':caught?'Run after catch':run?'Run':'Dropback';
 const held=new Set([...engagements.values()].flatMap(e=>[e.b.slot,e.d.slot]));
 // QB drop, settle, and climb away from the nearest free edge pressure.
 if(!held.has('QB')){
 if(run&&!handed){qb.status='Mesh';steer(qb,{x:origin.QB.x+(runner===qb?0:Math.sign(origin[runner.slot].x-origin.QB.x)*.8),y:origin.QB.y-.3},2.5)}
 else if(!caught&&!flight){const threat=nearestThreat(qb),near=threat?dist(threat,qb):99;const drop=play.formation==='Singleback'?-5.4:origin.QB.y-.8;
 const climb=t>1.4&&near<4?1:0;const dodge=t>1.4&&near<3?Math.sign(qb.x-threat.x)*1.3:0;
 qb.status=release?'Throwing':t<1.3?'Dropback':climb?'Climb pocket':'Reading';steer(qb,{x:origin.QB.x+dodge,y:drop+climb},release?.4:t<1.3?4.2:2.3)}
 else if(carrier!==qb){qb.status='Watch';steer(qb,qb,0)}
 }
 for(const p of off){if(blockers.includes(p)||held.has(p.slot)||p===qb||(caught&&p!==carrier))continue;
 if(run&&!handed&&p===runner){p.status='Mesh';steer(p,{x:qb.x+.7,y:qb.y},p.traits.topSpeed*.78)}
 else if(caught&&p===carrier){p.status='Carry';if(t>= (p.nextVision||0)){p.runGoal=runnerGoal(p);p.nextVision=t+.16+(100-p.traits.vision)*.002}steer(p,p.runGoal,p.traits.topSpeed*.93,DT,false)}

 else if(flight&&p===target&&t>flight.start+.2&&flight.start+flight.duration-t<.5){p.status='Track ball';steer(p,flight.to,p.traits.topSpeed)}
 else {p.status=paths[p.slot]?'Route':'Release';if(t>.22)followRoute(p,paths[p.slot]||[origin[p.slot],{x:p.x,y:p.y+3}],p.traits.topSpeed*.93)}
 }
 if(run&&handed&&runner===qb){qb.status='Carry';if(t>=(qb.nextVision||0)){qb.runGoal=runnerGoal(qb);qb.nextVision=t+.2}steer(qb,qb.runGoal,qb.traits.topSpeed*.93,DT,false)}
 // Defensive perception updates are delayed. Coverage players do not know the catch point instantly.
 for(const d of def){if(held.has(d.slot))continue;if(t<d.traits.reaction*.55){d.status='Read snap';continue}
 const observedRun=handed&&t>(catchTime+d.traits.reaction),observedCatch=caught&&!run&&t>catchTime+d.traits.reaction;
 const seesThrow=flight&&t>flight.start+d.traits.reaction;
 if(t>=(d.nextDecision||0)){
 let goal,pace=d.traits.topSpeed;
 if(observedRun||observedCatch){const lead=clamp(dist(d,carrier)/Math.max(1,d.traits.topSpeed)*.85+.15,0,1.4);goal={x:carrier.x+carrier.vx*lead,y:carrier.y+carrier.vy*lead};d.status='Pursuit';if(d.y>carrier.y+2&&dist(d,carrier)<7)pace=Math.min(pace,3+dist(d,carrier)*.45)}
 else if(seesThrow&&!rushers.includes(d)){const contest=flight.contesters.includes(d.slot)&&dist(d,flight.to)<Math.max(0,flight.start+flight.duration-t)*d.traits.topSpeed*.75+1;goal=contest?flight.to:{x:flight.to.x,y:Math.max(d.y,flight.to.y+(d.slot.startsWith('S')?4:2))};d.status=contest?'Break on ball':'Contain catch'}
 else if(plan[d.slot]?.type==='zone'||plan[d.slot]?.type==='blitz'){
 const assignment=plan[d.slot],route=[origin[d.slot],...(assignment.path||[]).slice(1)];d.defensiveWaypoint=d.defensiveWaypoint||1;
 while(d.defensiveWaypoint<route.length&&dist(d,route[d.defensiveWaypoint])<1.8)d.defensiveWaypoint++;
 const endpoint=route.at(-1);goal=route[d.defensiveWaypoint];
 if(!goal&&assignment.type==='blitz')goal={x:qb.x,y:qb.y};
 if(!goal){const match=off.filter(p=>p!==qb&&dist(p,endpoint)<6).sort((a,b)=>dist(a,endpoint)-dist(b,endpoint))[0];goal=match?{x:match.x,y:match.y}:endpoint;}
 d.status=assignment.type==='blitz'?'Blitz path':'Custom zone';
 }
 else if(plan[d.slot]?.type==='man'&&by[plan[d.slot].target]){const target=by[plan[d.slot].target];goal={x:target.x+target.vx*.25,y:target.y+target.vy*.25+1};d.status=`Man ${target.slot}`;}
 else if(rushers.includes(d)){goal={x:qb.x,y:qb.y};d.status='Rush';if(d.slot.startsWith('DE')&&t<1.15)goal={x:origin[d.slot].x+(d.x<26.65?-1:1),y:qb.y+1};}
 else if(coverage==='Man'||coverage==='Blitz'){const assignment=by[manAssignments.get(d.slot)];if(assignment){goal={x:assignment.x+assignment.vx*.25,y:Math.max(origin[d.slot].y,assignment.y+assignment.vy*.25+1.5)};d.status=`Man ${assignment.slot}`}else{goal={x:26.65,y:Math.min(18,qb.y+23)};d.status='Deep help'}}
 else {const deep=coverage==='Cover 3'?['CB1','CB2','S1'].includes(d.slot):d.slot.startsWith('S');const zone={x:origin[d.slot].x,y:deep?18:6};
 const candidates=off.filter(p=>ELIGIBLE.includes(p.slot)&&Math.abs(p.x-zone.x)<(deep?12:9)&&p.y>(deep?6:-1)&&p.y<(deep?45:24));
 const match=candidates.sort((a,b)=>dist(a,zone)-dist(b,zone))[0];goal=match?{x:clamp(match.x,zone.x-7,zone.x+7),y:deep?Math.max(zone.y,match.y+2.5):clamp(match.y+Math.max(0,match.vy)*.35+3,origin[d.slot].y,28)}:zone;
 pace*=match?.98:.8;d.status=deep?'Deep zone':match&&match.y>8?'Carry seam':'Under zone';}
 reactionGoals.set(d.slot,{goal,pace});d.nextDecision=t+d.traits.reaction;
 }
 const decision=reactionGoals.get(d.slot);if(decision)steer(d,decision.goal,decision.pace,DT,!['Pursuit','Carry seam'].includes(d.status)&&!d.status.startsWith('Man '));
 }
 const pairs=blocking();separateBodies(people,pairs);
 for(const p of people){p.x=clamp(p.x,-.15,53.45);p.y=clamp(p.y,-spot-8,109-spot)}
 if(run&&!handed&&t>.55&&(runner===qb||dist(qb,runner)<1.3)){
 handed=true;caught=true;catchTime=t;carrier=runner;runner.waypoint=1;
 // The runner begins the authored route after the mesh, skipping points behind him.
 while(paths[runner.slot]&&runner.waypoint<paths[runner.slot].length-1&&paths[runner.slot][runner.waypoint].y<runner.y)runner.waypoint++;
 event(runner===qb?'Keeper':'Handoff',{to:runner.slot});
 }
 if(run&&!handed&&t>2.5){kind='run';carrier=qb;end('Broken mesh')}
 const free=def.filter(d=>![...engagements.values()].some(e=>e.d===d));const nearest=free.length?Math.min(...free.map(d=>dist(d,qb))):99;
 const pressure=clamp((4.2-nearest)/3.2,0,1);
 if(!run&&!caught&&!flight){
 if(pressure>.25&&!pressureLogged){pressureLogged=true;metrics.firstPressure=t;event('Pressure')}
 if(nearest<1.05&&t>.65){kind='sack';carrier=qb;end('Sack',{by:free.slice().sort((a,b)=>dist(a,qb)-dist(b,qb))[0].slot})}
 else if(release&&t>=release.at){
 target=release.receiver;const window=windowFor(target),travel=window.travel;
 const moving=Math.hypot(qb.vx,qb.vy);const scatter=clamp(.28+(100-qb.traits.accuracy)*.018+dist(qb,window.aim)*.016+pressure*1.7+moving*.1,.3,3.2);
 const aim={x:window.aim.x+rng.normal(0,scatter),y:window.aim.y+rng.normal(0,scatter)};
 flight={from:{x:qb.x,y:qb.y},to:aim,start:t,duration:travel,contesters:def.filter(d=>!rushers.includes(d)).sort((a,b)=>dist(a,aim)/a.traits.topSpeed-dist(b,aim)/b.traits.topSpeed).slice(0,2).map(d=>d.slot)};metrics.timeToThrow=t;event('Throw',{from:'QB',to:target.slot,order:readIndex+1,pressure:+pressure.toFixed(2),separation:+window.separation.toFixed(2)});carrier=null;release=null;
 }
 else if(!release&&t>(pressure>.35?.8:play.formation==='Singleback'?1.45:1.15)){
 if(t>=nextRead&&reads.length){readIndex=(readIndex+1)%reads.length;readSince=t;nextRead=t+(pressure>.35?.16:.36)+(100-qb.traits.vision)*.003;event('Read',{slot:reads[readIndex],order:readIndex+1})}
 const receiver=by[reads[readIndex]];
 if(receiver&&paths[receiver.slot]&&!blockers.includes(receiver)){const window=windowFor(receiver);metrics.maxSeparation=Math.max(metrics.maxSeparation,window.separation);
 const urgency=pressure>.6||t>4.2;const routeDepth=Math.max(0,paths[receiver.slot].at(-1).y-origin[receiver.slot].y);const developed=receiver.y-origin[receiver.slot].y>=Math.min(8,routeDepth*.45);const ready=t-readSince>(pressure>.35?.04:.12)&&(developed||urgency);
 if(ready&&(window.score>(urgency?1.0:1.8)||t>5.1)){
 metrics.readWindows.push({slot:receiver.slot,t,score:+window.score.toFixed(2)});release={receiver,at:t+.24+(100-qb.traits.accuracy)*.002};event('Set to throw',{to:receiver.slot});
 }}
 if(t>5.6&&!release){kind='incomplete';carrier=qb;end('Throwaway')}
 }
 }
 if(t<.3){const f=t/.3;ball={x:origin.C.x+(qb.x-origin.C.x)*f,y:origin.C.y+(qb.y-origin.C.y)*f,z:.35}}
 else if(carrier)ball={x:carrier.x,y:carrier.y,z:.4};
 if(flight&&!done){const f=clamp((t-flight.start)/flight.duration,0,1);ball={x:flight.from.x+(flight.to.x-flight.from.x)*f,y:flight.from.y+(flight.to.y-flight.from.y)*f,z:.45+Math.sin(f*Math.PI)*Math.min(4,dist(flight.from,flight.to)*.12)};
 // Interceptions require actual reach of the ball, including its height; no remote outcome roll.
 const interceptor=def.filter(d=>t>flight.start+.2&&ball.z<d.traits.reach*.9&&dist(d,ball)<.85).sort((a,b)=>dist(a,ball)-dist(b,ball))[0];
 if(interceptor&&rng.fork(`intercept/${interceptor.slot}`).chance(.07+interceptor.traits.catching*.001)){carrier=interceptor;kind='interception';ball={x:carrier.x,y:carrier.y,z:.3};end('Interception',{by:carrier.slot});flight=null}
 else if(f>=1){const defender=def.slice().sort((a,b)=>dist(a,target)-dist(b,target))[0];const contest=clamp((2-dist(defender,target))/2,0,1);const reach=1.15+target.traits.reach*.3;
 const canCatch=dist(target,ball)<reach&&ball.x>.2&&ball.x<53.1&&spot+ball.y<110;
 const chance=clamp(.74+target.traits.catching*.0022-contest*(.24+defender.traits.coverage*.0015),.2,.98);
 if(canCatch&&rng.chance(chance)){carrier=target;caught=true;catchTime=t;kind='pass';ball={x:carrier.x,y:carrier.y,z:.4};event('Catch',{by:carrier.slot,contested:contest>.2})}
 else {kind='incomplete';end(canCatch?'Pass defended':'Incomplete')}
 flight=null;
 }
 }
 if(caught&&carrier&&!done){
 ball={x:carrier.x,y:carrier.y,z:.4};
 if(spot+carrier.y>=100){carrier.y=100-spot;ball.y=carrier.y;end('Touchdown',{by:carrier.slot})}
 else if(carrier.x<=.2||carrier.x>=53.1){end('Out of bounds',{by:carrier.slot})}
 else if(contact){carrier.vx*=.7;carrier.vy*=.7;if(t>=contact.until){const forward=contact.forward;carrier.y=Math.max(carrier.y,forward);ball={x:carrier.x,y:carrier.y,z:0};if(rng.chance(clamp(.02-(carrier.traits.ballSecurity-60)*.0003,.004,.025))){kind='fumble';end('Fumble',{by:carrier.slot})}else end('Tackle',{by:contact.by})}}
 else for(const d of free){if((tackleCooldown.get(d.slot)||0)>t||dist(d,carrier)>1.6)continue;
 const closing=Math.hypot(d.vx-carrier.vx,d.vy-carrier.vy),support=free.filter(o=>o!==d&&dist(o,carrier)<2.8).length;
 const chance=clamp(.64+(d.traits.tackling-carrier.traits.elusiveness)*.006+(d.traits.mass-carrier.traits.mass)*.001+support*.1-closing*.012,.25,.97);
 tackleCooldown.set(d.slot,t+1.3);
 if(rng.chance(chance)){contact={by:d.slot,until:t+.25,forward:carrier.y};carrier.vx*=.35;carrier.vy*=.35;event('Contact',{by:d.slot});break}
 d.vx*=.35;d.vy*=.35;event('Broken tackle',{by:carrier.slot,against:d.slot});
 }
 }
 snapshot();
 }
 if(!done){end('Whistle');snapshot()}
 const outcome=kind==='sack'?by.QB:carrier||target||by.QB;const yards=kind==='incomplete'?0:clamp(Math.round(outcome.y),-spot,100-spot);
 metrics.blockWins=[...engagements.values()].length;
 return {kind,yards,playerId:outcome.id,playerName:outcome.name,qbName:by.QB.name,readOrder:Math.max(0,readIndex+1),targetSlot:target?.slot,frames,events,people:people.map(p=>({slot:p.slot,side:p.side,id:p.id,name:p.name,number:p.number,traits:p.traits})),duration:t,spot,coverage,metrics,modelVersion:2};
}
export function interpolateFrame(frames,time){if(!frames?.length)return null;let i=Math.min(frames.length-1,Math.floor(time/.05));while(i<frames.length-1&&frames[i+1].t<=time)i++;const a=frames[i],b=frames[Math.min(i+1,frames.length-1)],f=clamp((time-a.t)/Math.max(.001,b.t-a.t),0,1);return {...a,players:a.players.map((p,j)=>({...p,x:p.x+(b.players[j].x-p.x)*f,y:p.y+(b.players[j].y-p.y)*f})),ball:{x:a.ball.x+(b.ball.x-a.ball.x)*f,y:a.ball.y+(b.ball.y-a.ball.y)*f,z:a.ball.z+(b.ball.z-a.ball.z)*f}};}
