import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {LEGEND_PLAYERS,LEGEND_PACKS,withLegendPlayers} from './legendPlayers.js';
import {initialState,recruit,restore,release,packPool,PACKS} from './economy.js';
import {PREMIUM_PACKS,premiumLineup,openPremiumPack} from './premiumPacks.js';
import {DEFAULT_PLAYS,fieldPlayers} from './playbook.js';
import {lineup} from './liveSimulation.js';
import {PremiumPacks} from './PremiumPacks.jsx';
const current=JSON.parse(readFileSync(new URL('../public/data/catalog.json',import.meta.url))).players;
const players=withLegendPlayers(current);
test('each guaranteed legend unlocks, signs, restores and takes the field with his traits',()=>{
 for(const legend of LEGEND_PLAYERS){
  const before={...initialState(),tokens:100},snapshot=structuredClone(before);
  assert.throws(()=>recruit(before,legend),/not currently recruitable/);
  const opened=openPremiumPack(before,legend.id,players,legend.id);
  assert.deepEqual(opened.cards,[legend]);assert.equal(opened.state.tokens,80);
  assert.deepEqual(before,snapshot);
  const signed=recruit(opened.state,legend);
  signed.depth={QB:[legend.id]};
  const saved=restore(JSON.stringify(signed),players);
  assert.deepEqual(saved,signed);assert.equal(saved.credits,before.credits-legend.cost);
  const roster=saved.roster.map(r=>players.find(p=>p.id===r.id));
  assert.equal(fieldPlayers(roster,saved.depth).QB.id,legend.id);
  const qb=lineup(DEFAULT_PLAYS[0],'Cover 2',roster,[],saved.depth).find(p=>p.slot==='QB');
  assert.equal(qb.id,legend.id);assert.equal(qb.number,legend.number);
  for(const [trait,value] of Object.entries(legend.legendTraits))assert.equal(qb.traits[trait],value);
  assert.throws(()=>openPremiumPack(saved,legend.id,players,legend.id),/already been opened/);
  assert.equal(release(saved,legend.id).credits,before.credits);
 }
});
test('legends stay outside ordinary packs and leave existing special lineups unchanged',()=>{
 assert.equal(players.length,current.length+5);
 assert.equal(withLegendPlayers(players).length,players.length);
 for(const pack of PACKS)assert(packPool(initialState(),pack,players).every(p=>!p.legend));
 for(const pack of PREMIUM_PACKS)assert.deepEqual(premiumLineup(pack,players),premiumLineup(pack,current));
});
test('five illustrated legend packs render guaranteed selections and valid covers',()=>{
 const html=renderToStaticMarkup(React.createElement(PremiumPacks,{state:{...initialState(),tokens:100},players,onBuy:()=>{},onInspect:()=>{}}));
 for(const pack of LEGEND_PACKS){
  assert(existsSync(new URL(`../public/packs/${pack.id}.png`,import.meta.url)));
  assert(html.includes(`Unlock ${pack.name}`));
 }
 assert.equal((html.match(/GUARANTEED LEGEND/g)||[]).length,5);
 assert.equal((html.match(/type="radio"/g)||[]).length,29);
});
