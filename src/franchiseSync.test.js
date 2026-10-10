import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from './economy.js';
import {saveText,hasProgress,reconcileSave} from './franchiseSync.js';
test('new devices download existing progress; legacy progress stays identifiable',()=>{
 assert.equal(hasProgress(initialState()),false);
 assert.equal(hasProgress({...initialState(),name:'My Bills'}),true);
 assert.equal(hasProgress({...initialState(),history:[{id:'played'}]}),true);
 assert.equal(reconcileSave('old','old','new'),'cloud');
 assert.equal(reconcileSave('new','old','old'),'upload');
 assert.equal(reconcileSave('phone',null,'pc'),'conflict');
 assert.equal(reconcileSave('phone','base','pc'),'conflict');
 assert.equal(reconcileSave('same',null,'same'),'cloud');
 assert.equal(reconcileSave('local',null,null),'upload');
});
test('cloud save retains players and box scores without replay frame payloads',()=>{
 const s={...initialState(),roster:[{id:'qb',paid:1}],history:[{boxScore:{yards:400}}],game:{state:{turn:5},last:{simulation:{frames:Array(1000).fill({})},text:'Touchdown'}}};
 const saved=JSON.parse(saveText(s));assert.deepEqual(saved.roster,s.roster);assert.deepEqual(saved.history,s.history);assert.equal(saved.game.last.text,'Touchdown');assert.equal(saved.game.last.simulation,undefined);
});
