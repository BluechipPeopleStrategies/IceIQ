#!/usr/bin/env node
// The gauntlet generator (v1, lean, text-MC). Reads the locked curriculum
// ledger, generates a question for an under-target node, runs it through a lean
// gate pipeline (creator -> deterministic validate -> curriculum confirmer ->
// coach/answer-key -> queue), and writes passing items into the founder review
// queue. It NEVER writes the live bank directly — approval happens in #review.
//
// Usage:
//   node tools/gauntlet-run.mjs --node u11.decision-making [--count 1]
//   node tools/gauntlet-run.mjs --fill-gaps [--max 10] [--count 1]
//   node tools/gauntlet-run.mjs --node u9.passing --mock      # no claude calls
// Flags: --model sonnet  --rounds 2  --mock  --dry-run
import { readFileSync, readdirSync, existsSync, appendFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadLedger, nodeById, conceptById, domainById } from "./lib/curriculum-ledger.mjs";
import { runAgent } from "./lib/claude-agent.mjs";
import { validateMC, structuralHash } from "./gauntlet/validate-mc.mjs";
import { selectTargets } from "./gauntlet/select-targets.mjs";
import { enqueue, loadQueue } from "./review-store.mjs";
import { buildCreatorPrompt, buildCurriculumPrompt, buildPanelCoachPrompt, buildHeadCoachPrompt, buildLessonExtractorPrompt, PANEL_LENSES, AGE_LEVEL } from "./gauntlet/prompts.mjs";
import { loadLessons, addLesson, renderLessons } from "./gauntlet/lessons.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const paths = {
  queue: resolve(root, "src/data/review-queue.json"),
  bank: resolve(root, "src/data/bank.json"),
  log: resolve(root, "src/data/review-log.jsonl"),
  lessons: resolve(root, "tools/gauntlet/lessons.json"),
};

// ---------- args ----------
function parseArgs(argv) {
  const a = { count: 1, max: Infinity, model: "sonnet", rounds: 2, mock: false, dryRun: false, node: null, fillGaps: false, fast: false, debateRounds: 2, mockFail: false };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--node") a.node = argv[++i];
    else if (t === "--fill-gaps") a.fillGaps = true;
    else if (t === "--count") a.count = parseInt(argv[++i], 10);
    else if (t === "--max") a.max = parseInt(argv[++i], 10);
    else if (t === "--model") a.model = argv[++i];
    else if (t === "--rounds") a.rounds = parseInt(argv[++i], 10);
    else if (t === "--mock") a.mock = true;
    else if (t === "--dry-run") a.dryRun = true;
    else if (t === "--fast") a.fast = true;
    else if (t === "--debate-rounds") a.debateRounds = parseInt(argv[++i], 10);
    else if (t === "--mock-fail") a.mockFail = true;
  }
  return a;
}

// ---------- current coverage (live bank + queued), counted by nodeId ----------
function loadCounts() {
  const counts = {};
  const bump = (id) => { if (typeof id === "string") counts[id] = (counts[id] || 0) + 1; };
  try {
    const bank = JSON.parse(readFileSync(paths.bank, "utf8"));
    for (const lvl of Object.keys(bank)) for (const q of bank[lvl] || []) bump(q.nodeId);
  } catch {}
  const seedDir = resolve(root, "src/scenario/seeds");
  try { for (const f of readdirSync(seedDir)) if (f.endsWith(".json")) { try { bump(JSON.parse(readFileSync(resolve(seedDir, f), "utf8")).nodeId); } catch {} } } catch {}
  try { for (const it of loadQueue(paths).items) bump(it.question?.nodeId); } catch {}
  return counts;
}

// existing structural hashes (queue) so we don't generate dupes
function seenHashes() {
  const seen = new Set();
  try { for (const it of loadQueue(paths).items) if (it.question) seen.add(structuralHash(it.question)); } catch {}
  return seen;
}

// ---------- repair / normalize a generated question ----------
function rand() { return Math.random().toString(36).slice(2, 6); }
function repair(q, node, domain, idSeed) {
  q = q && typeof q === "object" ? q : {};
  q.id = idSeed; q.type = "mc"; q.nodeId = node.id;
  if (!Array.isArray(q.levels) || !q.levels.length) q.levels = [AGE_LEVEL[node.ageId]];
  q.cat = q.cat || domain.name;
  q.d = [1, 2, 3].includes(q.d) ? q.d : 2;
  return q;
}
// Shuffle options to break any answer-position bias, keeping `ok` correct.
function shuffleOpts(q) {
  if (!Array.isArray(q.opts) || typeof q.ok !== "number") return q;
  const idx = q.opts.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  q.opts = idx.map((i) => q.opts[i]);
  q.ok = idx.indexOf(q.ok);
  return q;
}

