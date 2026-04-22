// Quality-scan for src/data/questions.json. Goes hard.
//
//   node tools/quality-scan.mjs [--md]
//
// Default: prints a prioritized report to stdout.
// --md:    also writes tools/quality-scan-report.md with the full per-question list.
//
// Severity:
//   ERROR   — question is broken or self-contradictory; fix before shipping.
//   WARN    — likely-bad (empty why/tip, weird length, age-vocab mismatch).
//   INFO    — possible redundancy or style nit (duplicate concept, tip==why).
//
// Exit code: 0 always (advisory tool). Scan totals printed at the top.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const qPath = path.join(here, "..", "src", "data", "questions.json");
const writeMd = process.argv.includes("--md");
const mdPath = path.join(here, "quality-scan-report.md");

const bank = JSON.parse(fs.readFileSync(qPath, "utf8"));

// ─────────────────────────────────────────────────────────────────────────────
// CHECK HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const ZONE_KEYS = new Set([
  "net-front","slot","high-slot","left-faceoff","right-faceoff",
  "left-corner","right-corner","behind-net","left-boards","right-boards",
  "left-point","right-point","home-plate",
]);

const PLACEHOLDER_RE = /\b(TODO|FIXME|XXX|TBD|lorem|ipsum|placeholder|temp text)\b/i;

// Vocab the U7/U9 banks should NOT use (hockey IQ words beyond their reading level).
const AGE_TOO_COMPLEX = {
  u7: /\b(forecheck|regroup|breakout|pinch|stretch|f1|f2|f3|d-zone|o-zone|n-zone|high-danger|back-door|one-timer|read|anticipate|tempo|transition|cycle|gap control|stick on puck)\b/i,
  u9: /\b(pre-scan|pinch|stretch|high-danger|cycle|gap control|transition triggers|tempo manipulation|f1|f2|f3)\b/i,
};
// Vocab that's too simple for U15/U18 (flag as potentially patronizing)
const AGE_TOO_SIMPLE = {
  u15: /\b(skate toward|tap your stick|friend|find the net|say hi|goalie wearing)\b/i,
  u18: /\b(friend|helper|little|skate toward|find the net)\b/i,
};

const AGE_FROM_LEVEL = (level) => {
  const m = (level || "").match(/^U(\d+)/i);
  return m ? `u${m[1]}` : null;
};

const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();

