import test from 'node:test';
import assert from 'node:assert/strict';
import {materialColor,playerSkinTone} from './playerAppearance.js';
import {TEAM_IDENTITIES} from './teamIdentities.js';
import {fieldPalettes} from './teamColors.js';
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
test('all 52 selected identities preserve all uniform channels and skin through possession changes',()=>{
 assert.equal(TEAM_IDENTITIES.length,52);
 for(const team of TEAM_IDENTITIES)for(const possession of ['home','away']){
  const colors=fieldPalettes(team.name,'KC',team.primary,possession,team.secondary,team.tertiary);
  const own=possession==='home'?colors.offense:colors.defense;
  assert.deepEqual(materialColor(1,255,own,'#583924'),rgb(team.primary));
  assert.deepEqual(materialColor(2,255,own,'#583924'),rgb(team.secondary));
  assert.deepEqual(materialColor(3,255,own,'#583924'),rgb(team.tertiary));
  assert.deepEqual(materialColor(4,255,own,'#583924'),rgb('#583924'));
 }
});
test('custom colors and dark skin remain independent, including black uniforms',()=>{
 const palette={primary:'#000000',secondary:'#cd7821',tertiary:'#13a4ff'};
 assert.deepEqual(materialColor(1,255,palette,'#482919'),[0,0,0]);
 assert.deepEqual(materialColor(3,255,palette,'#482919'),[19,164,255]);
 assert.deepEqual(materialColor(4,255,palette,'#482919'),[72,41,25]);
 assert.deepEqual(materialColor(4,128,palette,'#482919'),[36,21,13]);
});
test('appearance uses player identity or an explicit override, not team or name',()=>{
 const a={id:'test-missing',name:'One',side:'offense'};
 assert.equal(playerSkinTone(a),playerSkinTone({...a,name:'Another',side:'defense'}));
 assert.equal(playerSkinTone({...a,skinTone:'#482919'}),'#482919');
 assert.equal(playerSkinTone({...a,skinTone:'invalid'}),playerSkinTone(a));
});
test('paired tackle artwork has independent opponent uniform and complexion channels',()=>{
 const own={primary:'#ff0000',secondary:'#ffff00',tertiary:'#ffffff'},opponent={primary:'#0000ff',secondary:'#eeeeee',tertiary:'#cccccc'};
 assert.deepEqual(materialColor(5,255,own,'#aa8866',opponent,'#553322'),[0,0,255]);
 assert.deepEqual(materialColor(6,255,own,'#aa8866',opponent,'#553322'),[238,238,238]);
 assert.deepEqual(materialColor(8,255,own,'#aa8866',opponent,'#553322'),[85,51,34]);
 assert.deepEqual(materialColor(1,255,own,'#aa8866',opponent,'#553322'),[255,0,0]);
});
