import {test} from 'node:test';
import assert from 'node:assert/strict';
import {followRoute,footballTraits} from './footballPhysics.js';
import {withTouchdownCelebration} from './touchdownPlayback.js';
test('densely drawn straight route keeps accelerating instead of braking at every mouse sample',()=>{
 const p={x:0,y:0,vx:0,vy:0,traits:footballTraits({overall:90},'WR')};const path=Array.from({length:101},(_,i)=>({x:0,y:i*.4}));
 for(let i=0;i<60;i++)followRoute(p,path,9);
 assert(p.y>18,`Only ran ${p.y} yards`);assert(p.vy>8);assert(Math.abs(p.x)<.01);
});
test('passed waypoint advances rather than pulling the receiver backward',()=>{
 const p={x:0,y:5.5,vx:0,vy:8,waypoint:1,traits:footballTraits({},'WR')};followRoute(p,[{x:0,y:0},{x:0,y:4},{x:0,y:20}],9);assert.equal(p.waypoint,2);assert(p.vy>=8);
});
test('celebration adds presentation time without changing scoring or source frames',()=>{
 const sim={duration:2,events:[{type:'Touchdown',by:'WR1'}],frames:[{t:2,carrier:'WR1',ball:{x:10,y:20},players:[{slot:'WR1',side:'offense',x:10,y:20,vx:3,vy:6}]}]};const before=structuredClone(sim),result=withTouchdownCelebration(sim);
 assert.deepEqual(sim,before);assert.equal(result.duration,5);assert.equal(result.frames.at(-1).phase,'Celebration');assert(result.frames.some(f=>f.players[0].celebrationLift>0));assert.deepEqual(result.events,sim.events);
 assert.equal(withTouchdownCelebration({...sim,events:[]}).duration,2);
});

import {anchoredRoute,routeDragPoint,DEFAULT_PLAYS} from './playbook.js';
import {resolveLivePlay} from './liveSimulation.js';
import {all22Camera,broadcastCamera} from './all22.js';
test('dragging from a receiver body starts the route at his feet in both cameras',()=>{
 for(const cameraFactory of [all22Camera,broadcastCamera]){
  const feet={x:6,y:-.75},camera=cameraFactory([{players:[feet],ball:feet}],1280,720,{zoom:1,spot:25});
  const screen=camera.point(feet.x,feet.y);
  const origin=camera.world(screen.x,screen.y-30);
  const destination={x:feet.x,y:feet.y+5};const projected=camera.point(destination.x,destination.y);
  const pointer=camera.world(projected.x,projected.y-30);
  const result=routeDragPoint(pointer,origin,feet);
  assert(Math.abs(result.x-destination.x)<1e-8);assert(Math.abs(result.y-destination.y)<1e-8);
 }
});
test('old release points translate the whole route and preserve curl cuts',()=>{
 const play={...structuredClone(DEFAULT_PLAYS[0]),routes:{WR1:[[12,70],[12,69],[12,50],[15,54]]}};
 const before=structuredClone(play);assert.deepEqual(anchoredRoute(play,'WR1'),[[12,61],[12,60],[12,41],[15,45]]);assert.deepEqual(play,before);
 const sim=resolveLivePlay({play,coverage:'Cover 2',offense:[],defense:[],seed:'route-release',spot:25});
 const first=sim.frames[0].players.find(p=>p.slot==='WR1');
 const release=sim.frames.filter(f=>f.t<=1).map(f=>f.players.find(p=>p.slot==='WR1'));
 assert(release.every(p=>p.y>=first.y-.01),'receiver must not run back to old drawing samples');
 assert(release.at(-1).y>first.y+1,'receiver accelerates into his route');
});
