// Single source of truth for question kinds. A kind can only be born here;
// validators reject anything not in this registry (Kind Registry Rule).
import { kindsForAge } from "./interactionProfiles.js";

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

const DIRECT_ANSWER_MODES = new Set(["rink-actors", "rink-zones"]);

export function resolveKindForAge(node, ageBand) {
  const authoredKind = resolveKind(node);
  if (!authoredKind) return null;
  if (kindsForAge(ageBand).includes(authoredKind)) return authoredKind;
  if (DIRECT_ANSWER_MODES.has(kindSpec(authoredKind)?.answer)) return authoredKind;
  return "read-mc";
}

export function isWatchNode(node) {
  return Boolean(node && !node.terminal && node.autoNext);
}

export function watchChainInfo(play, startNodeId) {
  let length = 0;
  let nodeId = startNodeId;
  const seen = new Set();
  while (isWatchNode(play?.nodes?.[nodeId])) {
    if (seen.has(nodeId)) return { length, endNodeId: nodeId, cyclic: true };
    seen.add(nodeId);
    length += 1;
    nodeId = play.nodes[nodeId].autoNext.next;
  }
  return { length, endNodeId: nodeId, cyclic: false };
}
