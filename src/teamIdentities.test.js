import {test} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {FICTIONAL_TEAMS,PRO_TEAMS,TEAM_IDENTITIES,selectIdentity,proIdentity} from './teamIdentities.js';
import {TeamIdentity,TeamHelmet} from './TeamIdentity.jsx';
import {initialState,restore} from './economy.js';
test('20 original identities and 32 distinct pro identities have fixed palettes and helmet assets',()=>{
 assert.equal(FICTIONAL_TEAMS.length,20);assert.equal(PRO_TEAMS.length,32);assert.equal(new Set(TEAM_IDENTITIES.map(t=>t.id)).size,52);
 for(const team of TEAM_IDENTITIES){assert([team.primary,team.secondary,team.tertiary].every(c=>/^#[0-9a-f]{6}$/i.test(c)));assert.equal(team.helmet,`/helmets/${team.id}.png`)}
 for(const name of ['Wildcats','Sabers','Orcas','Knights','Reds'])assert(FICTIONAL_TEAMS.some(t=>t.name===name));
 assert.match(FICTIONAL_TEAMS.find(t=>t.id==='reds').design,/rooster/);assert.equal(proIdentity('LAR').code,'LA');
});
test('preset selection preserves roster and restores custom identity; saved presets enforce colors',()=>{
 const custom={...initialState(),name:'My custom team',color:'#112233'};
 const preset=selectIdentity(custom,'wildcats');assert.equal(preset.color,'#F47321');assert.equal(preset.name,'Wildcats');assert.equal(preset.roster,custom.roster);
 const restored=restore(JSON.stringify({...preset,color:'#000000',name:'Changed'}),[]);assert.equal(restored.color,'#F47321');assert.equal(restored.name,'Wildcats');
 const back=selectIdentity(selectIdentity(restored,'pro-kc'),null);assert.equal(back.name,custom.name);assert.equal(back.color,custom.color);assert.equal(back.teamIdentity,null);
 const legacy=restore(JSON.stringify(custom),[]);assert.equal(legacy.teamIdentity,null);assert.equal(legacy.color,custom.color);
});
test('preset picker omits editable color controls and pro helmet uses only local graphic',()=>{
 const html=renderToStaticMarkup(React.createElement(TeamIdentity,{state:selectIdentity(initialState(),'wildcats'),setState:()=>{}}));assert(!html.includes('type="color"'));assert(html.includes('Choose Wildcats'));assert(html.includes('/helmets/wildcats.png'));
 const pro=renderToStaticMarkup(React.createElement(TeamHelmet,{code:'KC'}));assert(pro.includes('/helmets/pro-kc.png'));assert(!pro.includes('logo'));
});

test('changing identity freezes the old palette for an already running game',()=>{const state={...initialState(),game:{name:'My franchise'}};const next=selectIdentity(state,'wildcats');assert.equal(next.game.color,state.color);assert.equal(next.game.teamIdentity,null);assert.equal(next.color,'#F47321');const again=selectIdentity(next,'orcas');assert.equal(again.game.color,state.color)});
