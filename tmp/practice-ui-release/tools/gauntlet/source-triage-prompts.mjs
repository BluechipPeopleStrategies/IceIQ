// System + user prompts for the source-triage funnel's two judgment calls
// (stage 2 excerpt judgment, stage 3 full-read escalation chunks). Each
// builder returns { system, prompt }; the caller feeds these to runAgent()
// and parses the JSON the model returns. Mirrors the shape of
// tools/gauntlet/prompts.mjs.
import { loadSourceTriageRubric, renderSourceTriageRubric } from "./source-triage-rubric.mjs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RUBRIC = loadSourceTriageRubric(resolve(__dirname, "source-triage-rubric.json"));
const RUBRIC_BLOCK = renderSourceTriageRubric(RUBRIC);

const ROLE = `You are triaging scraped hockey-content video transcripts for RinkReads, an app
that builds an evidence-led youth-hockey decision-making curriculum. Your ONLY job is
to decide whether a transcript is worth a human's time mining for curriculum evidence.
You are NOT extracting evidence yourself, and you must write every rationale in your
own words — never quote the transcript verbatim beyond a few attributed words.`;

export function buildExcerptTriagePrompt({ title, channel, date, excerpt }) {
  const system = `${ROLE}

${RUBRIC_BLOCK}

You are seeing a CAPPED EXCERPT (not the full transcript) — the opening plus a sample
from the middle. If the excerpt is not enough to judge confidently, return MAYBE rather
than guessing; a longer read is available on MAYBE.
Return ONLY: {"verdict":"PURSUE"|"SKIP"|"MAYBE","tier":1|2|3|null,"notes":["short, specific, in your own words"]}`;
  const prompt = `Channel: ${channel}
Date: ${date}
Title: ${title}

Excerpt:
${excerpt}

Judge this excerpt.`;
  return { system, prompt };
}

export function buildFullReadChunkPrompt({ title, channel, date, chunkBody, chunkIndex, totalChunks, priorNotes, isLast }) {
  const priorBlock = priorNotes && priorNotes.length
    ? `\nNotes from earlier chunks of this same transcript:\n${priorNotes.map((n) => `- ${n}`).join("\n")}\n`
    : "";
  if (!isLast) {
    const system = `${ROLE}

${RUBRIC_BLOCK}

You are reading this transcript one chunk at a time because the excerpt alone was not
enough to judge confidently. This is chunk ${chunkIndex + 1} of ${totalChunks} — NOT the
last one, so do not give a final verdict yet.
Return ONLY: {"leaning":"PURSUE"|"SKIP"|"UNSURE","notes":["short, specific, in your own words"]}`;
    const prompt = `Channel: ${channel}
Date: ${date}
Title: ${title}
${priorBlock}
Chunk ${chunkIndex + 1} of ${totalChunks}:
${chunkBody}

Give your current leaning based on everything read so far.`;
    return { system, prompt };
  }
  const system = `${ROLE}

${RUBRIC_BLOCK}

You are reading this transcript one chunk at a time because the excerpt alone was not
enough to judge confidently. This is the FINAL chunk (${chunkIndex + 1} of ${totalChunks})
— give your final decision now. No MAYBE is allowed at this point.
Return ONLY: {"verdict":"PURSUE"|"SKIP","tier":1|2|3|null,"notes":["short, specific, in your own words"]}`;
  const prompt = `Channel: ${channel}
Date: ${date}
Title: ${title}
${priorBlock}
Final chunk ${chunkIndex + 1} of ${totalChunks}:
${chunkBody}

Give your final PURSUE or SKIP verdict based on everything read across all chunks.`;
  return { system, prompt };
}
