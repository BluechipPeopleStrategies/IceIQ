import fs from 'node:fs';
const p='C:/Users/mtsli/IceIQ/tmp/packets-production-release/tools/build-curriculum-coverage.mjs';
let t=fs.readFileSync(p,'utf8');
t=t.replace('>Question basis</h2>','>What answers are based on</h2><p>Read the picture: visible facts with a definite answer. Choose or explain a play: coaching suggestions where other choices may be defensible. These categories are not quality ratings.</p>');
t=t.replace('esc(k)',"esc(k==='scene'?'Read the picture':k==='coaching'?'Choose or explain a play':k)");
fs.writeFileSync(p,t);
