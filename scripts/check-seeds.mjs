// Run the golden validators over named seed files (or all). Print errs/warns.
// Usage: node scripts/check-seeds.mjs id1 id2 ...   (no args = all seeds)
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runHockeyValidators } from "../src/scenario/validators.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const seedDir = resolve(ROOT, "src/scenario/seeds");
const want = process.argv.slice(2);

let bad = 0;
for (const f of readdirSync(seedDir).filter(f => f.endsWith(".json"))) {
  let seed; try { seed = JSON.parse(readFileSync(join(seedDir, f), "utf8")); } catch { continue; }
  if (want.length && !want.includes(seed.id)) continue;
  const { errs = [], warns = [] } = runHockeyValidators(seed) || {};
  if (errs.length) bad++;
  const mark = errs.length ? "ERR " : warns.length ? "warn" : "ok  ";
  console.log(`${mark} ${seed.id}`);
  for (const e of errs) console.log(`       ✗ ${e}`);
  for (const w of warns) console.log(`       · ${w}`);
}
console.log(bad ? `\n${bad} seed(s) with ERRORS` : "\nno hard errors");
process.exit(bad ? 1 : 0);
