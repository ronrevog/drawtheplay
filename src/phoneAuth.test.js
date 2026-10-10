import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePhone,authMessage} from './phoneAuth.js';
test('US phone input normalizes consistently',()=>{for(const p of ['(212) 555-0198','2125550198','12125550198','+1 212 555 0198'])assert.equal(normalizePhone(p),'+12125550198')});
test('invalid or unsupported numbers are rejected',()=>{for(const p of ['','555','+442071234567','2125550198abc','+10125550198'])assert.throws(()=>normalizePhone(p))});
test('auth errors show useful messages without provider internals',()=>{assert.match(authMessage({code:'auth/invalid-verification-code'}),/incorrect/);assert.match(authMessage({code:'auth/too-many-requests'}),/wait/);assert.equal(authMessage({message:'private provider details'}),'Something went wrong. Please try again.')});