// ─────────────────────────────────────────────────────────────────────────────
// PER-QUESTION CHECKS
// ─────────────────────────────────────────────────────────────────────────────
function checkQuestion(q, level, bankByIdGlobal, siblingIndex) {
  const issues = [];
  const err  = (code, msg) => issues.push({ sev: "ERROR", code, msg });
  const warn = (code, msg) => issues.push({ sev: "WARN",  code, msg });
  const info = (code, msg) => issues.push({ sev: "INFO",  code, msg });

  const age = AGE_FROM_LEVEL(level);
  const type = q.type || "mc";

  // ── universal structural checks ────────────────────────────────────────────
  if (!q.id)                  err("no-id", "missing id");
  if (!q.sit)                 err("no-sit", "missing situation text");
  else if (q.sit.length < 10) warn("sit-too-short", `sit only ${q.sit.length} chars: ${q.sit.slice(0,60)}`);
  else if (q.sit.length > 400) warn("sit-too-long", `sit is ${q.sit.length} chars — consider trimming`);

  if (!q.cat)     warn("no-cat",     "missing cat");
  if (!q.concept) warn("no-concept", "missing concept");
  if (!q.d)       warn("no-d",       "missing difficulty (d)");
  else if (![1,2,3].includes(q.d)) warn("d-range", `difficulty d=${q.d} outside 1-3`);

  if (q.pos && !Array.isArray(q.pos)) err("pos-shape", "pos must be an array");
  if (q.pos && Array.isArray(q.pos) && q.pos.length === 0) warn("pos-empty", "pos is empty array");

  if (!q.why) warn("no-why", "missing why (explanation)");
  else if (q.why.length < 8) warn("why-thin", `why only ${q.why.length} chars`);

  if (!q.tip) info("no-tip", "missing tip");
  else if (q.why && norm(q.tip) === norm(q.why)) info("tip-eq-why", "tip duplicates why verbatim");
  else if (q.sit && norm(q.tip) === norm(q.sit)) info("tip-eq-sit", "tip duplicates sit verbatim");

  // placeholder / shouting text
  for (const field of ["sit","why","tip","cat","concept"]) {
    const v = q[field];
    if (!v) continue;
    if (PLACEHOLDER_RE.test(v)) err("placeholder", `${field} contains placeholder text`);
    // ALL CAPS shouting (ignore if short + acronymish)
    if (v.length > 15 && v === v.toUpperCase() && /[A-Z]{5,}/.test(v)) warn("shouting", `${field} is ALL CAPS`);
  }

  // ── age-vocab mismatch ────────────────────────────────────────────────────
  const sitAndWhy = [q.sit, q.why, q.tip].filter(Boolean).join(" ");
  if (age && AGE_TOO_COMPLEX[age] && AGE_TOO_COMPLEX[age].test(sitAndWhy)) {
    info("age-vocab-complex", `contains vocabulary likely too advanced for ${level}`);
  }
  if (age && AGE_TOO_SIMPLE[age] && AGE_TOO_SIMPLE[age].test(sitAndWhy)) {
    info("age-vocab-simple", `contains language likely too simple for ${level}`);
  }

  // ── type-specific checks ──────────────────────────────────────────────────
  if (type === "mc" || type === "mistake" || type === "next") {
    const opts = Array.isArray(q.opts) ? q.opts : [];
    if (opts.length === 0) err("mc-no-opts", "no options");
    else if (opts.length < 2) err("mc-too-few", `only ${opts.length} option(s)`);
    else {
      const seen = new Set();
      opts.forEach((o, i) => {
        if (!o || !String(o).trim()) err("mc-empty-opt", `option ${i+1} is empty`);
        const n = norm(o);
        if (n && seen.has(n)) warn("mc-dup-opt", `option ${i+1} duplicates an earlier option: "${o}"`);
        seen.add(n);
      });
      if (typeof q.ok !== "number") err("mc-no-ok", "missing ok index");
      else if (q.ok < 0 || q.ok >= opts.length) err("mc-ok-range", `ok=${q.ok} outside 0..${opts.length-1}`);
    }
  }

  if (type === "tf") {
    if (typeof q.ok !== "boolean") err("tf-ok-type", `ok must be boolean, got ${typeof q.ok}`);
  }

  if (type === "seq") {
    const items = Array.isArray(q.items) ? q.items : [];
    if (items.length < 3) err("seq-too-few", `only ${items.length} step(s) — need at least 3`);
    const seen = new Set();
    items.forEach((it, i) => {
      if (!it || !String(it).trim()) err("seq-empty", `step ${i+1} is empty`);
      const n = norm(it);
      if (n && seen.has(n)) warn("seq-dup", `step ${i+1} duplicates an earlier step: "${it}"`);
      seen.add(n);
    });
  }

  if (type === "rink") {
    if (!q.scene) { err("rink-no-scene", "no scene object"); return issues; }
    const sc = q.scene;
    const sq = sc.question || {};
    const mode = sq.mode;
    if (!mode) err("rink-no-mode", "scene.question.mode missing");

    if (mode === "choice") {
      const opts = Array.isArray(sq.options) ? sq.options : [];
      if (opts.length === 0) err("rink-choice-no-opts", "choice mode has no options");
      else {
        const haveCorrect = opts.some(o => o && o.verdict === "correct");
        if (!haveCorrect) err("rink-choice-no-correct", "no option has verdict=correct");
        opts.forEach((o, i) => {
          if (!o?.text) err("rink-choice-opt-empty", `option ${i+1} has no text`);
          if (!o?.verdict) err("rink-choice-opt-no-verdict", `option ${i+1} missing verdict`);
          else if (!["correct","partial","wrong"].includes(o.verdict)) err("rink-choice-opt-bad-verdict", `option ${i+1} verdict=${o.verdict}`);
          if (!o?.feedback) warn("rink-choice-opt-no-fb", `option ${i+1} has no feedback`);
        });
      }
    }

    if (mode === "zone-click") {
      const z = sq.zones || {};
      const correct = z.correct || [], partial = z.partial || [], wrong = z.wrong || [];
      if (correct.length === 0) err("rink-zc-no-correct", "zone-click has no correct zones");
      const all = new Set();
      for (const [key, arr] of Object.entries(z)) {
        for (const k of (arr || [])) {
          if (!ZONE_KEYS.has(k) && k !== "home-plate") err("rink-zc-bad-zone", `zone bucket "${key}" references unknown zone "${k}"`);
          if (all.has(k)) err("rink-zc-dup-zone", `zone "${k}" appears in multiple buckets`);
          all.add(k);
        }
      }
      const fb = sq.feedback || {};
      if (!fb.correct) warn("rink-zc-no-correct-fb", "zone-click missing feedback.correct");
      if (partial.length && !fb.partial) warn("rink-zc-no-partial-fb", "has partial zones but no partial feedback");
      if (wrong.length === 0) warn("rink-zc-no-wrong", "zone-click has no wrong zones — every tap is right-ish");
    }

    // Scene plausibility
    if (!sq.prompt && mode !== "choice") warn("rink-no-prompt", "no question prompt for a mode that needs one");
    if (sq.prompt && q.sit && norm(sq.prompt) === norm(q.sit)) info("rink-prompt-eq-sit", "scene prompt duplicates sit");

    // Team / opponents / goalie presence
    const team = sc.team || [];
    const opps = sc.opponents || [];
    if (team.length === 0 && opps.length === 0 && !sc.puck) warn("rink-empty-scene", "no teammates, opponents, or puck on the rink");
  }

  // ── duplication checks within age ─────────────────────────────────────────
  // Compare against siblings already processed in this age bucket.
  const sigSit = norm(q.sit).slice(0, 80);
  if (sigSit && siblingIndex.sitSeen.has(sigSit)) {
    warn("dup-sit-in-age", `sit almost identical to ${siblingIndex.sitSeen.get(sigSit)} in same age`);
  } else if (sigSit) {
    siblingIndex.sitSeen.set(sigSit, q.id);
  }
  const sigConcept = norm(q.concept);
  if (sigConcept && siblingIndex.conceptSeen.has(sigConcept)) {
    info("dup-concept-in-age", `same concept "${q.concept}" as ${siblingIndex.conceptSeen.get(sigConcept)}`);
  } else if (sigConcept) {
    siblingIndex.conceptSeen.set(sigConcept, q.id);
  }

  // ── id uniqueness (cross-age) ─────────────────────────────────────────────
  if (q.id) {
    if (bankByIdGlobal.has(q.id)) {
      err("dup-id", `duplicate id (also seen in ${bankByIdGlobal.get(q.id)})`);
    } else {
      bankByIdGlobal.set(q.id, level);
    }
  }

  return issues;
}

