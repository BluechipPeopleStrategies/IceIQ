import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=path.dirname(fileURLToPath(import.meta.url));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'FILE-HASHES.json'),'utf8'));
for(const row of manifest.files){const p=path.resolve(root,row.path);assert(p.startsWith(root+path.sep));const b=fs.readFileSync(p);assert.equal(b.length,row.bytes,row.path);assert.equal(createHash('sha256').update(b).digest('hex'),row.sha256,row.path);}
const a=JSON.parse(fs.readFileSync(path.join(root,'assignment.json'),'utf8'));
assert.equal(a.timeBudgetMinutes,null);assert.equal(a.executionMode,"until-completed");assert.equal(a.checkpointMinutes,30);
console.log(`Verified ${manifest.files.length} package files; completion-driven assignment.`);
