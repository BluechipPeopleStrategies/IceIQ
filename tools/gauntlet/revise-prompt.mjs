// Builds the constrained-edit prompt for coach auto-revise. The model returns the
// SMALLEST edit that resolves the coach's notes, as strict JSON. Returns { system, prompt }
// for tools/lib/claude-agent.mjs:runAgent. See visual-prompts.mjs for the sibling pattern.

export function buildRevisePrompt({ scenario, ascii, node, concept, notes, errs = [], warns = [] }) {
  const system = [
    "You are a youth-hockey scenario editor for RinkReads.",
    "You revise ONE visual board scenario to resolve specific coach feedback.",
    "Make the smallest change that fixes the issue. Preserve the author's voice and every field you are not explicitly changing.",
    "You MUST return strict JSON and nothing else — no prose, no code fences.",
  ].join(" ");

  const checks = [];
  if (errs.length) checks.push("Hard errors (must be resolved):\n" + errs.map((e) => `- ${e}`).join("\n"));
  if (warns.length) checks.push("Warnings (resolve if it doesn't fight the coach feedback):\n" + warns.map((w) => `- ${w}`).join("\n"));

  const prompt = [
    `NODE: ${node?.id || "(unknown)"} — CONCEPT: ${concept?.name || ""}${concept?.definition ? ` (${concept.definition})` : ""}`,
    "",
    "COACH FEEDBACK TO ADDRESS:",
    notes && notes.trim() ? notes.trim() : "(no specific notes — if there is nothing concrete to fix, return an empty edit)",
    "",
    checks.length ? "MACHINE GEOMETRY CHECKS:\n" + checks.join("\n\n") + "\n" : "",
    "ASCII RINK (current):",
    ascii || "(none)",
    "",
    "CURRENT SCENARIO JSON:",
    JSON.stringify(scenario, null, 2),
    "",
    "Return strict JSON in exactly this shape:",
    '{ "change": "<one-line summary of what you changed>", "edit": { <only the top-level fields you changed> } }',
    "Rules for `edit`:",
    "- Include ONLY top-level keys you are changing; omit everything else.",
    "- When you change anything inside an array (e.g. `actors`), return the FULL array, not a fragment — arrays are replaced wholesale.",
    "- Keep coordinates in 0..1. Do not invent new interaction kinds.",
    "- If there is no concrete, safe fix, return \"edit\": {} and say so in \"change\".",
  ].filter(Boolean).join("\n");

  return { system, prompt };
}
