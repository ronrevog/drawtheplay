import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeDefense,DEFENSIVE_SLOTS} from './defensivePlan.js';
import {resolveLivePlay} from './liveSimulation.js';
import {LIBRARY_PLAYS} from './playbook.js';
const args={play:LIBRARY_PLAYS[0],coverage:'Cover 2',offense:[],defense:[],seed:'custom-defense',spot:25};
test('defensive positioning stays behind scrimmage while blitz paths can cross it',()=>{
 const plan=normalizeDefense({CB1:{start:{x:-5,y:-10},type:'blitz',path:[{x:6,y:3},{x:24,y:-7}]},S1:{start:{x:90,y:120},type:'zone',path:[{x:20,y:-8}]}},95);
 assert.deepEqual(plan.CB1.start,{x:.7,y:.8});assert.equal(plan.CB1.path[1].y,-7);
 assert.equal(plan.S1.start.x,52.6);assert(plan.S1.start.y<15);assert.equal(plan.S1.path[0].y,.8);
 assert.deepEqual(normalizeDefense(JSON.parse(JSON.stringify(plan)),95),plan);
});
test('custom position and man target override base coverage',()=>{
 const result=resolveLivePlay({...args,defensePlan:{DE1:{start:{x:8,y:10},type:'man',target:'WR2'}}});
 const first=result.frames[0].players.find(p=>p.slot==='DE1');assert.equal(first.x,8);assert.equal(first.y,10);assert.equal(first.assignment,'WR2');
 assert(result.frames.some(f=>f.players.some(p=>p.slot==='DE1'&&p.status==='Man WR2')));
});
test('zone and blitz follow authored paths; a defense with no rushers remains valid',()=>{
 const plan=Object.fromEntries(DEFENSIVE_SLOTS.map((slot,i)=>[slot,{start:{x:2+i*4,y:12},type:'zone',path:[{x:2+i*4,y:12},{x:2+i*4,y:20}]}]));
 const zones=resolveLivePlay({...args,defensePlan:plan});assert(zones.frames.some(f=>f.players.some(p=>p.status==='Custom zone'&&p.y>12.5)));
 plan.CB1={start:{x:3,y:12},type:'blitz',path:[{x:3,y:12},{x:3,y:17},{x:20,y:-5}]};
 const blitz=resolveLivePlay({...args,defensePlan:plan});assert(blitz.frames.some(f=>f.players.some(p=>p.slot==='CB1'&&p.status==='Blitz path'&&p.y>12.5)));
 assert(blitz.frames.every(f=>f.players.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))));
});
