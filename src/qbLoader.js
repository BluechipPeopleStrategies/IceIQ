let cached = null;
let inflight = null;

export function loadQB() {
  if (cached) return Promise.resolve(cached);

  // Try sessionStorage cache first (survives page reload within same session)
  try {
    const stored = sessionStorage.getItem("iceiq_qb_cache");
    if (stored) {
      cached = JSON.parse(stored);
      return Promise.resolve(cached);
    }
  } catch (e) {}

  if (!inflight) {
    inflight = import("./data/questions.json").then(m => {
      cached = m.default;
      // Store in sessionStorage for future loads in this session
      try { sessionStorage.setItem("iceiq_qb_cache", JSON.stringify(cached)); } catch (e) {}
      return cached;
    });
  }
  return inflight;
}

export function preloadQB() { loadQB(); }