// ---------- mock role outputs (no claude) ----------
function mockCreate(node, concept, domain, idSeed) {
  return {
    id: idSeed, type: "mc", nodeId: node.id, levels: [AGE_LEVEL[node.ageId]], cat: domain.name, d: 2,
    sit: `[MOCK] In a game situation that tests ${concept.name.toLowerCase()}, what is the best read for the player in black?`,
    opts: ["Make the read this concept teaches", "A tempting but lower-value option", "A safe but passive option", "An option that ignores the read"],
    ok: 0,
    explain: `Mock item for ${concept.name}. The first option reflects the concept's core read; the others are plausible but lower-value.`,
  };
}

// Run the 3-coach panel, debating to unanimous PASS. Returns { ok, critiques }.
async function runPanel(q, node, concept, opts) {
  let reviews = null;
  for (let round = 1; round <= opts.debateRounds; round++) {
    const others = round === 1 ? null : reviews;
    reviews = [];
    for (const lens of PANEL_LENSES) {
      if (opts.mock) {
        // Perfectionist fails forever under --mock-fail to exercise drop+learn.
        const verdict = (opts.mockFail && lens.key === "perfectionist") ? "REVISE" : "PASS";
        reviews.push({ key: lens.key, verdict, critique: verdict === "REVISE" ? ["[mock] not perfect"] : [] });
      } else {
        const peers = others ? others.filter((o) => o.key !== lens.key) : null;
        let r;
        try { r = await runAgent({ ...buildPanelCoachPrompt({ question: q, node, concept, lens, others: peers }), model: opts.model }); }
        catch (e) { r = { verdict: "REVISE", critique: [`${lens.key} error: ${e.message}`] }; }
        reviews.push({ key: lens.key, verdict: r.verdict, critique: r.critique || [] });
      }
    }
    if (reviews.every((r) => r.verdict === "PASS")) return { ok: true, critiques: [] };
  }
  return { ok: false, critiques: reviews.filter((r) => r.verdict !== "PASS").flatMap((r) => r.critique) };
}

// The Head Coach gate. Returns { ok, notes }.
async function runHeadCoach(q, node, concept, opts) {
  if (opts.mock) return opts.mockFail ? { ok: false, notes: ["[mock] head coach kickback"] } : { ok: true, notes: [] };
  let r;
  try { r = await runAgent({ ...buildHeadCoachPrompt({ question: q, node, concept }), model: opts.model }); }
  catch (e) { return { ok: false, notes: [`head coach error: ${e.message}`] }; }
  return { ok: r.verdict === "APPROVE", notes: r.notes || [] };
}

// Drop a failed question: log it and distill a lesson for next time.
async function dropAndLearn(q, node, concept, critique, opts) {
  try { appendFileSync(paths.log, JSON.stringify({ ts: new Date().toISOString(), by: "gauntlet", action: "drop", nodeId: node.id, critique }) + "\n"); } catch {}
  let lessons = [];
  if (opts.mock) lessons = [`For ${node.ageId} ${node.conceptId}, avoid the issue: ${(critique[0] || "unclear").slice(0, 60)}`];
  else {
    try { const r = await runAgent({ ...buildLessonExtractorPrompt({ question: q, node, critique }), model: opts.model }); lessons = Array.isArray(r.lessons) ? r.lessons : []; }
    catch {}
  }
  for (const l of lessons) addLesson(paths.lessons, l);
  return lessons;
}

