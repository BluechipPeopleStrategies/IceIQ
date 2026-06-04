// System + user prompts for the three lean-gauntlet roles (creator, curriculum
// confirmer, coach/answer-key). Each builder returns { system, prompt }. The
// orchestrator feeds these to runAgent() and parses the JSON each role returns.

export const AGE_LEVEL = {
  U7: "U7 / Initiation", U9: "U9 / Novice", U11: "U11 / Atom",
  U13: "U13 / Peewee", U15: "U15 / Bantam", U18: "U18 / Midget",
};
const AGE_DESC = {
  U7: "ages 5-6, first-year players; very simple language, one idea, fun-first",
  U9: "ages 7-8; simple language, one clear read, light game context",
  U11: "ages 9-10; can handle a single situational read with 1-2 cues",
  U13: "ages 11-12; multi-cue situations inside a basic play structure",
  U15: "ages 13-14; tactical reads, anticipate the next move",
  U18: "ages 15-17; pattern recognition, best-of-three decisions under pressure",
};
const DEPTH_DESC = {
  I: "INTRODUCED — first exposure; keep it a clean, low-context recognition question",
  D: "DEVELOPING — a game-like situation with a single right answer",
  M: "MASTERY — stable read with more options but a still-clear best answer",
  R: "REFINEMENT — lesser-of-two-evils / time-pressure read with defensible alternatives",
};
const DEPTH_DIFFICULTY = { I: 1, D: 2, M: 2, R: 3 };

const BRAND = `RinkReads brand & rules:
- Warm, encouraging, kid-friendly. This builds "Game Sense" (never call it "IQ").
- Refer to players by jersey color "black"/"white", or "your teammate"/"the defender". NEVER use red/green to identify players (colorblind-unsafe).
- One question must teach exactly ONE concept (the target node). Frame it as a READ or DECISION ("what's the best play?"), not a rote-rule recall.
- Exactly one clearly-best answer; the other options must be plausible-but-wrong (a real player might pick them), never absurd or obviously silly, and never also-correct.
- Keep option lengths balanced; do not make the correct option the longest. Do not signpost the answer.
- No em dashes; use commas or periods.`;

const MC_SCHEMA = `Output ONLY this JSON object, nothing else:
{
  "id": "<the id given to you>",
  "type": "mc",
  "nodeId": "<the nodeId given to you>",
  "levels": ["<primary age display name>", ...optional secondary age display names it also fits],
  "cat": "<the domain name given to you>",
  "d": <difficulty 1|2|3>,
  "sit": "<the game situation + question, >= 20 chars>",
  "opts": ["<option A>", "<option B>", "<option C>", "<option D>"],
  "ok": <index 0-3 of the correct option>,
  "explain": "<1-2 sentences: why the correct read is best, in kid-friendly language>"
}`;

export function buildCreatorPrompt({ node, concept, domain, idSeed, lessons = "" }) {
  const ageDisplay = AGE_LEVEL[node.ageId];
  const system =
`You are an expert youth-hockey question writer for RinkReads, an app that develops on-ice decision-making.
${BRAND}

You write ONE text multiple-choice question for a specific curriculum target.
${MC_SCHEMA}${lessons ? "\n\n" + lessons : ""}`;
  const prompt =
`Write one question for this curriculum target.

Age band: ${node.ageId} (${ageDisplay}) — ${AGE_DESC[node.ageId]}
Concept: ${concept.name} — ${concept.definition}
The read this concept trains: ${concept.readConnection}
Depth at this age: ${node.depth} (${DEPTH_DESC[node.depth]})
Domain (use as "cat"): ${domain.name}
Suggested difficulty "d": ${DEPTH_DIFFICULTY[node.depth]}
Use this exact id: ${idSeed}
Use this exact nodeId: ${node.id}
Primary level for "levels": ${ageDisplay} (add adjacent age display names ONLY if the question genuinely fits them).

Output ONLY the JSON object.`;
  return { system, prompt };
}

export function buildCurriculumPrompt({ question, node, concept }) {
  const system =
`You are a curriculum confirmer for RinkReads youth-hockey questions. You judge two lenses:
1) Learning design: the question teaches exactly ONE concept (the target), the answer follows from that concept, and the cognitive load fits the age band.
2) Assessment integrity: exactly one clearly-best answer, 3 plausible-but-wrong distractors, options distinct and balanced in length, no "tell".
Return ONLY: {"verdict":"PASS"|"REVISE","notes":["specific, actionable notes if REVISE"]}`;
  const prompt =
`Target — age ${node.ageId}, concept "${concept.name}" (${concept.definition}); depth ${node.depth}.
Question JSON:
${JSON.stringify(question, null, 2)}

Judge it. If anything fails either lens, verdict REVISE with concrete notes. Otherwise PASS.`;
  return { system, prompt };
}

