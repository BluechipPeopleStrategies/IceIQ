let cached = null;
let inflight = null;

export function loadQB() {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = import("./data/questions.json").then(m => {
      cached = m.default;
      return cached;
    });
  }
  return inflight;
}

export function preloadQB() { loadQB(); }
