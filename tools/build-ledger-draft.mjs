#!/usr/bin/env node
// Authoring generator for the DRAFT curriculum ledger (v3.0.0-draft).
//
// The compact CONCEPTS table below is the readable form of the curriculum: each
// row carries its domain, anchor flag, lineage, definition, the game-sense
// connection, and a 6-char depth string across [U7, U9, U11, U13, U15, U18]
// using - I D M R. This script expands that into the full
// src/data/curriculum-ledger.json (domains + concepts + nodes) and is the safe
// way to edit the matrix: change a row, re-run, re-validate. The JSON it emits
// is the canonical source of truth (this script just regenerates it).
//
// Synthesis basis (deep-research run wf_c45a5a43, 2026-06-04): age bands +
// Introduce/Develop/Refine from Hockey Canada LTPD; four game-situation roles at
// ~U11/12 + small-area decision-training from USA Hockey ADM; scanning / rep-
// density / read-react from the IIHF Finnish-Swedish small-area-games study;
// decision-making definition from sport-science review (PMC8156213). Soviet/
// Tarasov, Czech, and Finnish-vs-Swedish *specific* attributions are doctrine-
// level (secondary sources) and flagged for coach review before meta.locked.
//
// Run:  node tools/build-ledger-draft.mjs   (writes src/data/curriculum-ledger.json)
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadLedger, validateLedger } from "./lib/curriculum-ledger.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../src/data/curriculum-ledger.json");
const AGES = ["U7", "U9", "U11", "U13", "U15", "U18"];

const meta = {
  version: "3.0.1-draft",
  locked: null,
  ageBands: AGES,
  depthLegend: {
    "-": "not yet introduced (no node emitted for this age)",
    I: "introduced — first exposure, controlled/closed conditions",
    D: "developing — used in game-like reps with light pressure",
    M: "mastery emphasis — stable execution under semi-controlled conditions (for reads: correct recognition with more options but predictable tempo)",
    R: "refinement — at speed under random/opposed game conditions",
  },
  anchorMultiplier: 2,
  // Hockey Canada's authoritative scheme is 3-level (Introduce/Develop/Refine);
  // M is our added tier between D and R. Progression weights toward tactics with
  // age (Hockey Canada: ~85% technical at U7 → 35% technical / 65% tactical at U18).
  // U7 = ages 5-6 (Fundamentals 1) → motor/fun only, NO cognitive reads (anchors
  // floor at U9 = ages 7-8, where LTPD introduces standard-situation decisions).
  notes:
    "DRAFT v3.0.1 — revised after a 4-coach panel (skills/tactics/pedagogy/adversarial). " +
    "Hockey content still pending a real coaching authority's sign-off before meta.locked. " +
    "Lineage tags for tarasov-soviet, czech, swedish, finnish are doctrine-level (secondary " +
    "sources), not primary-cited; verify before lock.",
};

const sourceModels = [
  { id: "hockey-canada",   name: "Hockey Canada LTPD/LTAD",     tradition: "Canadian",
    contributes: "Age bands + Introduce/Develop/Refine progression; technical→tactical shift (85%→35% technical, U7→U18); decision-making named the dominant Refine trait." },
  { id: "usa-adm",         name: "USA Hockey ADM",              tradition: "American",
    contributes: "Age-banded skill progressions; four game-situation roles introduced ~U11/12; small-area games for decision-making; practice-heavy young." },
  { id: "tarasov-soviet",  name: "Tarasov / Soviet school",     tradition: "Soviet/Russian",
    contributes: "Skill density and creativity/improvisation under pressure via small-area and off-ice games. (Doctrine-level; not primary-cited in the research pass.)" },
  { id: "swedish",         name: "Swedish development model",   tradition: "Swedish",
    contributes: "Scanning / visual exploratory behaviour and read-and-react in small space. (Joint IIHF Finnish-Swedish source; Swedish-specific attribution doctrine-level.)" },
  { id: "finnish",         name: "Finnish development model",   tradition: "Finnish",
    contributes: "Game-based 'play more, drill less'; small-area rep density (5-8x activity). (Joint IIHF Finnish-Swedish source.)" },
  { id: "czech",           name: "Czech development model",     tradition: "Czech",
    contributes: "Puck-skill creativity and 1v1 deception. (Doctrine-level; not primary-cited.)" },
  { id: "pond-small-area", name: "Pond / unsanctioned / SAG",   tradition: "informal",
    contributes: "Positionless read-and-react in 2v2/3v3; constant scanning and decision load; the shared cross-tradition engine for game sense." },
  { id: "iihf",            name: "IIHF small-area-games research", tradition: "international",
    contributes: "Finnish/Swedish SAG study: quantified rep density and decision load; codified read-react development across ages." },
];

