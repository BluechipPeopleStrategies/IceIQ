// Run an async worker over items with a bounded number in flight at once.
// Results are returned in input order. Pure — no shared mutable state beyond
// the local cursor. (Used to parallelize gauntlet generation across nodes.)
export async function runPool(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  const cap = Math.max(1, Math.min(limit, items.length));
  async function lane() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: cap }, lane));
  return results;
}
