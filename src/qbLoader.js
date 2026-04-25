let cached = null;
let inflight = null;

// Vite eagerly bundles every scenario seed at build time. Authors drop
// a JSON in src/scenario/seeds/ and it shows up in the live bank under
// its declared `level` (or `levels[]` for multi-age) — no manual edit
// of questions.json needed.
const SCENARIO_SEED_MODULES = import.meta.glob("./scenario/seeds/*.json", { eager: true });

function collectScenarios() {
  const out = [];
  for (const mod of Object.values(SCENARIO_SEED_MODULES)) {
    const s = mod && mod.default ? mod.default : mod;
    if (s && s.type === "scenario") out.push(s);
  }
  return out;
}

export function loadQB() {
  if (cached) return Promise.resolve(cached);

  // Bumped to v4 so banks cached before scenario merging get invalidated.
  try {
    sessionStorage.removeItem("iceiq_qb_cache");
    sessionStorage.removeItem("iceiq_qb_cache_v3");
    const stored = sessionStorage.getItem("iceiq_qb_cache_v4");
    if (stored) {
      cached = JSON.parse(stored);
      return Promise.resolve(cached);
    }
  } catch (e) {}

  if (!inflight) {
    inflight = import("./data/questions.json")
      .then(m => {
        const qb = m.default;
        for (const level in qb) {
          // Non-MC questions already carry an explicit `type`; default the rest to "mc".
          qb[level] = qb[level].map(q => q.type ? q : { ...q, type: "mc" });
        }
        // Multi-age support: if a question has `levels: [...]`, replicate the
        // reference into every listed level array so quiz builders see it
        // under each age without having to duplicate rows in questions.json.
        for (const primary of Object.keys(qb)) {
          for (const q of qb[primary]) {
            if (!Array.isArray(q.levels) || q.levels.length === 0) continue;
            for (const lvl of q.levels) {
              if (lvl === primary || !qb[lvl]) continue;
              if (qb[lvl].some(x => x.id === q.id)) continue;
              qb[lvl].push(q);
            }
          }
        }
        // Merge unified-engine scenarios. Each seed declares a `level`
        // (single primary) or `levels[]` (multi-age). Skip silently if
        // the level isn't a known bank key.
        for (const s of collectScenarios()) {
          const targets = Array.isArray(s.levels) && s.levels.length
            ? s.levels
            : (s.level ? [s.level] : []);
          for (const lvl of targets) {
            if (!qb[lvl]) continue;
            if (qb[lvl].some(x => x.id === s.id)) continue;
            qb[lvl].push(s);
          }
        }
        cached = qb;
        try { sessionStorage.setItem("iceiq_qb_cache_v4", JSON.stringify(cached)); } catch (e) {}
        return cached;
      })
      .catch(e => {
        inflight = null;
        throw e;
      });
  }
  return inflight;
}

export function preloadQB() { loadQB(); }
