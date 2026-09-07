#!/usr/bin/env node
// Golden test for the curriculum ledger. Loads the REAL src/data/curriculum-ledger.json
// and asserts it validates. CI backstop: if this fails, the curriculum spine is wrong
// and the gauntlet must not generate against it. Run: npm run test:ledger
import { loadLedger, validateLedger } from "./lib/curriculum-ledger.mjs";

const ledger = loadLedger();
const { ok, errs, warns } = validateLedger(ledger);

for (const w of warns) console.log(`WARN  ${w}`);
for (const e of errs) console.log(`FAIL  ${e}`);
console.log(`\nledger v${ledger.meta.version}: ${ledger.concepts.length} concepts, ${ledger.nodes.length} nodes — ${ok ? "VALID" : "INVALID"}`);
process.exit(ok ? 0 : 1);
