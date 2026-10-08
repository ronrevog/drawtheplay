import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSpriteCache} from './playerSprites.js';
test('pending artwork remains loading and resolved artwork is immediately available on re-entry',async()=>{
 let finish,calls=0;const cache=createSpriteCache(()=>{calls++;return new Promise(resolve=>{finish=resolve})});
 assert.equal(cache.get(),undefined);
 const first=cache.load();assert.equal(first,cache.load());await Promise.resolve();
 assert.equal(cache.get(),undefined);
 const pack={image:'ready'};finish(pack);await first;
 assert.equal(cache.get(),pack);assert.equal(await cache.load(),pack);assert.equal(calls,1);
});
test('missing artwork settles on fallback once and does not restart or swap on re-entry',async()=>{
 let calls=0;const cache=createSpriteCache(()=>{calls++;throw Error('missing')});
 assert.equal(await cache.load(),null);assert.equal(cache.get(),null);await cache.load();assert.equal(calls,1);
});
