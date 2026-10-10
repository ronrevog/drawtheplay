import test from 'node:test';import assert from 'node:assert/strict';import {pullDistance,canPullRefresh,PULL_THRESHOLD} from './pullRefresh.js';
test('refresh needs a deliberate downward gesture',()=>{const start={x:100,y:100};assert.equal(pullDistance(start,{clientX:100,clientY:90}),0);assert.equal(pullDistance(start,{clientX:200,clientY:120}),0);assert.ok(pullDistance(start,{clientX:105,clientY:200})>=PULL_THRESHOLD);assert.ok(pullDistance(start,{clientX:100,clientY:130})<PULL_THRESHOLD)});
test('gameplay and scrolled pages cannot start refresh',()=>{const doc={body:{classList:{contains:()=>true}},scrollingElement:{scrollTop:0}};assert.equal(canPullRefresh(null,doc),false);doc.body.classList.contains=()=>false;doc.scrollingElement.scrollTop=20;assert.equal(canPullRefresh(null,doc),false)});

test('sign-in loading screen cannot trigger another refresh',()=>{assert.equal(canPullRefresh(null,{querySelector:()=>({})}),false)});