export function buildCoachPrompt({ question, node, concept }) {
  const system =
`You are a youth-hockey COACH acting as the ANSWER-KEY AUTHORITY for RinkReads (there is no automated solver for text questions — you decide correctness).
Confirm BOTH: (a) the declared correct option is genuinely the best hockey read for the situation, and (b) every other option is plausible-but-wrong (a real player might choose it) and NOT also-correct.
If a different option is actually best, or a distractor is also defensible, verdict REVISE.
Return ONLY: {"verdict":"PASS"|"REVISE","correctIndex":<int>,"confidence":<0-1>,"notes":["..."]}`;
  const correct = Array.isArray(question.opts) ? question.opts[question.ok] : undefined;
  const prompt =
`Age ${node.ageId}. Concept "${concept.name}" — the read: ${concept.readConnection}
Situation: ${question.sit}
Options: ${JSON.stringify(question.opts)}
Declared correct (index ${question.ok}): ${JSON.stringify(correct)}

Is the declared answer the best read, and are the distractors plausible-but-wrong? PASS or REVISE.`;
  return { system, prompt };
}

// The three panel lenses. One is a perfectionist who drives the debate.
export const PANEL_LENSES = [
  { key: "tactical", title: "Tactical / answer-key coach",
    focus: "Is the hockey correct and is the declared correct option genuinely the single best read? Are the distractors actually wrong (not also-correct)?" },
  { key: "pedagogy", title: "Pedagogy / learner coach",
    focus: "Does it teach this node's ONE read cleanly, at the right cognitive load for the age band, in language a kid that age understands?" },
  { key: "perfectionist", title: "Perfectionist adversarial coach",
    focus: "Nitpick everything: wording precision, distractor quality, any ambiguity or 'tell', edge cases. Decide whether this is TRULY EXCELLENT, not merely acceptable. Do not cave on real flaws." },
];

// A panel coach review. `others`, when present (debate rounds), carries peers' critiques.
export function buildPanelCoachPrompt({ question, node, concept, lens, others }) {
  const system =
`You are the ${lens.title} on a RinkReads youth-hockey question panel reviewing one multiple-choice question.
Your lens: ${lens.focus}
The bar is PERFECT, not "good enough" — only PASS a question you would stake your name on shipping to kids.
Return ONLY: {"verdict":"PASS"|"REVISE","critique":["specific, actionable points if REVISE (else empty)"]}`;
  const peer = Array.isArray(others) && others.length
    ? `\n\nThis is a debate round. The other coaches said:\n` +
      others.map((o) => `- [${o.key}] ${(o.critique || []).join("; ") || "PASS"}`).join("\n") +
      `\nHold your position if their points don't resolve a real flaw; concede if they do.`
    : "";
  const prompt =
`Age ${node.ageId}. Concept "${concept.name}" — the read: ${concept.readConnection}
Question:
${JSON.stringify(question, null, 2)}
Correct option index: ${question.ok}${peer}

Judge against your lens at the PERFECT bar. PASS or REVISE.`;
  return { system, prompt };
}

// The Head Coach — stricter than the panel, judges whole-product fit.
export function buildHeadCoachPrompt({ question, node, concept }) {
  const system =
`You are the HEAD COACH for RinkReads, the final development authority. A panel of three coaches has already unanimously approved this question as perfect. Your bar is even higher.
Judge whole-product fit: brand & voice (Game Sense, warm, colorblind-safe), exact fit to the curriculum node, that it stands proudly next to sibling questions, and that it is genuinely worthy of reaching the founder's own review. Anything less than excellent on ALL of these is a kick-back.
Return ONLY: {"verdict":"APPROVE"|"KICK_BACK","notes":["specific reasons if KICK_BACK"]}`;
  const prompt =
`Node ${node.id} (age ${node.ageId}, concept "${concept.name}": ${concept.definition}).
Question:
${JSON.stringify(question, null, 2)}

Approve only if this is excellent on every dimension. Otherwise KICK_BACK with reasons.`;
  return { system, prompt };
}

// Distills a dropped question's failure into 1-2 reusable, node-agnostic rules.
export function buildLessonExtractorPrompt({ question, node, critique }) {
  const system =
`You improve a youth-hockey question generator. A question was DROPPED after failing review. Turn the failure into 1-2 GENERAL, reusable rules a question writer should follow next time (not specific to this exact question). Keep each rule short and imperative.
Return ONLY: {"lessons":["rule 1","rule 2"]}`;
  const prompt =
`Age ${node.ageId}, concept "${node.conceptId}".
Question that failed:
${JSON.stringify(question, null, 2)}
Why it failed: ${(critique || []).join("; ")}

Give 1-2 general rules to prevent this class of failure.`;
  return { system, prompt };
}
