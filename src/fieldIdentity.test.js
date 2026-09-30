import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {PlayerShape} from './PlayerShape.jsx';
import {NFL_COLORS,fieldPalettes,teamPalette,PLAYER_RADIUS} from './teamColors.js';
import {lineup} from './liveSimulation.js';
import {FORMATIONS,DEFENSES,DEFAULT_PLAYS} from './playbook.js';
test('team colors retain identity when offense and defense swap',()=>{
 const a=fieldPalettes('My franchise','KC','#123456','home');
 const b=fieldPalettes('My franchise','KC','#123456','away');
 assert.equal(a.offense.primary,'#123456');assert.equal(a.defense.primary,'#E31837');
 assert.deepEqual(a.offense,b.defense);assert.deepEqual(a.defense,b.offense);
 for(const abbr of 'ARI ATL BAL BUF CAR CHI CIN CLE DAL DEN DET GB HOU IND JAX KC LA LAC LV MIA MIN NE NO NYG NYJ PHI PIT SEA SF TB TEN WAS'.split(' '))assert.match(NFL_COLORS[abbr].primary,/^#[0-9a-f]{6}$/i);
});
test('player geometry follows role regardless of team color',()=>{
 for(const side of ['offense','defense'])for(const team of ['KC','BUF','LV']){
 const html=renderToStaticMarkup(React.createElement(PlayerShape,{side,x:0,y:0,r:PLAYER_RADIUS,palette:teamPalette(team)}));
 assert(html.includes(`data-player-shape="${side==='offense'?'circle':'square'}"`));
 assert(html.includes(side==='offense'?'<circle':'<rect'));
 }
});
test('all formations and coverage looks have separated pre-snap players and neutral zone',()=>{
 for(const formation of Object.keys(FORMATIONS))for(const coverage of DEFENSES){
 const people=lineup({...DEFAULT_PLAYS[0],formation},coverage,[],[]);
 for(const p of people){assert(p.side==='offense'?p.y<0:p.y>0);assert(p.x>0&&p.x<53.3);}
 for(let i=0;i<people.length;i++)for(let j=i+1;j<people.length;j++){
 const a=people[i],b=people[j];assert(Math.hypot(a.x-b.x,a.y-b.y)>PLAYER_RADIUS*2+.2,`${formation} ${coverage}: ${a.slot}/${b.slot}`);
 }
 const qb=people.find(p=>p.slot==='QB');assert(qb.y>=-7&&qb.y<=-2);
 }
});

test('offensive circles and defensive squares have equal filled area',()=>{
 const render=side=>renderToStaticMarkup(React.createElement(PlayerShape,{side,x:0,y:0,r:PLAYER_RADIUS,palette:teamPalette('KC')}));
 const radius=Number(render('offense').match(/ r="([^"]+)"/)[1]);const width=Number(render('defense').match(/ width="([^"]+)"/)[1]);
 assert(Math.abs(Math.PI*radius*radius-width*width)<1e-9);
});
