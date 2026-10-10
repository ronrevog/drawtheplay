import {test} from 'node:test';
import assert from 'node:assert/strict';
import {finishTurnover} from './turnoverReturn.js';
import {footballTraits} from './footballPhysics.js';
import {createRng} from './engine/rng.ts';
const sim=(kind,offX=45)=>({kind,spot:25,yards:10,playerName:'Runner',people:[{slot:'CB1',side:'defense',id:'cb',name:'Corner',traits:footballTraits({overall:90},'DB')},{slot:'WR1',side:'offense',id:'wr',name:'Runner',traits:footballTraits({overall:60},'WR')}],events:[{type:kind==='interception'?'Interception':'Fumble',by:kind==='interception'?'CB1':'WR1'}],frames:[{t:1,carrier:kind==='interception'?'CB1':'WR1',ball:{x:25,y:10,z:.3},players:[{slot:'CB1',side:'defense',x:25,y:10,vx:0,vy:0},{slot:'WR1',side:'offense',x:offX,y:10,vx:0,vy:0}]}]});
test('interceptor returns toward opposite goal and can score a pick six',()=>{
 const input=sim('interception'),copy=structuredClone(input),out=finishTurnover(input,createRng('return'));
 assert.deepEqual(input,copy);assert(out.returnYards>0);assert.equal(out.recoverySide,'defense');assert(out.frames.some(f=>f.phase==='Turnover return'));assert(out.events.some(e=>e.type==='Touchdown'));assert.equal(out.yards,-25);
});
test('fumbles have a loose ball and recoveries belong to the player who reaches it',()=>{
 const input=sim('fumble',25);input.frames[0].players[0].x=48;
 const out=finishTurnover(input,createRng('fumble'));assert.equal(out.recoverySide,'offense');assert(out.events.some(e=>e.type==='Recovery'&&e.side==='offense'));assert(out.frames.some(f=>f.phase==='Loose ball'&&!f.carrier));
 for(const frame of out.frames)if(frame.carrier){const p=frame.players.find(p=>p.slot===frame.carrier);assert(Math.hypot(p.x-frame.ball.x,p.y-frame.ball.y)<.01)}
});
