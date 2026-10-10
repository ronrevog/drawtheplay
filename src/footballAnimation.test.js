import test from 'node:test';
import assert from 'node:assert/strict';
import {footballPose} from './footballAnimation.js';
test('football follows projected flight direction in all eight directions',()=>{
 for(const [x,y] of [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]]){
  const frames=[{t:0,ball:{x:0,y:0,z:2}},{t:1,ball:{x,y,z:2}}];
  const pose=footballPose({...frames[0],players:[]},frames,.5);
  assert.equal(pose.angle,Math.atan2(-y,x));assert.ok(pose.spin>=.64&&pose.spin<=1);
 }
});
test('native carrying animation does not get a duplicate ball',()=>{
 const frame={players:[{slot:'RB',x:10,y:2}],carrier:'RB',ball:{x:10,y:2,z:.4}};
 assert.equal(footballPose(frame,[frame],0,true),null);
 assert.equal(footballPose(frame,[frame],0,false).held,true);
 const airborne={...frame,ball:{x:15,y:8,z:2}};
 assert.ok(footballPose(airborne,[airborne],0,true));
});
test('pre-snap and completed frames remain still',()=>{
 const frame={t:0,players:[],ball:{x:20,y:0,z:0}};
 assert.equal(footballPose(frame,[frame],0).spin,1);
 assert.equal(footballPose(frame,[frame],10).spin,1);
 assert.equal(footballPose(null,[],0),null);
});
