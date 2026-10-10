import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DEPTH_ROWS,depthStarters,setDepthPlayer} from './depthChart.js';
import {fieldPlayers,DEFAULT_PLAYS} from './playbook.js';
import {lineup} from './liveSimulation.js';
import {specialLineup} from './specialTeams.js';
import {initialState,restore,release} from './economy.js';
const player=(id,position,detailPosition,overall=80)=>({id,name:id,position,detailPosition,overall,number:'70'});
const roster=[player('lt','OL','T'),player('rt','OL','T'),player('lg','OL','G'),player('rg','OL','G'),player('c','OL','C'),player('backup','OL','T',70),player('de1','DL','DE'),player('de2','DL','DE'),player('dt1','DL','DT'),player('dt2','DL','DT'),player('w','LB','OLB'),player('m','LB','MLB'),player('s','LB','OLB'),player('cb1','DB','CB'),player('cb2','DB','CB'),player('fs','DB','FS'),player('ss','DB','SS'),player('p','P','P'),player('k','K','K'),player('ls','LS','LS'),player('receiver','WR','WR'),player('returner','WR','WR',70)];
test('specific positions populate offense and defense without duplicate starters',()=>{
 const depth={LT:['rt'],RT:['lt'],LG:['lg'],RG:['rg'],C:['c'],WLB:['w'],MLB:['m'],SLB:['s'],LCB:['cb1'],RCB:['cb2'],FS:['fs'],SS:['ss']};
 const f=fieldPlayers(roster,depth);assert.equal(f.LT.id,'rt');assert.equal(f.C.id,'c');assert.equal(f.RT.id,'lt');
 const people=lineup(DEFAULT_PLAYS[0],'Cover 2',roster,roster,depth,depth);
 assert.equal(people.find(p=>p.slot==='LB2').id,'m');assert.equal(people.find(p=>p.slot==='S1').id,'fs');
 for(const unit of ['Offense','Defense']){const ids=Object.values(depthStarters(roster,depth,unit)).map(p=>p.id);assert.equal(ids.length,new Set(ids).size)}
});
test('depth edits survive saves and release clears slot assignments',()=>{
 const depth=setDepthPlayer(roster,{},'LT',0,'backup');assert.equal(fieldPlayers(roster,depth).LT.id,'backup');
 const state={...initialState(),depth,roster:roster.map(p=>({id:p.id,paid:0}))};assert.deepEqual(restore(JSON.stringify(state),roster).depth,depth);
 assert(!release(state,'backup').depth.LT.includes('backup'));
});
test('selected returners and holders take special-team snaps',()=>{
 const depth={KR:['returner'],PR:['returner'],H:['p']};
 assert.equal(specialLineup('kickoff',roster,roster,35,{},depth).find(p=>p.slot==='KR').id,'returner');
 assert.equal(specialLineup('punt',roster,roster,35,{},depth).find(p=>p.slot==='KR').id,'returner');
 assert.equal(specialLineup('fg',roster,roster,65,depth).find(p=>p.slot==='H').id,'p');
 assert(DEPTH_ROWS.some(r=>r.slot==='LS'));
});