// ---------- one node -> one question through the gates ----------
async function generateOne(ledger, node, opts, seen) {
  const concept = conceptById(ledger, node.conceptId);
  const domain = domainById(ledger, concept.domainId);
  const idSeed = `gen_${node.id.replace(/\./g, "_")}_${rand()}`;
  const lessons = renderLessons(loadLessons(paths.lessons));
  let notes = [];

  for (let round = 1; round <= opts.rounds; round++) {
    // G0 create (with accumulated lessons + this run's rework notes)
    let q;
    try {
      if (opts.mock) q = mockCreate(node, concept, domain, idSeed);
      else {
        const { system, prompt } = buildCreatorPrompt({ node, concept, domain, idSeed, lessons });
        const extra = notes.length ? `\n\nThe previous attempt was sent back. Fix these: ${notes.join("; ")}` : "";
        q = await runAgent({ system, prompt: prompt + extra, model: opts.model });
      }
    } catch (e) { notes = [`creator error: ${e.message}`]; continue; }
    q = shuffleOpts(repair(q, node, domain, idSeed));

    // G1-G3 deterministic
    const v = validateMC(q, { seen });
    if (!v.ok) { notes = v.errs; continue; }

    // G4 curriculum confirmer
    let cur = { verdict: "PASS", notes: [] };
    if (!opts.mock) {
      try { cur = await runAgent({ ...buildCurriculumPrompt({ question: q, node, concept }), model: opts.model }); }
      catch (e) { cur = { verdict: "REVISE", notes: [`curriculum error: ${e.message}`] }; }
    }
    if (cur.verdict !== "PASS") { notes = cur.notes || ["curriculum revise"]; continue; }

    // Coach gate: --fast = single tactical coach (v1); default = panel + head coach.
    if (opts.fast) {
      let coach = { verdict: "PASS", critique: [] };
      if (!opts.mock) {
        try { coach = await runAgent({ ...buildPanelCoachPrompt({ question: q, node, concept, lens: PANEL_LENSES[0], others: null }), model: opts.model }); }
        catch (e) { coach = { verdict: "REVISE", critique: [`coach error: ${e.message}`] }; }
      }
      if (coach.verdict !== "PASS") { notes = coach.critique || coach.notes || ["coach revise"]; continue; }
    } else {
      const panel = await runPanel(q, node, concept, opts);
      if (!panel.ok) { notes = panel.critiques.length ? panel.critiques : ["panel not unanimous"]; continue; }
      const head = await runHeadCoach(q, node, concept, opts);
      if (!head.ok) { notes = head.notes.length ? head.notes : ["head coach kickback"]; continue; }
    }

    // Passed everything → queue item
    const item = {
      question: q,
      gateHistory: { creator: "pass", curriculum: "pass", panel: opts.fast ? "fast-single" : "unanimous", headCoach: opts.fast ? "skipped" : "approve", round },
      proxyVerdict: {
        decision: "forward", scores: {},
        rationale: "Cleared the gauntlet (creator + curriculum + " + (opts.fast ? "single coach" : "perfectionist panel + Head Coach") + "). Founder-proxy gate (G9) not built yet — review directly.",
      },
      queuedAt: new Date().toISOString().slice(0, 10),
    };
    return { ok: true, item, hash: structuralHash(q) };
  }

  // Rework cap reached → drop + learn
  const learned = await dropAndLearn({ id: idSeed, nodeId: node.id }, node, concept, notes, opts);
  return { ok: false, dropped: true, reason: `failed after ${opts.rounds} rounds: ${notes.join("; ")}`, learned };
}

// ---------- main ----------
async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const ledger = loadLedger();
  if (ledger.meta?.locked == null) console.warn("⚠ ledger is not locked; generating against a draft spine.");

  // build the work list of nodes
  let targets = [];
  if (opts.node) {
    const n = nodeById(ledger, opts.node);
    if (!n) { console.error(`✗ node "${opts.node}" not in the ledger.`); process.exit(2); }
    targets = [n];
  } else if (opts.fillGaps) {
    targets = selectTargets(ledger, loadCounts(), { max: opts.max }).map((r) => r.node);
    if (!targets.length) { console.log("Nothing under target — the ledger is fully covered (live + queued)."); return; }
  } else {
    console.error("Usage: --node <id> | --fill-gaps [--max N]   (+ --count, --model, --rounds, --mock, --dry-run)");
    process.exit(2);
  }

  const seen = seenHashes();
  let enq = 0, skipped = 0;
  for (const node of targets) {
    for (let i = 0; i < opts.count; i++) {
      process.stdout.write(`• ${node.id} (${i + 1}/${opts.count}) … `);
      const r = await generateOne(ledger, node, opts, seen);
      if (!r.ok) { console.log(`dropped (${r.reason})${r.learned?.length ? ` — learned: ${r.learned.join(" | ")}` : ""}`); skipped++; continue; }
      seen.add(r.hash);
      if (opts.dryRun) { console.log("ok (dry-run, not queued)"); continue; }
      const e = enqueue(paths, r.item);
      console.log(e.added ? `queued ${r.item.question.id}` : "dup (already queued)");
      if (e.added) enq++;
    }
  }
  console.log(`\nDone. queued ${enq}, skipped ${skipped}. Review at #review (npm run dev).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