const domains = [
  { id: "skating-movement", name: "Skating & Movement", positions: ["skater"],
    definition: "Edges, agility, and footwork — the mobility that lets a player get to ice and execute reads in time." },
  { id: "puck-skills", name: "Puck Skills", positions: ["skater"],
    definition: "Controlling, protecting, moving, and shooting the puck — judged as decisions (when/where/whether), not just mechanics." },
  { id: "hockey-sense", name: "Hockey Sense", positions: ["skater"],
    definition: "The cognitive core: scanning, reading the play, and choosing the right option. RinkReads' anchor domain." },
  { id: "offensive-play", name: "Offensive Play", positions: ["skater"],
    definition: "Creating and attacking with the puck and away from it — supporting, beating defenders, entering and extending offence." },
  { id: "defensive-play", name: "Defensive Play", positions: ["skater"],
    definition: "Taking away time and space — gaps, angles, positioning, and coverage to deny the read and recover the puck." },
  { id: "transition-compete", name: "Transition & Compete", positions: ["skater"],
    definition: "Switching between offence and defence and winning the puck — transition reads, breakouts, fore/backcheck, battles, talk." },
];

// id | domain | anchor | depths(U7,U9,U11,U13,U15,U18) | lineage ids | definition | readConnection
// Revised 2026-06-04 after the 4-coach panel. Change log vs v3.0.0-draft:
//  - anchors: + scanning, + time-and-space (adversarial: the input gate + core variable)
//  - merged support-principles → off-puck-support-offense (tag collision)
//  - cut communication (output behavior, not a clickable read)
//  - added backward-transitions (skills gap), odd-man-reads + net-front-play (tactics gaps)
//  - retimed shooting (matures with puck skills), edges/agility (M/R one band later),
//    creativity-under-pressure (intro U9, accelerated + redefined testable)
//  - sharpened defensive-side-positioning (individual) vs coverage-reads (team) defs;
//    folded the 2v1 defensive read into gap-control; tightened deception-with-feet to movement
//  - lineage honesty: stripped tarasov/czech off generic concepts (kept only where characteristic)
const CONCEPTS = [
  // ---- Skating & Movement ----
  ["edges-balance", "skating-movement", false, "IDDMRR", ["hockey-canada","usa-adm"],
    "Athletic stance, edge control, and balance on both feet.",
    "Being on balance and on your edges is what lets you act on a read instead of just seeing it."],
  ["agility-mobility", "skating-movement", false, "IDDMRR", ["hockey-canada","usa-adm"],
    "Crossovers, tight turns, pivots, and changing direction at speed.",
    "Quick direction changes let you adjust to what the play gives you and arrive where the puck is going."],
  ["backward-transitions", "skating-movement", false, "-IDMRR", ["hockey-canada","usa-adm"],
    "Backward skating and forward-to-backward transitions (pivots, mohawks, open-ups).",
    "Transitional footwork keeps a read alive while you change direction, especially defending the rush."],
  ["deception-with-feet", "skating-movement", false, "-IDDMR", ["czech","tarasov-soviet"],
    "The skating move itself: changes of pace and footwork fakes that unbalance a defender (the tool, not the when-to-use-it).",
    "Deception with the feet manipulates a defender's read; the decision of when to use it lives in attacking-1v1."],

  // ---- Puck Skills ----
  ["puck-control", "puck-skills", false, "IDMRRR", ["usa-adm","hockey-canada","czech"],
    "Head-up stickhandling and carrying the puck under control.",
    "Carrying head-up is the precondition for reading the play while you have the puck."],
  ["puck-protection", "puck-skills", false, "-IDMRR", ["hockey-canada","usa-adm"],
    "Using body position and angle to shield the puck from a defender.",
    "Protecting the puck buys the extra beat needed to find the better option."],
  ["passing", "puck-skills", false, "IDMRRR", ["hockey-canada","usa-adm"],
    "Selecting a lane, timing, and weighting a pass; leading the receiver.",
    "A pass is a decision about lane and timing — the most common 'what's the read' moment."],
  ["receiving", "puck-skills", false, "IDMRRR", ["hockey-canada","usa-adm"],
    "Catching and settling pucks, on the move, with a plan before they arrive.",
    "Receiving with a pre-scan turns a catch into the next decision already made."],
  ["shooting", "puck-skills", false, "IDMRRR", ["hockey-canada","usa-adm"],
    "Shot mechanics and selection; release, shooting in traffic and off the rush.",
    "Choosing to shoot — and which shot — is a read of the goalie, lane, and support."],

  // ---- Hockey Sense (anchor domain) ----
  ["scanning", "hockey-sense", true, "-IDMRR", ["iihf","swedish","hockey-canada"],
    "Head on a swivel: shoulder checks and visual exploration before and after receiving.",
    "Scanning is how information enters the decision — no scan, no read. (Anchor: the input gate.)"],
  ["reading-the-play", "hockey-sense", true, "-IDDMR", ["usa-adm","iihf","pond-small-area","hockey-canada"],
    "Anticipating what is about to happen from the cues on the ice.",
    "The anchor: recognizing the developing pattern before it fully forms."],
  ["decision-making", "hockey-sense", true, "-IDDMR", ["hockey-canada","usa-adm","pond-small-area"],
    "Selecting the best option — pass, shoot, carry, delay — for the situation; risk vs reward.",
    "The anchor: choosing the highest-value action from what the read affords."],
  ["time-and-space", "hockey-sense", true, "-IDDMR", ["iihf","pond-small-area","hockey-canada"],
    "Recognizing, creating, and exploiting time and space; when to slow down vs attack.",
    "The anchor variable every on-ice decision is solved against."],
  ["creativity-under-pressure", "hockey-sense", false, "-IDMRR", ["tarasov-soviet","czech","pond-small-area"],
    "Finding the second or third option when the first is taken away — expanding the option set under pressure.",
    "Tests the next read when the obvious play is gone, rather than open-ended improvisation."],

  // ---- Offensive Play ----
  ["puck-carrier-options", "offensive-play", false, "-IDDMR", ["usa-adm","pond-small-area"],
    "Reading the 1v1/2v1 as the carrier: attack, delay, pass, or protect.",
    "Directly the carrier's decision: what does the defender give me right now?"],
  ["off-puck-support-offense", "offensive-play", false, "-IDMRR", ["iihf","hockey-canada","pond-small-area"],
    "Off-puck support: getting open, give-and-go timing, support angles/triangles/distance, and driving the net to be the best option for the carrier.",
    "Reading where to go without the puck — and at what angle — to give the carrier a real option."],
  ["attacking-1v1", "offensive-play", false, "-IDDMR", ["czech","tarasov-soviet"],
    "Beating a defender one-on-one: the decision of when to take them vs make a play.",
    "A read of the defender's gap and balance, then the decision to attack or move it."],
  ["cycle-and-possession", "offensive-play", false, "--IDMR", ["hockey-canada"],
    "Low cycle, F1/F2/F3 support, and extending offensive-zone possession.",
    "Reading support and pressure to keep the puck and wait for the higher-value look."],
  ["zone-entry", "offensive-play", false, "--IDMR", ["usa-adm","hockey-canada"],
    "Controlled vs dump entries; wide drive, delay, or cross based on the gap.",
    "Reading the defender's gap at the blue line and choosing how to enter."],
  ["odd-man-reads", "offensive-play", false, "--IDMR", ["usa-adm","hockey-canada","pond-small-area"],
    "Reading odd-man situations as the attacker (2v1 / 3v2): pass, shoot, or drive based on the lone defender and the goalie.",
    "The cleanest, highest-frequency scoring read in youth hockey."],
  ["net-front-play", "offensive-play", false, "--IDMR", ["hockey-canada","usa-adm"],
    "Scoring-area reads off the puck: screen, tip/deflection, rebound timing, and finding the back door.",
    "Deciding how to score at the net — when to screen vs tip vs jump for the rebound."],

  // ---- Defensive Play ----
  ["gap-control", "defensive-play", false, "--IDMR", ["hockey-canada","usa-adm"],
    "Closing time and space on the rush by managing the gap — including the lone defender's read on a 2v1 (take the pass vs force the shot).",
    "Reading closing speed and the carrier's options to take the gap at the right moment."],
  ["angling-steering", "defensive-play", false, "-IDDMR", ["hockey-canada","usa-adm"],
    "Steering the carrier to low-value ice with body angle and stick.",
    "Deciding which way to force, turning a read into a predictable outcome."],
  ["defensive-side-positioning", "defensive-play", false, "-IDMRR", ["hockey-canada","usa-adm"],
    "Individual net-side body position on one attacker: staying between your check and the net, body and stick on the inside.",
    "Reading your one threat to hold position so the attacker's best decision is taken away."],
  ["coverage-reads", "defensive-play", false, "--IDMR", ["hockey-canada","usa-adm"],
    "Team d-zone reads: which threat is yours, switching assignments, and weak-side awareness (the heavy switching content is U15+ refinement).",
    "Reading the layered team picture and when to switch — introduced light, refined late."],
  ["stick-and-body-detail", "defensive-play", false, "-IDMRR", ["hockey-canada"],
    "Active stick in lanes, box-outs, and contain without over-committing.",
    "Small reads — lane vs body — that decide whether a check kills the play."],

  // ---- Transition & Compete ----
  ["transition-reads", "transition-compete", false, "--IDMR", ["iihf","pond-small-area","hockey-canada"],
    "The offence-to-defence switch and the first option after a change of possession.",
    "The highest-leverage read: recognizing the turnover and choosing the first action."],
  ["breakout-and-regroup", "transition-compete", false, "--IDMR", ["hockey-canada","usa-adm"],
    "Support layers and options under forecheck; neutral-zone regroups.",
    "Reading the forecheck to pick the breakout option that beats the pressure."],
  ["forecheck-pressure", "transition-compete", false, "--IDMR", ["hockey-canada"],
    "Angling and pressure to recover the puck; F1 reads.",
    "Deciding when to pressure vs contain based on support and the carrier's options."],
  ["backcheck-recovery", "transition-compete", false, "--IDMR", ["hockey-canada","usa-adm"],
    "Picking up the right man and taking away the dangerous lane on the way back.",
    "Reading the rush to recover the highest-threat option, not just chase the puck."],
  ["battles-and-compete", "transition-compete", false, "IDMRRR", ["hockey-canada","pond-small-area"],
    "1v1 wall and net battles, loose-puck recovery, and resilience after a mistake.",
    "Winning the puck creates the next decision; quick recovery keeps options alive."],
];

