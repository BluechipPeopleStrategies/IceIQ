import { resolveKind } from "./questionKinds.js";

const SHORTHAND_RE = /\b(?:A|D|F|BC)\d+\b/i;

export function ageTelemetryGroup(ageBand = "") {
  const age = String(ageBand).toUpperCase();

  if (age.includes("U7") || age.includes("U9")) return "young";
  if (age.includes("U11") || age.includes("U13")) return "trainer";
  if (age.includes("U15") || age.includes("U18") || age.includes("FILM")) return "film";

  return "trainer";
}

export function playerFacingTelemetryText(value, ageBand = "") {
  const raw = String(value || "");
  const group = ageTelemetryGroup(ageBand);

  if (group === "film") return raw;

  if (group === "young") {
    return raw
      .replace(/\bF2\b/g, "Helper")
      .replace(/\bF1\b/g, "your teammate")
      .replace(/\bD1\b/g, "checker")
      .replace(/\bA1\b/g, "puck carrier")
      .replace(/\bA2\b/g, "open player")
      .replace(/\bBC1\b/g, "checker coming back")
      .replace(/\bbackchecker\b/gi, "checker coming back")
      .replace(/\bdefender\b/gi, "checker")
      .replace(/\bsupport option\b/gi, "Helper");
  }

  return raw
    .replace(/\bF2\b/g, "support teammate")
    .replace(/\bF1\b/g, "teammate with the puck")
    .replace(/\bD1\b/g, "defender")
    .replace(/\bA1\b/g, "puck carrier")
    .replace(/\bA2\b/g, "open player")
    .replace(/\bBC1\b/g, "backchecker")
    .replace(/\bsupport option\b/gi, "support teammate");
}

export function telemetryQuestionText(node, ageBand = "") {
  const group = ageTelemetryGroup(ageBand);

  const raw =
    group === "young"
      ? node?.youngQ || node?.ask?.youngQ || node?.ask?.q || node?.q || ""
      : node?.trainerQ || node?.ask?.trainerQ || node?.ask?.q || node?.q || "";

  return playerFacingTelemetryText(raw, ageBand);
}

export function telemetryOptionText(opt, ageBand = "") {
  const group = ageTelemetryGroup(ageBand);

  const raw =
    group === "young" && opt?.youngT
      ? opt.youngT
      : group === "trainer" && opt?.trainerT
        ? opt.trainerT
        : opt?.t || "";

  return playerFacingTelemetryText(raw, ageBand);
}

export function telemetryRevealText(opt, ageBand = "") {
  const group = ageTelemetryGroup(ageBand);

  const raw =
    group === "young"
      ? opt?.youngWhy || opt?.why || opt?.no || opt?.outcome || ""
      : group === "trainer"
        ? opt?.trainerWhy || opt?.why || opt?.no || opt?.outcome || ""
        : opt?.why || opt?.no || opt?.outcome || "";

  return playerFacingTelemetryText(raw, ageBand);
}

export function telemetryCueText(node, ageBand = "") {
  const group = ageTelemetryGroup(ageBand);
  const cue = node?.cue;

  if (!cue) return "";

  const raw =
    group === "young"
      ? cue.youngLabel || cue.shortLabel || cue.label || ""
      : group === "trainer"
        ? cue.shortLabel || cue.trainerLabel || cue.label || ""
        : cue.label || "";

  return playerFacingTelemetryText(raw, ageBand);
}

export function telemetrySignature(value) {
  const input = JSON.stringify(value);
  let hash = 2166136261;

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function createQuestionTelemetrySnapshot({ play, nodeId, node, ageBand }) {
  const options = (node?.ask?.opts || []).map((opt, index) => ({
    index,
    id: opt.id || String(index),
    displayedText: telemetryOptionText(opt, ageBand),
    displayedRevealText: telemetryRevealText(opt, ageBand),
    isCorrect: Boolean(opt.ok),
    next: opt.next || null,
  }));

  const snapshot = {
    eventType: node?.terminal ? "prototype_reveal_viewed" : "prototype_question_viewed",
    playId: play?.id || "",
    playTitle: play?.title || "",
    playConcept: play?.concept || "",
    nodeId,
    ageBand,
    ageGroup: ageTelemetryGroup(ageBand),
    kind: node?.terminal ? null : resolveKind(node),
    displayedQuestion: telemetryQuestionText(node, ageBand),
    displayedCue: telemetryCueText(node, ageBand),
    options,
    correctOptionIds: options.filter((opt) => opt.isCorrect).map((opt) => opt.id),
    terminal: Boolean(node?.terminal),
    hasCue: Boolean(node?.cue),
  };

  return {
    ...snapshot,
    questionSignature: telemetrySignature(snapshot),
  };
}

export function collectPlayTelemetrySnapshots(play, ageBand) {
  return Object.entries(play?.nodes || {})
    .filter(([, node]) => node.ask || node.terminal)
    .map(([nodeId, node]) => createQuestionTelemetrySnapshot({ play, nodeId, node, ageBand }));
}

export function snapshotHasForbiddenYoungLanguage(snapshot) {
  if (snapshot.ageGroup === "film") return false;

  const allText = [
    snapshot.displayedQuestion,
    snapshot.displayedCue,
    ...snapshot.options.flatMap((opt) => [opt.displayedText, opt.displayedRevealText]),
  ].join(" ");

  return SHORTHAND_RE.test(allText);
}
