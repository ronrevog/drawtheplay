import test from 'node:test';
import assert from 'node:assert/strict';
import {playerFootAnchor,spriteFootPoint} from './playerFootAnchor.js';
test('feet ignore transparent padding and upper-body pixels',()=>{
 const pixels=new Uint8ClampedArray(20*30*4);
 for(const [x,y] of [[0,0],[19,5],[6,24],[12,25]])pixels[(y*20+x)*4+3]=255;
 assert.deepEqual(playerFootAnchor(pixels,20,30),{x:9.5,y:26});
});
test('foot follows mirrored frames, offsets and camera scales',()=>{
 for(const scale of [.2,.5,1,2,3.5])for(const flags of [0,2]){
  const at={x:201.4,y:350.8},ref={x:-17,y:-40,flags},s={width:40},foot={x:12,y:88};
  const result=spriteFootPoint(at,ref,s,foot,scale);
  assert.equal(result.y,Math.round(at.y-40*scale)+88*scale);
  assert.equal(result.x,Math.round(at.x-17*scale)+(flags?28:12)*scale);
 }
});
