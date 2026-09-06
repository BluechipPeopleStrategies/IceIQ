import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
const root=new URL('../dist/',import.meta.url);
const files=fs.readdirSync(new URL('assets/',root)).filter(f=>f.endsWith('.js'));
for(const file of files){const text=fs.readFileSync(new URL('assets/'+file,root),'utf8');assert(!text.includes('/__coaching-feedback'),`Local feedback API leaked into production bundle: ${file}`);assert(!text.includes('X-Feedback-Owner'),`Local owner token leaked: ${file}`);}
assert(!fs.existsSync(new URL('docs/factory/coaching-panel/admin.html',root)),'Local admin page emitted to production');
console.log('PASS: local feedback endpoint, browser-owner transport and administrator HTML excluded from production build.');
