import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {footballTraits,steer,distance} from './footballPhysics.js';
import {resolveLivePlay} from './liveSimulation.js';
import {LIBRARY_PLAYS} from './playbook.js';
const players=JSON.parse(readFileSync(new URL('../public/data/catalog.json',import.meta.url))).players;
const base=players.filter(p=>p.eligible&&p.team==='KC'),defense=players.filter(p=>p.eligible&&p.team==='BUF');
const simulate=(i,extra={})=>resolveLivePlay({offense:base,defense,play:LIBRARY_PLAYS[i%30],coverage:['Cover 2','Cover 3','Man','Blitz'][i%4],seed:`physics-${i}`,spot:25,...extra});
test('movement accelerates and turns gradually; historical measurements affect estimates',()=>{
 const traits=footballTraits({overall:80,combine:{fortySeconds:4.4},bio:{weightLbs:210}},'WR');
 const p={x:0,y:0,vx:0,vy:0,traits};steer(p,{x:0,y:30},traits.topSpeed);
 assert(p.vy>0&&p.vy<1);for(let i=0;i<20;i++)steer(p,{x:0,y:30},traits.topSpeed);
 const before=p.vy;steer(p,{x:0,y:-30},traits.topSpeed);assert(p.vy>0&&p.vy<before);
 assert(footballTraits({overall:80,combine:{fortySeconds:4.3}},'WR').topSpeed>footballTraits({overall:80,combine:{fortySeconds:4.9}},'WR').topSpeed);
 assert(footballTraits({overall:80,bio:{weightLbs:330}},'OL').strength>footballTraits({overall:80,bio:{weightLbs:280}},'OL').strength);
});
test('contact holds assigned rushers in front of blockers across consecutive frames',()=>{
 const result=simulate(0),counts=new Map();
 for(const frame of result.frames){const defenders=new Set();for(const e of frame.blocks){
 assert(!defenders.has(e.defender));defenders.add(e.defender);
 const b=frame.players.find(p=>p.slot===e.blocker),d=frame.players.find(p=>p.slot===e.defender);
 assert(d.y>b.y,`${e.blocker} must stay between rusher and QB`);assert(distance(b,d)<1.7);
 const key=`${e.blocker}/${e.defender}`;counts.set(key,(counts.get(key)||0)+1);
 }}
 assert(Math.max(...counts.values())>=10,'an engagement must last at least half a second');
 assert(result.events.some(e=>e.type==='Block engaged'));
 assert(result.events.some(e=>e.type==='Block shed'));
});
test('stronger offensive line sustains protection and reduces pressure across matched seeds',()=>{
 const totals={};for(const rating of [40,95]){const offense=base.map(p=>p.position==='OL'?{...p,overall:rating}:p);let blocks=0,pressure=0;
 for(let i=0;i<60;i++){const r=simulate(i,{offense});blocks+=r.metrics.blockedSeconds;pressure+=r.metrics.firstPressure!==null?1:0;}
 totals[rating]={blocks,pressure};}
 assert(totals[95].blocks>totals[40].blocks*1.2,JSON.stringify(totals));
 assert(totals[95].pressure<totals[40].pressure,JSON.stringify(totals));
});
test('all play and coverage combinations keep bodies continuous and ball attached after catches',()=>{
 for(let i=0;i<120;i++){const result=simulate(i,{play:LIBRARY_PLAYS[Math.floor(i/4)],coverage:['Cover 2','Cover 3','Man','Blitz'][i%4]});
 assert(result.events.at(-1).type!=='Whistle','normal play should end through football action');
 for(let n=1;n<result.frames.length;n++){const a=result.frames[n-1],b=result.frames[n];
 for(let j=0;j<22;j++){assert(Number.isFinite(b.players[j].x)&&Number.isFinite(b.players[j].y));assert(distance(a.players[j],b.players[j])<1.3,`no player teleporting: play ${i}, t ${b.t}, ${b.players[j].slot}, ${distance(a.players[j],b.players[j])}`);}
 if(b.carrier&&b.t>.35){const p=b.players.find(p=>p.slot===b.carrier);assert(distance(p,b.ball)<.01,'ball stays with its carrier');}
 }
 const throwEvent=result.events.find(e=>e.type==='Throw');if(throwEvent){assert(throwEvent.t>=1);for(const f of result.frames.filter(f=>f.t<throwEvent.t+.15)){assert(!f.players.some(p=>p.status==='Break on ball'),'defenders cannot react to a throw before seeing it');}}
 }
});
test('pass-blocking a back creates an extra protection assignment, not an eligible throwing target',()=>{
 const play=structuredClone(LIBRARY_PLAYS[0]);play.routes.RB=[[62,69],[62,73]];play.reads=['RB','WR1','WR2','WR3','TE'];play.target='RB';
 const r=simulate(0,{play,coverage:'Blitz'});assert(r.frames.some(f=>f.players.find(p=>p.slot==='RB').status==='Pass set'));
 assert(!r.events.some(e=>e.type==='Throw'&&e.to==='RB'));
});
