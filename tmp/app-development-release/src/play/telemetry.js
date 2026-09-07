export const ANIMATED_PLAY_EVENT_KEY = "rinkreads_animated_play_events_v1";
const MAX_EVENTS = 200;

function nowIso() {
  return new Date().toISOString();
}

function safeParse(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function readAnimatedPlayEvents(storage = globalThis.localStorage) {
  if (!storage) return [];
  return safeParse(storage.getItem(ANIMATED_PLAY_EVENT_KEY));
}

export function logAnimatedPlayEvent(event, storage = globalThis.localStorage) {
  if (!storage || !event || !event.playId || !event.event) return null;
  const next = {
    source: "animated-play-v1",
    at: nowIso(),
    playId: event.playId,
    nodeId: event.nodeId || "",
    event: event.event,
    answerId: event.answerId || "",
    ok: typeof event.ok === "boolean" ? event.ok : null,
    ms: typeof event.ms === "number" ? Math.max(0, Math.round(event.ms)) : null,
  };
  if (event.kind !== undefined) next.kind = event.kind;
  if (event.justifyId !== undefined) next.justifyId = event.justifyId;
  if (typeof event.judgeOk === "boolean") next.judgeOk = event.judgeOk;
  if (typeof event.justifyOk === "boolean") next.justifyOk = event.justifyOk;
  const events = readAnimatedPlayEvents(storage);
  const bounded = [...events, next].slice(-MAX_EVENTS);
  storage.setItem(ANIMATED_PLAY_EVENT_KEY, JSON.stringify(bounded));
  return next;
}

export function summarizeAnimatedPlayEvents(playId, storage = globalThis.localStorage) {
  const events = readAnimatedPlayEvents(storage).filter((event) => event.playId === playId);
  const answerEvents = events.filter((event) => event.event === "answer");
  const wrongCounts = new Map();
  for (const event of answerEvents) {
    if (event.ok !== false) continue;
    const wrongId =
      event.kind === "verdict" && event.judgeOk === true && event.justifyOk === false
        ? event.justifyId
        : event.answerId;
    if (wrongId) {
      wrongCounts.set(wrongId, (wrongCounts.get(wrongId) || 0) + 1);
    }
  }
  const mostCommonWrongAnswer = [...wrongCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "";
  return {
    total: events.length,
    answers: answerEvents.length,
    correct: answerEvents.filter((event) => event.ok === true).length,
    replays: events.filter((event) => event.event === "replay").length,
    unclear: events.filter((event) => event.event === "unclear").length,
    mostCommonWrongAnswer,
  };
}

