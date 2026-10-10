import {test} from 'node:test';
import assert from 'node:assert/strict';
import {broadcastCamera,broadcastPlayer,spriteDirection} from './all22.js';
import {initialState,restore} from './economy.js';
test('broadcast projection stays invertible at every zoom and pans',()=>{
 const frames=[{players:[{x:0,y:-8},{x:53.3,y:30}],ball:{x:25,y:15}}];
 for(const zoom of [0,1,2,3])for(const [w,h] of [[1280,720],[640,360]]){const c=broadcastCamera(frames,w,h,{zoom,pan:{x:3,y:4}});for(const p of frames[0].players){const screen=c.point(p.x,p.y),q=c.world(screen.x,screen.y);assert(Math.abs(p.x-q.x)<1e-8);assert(Math.abs(p.y-q.y)<1e-8)}}
});
test('downfield runs left in broadcast and view survives restore',()=>{
 const p=broadcastPlayer({vx:0,vy:8});assert(p.vx<0);assert.equal(p.vy,0);
 assert.equal(restore(JSON.stringify({...initialState(),fieldPresentation:'broadcast'}),[]).fieldPresentation,'broadcast');
});

test('native archive direction order is counterclockwise and broadcast respects it',()=>{
 assert.equal(spriteDirection({vx:-8,vy:0},8),2);
 assert.equal(spriteDirection({vx:8,vy:0},8),6);
 assert.equal(spriteDirection({vx:0,vy:8},8),0);
 assert.equal(spriteDirection({vx:0,vy:-8},8),4);
 assert.equal(spriteDirection(broadcastPlayer({side:'offense',vx:0,vy:8}),8),2);
 assert.equal(spriteDirection(broadcastPlayer({side:'defense',vx:0,vy:-8}),8),6);
 assert.equal(spriteDirection(broadcastPlayer({slot:'QB',status:'Dropback',vx:0,vy:-4}),8),2);
});
