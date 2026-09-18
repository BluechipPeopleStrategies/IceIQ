import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesPreviewCode,previewPlayerId,previewAge} from './previewAccess.js';
test('preview code accepts spaces, dashes and case but rejects guesses',()=>{for(const code of ['FIRST-SHIFT','first shift',' firstshift '])assert.equal(matchesPreviewCode(code),true);for(const code of ['',null,'FIRST','FIRST-SHIFT-extra'])assert.equal(matchesPreviewCode(code),false);});
test('only supported ages are used and preview identities are isolated',()=>{assert.equal(previewAge('U9'),'U9');assert.equal(previewAge('U18'),'U7');assert.equal(previewPlayerId('U7'),'public-preview-v1:U7');assert.notEqual(previewPlayerId('U9'),previewPlayerId('U7'));});
