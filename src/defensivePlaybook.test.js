import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEFENSIVE_PLAYS,DEFENSIVE_FORMATIONS,defensivePackage} from './defensivePlaybook.js';
import {lineup,resolveLivePlay} from './liveSimulation.js';
import {DEFAULT_PLAYS,DEFENSES} from './playbook.js';
const players=JSON.parse(readFileSync(new URL('../public/data/catalog.json',import.meta.url))).players;
const offense=players.filter(p=>p.eligible&&p.team==='KC'),defense=players.filter(p=>p.eligible&&p.team==='BUF');
test('25 unique calls cover every front with man, zone and blitz',()=>{
 assert.equal(DEFENSIVE_PLAYS.length,25);assert.equal(new Set(DEFENSIVE_PLAYS.map(p=>p.name)).size,25);
 for(const front of Object.keys(DEFENSIVE_FORMATIONS))for(const type of ['Man','Zone','Blitz'])assert.ok(DEFENSIVE_PLAYS.some(p=>p.formation===front&&p.type===type));
});
test('all calls field eleven unique defenders with correct personnel and executable assignments',()=>{
 for(const call of DEFENSIVE_PLAYS){
  assert.ok(DEFENSES.includes(call.name));const pack=defensivePackage(call.name);
  assert.equal(pack.positions.length,11);assert.equal(Object.keys(pack.plan).length,11);
  const people=lineup(DEFAULT_PLAYS[0],call.name,offense,defense).filter(p=>p.side==='defense');
  assert.equal(new Set(people.map(p=>p.id)).size,11);
  const groups=people.reduce((a,p)=>{const role=defense.find(d=>d.id===p.id).position;a[role]=(a[role]||0)+1;return a},{});
  assert.deepEqual([groups.DL,groups.LB,groups.DB],DEFENSIVE_FORMATIONS[call.formation]);
  const sim=resolveLivePlay({play:DEFAULT_PLAYS[0],coverage:call.name,offense,defense,seed:call.id});
  assert.ok(sim.frames.length>1);assert.ok(sim.frames.every(f=>f.players.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))));
 }
});
