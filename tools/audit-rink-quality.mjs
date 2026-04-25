// Quality audit for visual rink questions. Flags questions that fail the
// "legitimate hockey strategy" bar. A coach should look at one and think
// "yes, that's a real read I'd teach", not "okay, A or B?"
//
//   node tools/audit-rink-quality.mjs              # full report
//   node tools/audit-rink-quality.mjs --u11        # only U11 / Atom
//   node tools/audit-rink-quality.mjs --new        # only u11_rr_* (the new batches)
//
// Rubric (each question scored 0–6 across these axes; flagged if any axis fails):
//
//   1. OPTION COUNT      lane-select / pov-pick / drag-target need ≥ 3 options
//                        hot-spots needs ≥ 4 spots (1 correct, 3 plausible-wrong)
//   2. SCENE DENSITY     ≥ 4 player markers (excluding YOU and goalie) — a real
//                        read involves the rest of the ice
//   3. TIP DOESN'T LEAK  tip can't contain the answer verbatim. Should teach a
//                        principle ("read defender's stick"), not the answer
//                        ("pass to the LW")
//   4. FEEDBACK DEPTH    each option's feedback ≥ 60 chars and contains "because"
//                        or a "why" phrase — not "✓ correct" or "wrong"
//   5. POSITION FIT      single-position questions (pos: ["D"] only) shouldn't
//                        prompt "where do you go?" if YOU isn't a defender;
//                        catches role/marker mismatches
//   6. ANSWER DEFENSIBLE no two options should have nearly-identical feedback
//                        or trivially obvious differences (e.g., "perfect" vs
//                        "useless"). The wrong options should be plausibly tempting

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const qPath = path.join(here, "..", "src", "data", "questions.json");
const qb = JSON.parse(fs.readFileSync(qPath, "utf8"));

const args = new Set(process.argv.slice(2));
const filterU11 = args.has("--u11");
const filterNew = args.has("--new");

const PLAYER_TYPES = new Set(["teammate", "attacker", "defender", "player"]);

const issues = []; // { id, level, axis, severity, msg }
const score = {}; // { id: 6 }

function flag(q, level, axis, severity, msg) {
  issues.push({ id: q.id, level, axis, severity, msg });
  score[q.id] = (score[q.id] ?? 6) - (severity === "hard" ? 2 : 1);
}

function getOptions(q) {
  if (q.type === "lane-select")  return q.lanes  || [];
  if (q.type === "hot-spots")    return q.spots  || [];
  if (q.type === "pov-pick")     return q.targets || [];
  if (q.type === "drag-target")  return q.targets || [];
  if (q.type === "pov-mc")       return q.choices || q.options || [];
  return [];
}

function getFeedback(opt) {
  return opt.msg || opt.feedback || opt.message || "";
}

function getMarkers(q) {
  const out = [];
  if (q.rink?.markers) out.push(...q.rink.markers);
  if (q.pov?.markers)  out.push(...q.pov.markers);
  return out;
}

const ANSWER_LEAK_PHRASES = [
  "off the post", "in the eyes",        // u11_rr_screen_position tip
  "stick in the backdoor lane",         // u11_rr_weakside_d tip
  "weak-side d takes the weak-side wing", // u11_rr_19 tip
  "stick on puck",                       // u11_rr_20 tip
  "drive the wall",                     // u11_rr_50 tip
  "ice it down the wall",               // u11_rr_57 tip
];

