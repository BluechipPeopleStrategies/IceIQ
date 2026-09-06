import test from 'node:test';import assert from 'node:assert/strict';
import {reviewResponse} from './experimentalBankCore.js';
const q={type:'sequence',basis:'coaching',options:[{id:'a'},{id:'b'},{id:'c'}],answer:['a','b','c'],explanation:'Check pressure again.'};
test('matching suggested sequences receive explicit acknowledgement without correctness telemetry',()=>{const r=reviewResponse(q,['a','b','c']);assert.match(r.heading,/Yep, you got it/);assert.equal(r.matched,null);assert.equal(r.suggestionMatched,true);});
test('different coaching sequences prompt comparison without declaring them wrong',()=>{const r=reviewResponse(q,['b','a','c']);assert.match(r.heading,/differs/);assert.equal(r.matched,null);assert.equal(r.suggestionMatched,false);});
test('scene questions acknowledge correctness and multi answers ignore selection order',()=>{const s={...q,type:'multi',basis:'scene',answer:['a','b']};assert.equal(reviewResponse(s,['b','a']).heading,'Yep, you got it.');assert.equal(reviewResponse(s,['c']).matched,false);});
test('ungraded positions and reflection never claim correctness',()=>{for(const s of [{type:'position',basis:'coaching'},{type:'explain',basis:'coaching'}]){const r=reviewResponse(s,s.type==='position'?{x:0,y:0}:'');assert.equal(r.matched,null);assert.equal(r.suggestionMatched,null);}});
