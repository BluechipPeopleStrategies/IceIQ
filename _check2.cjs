// check banned trailing patterns
const fs = require('fs');
const src = fs.readFileSync('C:/Users/mtsli/IceIQ/_check.js', 'utf8');
// extract distractors
const re = /'([^'\\]*(?:\\.[^'\\]*)*)'/g;
let m;
const bannedEndings = [' hard', ' now', ' really', ' soon', ' here'];
const bannedPhrases = [" — you'll figure the rest out later", " — that's a bad read", " — it's not the right call", ' and hope for the best'];
const bannedConn = [' the', ' a', ' and', ' or', ' for', ' with', ' from'];
const strs = [];
while ((m = re.exec(src))) {
  strs.push(m[1]);
}
for (const s of strs) {
  for (const e of bannedEndings) {
    if (s.endsWith(e)) console.log('BAD END', JSON.stringify(e), '::', s);
  }
  for (const p of bannedPhrases) {
    if (s.includes(p)) console.log('BAD PHRASE', JSON.stringify(p), '::', s);
  }
  for (const c of bannedConn) {
    if (s.endsWith(c)) console.log('BAD CONN', JSON.stringify(c), '::', s);
  }
}
console.log('done');
