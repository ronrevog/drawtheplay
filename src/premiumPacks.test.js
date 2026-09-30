import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {PREMIUM_PACKS,premiumLineup,premiumOffer,openPremiumPack} from './premiumPacks.js';
import {initialState,restore,recruit,release} from './economy.js';
import {PremiumPacks} from './PremiumPacks.jsx';
const players=JSON.parse(readFileSync(new URL('../public/data/catalog.json',import.meta.url))).players;
const funded=()=>({...initialState(),tokens:200});
test('eight expensive collections have three distinct featured players and correct leaders',()=>{
 assert.equal(PREMIUM_PACKS.length,8);
 for(const p of PREMIUM_PACKS){const lineup=premiumLineup(p,players);assert.equal(lineup.length,3,p.name);assert.equal(new Set(lineup.map(p=>p.id)).size,3);assert(p.cost>=18)}
 assert.deepEqual(premiumLineup(PREMIUM_PACKS[0],players).map(p=>p.name),['Matthew Stafford','Josh Allen','Lamar Jackson']);
 assert.deepEqual(premiumLineup(PREMIUM_PACKS[1],players).map(p=>p.name),['Myles Garrett','Brian Burns','Danielle Hunter']);
 assert.deepEqual(premiumLineup(PREMIUM_PACKS[6],players).map(p=>p.detailPosition),['T','G','C']);
});
test('purchase charges tokens only, persists once-only receipt and grants only the selected player signing rights',()=>{
 for(const pack of PREMIUM_PACKS){const before=funded(),offer=premiumOffer(before,pack.id,players),{state,cards}=openPremiumPack(before,pack.id,players,offer.fresh[0].id);
 assert.equal(state.tokens,200-offer.cost);assert.equal(state.credits,before.credits);assert.deepEqual(state.roster,[]);assert.equal(cards.length,1);assert.deepEqual(state.unlocked,[offer.fresh[0].id]);assert.deepEqual(state.premiumUnlocks,[offer.fresh[0].id]);for(const other of offer.fresh.slice(1))assert.throws(()=>recruit(state,other));assert.equal(before.tokens,200);
 const restored=restore(JSON.stringify(state),players);assert.deepEqual(restored,state);assert.throws(()=>openPremiumPack(restored,pack.id,players),/already been opened/);
 for(const p of cards){const signed=recruit(restored,p);assert(signed.roster.some(r=>r.id===p.id));assert.equal(signed.credits,restored.credits-p.cost);assert.equal(release(signed,p.id).credits,restored.credits)}
 }
});
test('overlapping unlocks, signed players and starters reduce the price without duplicate rewards',()=>{
 const pack=PREMIUM_PACKS[0],lineup=premiumLineup(pack,players),s={...funded(),unlocked:[lineup[0].id],roster:[{id:lineup[1].id,paid:lineup[1].cost}]};
 const offer=premiumOffer(s,pack.id,players);assert.equal(offer.cost,10);assert.deepEqual(offer.fresh.map(p=>p.id),[lineup[2].id]);
 const result=openPremiumPack(s,pack.id,players,lineup[2].id);assert.equal(result.cards.length,1);assert.equal(new Set(result.state.unlocked).size,result.state.unlocked.length);
 const allKnown={...s,unlocked:lineup.map(p=>p.id)};assert.equal(premiumOffer(allKnown,pack.id,players).cost,0);assert.throws(()=>openPremiumPack(allKnown,pack.id,players),/already available/);
 const mocked=players.map(p=>lineup.some(q=>q.id===p.id)?{...p,starter:true,eligible:true}:p);assert.equal(premiumOffer(funded(),pack.id,mocked).cost,0);
 const overlap=openPremiumPack(funded(),'mvp-royalty',players,'00-0026498').state;assert(premiumOffer(overlap,'triple-crown',players).cost<28);
});
test('missing data, insufficient tokens and unknown packs fail without mutation',()=>{
 const s=initialState(),snapshot=structuredClone(s);
 assert.throws(()=>openPremiumPack(s,'mvp-royalty',players,'00-0026498'),/Not enough/);assert.deepEqual(s,snapshot);
 assert.throws(()=>openPremiumPack(funded(),'mvp-royalty',players.filter(p=>p.id!=='00-0026498')),/all three/);
 assert.throws(()=>openPremiumPack(funded(),'unknown',players),/Unknown/);
 const legacy={...funded()};delete legacy.premiumPacks;delete legacy.premiumUnlocks;const restored=restore(JSON.stringify(legacy),players);assert.deepEqual(restored.premiumPacks,[]);assert.deepEqual(restored.premiumUnlocks,[]);
 assert.throws(()=>recruit(funded(),players.find(p=>p.name==='Myles Garrett')),/not currently recruitable/);
});
test('selection is required and must belong to the available lineup',()=>{
 const s=funded();
 for(const selected of [undefined,'not-a-player',players.find(p=>p.position==='K').id])assert.throws(()=>openPremiumPack(s,'mvp-royalty',players,selected),/Choose one/);
 const chosen='00-0026498';const known={...s,unlocked:[chosen]};assert.throws(()=>openPremiumPack(known,'mvp-royalty',players,chosen),/Choose one/);
 const result=openPremiumPack(s,'mvp-royalty',players,chosen);
 const signed=recruit(result.state,result.cards[0]);const released=restore(JSON.stringify(release(signed,chosen)),players);
 assert.throws(()=>openPremiumPack(released,'mvp-royalty',players,'00-0034857'),/already been opened/);
 assert.deepEqual(s.unlocked,[]);assert.equal(s.tokens,200);
});
test('premium gallery renders eight covers, lineups and disabled affordable-state buttons',()=>{
 const html=renderToStaticMarkup(React.createElement(PremiumPacks,{state:initialState(),players,onBuy:()=>{},onInspect:()=>{}}));
 for(const p of PREMIUM_PACKS){assert(html.includes(`/packs/${p.id}.png`));assert(html.includes(p.name))}
 assert(html.includes('Need 25 more tokens'));assert(html.includes('Myles Garrett'));assert(html.includes('disabled'));
 assert.equal((html.match(/type="radio"/g)||[]).length,24);assert(html.includes('CHOOSE 1 OF 3'));assert(html.includes('1 player unlock'));
});
