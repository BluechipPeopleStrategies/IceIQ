import { readFileSync, writeFileSync } from "fs";
const c = JSON.parse(readFileSync("./candidates.json", "utf8"));

function chunk(arr, n) {
  const size = Math.ceil(arr.length / n);
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const u9 = chunk(c["U9 / Novice"], 3);
const u11 = chunk(c["U11 / Atom"], 3);
writeFileSync("./batch_u9_1.json", JSON.stringify(u9[0], null, 2));
writeFileSync("./batch_u9_2.json", JSON.stringify(u9[1], null, 2));
writeFileSync("./batch_u9_3.json", JSON.stringify(u9[2], null, 2));
writeFileSync("./batch_u11_1.json", JSON.stringify(u11[0], null, 2));
writeFileSync("./batch_u11_2.json", JSON.stringify(u11[1], null, 2));
writeFileSync("./batch_u11_3.json", JSON.stringify(u11[2], null, 2));
console.log(`U9 chunks: ${u9.map(x => x.length).join(", ")}`);
console.log(`U11 chunks: ${u11.map(x => x.length).join(", ")}`);
