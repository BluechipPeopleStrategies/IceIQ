// Seeds the POV image scenario bank from data/pov-export.json into
// src/data/questions.json. Idempotent — skips ids that already exist.
//
//   node tools/seed-pov-to-bank.mjs
//
// Each question becomes a bank row with type "pov-mc" and a `media`
// reference (image url + alt). Empty imageUrl falls back to the
// placeholder SVG so the renderer always has something to show.
//
// Field mapping (Notion → bank):
//   questionText         → sit
//   options[].text       → opts[]
//   correctAnswer letter → ok (index)
//   explanation          → why  (full)  + tip (short, first sentence)
//   difficulty           → d (Beginner=1, Intermediate=2, Advanced=3, Elite=4)
//   ageGroups[]          → levels[]   (primary = first age)
//   position[]           → pos[]      ("Forward"→F, "Defense"→D, "Goalie"→G, "Any"→F+D)
//   archetype            → cat        (mapped to existing bank category)
//   linked image's id    → imageId    (back-reference, optional metadata)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const exportPath = path.join(here, "..", "data", "pov-export.json");
const bankPath   = path.join(here, "..", "src", "data", "questions.json");
const PLACEHOLDER_URL = "/pov-placeholder.svg";

const AGE_TO_LEVEL = {
  U5:  "U5 / Timbits",
  U7:  "U7 / Initiation",
  U9:  "U9 / Novice",
  U11: "U11 / Atom",
  U13: "U13 / Peewee",
  U15: "U15 / Bantam",
  U18: "U18 / Midget",
};

const POSITION_MAP = {
  Forward: ["F"],
  Defense: ["D"],
  Goalie:  ["G"],
  Any:     ["F", "D"],
};

const DIFFICULTY_MAP = { Beginner: 1, Intermediate: 2, Advanced: 3, Elite: 4 };

const ARCHETYPE_TO_CAT = {
  "Eyes Up":           "Hockey Sense",
  "Athletic Stance":   "Skating",
  "Stick on Ice":      "Skills",
  "Puck Protection":   "Skills",
  "Receiving a Pass":  "Skills",
  "Skating Crossovers":"Skating",
};

function letterToIndex(letter) {
  return { A: 0, B: 1, C: 2, D: 3 }[String(letter).trim().toUpperCase()] ?? 0;
}

function shortTip(explanation) {
  if (!explanation) return "";
  const firstSentence = explanation.split(/[.!?]\s/)[0];
  return firstSentence.length > 140 ? firstSentence.slice(0, 137) + "..." : firstSentence + ".";
}

function mapPositions(positionList) {
  if (!Array.isArray(positionList) || positionList.length === 0) return ["F", "D"];
  const out = new Set();
  for (const p of positionList) {
    const mapped = POSITION_MAP[p] || POSITION_MAP.Any;
    for (const m of mapped) out.add(m);
  }
  return Array.from(out);
}

function mapLevels(ageGroups) {
  if (!Array.isArray(ageGroups) || !ageGroups.length) return ["U9 / Novice"];
  return ageGroups.map(a => AGE_TO_LEVEL[a]).filter(Boolean);
}

function buildRow(image, q) {
  const levels = mapLevels(q.ageGroups);
  const primaryLevel = levels[0];
  const correctText = (q.options || []).find(o => o.label === q.correctAnswer)?.text;
  const opts = (q.options || []).map(o => o.text);
  return {
    primaryLevel,
    row: {
      id: q.id,
      type: "pov-mc",
      cat: ARCHETYPE_TO_CAT[image.archetype] || "Hockey Sense",
      pos: mapPositions(image.position),
      d: DIFFICULTY_MAP[q.difficulty] || 2,
      sit: q.questionText,
      opts,
      ok: letterToIndex(q.correctAnswer),
      why: q.explanation || "",
      tip: shortTip(q.explanation),
      levels,
      media: {
        type: "image",
        url: image.imageUrl && image.imageUrl.trim() ? image.imageUrl : PLACEHOLDER_URL,
        alt: image.readTrigger || image.archetype,
      },
      // Metadata — useful for the admin dashboard / future engine wiring
      imageId: image.id,
      archetype: image.archetype,
      cognitiveSkill: image.cognitiveSkill,
      concepts: q.concepts || [],
      // Sanity check the seeder can re-validate against
      _correctAnswerLetter: q.correctAnswer,
      _correctAnswerText: correctText,
    },
  };
}

const exp = JSON.parse(fs.readFileSync(exportPath, "utf8"));
const bank = JSON.parse(fs.readFileSync(bankPath, "utf8"));

const allIds = new Set();
for (const lvl of Object.keys(bank)) for (const q of bank[lvl]) allIds.add(q.id);

let added = 0;
let skipped = 0;
const skippedIds = [];

for (const image of exp.images || []) {
  for (const q of image.questions || []) {
    if (allIds.has(q.id)) { skipped++; skippedIds.push(q.id); continue; }
    const { primaryLevel, row } = buildRow(image, q);
    if (!bank[primaryLevel]) bank[primaryLevel] = [];
    bank[primaryLevel].push(row);
    allIds.add(q.id);
    added++;
  }
}

fs.writeFileSync(bankPath, JSON.stringify(bank, null, 2) + "\n");

console.log(`Seeded POV: ${added} added, ${skipped} skipped (already in bank).`);
if (skippedIds.length) for (const id of skippedIds) console.log("  skip:", id);
