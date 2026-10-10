import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createKickFlight,kickPosition,GOAL} from './kickFlight.js';
import {createRng} from './engine/rng.ts';
test('seeded flights include makes, both wide misses, and short kicks judged at the posts',()=>{
 const outcomes=new Set();
 for(const distance of [33,53,63,80])for(let i=0;i<100;i++){
  const f=createKickFlight({launchY:-8,goalY:distance-8,rating:75,rng:createRng(`flight/${i}`)});
  outcomes.add(f.outcome);
  assert.equal(f.good,f.outcome==='GOOD');
  if(f.crossing){
   assert(Math.abs(f.crossing.y-f.goalY)<1e-9);
   assert.equal(f.good,f.crossing.z>GOAL.crossbar&&Math.abs(f.crossing.x-GOAL.center)<GOAL.halfWidth);
  }else assert.equal(f.outcome,'Short');
  if(f.good)assert(kickPosition(f,f.endTime).y>f.goalY);
  assert.equal(kickPosition(f,0).z,0);
  assert(kickPosition(f,f.groundTime).z<1e-8);
 }
 assert.deepEqual([...outcomes].sort(),['GOOD','Short','Wide left','Wide right']);
});
test('flight has no discontinuity at the scoring plane and is deterministic',()=>{
 const args={launchY:-8,goalY:45,rating:85};
 const a=createKickFlight({...args,rng:createRng('repeat')}),b=createKickFlight({...args,rng:createRng('repeat')});
 assert.deepEqual(a,b);
 const before=kickPosition(a,a.crossingTime-.001),after=kickPosition(a,a.crossingTime+.001);
 assert(Math.abs(after.z-before.z)<.1);
});
