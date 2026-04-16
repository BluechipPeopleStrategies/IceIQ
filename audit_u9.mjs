import fs from "fs";
const src = fs.readFileSync("C:/Users/mtsli/IceIQ/src/App.jsx", "utf8");
const rx = /\{id:"(u9[qg][^"]+)"[^}]*?opts:\[([^\]]+)\][^}]*?ok:(\d+)[^}]*?\}/g;
let bad = 0, total = 0;
const details = [];
let m;
while ((m = rx.exec(src)) !== null) {
  total++;
  const opts = m[2].split(/,(?=")/).map(s => s.replace(/^"|"$/g, ""));
  const ok = +m[3];
  const lens = opts.map(o => o.length);
  const max = Math.max(...lens);
  if (lens[ok] === max && max !== Math.min(...lens)) {
    bad++;
    details.push({id: m[1], ok, lens, correctLen: lens[ok]});
  }
}
console.log(`U9: ${bad}/${total} still have correct=longest`);
details.forEach(d => console.log(`${d.id} ok=${d.ok} correct=${d.correctLen} lens=[${d.lens.join(",")}]`));
