// Seed/refresh POV image scenarios from src/data/povQuestions.json (the
// canonical Notion sync output) into src/data/questions.json. Idempotent
// on inserts (existing question ids are skipped) and ALSO refreshes the
// media.url on existing rows — the Notion S3 URLs are 1-hour presigned
// links, so a stale bank row needs its URL re-pointed every time the
// upstream sync runs.
//
//   node tools/seed-pov-to-bank.mjs
//
// Field mapping (Notion sync → bank legacy MC schema):
//   questionText         → sit
//   options[].text       → opts[]
//   correctAnswer letter → ok (index)
//   explanation          → why  (full)  + tip (short, first sentence)
//   difficulty           → d (Beginner=1, Intermediate=2, Advanced=3, Elite=4)
//   ageGroup             → levels[]   (single string from Notion → 1-element array)
//   image.position[]     → pos[]      ("Forward"→F, "Defense"→D, "Goalie"→G, "Any"→F+D)
//   image.archetype      → cat        (mapped to bank category)
//   image.imageUrls[0]   → media.url  (placeholder SVG fallback when empty)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.join(here, "..", "src", "data", "povQuestions.json");
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

// Archetype → in-app category. Anything missing defaults to "Hockey Sense".
const ARCHETYPE_TO_CAT = {
  // Game-state archetypes
  "2-on-1 Rush":         "Hockey Sense",
  "OZ Wall Battle":      "Hockey Sense",
  "Breakaway":           "Scoring",
  "OZ Cycle Support":    "Hockey Sense",
  "NZ Regroup":          "Hockey Sense",
  "OZ Entry":            "Hockey Sense",
  "DZ Breakout":         "Hockey Sense",
  "Forecheck Pressure":  "Hockey Sense",
  "DZ Coverage":         "Defense",
  "F3 Support":          "Hockey Sense",
  "Backcheck":           "Defense",
  "PK Clear":            "Defense",
  "Open Ice Carry":      "Hockey Sense",
  "NZ Wall Carry":       "Hockey Sense",
  // Fundamentals archetypes
  "Eyes Up":             "Hockey Sense",
  "Athletic Stance":     "Skating",
  "Stick on Ice":        "Skills",
  "Puck Protection":     "Skills",
  "Receiving a Pass":    "Skills",
  "Skating Crossovers":  "Skating",
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

function mapLevels(q) {
  // Newer scenario rows expose `ageGroups` (array, multi-age tagging).
  // Older POV rows expose `ageGroup` (single). Support both: prefer the
  // array if non-empty, otherwise fall back to the single value.
  const arr = Array.isArray(q.ageGroups) && q.ageGroups.length > 0
    ? q.ageGroups
    : (q.ageGroup ? [q.ageGroup] : []);
  if (arr.length === 0) return ["U9 / Novice"];
  const mapped = arr.map(a => AGE_TO_LEVEL[a]).filter(Boolean);
  return mapped.length > 0 ? mapped : ["U9 / Novice"];
}

function pickImageUrl(image) {
  const urls = Array.isArray(image.imageUrls) ? image.imageUrls : [];
  const first = urls.find(u => typeof u === "string" && u.trim());
  return first || PLACEHOLDER_URL;
}

function buildRow(image, q) {
  const levels = mapLevels(q);
  const primaryLevel = levels[0];
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
        url: pickImageUrl(image),
        alt: image.readTrigger || image.archetype || "",
      },
      // Metadata — useful for the admin dashboard / future engine wiring
      imageId: image.id,
      archetype: image.archetype,
      cognitiveSkill: image.cognitiveSkill,
      concepts: q.concepts || [],
    },
  };
}

const src  = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const bank = JSON.parse(fs.readFileSync(bankPath,   "utf8"));

// Index existing rows so we can refresh media.url without re-inserting.
const idIndex = new Map(); // id -> { level, indexInLevel }
for (const lvl of Object.keys(bank)) {
  bank[lvl].forEach((q, i) => { if (q.id) idIndex.set(q.id, { lvl, i }); });
}

let added = 0;
let urlRefreshed = 0;
let untouched = 0;
let skippedHotspot = 0;
let skippedNonMc = 0;

for (const image of src.images || []) {
  const url = pickImageUrl(image);
  for (const q of image.questions || []) {
    const existing = idIndex.get(q.id);
    if (existing) {
      const row = bank[existing.lvl][existing.i];
      // Only POV rows carry media; leave other types alone if an id collides.
      if (row.type === "pov-mc") {
        const prev = row.media?.url;
        if (prev !== url) {
          row.media = { ...(row.media || {}), type: "image", url, alt: image.readTrigger || row.media?.alt || "" };
          urlRefreshed++;
        } else {
          untouched++;
        }
      }
      continue;
    }
    // Hotspot questions need numeric x/y/correct/msg coords that don't
    // live in the Notion schema today. Skip them with a warning so the
    // author knows to hand-author the hot-spots JSON entry directly.
    if (q.format === "Hotspot") {
      skippedHotspot++;
      continue;
    }
    // Multi-Select / True/False / Open Response / Sequence Prediction
    // aren't yet wired through this seeder. Skip with a warning.
    if (q.format && q.format !== "Multiple Choice") {
      skippedNonMc++;
      continue;
    }
    const { primaryLevel, row } = buildRow(image, q);
    if (!bank[primaryLevel]) bank[primaryLevel] = [];
    bank[primaryLevel].push(row);
    idIndex.set(q.id, { lvl: primaryLevel, i: bank[primaryLevel].length - 1 });
    added++;
  }
}

fs.writeFileSync(bankPath, JSON.stringify(bank, null, 2) + "\n");

console.log(`Seeded POV from ${path.relative(process.cwd(), sourcePath)}`);
console.log(`  Added:     ${added}`);
console.log(`  URL fresh: ${urlRefreshed}`);
console.log(`  Untouched: ${untouched}`);
if (skippedHotspot > 0) console.log(`  Skipped hotspot: ${skippedHotspot} (need manual coords — author hot-spots JSON in questions.json directly)`);
if (skippedNonMc > 0)   console.log(`  Skipped non-MC:  ${skippedNonMc} (Sequence/Open Response/etc. not yet auto-seeded)`);
