// Three-stage escalation for the source-triage funnel: a capped-excerpt
// judgment first, escalating to a full sequential read ONLY when the
// excerpt judge returns MAYBE. Mirrors the Head-Coach-gates-the-room shape
// of tools/gauntlet/coach-gate.mjs, applied to read depth instead of panel
// size — the cost driver here is transcript length, not debate complexity.
import { runAgent } from "../lib/claude-agent.mjs";
import { buildExcerpt, chunkText } from "./vtt-parse.mjs";
import { buildExcerptTriagePrompt, buildFullReadChunkPrompt } from "./source-triage-prompts.mjs";

// A real model occasionally returns off-schema JSON (wrong case, missing
// key, wrong type for tier). These helpers normalize any raw model/mock
// response into the shape the rest of this module trusts, always coercing
// toward the SAFE direction: an off-schema stage-2 verdict escalates
// (MAYBE) rather than terminating, and an off-schema final-chunk verdict
// coerces to SKIP rather than being written to the report as garbage.
const STAGE2_VERDICTS = new Set(["PURSUE", "SKIP", "MAYBE"]);
const FINAL_VERDICTS = new Set(["PURSUE", "SKIP"]);

function normalizeVerdict(raw, validSet, fallback) {
  const v = String(raw || "").toUpperCase();
  return validSet.has(v) ? v : fallback;
}

function normalizeTier(raw) {
  if (raw === null || raw === undefined) return null;
  const n = Number(raw);
  return Number.isInteger(n) ? n : null;
}

function normalizeNotes(raw) {
  return Array.isArray(raw) ? raw : [];
}

function normalizeStage2(r) {
  return {
    verdict: normalizeVerdict(r?.verdict, STAGE2_VERDICTS, "MAYBE"),
    tier: normalizeTier(r?.tier),
    notes: normalizeNotes(r?.notes),
  };
}

// `notes` here is the caller's already-accumulated notes array (for the
// real chunk loop) or the response's own notes (for the mock shorthand) —
// see call sites.
function normalizeFinalChunk(r, notes) {
  return {
    verdict: normalizeVerdict(r?.verdict, FINAL_VERDICTS, "SKIP"),
    tier: normalizeTier(r?.tier),
    notes,
  };
}

// Consume the next response from a mockChunkResponses queue. An Error entry
// simulates a runAgent failure for that chunk, exercising the same catch
// path a real API error would.
function nextMockChunkResponse(queue) {
  const r = queue.shift();
  if (r instanceof Error) throw r;
  return r || { notes: [] };
}

// Stage 2: judge a capped excerpt. Returns { verdict, tier, notes }.
async function excerptTriage({ title, channel, date, excerpt, opts }) {
  if (opts.mock) return normalizeStage2(opts.mockExcerpt || { verdict: "SKIP", tier: null, notes: ["[mock] default skip"] });
  try {
    const r = await runAgent({ ...buildExcerptTriagePrompt({ title, channel, date, excerpt }), model: opts.coachModel });
    return normalizeStage2(r);
  } catch (e) {
    return { verdict: "MAYBE", tier: null, notes: [`excerpt judge error: ${e.message}`] };
  }
}

// Stage 3: sequential full-read escalation over word-budgeted chunks.
// Returns { verdict, tier, notes }. Only the final chunk is allowed to
// return a terminal PURSUE/SKIP; earlier chunks return a "leaning" that
// gets carried forward as context for the next chunk.
//
// Mock seams: `opts.mockFullRead` is a shorthand for the single-response
// case (skips the loop entirely — used by most existing tests).
// `opts.mockChunkResponses` (an array, one entry per expected sequential
// call) instead drives the SAME loop below via nextMockChunkResponse(), so
// the loop's real branching — chunking, notes carried forward chunk to
// chunk, per-chunk error handling, isLast — gets exercised under test.
async function fullReadEscalation({ title, channel, date, lines, opts }) {
  if (opts.mock && !opts.mockChunkResponses) {
    const r = opts.mockFullRead || { verdict: "SKIP", tier: null, notes: ["[mock] default skip"] };
    return normalizeFinalChunk(r, normalizeNotes(r.notes));
  }
  // chunkText() (the vtt-parse.mjs export, distinct from this loop's
  // per-iteration chunkBody value) always returns at least one chunk, and
  // the final iteration below always returns before the loop can exit
  // normally — so every code path is covered without a fallback after it.
  const chunks = chunkText(lines, { wordsPerChunk: 8000 });
  const mockQueue = opts.mock && opts.mockChunkResponses ? [...opts.mockChunkResponses] : null;
  const notes = [];
  for (let i = 0; i < chunks.length; i++) {
    const isLast = i === chunks.length - 1;
    try {
      const r = mockQueue
        ? nextMockChunkResponse(mockQueue)
        : await runAgent({
            ...buildFullReadChunkPrompt({ title, channel, date, chunkBody: chunks[i], chunkIndex: i, totalChunks: chunks.length, priorNotes: notes, isLast }),
            model: opts.coachModel,
          });
      if (r.notes) notes.push(...r.notes);
      if (!isLast && r.leaning) notes.push(`[leaning: ${r.leaning}]`);
      if (isLast) return normalizeFinalChunk(r, notes);
    } catch (e) {
      notes.push(`chunk ${i + 1} error: ${e.message}`);
      if (isLast) return { verdict: "SKIP", tier: null, notes };
    }
  }
}

// Top-level orchestrator for one transcript. `lines` is the output of
// parseVtt() — plain spoken-text lines, no timestamps/cue numbers.
export async function triageTranscript({ title, channel, date, lines, opts }) {
  const excerpt = buildExcerpt(lines);
  const stage2 = await excerptTriage({ title, channel, date, excerpt, opts });
  if (stage2.verdict !== "MAYBE") {
    return { verdict: stage2.verdict, tier: stage2.tier, notes: stage2.notes, escalated: false };
  }
  const stage3 = await fullReadEscalation({ title, channel, date, lines, opts });
  return { verdict: stage3.verdict, tier: stage3.tier, notes: [...stage2.notes, ...stage3.notes], escalated: true };
}
