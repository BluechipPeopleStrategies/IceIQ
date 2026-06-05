// apply-review.mjs — ingest the verdict JSON exported from the review sheet and
// turn it into action: list approvals, and write a rework packet (the flagged
// questions + your notes) ready to send back to ChatGPT/Gemini or to Claude.
//
// Usage:  node scripts/apply-review.mjs <verdict.json> <questions.json>
//   e.g.  node scripts/apply-review.mjs ~/Downloads/review-verdict.json docs/ai-pipeline/reviewed-incoming.json

import { readFileSync, writeFileSync } from "node:fs";

const [verdictPath, questionsPath] = process.argv.slice(2);
if (!verdictPath || !questionsPath) {
  console.error("usage: node scripts/apply-review.mjs <verdict.json> <questions.json>");
  process.exit(2);
}

const verdict = JSON.parse(readFileSync(verdictPath, "utf8"));
const questions = JSON.parse(readFileSync(questionsPath, "utf8"));
const byId = new Map(questions.map((q) => [q.id, q]));

const approve = [], rework = [], missing = [];
for (const d of verdict.decisions || []) {
  if (d.verdict === "approve") approve.push(d.id);
  else if (d.verdict === "rework") {
    const q = byId.get(d.id);
    if (!q) { missing.push(d.id); continue; }
    rework.push({ ...q, _reviewNote: d.note || "(no note — reviewer flagged for rework)" });
  }
}

console.log(`Verdict from ${verdictPath}`);
console.log(`  approved: ${approve.length}`);
console.log(`  rework:   ${rework.length}`);
if (missing.length) console.log(`  ⚠ flagged ids not found in ${questionsPath}: ${missing.join(", ")}`);

if (rework.length) {
  const out = "docs/ai-pipeline/rework.json";
  writeFileSync(out, JSON.stringify(rework, null, 2) + "\n");
  console.log(`\nWrote ${rework.length} item(s) needing work → ${out}`);
  console.log("Each carries a _reviewNote. Next step, either:");
  console.log("  • paste rework.json into ChatGPT (PROMPT B) with: \"Address each _reviewNote, return corrected JSON.\"");
  console.log("  • or tell Claude: \"Rework the questions in rework.json per their notes.\"");
  console.log("\nNotes:");
  for (const q of rework) console.log(`  - ${q.id}: ${q._reviewNote}`);
}
if (approve.length) {
  console.log(`\nApproved ids (already in bank if this batch was merged):`);
  console.log("  " + approve.join(", "));
}
