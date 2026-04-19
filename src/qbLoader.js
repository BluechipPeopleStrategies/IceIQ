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
          qb[level] = qb[level].map(q => {
            if (!q.type) {
              if (q.correctZone) q.type = "zone-click";
              else if (q.opts && q.opts.length === 2) q.type = "tf";
              else if (q.choices) q.type = "seq";
              else if (q.options) q.type = "next";
              else if (q.mistake) q.type = "mistake";
              else q.type = "mc";
            }
            return q;
          });
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
