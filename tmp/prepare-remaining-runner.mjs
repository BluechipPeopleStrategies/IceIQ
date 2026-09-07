import fs from 'node:fs';
const template=fs.readFileSync('tmp/apply-packet20.mjs','utf8');
fs.writeFileSync('tmp/apply-remaining-packet.mjs',template.replace("const folder=`${dir}/packet-20`;","const packet=Number(process.argv[2]);if(!Number.isInteger(packet)||packet<21||packet>34)throw Error('Expected packet21–34');\nconst folder=`${dir}/packet-${packet}`;").replaceAll('claude-packet-20-repairs.json','claude-packet-${packet}-repairs.json').replaceAll('packet-20-final-recheck.json','packet-${packet}-final-recheck.json'));
