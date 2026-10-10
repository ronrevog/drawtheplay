import {test} from 'node:test';
import assert from 'node:assert/strict';
import {withIncompleteBounce} from './incompletePlayback.js';
import {footballPose} from './footballAnimation.js';
import {interpolateFrame} from './liveSimulation.js';
test('incompletion lands, bounces lower, tumbles and settles without changing outcome',()=>{
 const sim={kind:'incomplete',yards:0,duration:1,events:[{type:'Pass defended'}],frames:[{t:.95,players:[],ball:{x:10,y:19,z:.8}},{t:1,players:[],ball:{x:10,y:20,z:.45},carrier:null}]};const original=structuredClone(sim),result=withIncompleteBounce(sim),tail=result.frames.slice(2);
 assert.deepEqual(sim,original);assert.equal(result.yards,0);assert.deepEqual(result.events,sim.events);assert.equal(result.duration,3);
 const peaks=tail.filter((f,i)=>i>0&&i<tail.length-1&&f.ball.z>tail[i-1].ball.z&&f.ball.z>=tail[i+1].ball.z).map(f=>f.ball.z);
 assert(peaks.length>=2);assert(peaks[0]>peaks[1]);assert.equal(tail.at(-1).ball.z,0);
 const frame=interpolateFrame(result.frames,1.5);assert.equal(footballPose(frame,result.frames,1.5).angle,frame.ballAngle);assert.notEqual(tail[0].ballAngle,tail[10].ballAngle);
 assert.equal(withIncompleteBounce({...sim,kind:'pass'}).frames,sim.frames);
 assert.equal(withIncompleteBounce(result),result);
});
