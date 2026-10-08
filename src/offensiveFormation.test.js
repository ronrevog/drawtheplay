import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_PLAYS,LIBRARY_PLAYS,positionPlayer,offensiveAlignment,validPlay} from './playbook.js';
import {formationRules} from './offensiveFormation.js';
import {resolveLivePlay} from './liveSimulation.js';
import {initialState,restore} from './economy.js';
const base=DEFAULT_PLAYS[0];
const simulate=play=>resolveLivePlay({play,coverage:'Cover 2',offense:[],defense:[],seed:'formation-rules'});
test('all stock formations have seven on the line and four backs',()=>{
 for(const play of [...DEFAULT_PLAYS,...LIBRARY_PLAYS]){const r=formationRules(play);assert(r.legal,r.errors.join(' '));assert.equal(r.onLine.length,7);assert.equal(r.backfield,4);}
});
test('moving an end off the line blocks an illegal snap, then moving TE up restores eligibility',()=>{
 let play=positionPlayer(base,'WR2',[88,65]);assert.equal(formationRules(play).legal,false);assert.throws(()=>simulate(play),/at least 7/);
 play=positionPlayer(play,'TE',[72,61]);const r=formationRules(play);assert(r.legal,r.errors.join(' '));assert.deepEqual(r.ends,['WR1','TE']);assert(r.eligible.includes('WR2'));
 assert.equal(simulate(play).frames[0].players.find(p=>p.slot==='WR2').y,-3.75);
});
test('covered receivers are excluded and reporting ineligible outside the core is rejected',()=>{
 const play=positionPlayer(base,'TE',[72,61]);assert(formationRules(play).covered.includes('TE'));assert(!formationRules(play).eligible.includes('TE'));
 assert(!formationRules({...play,reports:{TE:'ineligible'}}).legal);
});
test('eight on the line is legal with an ineligible core player and only four pass targets',()=>{
 let play=positionPlayer(base,'RG',[55,61]);play=positionPlayer(play,'RT',[60,61]);play=positionPlayer(play,'TE',[57.5,61]);play={...play,reports:{TE:'ineligible'}};
 const rules=formationRules(play);assert(rules.legal,rules.errors.join(' '));assert.equal(rules.onLine.length,8);assert.equal(rules.eligible.length,4);
 const result=simulate(play);assert(!result.events.some(e=>e.type==='Throw'&&e.to==='TE'));assert(result.frames.some(f=>f.players.some(p=>p.slot==='TE'&&['Pass set','Protecting'].includes(p.status))));
});
test('an eligible-numbered player and a reported lineman both need an eligible alignment',()=>{
 let play=positionPlayer(base,'LT',[3,61]);play=positionPlayer(play,'WR1',[43,61]);
 play={...play,reports:{LT:'eligible',WR1:'ineligible'}};const r=formationRules(play);assert(r.legal,r.errors.join(' '));assert(r.eligible.includes('LT'));assert(!r.eligible.includes('WR1'));
 assert(!formationRules({...base,reports:{LT:'eligible'}}).legal);
});
test('moving a player translates the route and custom formation survives saved play reload',()=>{
 const play=positionPlayer(base,'WR3',[32,68]);assert(validPlay(play));assert.equal(play.routes.WR3[0][0]-base.routes.WR3[0][0],7);
 const saved=restore(JSON.stringify({...initialState(),plays:[play]}),[]);assert.deepEqual(saved.plays[0],play);
 assert.deepEqual(offensiveAlignment(saved.plays[0]).find(p=>p[0]==='WR3'),['WR3',32,68]);
 assert(!validPlay({...play,positions:{WR3:[NaN,61]}}));
});
test('run blocking, route releases and pursuit differ by assignment',()=>{
 const pass=simulate(LIBRARY_PLAYS[5]);const statuses=new Set(pass.frames.flatMap(f=>f.players.map(p=>p.status)));
 assert(statuses.has('Route stem'));assert(statuses.has('Edge rush'));assert(statuses.has('Interior rush'));
 const run=simulate(LIBRARY_PLAYS[7]);assert(run.frames.some(f=>f.players.some(p=>p.slot==='WR1'&&['Run fit','Driving'].includes(p.status))));
 assert(run.frames.some(f=>f.players.some(p=>['Safety support','Outside contain'].includes(p.status))));
 assert.deepEqual(run,simulate(LIBRARY_PLAYS[7]));
});
test('receiver ratings affect reaction timing instead of a shared release clock',()=>{
 const offense=[{id:'fast',name:'Quick Reader',position:'WR',overall:99,number:11},{id:'slow',name:'Slow Reader',position:'WR',overall:40,number:12}];
 const result=resolveLivePlay({play:base,coverage:'Cover 2',offense,defense:[],seed:'release-ratings'});
 const frame=result.frames.find(f=>f.t===.3);
 assert.equal(frame.players.find(p=>p.slot==='WR1').status,'Route stem');
 assert.equal(frame.players.find(p=>p.slot==='WR2').status,'Read snap');
});