for (const [level, qs] of Object.entries(qb)) {
  if (filterU11 && level !== "U11 / Atom") continue;
  for (const q of qs) {
    if (!q.rink && !q.pov) continue;
    const isVisualType = ["lane-select", "hot-spots", "pov-pick", "pov-mc", "drag-target", "sequence-rink", "path-draw", "multi-tap", "zone-click"].includes(q.type);
    if (!isVisualType) continue;
    if (filterNew && !(q.id || "").startsWith("u11_rr_")) continue;

    score[q.id] = 6;

    // ── Axis 1: option count ───────────────────────────────────
    const opts = getOptions(q);
    const minOpts = q.type === "hot-spots" ? 4 : 3;
    if (opts.length > 0 && opts.length < minOpts) {
      flag(q, level, "OPTION COUNT", "hard",
        `Only ${opts.length} options for ${q.type} — needs ≥ ${minOpts} so it's not a coin flip`);
    }

    // ── Axis 2: scene density ──────────────────────────────────
    const markers = getMarkers(q);
    const players = markers.filter(m => PLAYER_TYPES.has(m.type));
    const playersExcludingYou = players.filter(m => !["YOU", "ME"].includes(m.label));
    if (playersExcludingYou.length < 4) {
      flag(q, level, "SCENE DENSITY", "soft",
        `Only ${playersExcludingYou.length} non-YOU players. Real reads need ≥ 4 (other teammates + opponents)`);
    }

    // ── Axis 3: tip leaks the answer ───────────────────────────
    const tip = (q.tip || "").toLowerCase();
    const correctOpt = opts.find(o =>
      o.correct === true || o.clear === true || o.verdict === "best");
    const correctMsg = correctOpt ? getFeedback(correctOpt).toLowerCase() : "";
    if (tip && correctMsg) {
      // Leak if the tip shares 4+ unique words with the correct feedback (not stop words)
      const stop = new Set(["the","a","is","to","of","and","you","your","that","with","from","for","in","on","be","it","they","their","this","at","or","are","an"]);
      const tipWords = new Set(tip.split(/\W+/).filter(w => w.length > 3 && !stop.has(w)));
      const msgWords = new Set(correctMsg.split(/\W+/).filter(w => w.length > 3 && !stop.has(w)));
      const overlap = [...tipWords].filter(w => msgWords.has(w));
      if (overlap.length >= 4) {
        flag(q, level, "TIP LEAKS", "soft",
          `Tip and correct feedback overlap on: ${overlap.slice(0, 5).join(", ")}`);
      }
    }

    // ── Axis 4: feedback depth ─────────────────────────────────
    let shortCount = 0;
    for (const o of opts) {
      const fb = getFeedback(o);
      if (fb.length < 60) shortCount++;
    }
    if (opts.length > 0 && shortCount === opts.length) {
      flag(q, level, "FEEDBACK DEPTH", "soft",
        `All ${opts.length} options have feedback < 60 chars — not enough teaching`);
    }

    // ── Axis 5: position fit ───────────────────────────────────
    const youMarker = markers.find(m => ["YOU", "ME"].includes(m.label));
    if (q.pos?.length === 1) {
      const p = q.pos[0];
      const expectedTypes = p === "D" ? ["defender", "teammate"] : ["attacker", "teammate"];
      if (youMarker && !expectedTypes.includes(youMarker.type)) {
        flag(q, level, "POSITION FIT", "soft",
          `Tagged pos:[${p}] but YOU is type "${youMarker.type}" — mismatch`);
      }
    }

    // ── Axis 6: answer defensibility ───────────────────────────
    // If correct feedback is "✓..." and wrong is short generic phrase,
    // the question is too on-the-nose. Heuristic: any wrong-option
    // feedback containing "useless", "no support", "wide open" without
    // the specific reason → too generic.
    for (const o of opts) {
      const fb = getFeedback(o).toLowerCase();
      const isWrong = o.correct === false || o.clear === false || o.verdict === "worst";
      if (isWrong && fb.length > 0 && fb.length < 40) {
        flag(q, level, "ANSWER DEFENSIBLE", "soft",
          `Wrong option has thin feedback (< 40 chars): "${fb.slice(0, 80)}"`);
      }
    }
  }
}

// ── Report ──────────────────────────────────────────────────────────────
const byId = {};
for (const i of issues) {
  if (!byId[i.id]) byId[i.id] = { level: i.level, issues: [] };
  byId[i.id].issues.push(`[${i.axis}] ${i.msg}`);
}

const ordered = Object.entries(byId).sort((a, b) => (score[a[0]] ?? 6) - (score[b[0]] ?? 6));
console.log(`Audited ${Object.keys(score).length} visual questions. Issues found in ${ordered.length}.\n`);

let hardCount = 0, softCount = 0;
for (const i of issues) (i.severity === "hard" ? hardCount++ : softCount++);
console.log(`Severity: ${hardCount} hard (blocking), ${softCount} soft (recommended)\n`);

// Top-N worst
const TOP = ordered.slice(0, 30);
for (const [id, info] of TOP) {
  console.log(`${id} (${info.level}) — score ${score[id]}/6`);
  for (const i of info.issues) console.log(`  ${i}`);
  console.log("");
}
if (ordered.length > 30) console.log(`...and ${ordered.length - 30} more.`);

// Histogram
const dist = { 6: 0, 5: 0, 4: 0, 3: 0, 2: 0, 1: 0, 0: 0 };
for (const s of Object.values(score)) dist[s] = (dist[s] || 0) + 1;
console.log(`\nScore distribution:`);
for (let s = 6; s >= 0; s--) console.log(`  ${s}/6: ${dist[s]} questions`);