// ---- expand ----
const concepts = CONCEPTS.map(([id, domainId, anchor, depths, lineageIds, definition, readConnection]) => ({
  id, name: titleCase(id), domainId, anchor, positions: ["skater"],
  definition, readConnection,
  lineage: lineageIds.map((sourceModel) => ({ sourceModel, note: "" })),
}));

const nodes = [];
for (const [id, , , depths] of CONCEPTS) {
  for (let i = 0; i < AGES.length; i++) {
    const depth = depths[i];
    if (!depth || depth === "-") continue; // emit only introduced cells
    nodes.push({ id: `${AGES[i].toLowerCase()}.${id}`, ageId: AGES[i], conceptId: id, depth });
  }
}

function titleCase(kebab) {
  return kebab.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

const ledger = { meta, sourceModels, domains, concepts, nodes };
writeFileSync(OUT, JSON.stringify(ledger, null, 2) + "\n");

// validate what we just wrote
const written = loadLedger(OUT);
const { ok, errs, warns } = validateLedger(written);
for (const w of warns) console.log(`WARN  ${w}`);
for (const e of errs) console.log(`FAIL  ${e}`);
const byDomain = {};
for (const c of concepts) byDomain[c.domainId] = (byDomain[c.domainId] || 0) + 1;
console.log(`\nWrote ${OUT}`);
console.log(`domains ${domains.length} | concepts ${concepts.length} | nodes ${nodes.length} | ${ok ? "VALID" : "INVALID"}`);
console.log("concepts/domain:", JSON.stringify(byDomain));
process.exit(ok ? 0 : 1);
