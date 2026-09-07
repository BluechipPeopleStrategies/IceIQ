import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const file='src/visuals/PlayerLocator.test.mjs';
const source=readFileSync(file,'utf8');
const end=source.indexOf('const stageOutput =');
if(end<0)throw Error('Missing boundary between standalone locator and unrelated legacy integration tests.');
const scoped=source.slice(0,end)
 .replace("existsSync, mkdirSync, readFileSync",'existsSync, mkdirSync')
 .replace(/^import .* from 'react(?:-dom\/server)?';\r?\n/gm,'')
 .replace(/^import .* from '\.\.\/one-on-one\/(?:readSequenceCore|readSequenceVisuals)\.js';\r?\n/gm,'')
 .trimEnd()+'\n';
const hash=execFileSync('git',['hash-object','-w','--stdin'],{input:scoped,encoding:'utf8'}).trim();
execFileSync('git',['update-index','--cacheinfo',`100644,${hash},${file}`]);
console.log('Staged standalone locator tests; retained all legacy-renderer integration tests in the working file.');
