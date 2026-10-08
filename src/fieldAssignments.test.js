import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {FieldAssignments} from './FieldAssignments.jsx';
const props={camera:{point:(x,y)=>({x,y}),scale:1},size:{width:640,height:400},play:{formation:'Shotgun',type:'pass',target:'WR1',reads:['WR1'],routes:{WR1:[[10,60],[20,30]],LT:[[38,60],[38,65]]}},frame:{players:[]},home:true,coach:true,defensePlan:{},stroke:[[10,60],[20,30]]};
const render=overrides=>renderToStaticMarkup(React.createElement(FieldAssignments,{...props,...overrides}));
test('live and replay fields never display assignment ink, even with coach or a stale stroke',()=>{
 for(const home of [true,false])for(const coach of [true,false])assert.equal(render({active:true,home,coach}),'');
});
test('kickoff, punt, field goal and PAT setups hide saved scrimmage routes',()=>{
 for(const special of ['kickoff','punt','fg','pat'])for(const home of [true,false])assert.equal(render({active:false,special,home}),'');
});
test('pre-snap primary route is red with an arrow; line protection ends in a bar',()=>{
 const html=render({active:false,stroke:null});
 assert(html.includes('stroke="#ff5252"'));assert(!html.includes('#d6fa70'));
 assert.equal((html.match(/marker-end=/g)||[]).length,1);
 assert(html.includes('stroke="#9dd9ff" stroke-width="3"'));
});
