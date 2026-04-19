let cached = null;
let inflight = null;

export function loadQB() {
  if (cached) return Promise.resolve(cached);

  // Try sessionStorage cache first (v2 to invalidate old cache without type field)
  try {
    sessionStorage.removeItem("iceiq_qb_cache");
    const stored = sessionStorage.getItem("iceiq_qb_cache_v2");
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
        cached = qb;
        try { sessionStorage.setItem("iceiq_qb_cache_v2", JSON.stringify(cached)); } catch (e) {}
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
