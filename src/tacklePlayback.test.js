import {test} from 'node:test';
import assert from 'node:assert/strict';
import {withTackleFinish,spriteFrame} from './tacklePlayback.js';
import {playerAnimation} from './all22.js';
const make=(type='Tackle')=>({duration:2,kind:'run',yards:5,events:[{type,t:2,by:'LB1'}],frames:[{t:2,carrier:'RB',ball:{x:20,y:5,z:.4},players:[{slot:'RB',side:'offense',x:20,y:5,vx:1,vy:2},{slot:'LB1',side:'defense',x:20,y:6,vx:0,vy:-2}]}]});
test('tackles and sacks play through a fall without altering the actual outcome or clock duration',()=>{
 for(const type of ['Tackle','Sack']){
  const original=make(type),copy=structuredClone(original),visual=withTackleFinish(original);
  assert.deepEqual(original,copy);assert.equal(visual.yards,5);assert.equal(original.duration,2);assert.equal(visual.duration,3.2);
  const [runner,defender]=visual.frames.at(-1).players;
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
});