// ─────────────────────────────────────────────────────────────────────────────
// RUN
// ─────────────────────────────────────────────────────────────────────────────
const report = []; // {id, level, issues: [...]}
const bankByIdGlobal = new Map();

for (const level of Object.keys(bank)) {
  const siblingIndex = { sitSeen: new Map(), conceptSeen: new Map() };
  for (const q of bank[level]) {
    const issues = checkQuestion(q, level, bankByIdGlobal, siblingIndex);
    if (issues.length) report.push({ id: q.id, level, type: q.type || "mc", issues });
  }
}

// Totals
const totals = { ERROR: 0, WARN: 0, INFO: 0 };
const byCode = new Map();
for (const r of report) {
  for (const i of r.issues) {
    totals[i.sev]++;
    byCode.set(i.code, (byCode.get(i.code) || 0) + 1);
  }
}
const byLevel = {};
for (const r of report) {
  byLevel[r.level] = byLevel[r.level] || { ERROR: 0, WARN: 0, INFO: 0 };
  for (const i of r.issues) byLevel[r.level][i.sev]++;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRINT SUMMARY TO STDOUT
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  red:   (s) => `\x1b[31m${s}\x1b[0m`,
  yel:   (s) => `\x1b[33m${s}\x1b[0m`,
  dim:   (s) => `\x1b[90m${s}\x1b[0m`,
  bold:  (s) => `\x1b[1m${s}\x1b[0m`,
};
function sevColor(s) { return s === "ERROR" ? C.red(s) : s === "WARN" ? C.yel(s) : C.dim(s); }

const totalQs = Object.values(bank).reduce((n, arr) => n + arr.length, 0);
console.log(C.bold(`\nQuality scan — ${totalQs} questions across ${Object.keys(bank).length} levels\n`));

