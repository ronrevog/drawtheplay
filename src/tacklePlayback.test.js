import {test} from 'node:test';
import assert from 'node:assert/strict';
import {withTackleFinish,spriteFrame} from './tacklePlayback.js';
import {playerAnimation} from './all22.js';
import {resolveLivePlay,interpolateFrame} from './liveSimulation.js';
import {LIBRARY_PLAYS} from './playbook.js';
const make=(type='Tackle')=>({duration:2,kind:'run',yards:5,events:[{type,t:2,by:'LB1'}],frames:[{t:2,carrier:'RB',ball:{x:20,y:5,z:.4},players:[{slot:'RB',side:'offense',x:20,y:5,vx:1,vy:2},{slot:'LB1',side:'defense',x:20,y:6,vx:0,vy:-2}]}]});
test('tackles and sacks play through a fall without altering the actual outcome or clock duration',()=>{
 for(const type of ['Tackle','Sack']){
  const original=make(type);if(type==='Sack'){original.frames[0].carrier='QB';original.frames[0].players[0].slot='QB'}
  const copy=structuredClone(original),visual=withTackleFinish(original);
  assert.deepEqual(original,copy);assert.equal(visual.yards,5);assert.equal(original.duration,2);assert.equal(visual.duration,3.2);
  const [runner,defender]=visual.frames.at(-1).players;
  assert.deepEqual(runner.animationPartner,{slot:'LB1',side:'defense'});
  assert.equal(playerAnimation(runner,'RB'),'L2BSIDL');assert.equal(playerAnimation(defender,'RB'),'SKDIVE');
  assert.equal(spriteFrame(runner,2,8),0);assert.equal(spriteFrame(runner,2.4,8),3);assert.equal(spriteFrame(runner,3.2,8),7);
  assert.equal(runner.y,5);assert.equal(visual.frames.at(-1).ball.z,0);
 }
});
test('out-of-bounds and scores do not create a tackle',()=>{
 for(const type of ['Out of bounds','Touchdown','Incomplete']){const original=make(type);assert.equal(withTackleFinish(original),original)}
});
test('return tackles use the returner and actual coverage tackler',()=>{
 const s=make();s.frames[0].carrier='KR';s.frames[0].players[0].slot='KR';s.frames[0].players[0].side='defense';s.frames[0].players[1].side='offense';
 assert.equal(withTackleFinish(s).frames.at(-1).players[0].status,'Tackled');
 assert.deepEqual(withTackleFinish(s).frames.at(-1).players[0].animationPartner,{slot:'LB1',side:'offense'});
});

test('real sack plays every QB fall frame and retains the actual pass rusher',()=>{
 const play=structuredClone(LIBRARY_PLAYS[5]);
 for(const slot of ['WR1','WR2','WR3','TE','RB'])delete play.routes[slot];
 const original=resolveLivePlay({play,coverage:'Blitz',offense:[],defense:[],seed:'sack-0',spot:25});
 assert.equal(original.kind,'sack');
 const visual=withTackleFinish(original),start=original.frames.at(-1).t,seen=new Set();
 const rusher=original.events.find(e=>e.type==='Sack').by;
 for(let tick=0;tick<23;tick++){
  const time=start+tick*.05+.001,frame=interpolateFrame(visual.frames,time),qb=frame.players.find(p=>p.slot==='QB');
  assert.equal(frame.carrier,'QB');assert.equal(playerAnimation(qb,frame.carrier),'L2BSIDL');
  assert.deepEqual(qb.animationPartner,{slot:rusher,side:'defense'});
  seen.add(spriteFrame(qb,time,8));
 }
 assert.deepEqual([...seen],[0,1,2,3,4,5,6,7]);
 assert.equal(visual.kind,original.kind);assert.equal(visual.yards,original.yards);
});
test('sack resolves QB even with missing carrier and a trailing diagnostic event',()=>{
 const sim=make('Sack');sim.frames[0].players[0].slot='QB';sim.frames[0].carrier=null;
 sim.events.push({type:'Pressure',t:2});
 const visual=withTackleFinish(sim),frame=visual.frames.at(-1);
 assert.equal(frame.carrier,'QB');assert.equal(frame.players[0].status,'Tackled');
 assert.equal(playerAnimation(frame.players[0],frame.carrier),'L2BSIDL');
});
