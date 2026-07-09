// Single source of truth for question kinds. A kind can only be born here;
// validators reject anything not in this registry (Kind Registry Rule).
export const QUESTION_KINDS = {
  "read-mc":      { playback: "freeze",     answer: "buttons",     reveal: "consequence" },
  "lane-pick":    { playback: "freeze",     answer: "rink-zones",  reveal: "consequence" },
  "predict-next": { playback: "occlusion",  answer: "buttons",     reveal: "truth" },
  "verdict":      { playback: "watch-full", answer: "buttons",     reveal: "coaching", justify: true },
  "spot-mistake": { playback: "watch-full", answer: "rink-actors",  reveal: "rewind-highlight" },
};

export function resolveKind(node) {
  if (!node || node.terminal) return null;
  if (node.ask?.kind) return node.ask.kind;
  // Back-compat: choiceMode predates the registry and keeps working.
  if (node.ask?.choiceMode === "lane-pick") return "lane-pick";
  return "read-mc";
}

export function kindSpec(kind) {
  return QUESTION_KINDS[kind] || null;
}
