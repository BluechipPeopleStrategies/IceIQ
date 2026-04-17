let cached = null;
let inflight = null;

export function loadQB() {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = import("./questionBank.js").then(m => {
      cached = m.QB;
      return cached;
    });
  }
  return inflight;
}

export function preloadQB() { loadQB(); }
