import fs from "fs";
const src = fs.readFileSync("C:/Users/mtsli/IceIQ/src/App.jsx", "utf8");
for (const age of ["u7","u9","u11","u13"]) {
  const rx = /\{id:"(AGETOKEN[qg][^"]+)"[^}]*?opts:\[([^\]]+)\][^}]*?ok:(\d+)[^}]*?\}/g;
  const pat = new RegExp(rx.source.replace("AGETOKEN", age), "g");
  let total=0, correctLongest=0, longestByPos=[0,0,0,0];
  let m;
  while ((m=pat.exec(src))!==null) {
    total++;
    const opts=m[2].split(/,(?=")/).map(s=>s.replace(/^"|"$/g,""));
    const ok=+m[3];
    const lens=opts.map(o=>o.length);
    const max=Math.max(...lens);
    const longestIdx=lens.indexOf(max);
    longestByPos[longestIdx]++;
    if(lens[ok]===max) correctLongest++;
  }
  console.log(`${age.toUpperCase()}: ${total} questions`);
  console.log(`  Correct is longest: ${correctLongest}/${total} (${(100*correctLongest/total).toFixed(1)}%)`);
  console.log(`  Longest by position: ${longestByPos.map((v,i)=>`opt${i}=${v}(${(100*v/total).toFixed(0)}%)`).join(" ")}`);
}
