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

  // Bumped to v6 so banks cached before rink-label authoring get invalidated.
  try {
    sessionStorage.removeItem("rinkreads_qb_cache");
    sessionStorage.removeItem("rinkreads_qb_cache_v3");
    sessionStorage.removeItem("rinkreads_qb_cache_v4");
    sessionStorage.removeItem("rinkreads_qb_cache_v5");
    sessionStorage.removeItem("rinkreads_qb_cache_v6");
    sessionStorage.removeItem("rinkreads_qb_cache_v7");
    sessionStorage.removeItem("rinkreads_qb_cache_v8");
    sessionStorage.removeItem("rinkreads_qb_cache_v9");
    sessionStorage.removeItem("rinkreads_qb_cache_v10");
    sessionStorage.removeItem("rinkreads_qb_cache_v11");
    sessionStorage.removeItem("rinkreads_qb_cache_v13");
    // v14: bank archived 2026-04-29; legacy questions moved to questions.legacy.json
    sessionStorage.removeItem("rinkreads_qb_cache_v14");
    const stored = sessionStorage.getItem("rinkreads_qb_cache_v14");
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
        // (single primary) or `levels[]` (multi-age). Scenarios use
        // `difficulty` for authoring readability but the live quiz
        // buckets by `d` — alias here so they actually reach the queue.
        for (const s of collectScenarios()) {
          const targets = Array.isArray(s.levels) && s.levels.length
            ? s.levels
            : (s.level ? [s.level] : []);
          // Shallow-copy + add `d` mirror so we don't mutate the imported
          // module (Vite freezes them in dev).
          const enriched = {
            ...s,
            d: typeof s.d === "number" ? s.d : (typeof s.difficulty === "number" ? s.difficulty : 2),
          };
          for (const lvl of targets) {
            if (!qb[lvl]) continue;
            if (qb[lvl].some(x => x.id === s.id)) continue;
            qb[lvl].push(enriched);
          }
        }
        cached = qb;
        try { sessionStorage.setItem("rinkreads_qb_cache_v14", JSON.stringify(cached)); } catch (e) {}
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
