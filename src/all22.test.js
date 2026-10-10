import test from 'node:test';
import assert from 'node:assert/strict';
import {all22Camera,projectYards,playerAnimation,spriteDirection} from './all22.js';
test('field stays straight overhead without skew or perspective compression',()=>{
 assert.deepEqual(projectYards(10,20),{x:10,y:-20});
 assert.equal(projectYards(10,80).x,projectYards(10,-10).x);
 assert.equal(projectYards(0,20).y,projectYards(53.3,20).y);
});
import {initialState,restore} from './economy.js';
test('view preference survives reload and invalid values use all-22',()=>{
 assert.equal(restore(JSON.stringify({...initialState(),fieldPresentation:'overhead'}),[]).fieldPresentation,'overhead');
 assert.equal(restore(JSON.stringify({...initialState(),fieldPresentation:'invalid'}),[]).fieldPresentation,'all22');
});
test('all-22 camera contains spread formations and a deep airborne pass in narrow and wide fields',()=>{
 const frames=[{players:[{x:0,y:-8},{x:53.3,y:0},{x:8,y:65}],ball:{x:51,y:85}}];
 for(const [w,h] of [[640,900],[900,400]]){const camera=all22Camera(frames,w,h);for(const p of [...frames[0].players,frames[0].ball]){const q=camera.point(p.x,p.y);assert.ok(q.x>=24&&q.x<=w-24);assert.ok(q.y>=35&&q.y<=h-25)}}
});
test('render actions follow actual carrier and quarterback states',()=>{
 assert.equal(playerAnimation({slot:'QB',status:'Set',vx:0,vy:0},'QB'),'QBSCHK');
 assert.equal(playerAnimation({slot:'QB',status:'Reading',vx:0,vy:0},'QB'),'QBPSET');
 assert.equal(playerAnimation({slot:'QB',status:'Throwing',vx:0,vy:1},null),'QBBULIT');
 assert.equal(playerAnimation({slot:'WR1',status:'Carry',vx:2,vy:6},'WR1'),'RBRNWB');
 assert.equal(playerAnimation({slot:'LT',status:'Protecting'},'QB'),'LMSTAND');
});
test('direction indices wrap at every heading',()=>{for(let i=-40;i<=40;i++){const p={vx:Math.sin(i),vy:Math.cos(i)};for(const count of [1,8,16]){const d=spriteDirection(p,count);assert.ok(Number.isInteger(d)&&d>=0&&d<count)}}});
test('drawing coordinates invert the camera at every zoom and pan',()=>{
 for(const zoom of [0,1,2,3])for(const [w,h] of [[640,350],[640,1000]]){
  const camera=all22Camera([{players:[{x:5,y:-7},{x:50,y:25}]}],w,h,{zoom,pan:{x:8,y:-10},spot:80});
  for(const p of [{x:3,y:-5},{x:26.65,y:0},{x:48,y:17}]){const screen=camera.point(p.x,p.y),q=camera.world(screen.x,screen.y);assert.ok(Math.abs(q.x-p.x)<1e-8);assert.ok(Math.abs(q.y-p.y)<1e-8)}
 }
});

test('phone play view uses field width without empty sideline gutters',()=>{
 const camera=all22Camera([{players:[{x:4,y:-8},{x:49,y:22}]}],390,695);
 assert.ok(camera.point(0,0).x<=5);
 assert.ok(camera.point(53.3,0).x>=385);
 for(const p of [{x:4,y:-8},{x:49,y:22}]){const screen=camera.point(p.x,p.y),world=camera.world(screen.x,screen.y);assert.ok(Math.abs(world.x-p.x)<1e-8);assert.ok(Math.abs(world.y-p.y)<1e-8)}
});

import {ballFollowCamera,broadcastCamera} from './all22.js';
test('zoom tracking centers traveling and airborne balls with an invertible field projection',()=>{
 const frames=[{players:[{x:8,y:-5},{x:45,y:25}],ball:{x:26.65,y:0}}];
 for(const factory of [all22Camera,broadcastCamera])for(const [width,height] of [[390,700],[1280,720]])for(const zoom of [1,2,3]){
  const base=factory(frames,width,height,{zoom,pan:{x:8,y:10}});
  for(const ball of [{x:26.65,y:-8,z:0},{x:4,y:35,z:12},{x:51,y:90,z:0},{x:20,y:-20,z:2}]){
   const camera=ballFollowCamera(base,ball,width,height),screen=camera.point(ball.x,ball.y);
   assert.ok(Math.abs(screen.x-width/2)<1e-8);
   assert.ok(Math.abs(screen.y-ball.z*camera.scale*.65-height/2)<1e-8);
   assert.equal(camera.scale,base.scale);
   const point=camera.point(12,34),world=camera.world(point.x,point.y);
   assert.ok(Math.abs(world.x-12)<1e-8&&Math.abs(world.y-34)<1e-8);
  }
  assert.equal(ballFollowCamera(base,null,width,height),base);
 }
});
