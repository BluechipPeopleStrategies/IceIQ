// Three-stage escalation for the source-triage funnel: a capped-excerpt
// judgment first, escalating to a full sequential read ONLY when the
// excerpt judge returns MAYBE. Mirrors the Head-Coach-gates-the-room shape
// of tools/gauntlet/coach-gate.mjs, applied to read depth instead of panel
// size — the cost driver here is transcript length, not debate complexity.
import { runAgent } from "../lib/claude-agent.mjs";
import { buildExcerpt, chunkText } from "./vtt-parse.mjs";
import { buildExcerptTriagePrompt, buildFullReadChunkPrompt } from "./source-triage-prompts.mjs";

// Stage 2: judge a capped excerpt. Returns { verdict, tier, notes }.
async function excerptTriage({ title, channel, date, excerpt, opts }) {
  if (opts.mock) return opts.mockExcerpt || { verdict: "SKIP", tier: null, notes: ["[mock] default skip"] };
  try {
    const r = await runAgent({ ...buildExcerptTriagePrompt({ title, channel, date, excerpt }), model: opts.coachModel });
    return { verdict: r.verdict, tier: r.tier ?? null, notes: r.notes || [] };
  } catch (e) {
    return { verdict: "MAYBE", tier: null, notes: [`excerpt judge error: ${e.message}`] };
  }
}

// Stage 3: sequential full-read escalation over word-budgeted chunks.
// Returns { verdict, tier, notes }. Only the final chunk is allowed to
// return a terminal PURSUE/SKIP; earlier chunks return a "leaning" that
// gets carried forward as context for the next chunk.
async function fullReadEscalation({ title, channel, date, lines, opts }) {
  if (opts.mock) return opts.mockFullRead || { verdict: "SKIP", tier: null, notes: ["[mock] default skip"] };
  // chunkText() (the vtt-parse.mjs export, distinct from this loop's
  // per-iteration chunkBody value) always returns at least one chunk, and
  // the final iteration below always returns before the loop can exit
  // normally — so every code path is covered without a fallback after it.
  const chunks = chunkText(lines, { wordsPerChunk: 8000 });
  const notes = [];
  for (let i = 0; i < chunks.length; i++) {
    const isLast = i === chunks.length - 1;
    try {
      const r = await runAgent({
        ...buildFullReadChunkPrompt({ title, channel, date, chunkBody: chunks[i], chunkIndex: i, totalChunks: chunks.length, priorNotes: notes, isLast }),
        model: opts.coachModel,
      });
      if (r.notes) notes.push(...r.notes);
      if (isLast) return { verdict: r.verdict, tier: r.tier ?? null, notes };
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