console.log(C.bold("Totals:"));
console.log(`  ${C.red(`ERROR: ${totals.ERROR}`)}  ${C.yel(`WARN: ${totals.WARN}`)}  ${C.dim(`INFO: ${totals.INFO}`)}`);
console.log(`  Questions with any issue: ${report.length} / ${totalQs}\n`);

console.log(C.bold("By level:"));
for (const L of Object.keys(bank)) {
  const b = byLevel[L] || { ERROR:0, WARN:0, INFO:0 };
  const count = bank[L].length;
  console.log(`  ${L.padEnd(20)} ${String(count).padStart(4)} Q — ${C.red("E "+b.ERROR)}  ${C.yel("W "+b.WARN)}  ${C.dim("I "+b.INFO)}`);
}

console.log("\n" + C.bold("Top issue codes:"));
const codesSorted = [...byCode.entries()].sort((a,b) => b[1] - a[1]).slice(0, 20);
for (const [code, n] of codesSorted) console.log(`  ${String(n).padStart(4)}  ${code}`);

console.log("\n" + C.bold("Top 30 most-problematic questions:"));
const sorted = report.slice().sort((a,b) => {
  const rank = (r) => r.issues.reduce((s,i) => s + (i.sev === "ERROR" ? 100 : i.sev === "WARN" ? 10 : 1), 0);
  return rank(b) - rank(a);
});
for (const r of sorted.slice(0, 30)) {
  const counts = r.issues.reduce((m,i) => (m[i.sev]=(m[i.sev]||0)+1, m), {});
  const tag = [
    counts.ERROR ? C.red(`E${counts.ERROR}`) : "",
    counts.WARN  ? C.yel(`W${counts.WARN}`)  : "",
    counts.INFO  ? C.dim(`I${counts.INFO}`)  : "",
  ].filter(Boolean).join(" ");
  console.log(`  ${r.id.padEnd(18)} ${r.level.padEnd(18)} ${r.type.padEnd(8)} ${tag}`);
  for (const i of r.issues) console.log(`     ${sevColor(i.sev.padEnd(5))} ${C.dim(i.code.padEnd(22))} ${i.msg}`);
}

console.log("\nUse `node tools/quality-scan.mjs --md` to write the full per-question report to tools/quality-scan-report.md\n");

// ─────────────────────────────────────────────────────────────────────────────
// MARKDOWN REPORT
// ─────────────────────────────────────────────────────────────────────────────
if (writeMd) {
  const lines = [];
  lines.push(`# Quality scan report\n`);
  lines.push(`Generated: ${new Date().toISOString()}  \n`);
  lines.push(`Total questions: **${totalQs}**  \n`);
  lines.push(`Questions with issues: **${report.length}** — ERROR ${totals.ERROR}, WARN ${totals.WARN}, INFO ${totals.INFO}\n`);
  lines.push(`\n## By level\n`);
  lines.push(`| Level | Count | Errors | Warns | Info |`);
  lines.push(`|---|---:|---:|---:|---:|`);
  for (const L of Object.keys(bank)) {
    const b = byLevel[L] || { ERROR:0, WARN:0, INFO:0 };
    lines.push(`| ${L} | ${bank[L].length} | ${b.ERROR} | ${b.WARN} | ${b.INFO} |`);
  }
  lines.push(`\n## Top issue codes\n`);
  lines.push(`| Code | Count |`);
  lines.push(`|---|---:|`);
  for (const [code, n] of [...byCode.entries()].sort((a,b) => b[1] - a[1])) lines.push(`| ${code} | ${n} |`);
  lines.push(`\n## All flagged questions\n`);
  const byLevelIssues = {};
  for (const r of report) (byLevelIssues[r.level] = byLevelIssues[r.level] || []).push(r);
  for (const L of Object.keys(byLevelIssues)) {
    lines.push(`\n### ${L}\n`);
    for (const r of byLevelIssues[L]) {
      lines.push(`#### \`${r.id}\` (${r.type})`);
      for (const i of r.issues) lines.push(`- **${i.sev}** \`${i.code}\` — ${i.msg}`);
      lines.push("");
    }
  }
  fs.writeFileSync(mdPath, lines.join("\n"));
  console.log(`Wrote ${path.relative(process.cwd(), mdPath)}`);
}
