let cached = null;
let inflight = null;

export function loadQB() {
  if (cached) return Promise.resolve(cached);

  // Try sessionStorage cache first (v2 to invalidate old cache without type field)
  try {
    sessionStorage.removeItem("iceiq_qb_cache");
    const stored = sessionStorage.getItem("iceiq_qb_cache_v3");
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
        cached = qb;
        try { sessionStorage.setItem("iceiq_qb_cache_v3", JSON.stringify(cached)); } catch (e) {}
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
