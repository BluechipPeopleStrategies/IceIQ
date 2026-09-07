import fs from 'node:fs';
let s=fs.readFileSync('tmp/apply-packet35.mjs','utf8').replace('packet>35','packet>36');fs.writeFileSync('tmp/apply-packet36.mjs',s);
for(const f of ['tools/audit-experimental-coaching.mjs','tools/audit-question-expansion.mjs']){let t=fs.readFileSync(f,'utf8').replace("'packet-35-final-recheck.json'","'packet-35-final-recheck.json','packet-36-final-recheck.json'");fs.writeFileSync(f,t);}
const f='tools/build-question-review-summary.mjs';s=fs.readFileSync(f,'utf8').replace(' Full evidence: [packet application receipt]',' Packet 36 repairs the two-on-one roster/pass line, a wall contest drawn in open ice and unsupported receiving/support claims: [receipt](packet-36/application-receipt.json). Full evidence: [packet application receipt]');fs.writeFileSync(f,s);
