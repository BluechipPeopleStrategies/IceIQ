import fs from 'node:fs';
let f='tmp/prepare-packet21.mjs',s=fs.readFileSync(f,'utf8');s=s.replace('finish(c,{});',"s=c.get('exp26-u13-002');q(s,7).prompt='What should YOU check with Gold 1 near the route to W?';q(s,7).options[0].text='Whether the direct W outlet is usable';\nfinish(c,{});");fs.writeFileSync(f,s);
