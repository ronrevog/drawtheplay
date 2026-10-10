import test from 'node:test';
import assert from 'node:assert/strict';
import {inkFor,teamPalette,fieldPalettes} from './teamColors.js';
import {FICTIONAL_TEAMS} from './teamIdentities.js';
test('custom multiplayer team palettes tolerate missing or malformed colors',()=>{for(const value of [null,undefined,'',42,'invalid','#fff']){assert.match(inkFor(value),/^#[0-9a-f]{6}$/i);assert.match(teamPalette('My franchise',value).primary,/^#[0-9a-f]{6}$/i);for(const team of FICTIONAL_TEAMS){const p=fieldPalettes(team.name,'Custom opponent',value,'home');assert.match(p.home.primary,/^#[0-9a-f]{6}$/i);assert.equal(p.offense,p.home);assert.equal(p.defense,p.away)}}});
test('valid franchise colors and known pro palettes remain intact',()=>{assert.equal(teamPalette('My franchise','#123456').primary,'#123456');assert.equal(inkFor('#ffffff'),'#101820');assert.equal(inkFor('#000000'),'#ffffff');assert.equal(fieldPalettes('Wildcats','Sabers','#123456','away','#abcdef').home.secondary,'#abcdef');assert.equal(teamPalette('KC',null).primary,teamPalette('KC').primary)});
