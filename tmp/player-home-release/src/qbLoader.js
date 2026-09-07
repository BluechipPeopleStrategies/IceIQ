import BANK from "./data/bank.json";
import { LEVELS } from "./shared.jsx";

let cached = null;

// The gauntlet drops ledger-tagged scenario seeds here; Vite eagerly bundles
// them at build time. Empty after the 2026-06-04 wipe — populated as the
// gauntlet ships content.
const SCENARIO_SEED_MODULES = import.meta.glob("./scenario/seeds/*.json", { eager: true });

function emptyByLevel() {
  const qb = {};
  for (const lvl of LEVELS) qb[lvl] = [];
  return qb;
}

function collectScenarios() {
  const out = [];
  for (const mod of Object.values(SCENARIO_SEED_MODULES)) {
    const s = mod && mod.default ? mod.default : mod;
    if (s && s.type === "scenario") out.push(s);
  }
  return out;
}

// Compose the live bank from src/data/bank.json (gauntlet output, keyed by age
// level → question[]) plus any scenario seeds. Always returns an object keyed
// by all 6 levels, even when empty. Version 28 keeps navy-team wording in sync
// with the September 5 artwork; discard older composed banks on reload.
export function loadQB() {
  if (cached) return Promise.resolve(cached);

  const CACHE_KEY = "rinkreads_qb_cache_v28";
  try {
    // Drop every prior cache version (pre-wipe banks must not be served).
    for (let v = 3; v <= 27; v++) sessionStorage.removeItem(`rinkreads_qb_cache_v${v}`);
    sessionStorage.removeItem("rinkreads_qb_cache");
    const stored = sessionStorage.getItem(CACHE_KEY);
    if (stored) { cached = JSON.parse(stored); return Promise.resolve(cached); }
  } catch (e) {}

  const qb = emptyByLevel();

  // bank.json: { "U7 / Initiation": [ ...questions ], ... }. Tolerate missing
  // levels and questions without an explicit type (default "mc").
  for (const lvl of LEVELS) {
    const rows = Array.isArray(BANK?.[lvl]) ? BANK[lvl] : [];
    qb[lvl] = rows.map(q => (q.type ? q : { ...q, type: "mc" }));
  }

  // Merge unified-engine scenarios by declared level/levels[].
  for (const s of collectScenarios()) {
    const targets = Array.isArray(s.levels) && s.levels.length ? s.levels : (s.level ? [s.level] : []);
    const enriched = { ...s, d: typeof s.d === "number" ? s.d : (typeof s.difficulty === "number" ? s.difficulty : 2) };
    for (const lvl of targets) {
      if (!qb[lvl]) continue;
      if (qb[lvl].some(x => x.id === s.id)) continue;
      qb[lvl].push(enriched);
    }
  }

  cached = qb;
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(cached)); } catch (e) {}
  return Promise.resolve(cached);
}

export function preloadQB() { loadQB(); }
