// Deterministic, zero-cost pre-filter for the source-triage funnel's stage 1.
// Judges ONLY the title/filename — never opens the transcript — so obvious
// non-candidates (game recaps, gear/product reviews, pure entertainment or
// challenge content) never reach a model call. Deliberately coarse: this is
// meant to under-skip (send borderline titles on to the real excerpt judge
// in stage 2) rather than over-skip a real candidate. Pure + unit-tested.

const SKIP_PATTERNS = [
  {
    reason: "game recap, score, or championship result",
    re: /\b(falls to|falls in|defeats?|claims?\s+.*championship|wins?\s+\d+-\d+|\d+-\d+\s+(win|loss)|final score)\b/i,
  },
  {
    reason: "gear, equipment, or product review",
    re: /\b(marsblade|sense arena|unboxing|product review|new\s+.*(skate|stick|blade|gear|rollerblade))\b/i,
  },
  {
    reason: "entertainment or challenge content",
    re: /\b(surprise\s+.*challenge|blind hockey)\b/i,
  },
];

export function preFilter({ title }) {
  const t = String(title || "");
  for (const p of SKIP_PATTERNS) {
    if (p.re.test(t)) return { skip: true, reason: p.reason };
  }
  return { skip: false, reason: null };
}
