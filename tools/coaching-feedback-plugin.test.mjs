import test from 'node:test';import assert from 'node:assert/strict';import {validateFeedback} from './coaching-feedback-plugin.mjs';
const pack={directChanges:[{questionId:'q1',afterHash:'exact-question-hash'}]};
test('feedback attaches exact identity without treating it as approval',()=>{const r=validateFeedback({packetSha256:'pack',questionId:'q1',note:' Lane unclear '},pack,'pack');assert.equal(r.afterHash,'exact-question-hash');assert.equal(r.note,'Lane unclear');assert.equal(r.status,'new');});
test('stale, unknown and empty feedback rejected',()=>{for(const v of [{packetSha256:'old',questionId:'q1',note:'test'},{packetSha256:'pack',questionId:'other',note:'test'},{packetSha256:'pack',questionId:'q1',note:' '}])assert.throws(()=>validateFeedback(v,pack,'pack'));});
test('general observations accepted without inventing question identity',()=>{assert.equal(validateFeedback({packetSha256:'pack',questionId:'general',note:'Too much text'},pack,'pack').afterHash,null);});
