import {readFileSync,writeFileSync} from 'node:fs';
const file='src/App.jsx';
let source=readFileSync(file,'utf8');
const target='padding:".95rem 1.1rem"';
const count=source.split(target).length-1;
if(count!==3)throw Error(`Expected three answer renderers; found ${count}.`);
source=source.replaceAll(target,'padding:".55rem .8rem", minHeight:44');
writeFileSync(file,source);
console.log(`Tightened ${count} answer renderers without changing inter-answer gaps.`);
