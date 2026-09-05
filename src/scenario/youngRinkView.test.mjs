#!/usr/bin/env node
// Run: node src/scenario/youngRinkView.test.mjs
//
// U7 and U9 must only ever be shown a HALF-ICE view. Never a full sheet, and
// never a blue line.
//
// Hockey Canada plays U7 cross-ice and U9 half-ice. Zone words were banned from
// U7/U9 question text on that basis (decision 2,
// docs/manual-playtest/2026-08-03-decisions-round3.md). Banning the WORD while
// still DRAWING the line would leave the picture making a promise the language
// had just withdrawn.
//
// The crop alone does NOT do it. The "right" half-view's viewBox is
// `285 -15 330 330` and the right blue line sits at x=387 — dead centre of the
// frame. The centre red line at x=300 clips to a visible sliver at the left
// edge, the neutral-zone faceoff dots at x=372 are in shot, and the zone tint
// draws a dashed boundary along x=387 on top of the blue line. Four separate
// zone markings, all visible, all measured before the fix.
//
// So this test renders the REAL component to SVG and reads the emitted markup,
// rather than trusting a prop. The rink is JSX, so it is transformed with vite's
// own esbuild (a devDependency already in the tree) into node_modules/.cache and
// imported — no new dependency, nothing written into the source tree.

import { readFileSync, mkdirSync, readdirSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";
import { join, relative } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { build } from "esbuild";
import { levelsOf, isYoungBand, halfIceView, rinkRenderFor } from "./youngRink.js";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const ROOT = new URL("../../", import.meta.url);
const SEED_DIR = new URL("./seeds/", import.meta.url);
const SRC = fileURLToPath(new URL("./src/", ROOT));

// ---- load the real rink component -------------------------------------------
const RINK_SRC = new URL("./src/RinkReadsRink.jsx", ROOT);
const CACHE_DIR = new URL("./node_modules/.cache/rinkreads-young-rink/", ROOT);
const CACHE_FILE = new URL("./RinkReadsRink.gen.mjs", CACHE_DIR);
mkdirSync(CACHE_DIR, { recursive: true });
await build({ entryPoints: [fileURLToPath(RINK_SRC)], outfile: fileURLToPath(CACHE_FILE),
  bundle: true, packages: "external", platform: "node", format: "esm", jsx: "automatic", logLevel: "silent" });
const { default: RinkReadsRink, RINK_DIMENSIONS: D } = await import(CACHE_FILE.href);

const CX = D.length / 2;                                  // 300 — centre red line
const LEFT_BLUE_X = D.goalLineFromEnd + D.goalLineToBlue;  // 213
const RIGHT_BLUE_X = D.length - D.goalLineFromEnd - D.goalLineToBlue; // 387
const LEFT_GOAL_X = D.goalLineFromEnd;                     // 40
const RIGHT_GOAL_X = D.length - D.goalLineFromEnd;         // 560

// Render exactly what RinkStage renders: the props come from the shared policy
// helper, so what is asserted here is what the app draws.
function renderBoard(seed) {
  const { view, hideZoneLines } = rinkRenderFor(seed.stage, levelsOf(seed));
  const html = renderToStaticMarkup(
    createElement(RinkReadsRink, { view, zone: seed.stage?.zone, markers: [], hideZoneLines }));
  return { view, hideZoneLines, html };
}

// ---- markup probes -----------------------------------------------------------
const RECT = /<rect\b[^>]*>/g;
const CIRCLE = /<circle\b[^>]*>/g;
const attr = (tag, name) => {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`));
  return m ? m[1] : null;
};
const num = (tag, name) => {
  const v = attr(tag, name);
  return v == null ? null : parseFloat(v);
};

// A blue line is a full-height rect painted the rink's blue. Colour alone is not
// enough of a test (the centre dot is blue too), so both are checked: any
// #1F7ACC at all, and any full-height rect straddling a blue-line x.
function blueLineElements(html) {
  const hits = [];
  for (const tag of html.match(RECT) || []) {
    const x = num(tag, "x"), w = num(tag, "width"), h = num(tag, "height");
    if (h !== D.width || x == null) continue;
    const mid = x + (w || 0) / 2;
    if (Math.abs(mid - LEFT_BLUE_X) < 2 || Math.abs(mid - RIGHT_BLUE_X) < 2) hits.push(tag);
  }
  return hits;
}
function centreLineElements(html) {
  return (html.match(RECT) || []).filter((tag) => {
    const x = num(tag, "x"), w = num(tag, "width"), h = num(tag, "height");
    return h === D.width && x != null && Math.abs(x + (w || 0) / 2 - CX) < 2;
  });
}
function goalLineElements(html) {
  return (html.match(RECT) || []).filter((tag) => {
    const x = num(tag, "x"), w = num(tag, "width"), h = num(tag, "height");
    if (h !== D.width || x == null) return false;
    const mid = x + (w || 0) / 2;
    return Math.abs(mid - LEFT_GOAL_X) < 2 || Math.abs(mid - RIGHT_GOAL_X) < 2;
  });
}
// NZ dots render at r=3.5, end-zone dots at r=3. The neutral-zone pair exists
// only because the blue line does (they are placed nzFaceoffFromBlue off it).
const nzDots = (html) => (html.match(CIRCLE) || []).filter((t) => num(t, "r") === 0.35 * 10);
const endDots = (html) => (html.match(CIRCLE) || []).filter((t) => num(t, "r") === 0.3 * 10
  && attr(t, "fill") === "#CC1F2B");
// The zone tints are the only dashed paths the rink emits, and their edge lands
// on the blue line.
const zoneTints = (html) => (html.match(/<path\b[^>]*stroke-dasharray[^>]*>/g) || []);
const HALF_ICE = new Set(["left", "right"]);

// ---- the policy itself -------------------------------------------------------
ok("U7 reads as a young band", isYoungBand(["U7 / Initiation"]));
ok("U9 reads as a young band", isYoungBand(["U9 / Novice"]));
ok("U11 does not", !isYoungBand(["U11 / Atom"]));
ok("U13 does not", !isYoungBand(["U13 / Peewee"]));
ok("U15 does not", !isYoungBand(["U15 / Bantam"]));
ok("a lowercase band still reads young", isYoungBand(["u9 / novice"]));
ok("`level` alone is read", isYoungBand(levelsOf({ level: "U7 / Initiation" })));
ok("`levels` alone is read", isYoungBand(levelsOf({ levels: ["U9 / Novice"] })));
ok("both keys together are read once", levelsOf({ level: "U9 / Novice", levels: ["U9 / Novice"] }).length === 1);
ok("a mixed board takes the youngest band", isYoungBand(levelsOf({ levels: ["U11 / Atom", "U9 / Novice"] })));
ok("no level at all is not young", !isYoungBand(levelsOf({})));

// A young board can never be handed a full sheet, whatever it asks for.
for (const [view, zone, want] of [
  ["full", "off-zone", "right"],
  ["full", "def-zone", "left"],
  ["neutral", "neutral", "right"],
  [undefined, undefined, "right"],
  ["right", "off-zone", "right"],
  ["left", "def-zone", "left"],
]) {
  ok(`view "${view}" + zone "${zone}" forces half-ice "${want}"`,
    halfIceView({ view, zone }) === want);
}

// ---- every U7/U9 seed, rendered ----------------------------------------------
const seedFiles = readdirSync(SEED_DIR).filter((f) => f.endsWith(".json"));
const seeds = seedFiles.map((f) => ({
  file: f,
  seed: JSON.parse(readFileSync(new URL(f, SEED_DIR), "utf8")),
}));
const young = seeds.filter(({ seed }) => isYoungBand(levelsOf(seed)));
const older = seeds.filter(({ seed }) => !isYoungBand(levelsOf(seed)));

console.log(`\n  ${seeds.length} seeds · ${young.length} U7/U9 · ${older.length} U11+\n`);
ok("the sweep found U7/U9 seeds to check", young.length >= 5);

{
  let badView = [], blue = [], centre = [], nz = [], tint = [], noGoal = [], noDots = [];
  for (const { file, seed } of young) {
    const { view, html } = renderBoard(seed);
    if (!HALF_ICE.has(view)) badView.push(file);
    if (blueLineElements(html).length) blue.push(file);
    if (centreLineElements(html).length) centre.push(file);
    if (nzDots(html).length) nz.push(file);
    if (zoneTints(html).length) tint.push(file);
    if (html.includes("#1F7ACC")) blue.push(`${file} (blue paint)`);
    // What IS real in their game must survive.
    if (!goalLineElements(html).length) noGoal.push(file);
    if (endDots(html).length < 2) noDots.push(file);
  }
  const say = (label, arr) => { if (arr.length) console.log(`      ${label}: ${arr.join(", ")}`); };
  say("full-sheet view", badView); say("blue line", blue); say("centre line", centre);
  say("neutral-zone dots", nz); say("zone tint", tint);
  say("missing goal line", noGoal); say("missing faceoff dots", noDots);

  ok("every U7/U9 seed renders half-ice", badView.length === 0);
  ok("no U7/U9 seed emits a blue line", blue.length === 0);
  ok("no U7/U9 seed emits the centre red line", centre.length === 0);
  ok("no U7/U9 seed emits neutral-zone faceoff dots", nz.length === 0);
  ok("no U7/U9 seed emits a zone-boundary tint", tint.length === 0);
  ok("every U7/U9 seed still draws its goal line", noGoal.length === 0);
  ok("every U7/U9 seed still draws its end-zone faceoff dots", noDots.length === 0);
}

// ---- a future seed cannot bypass the rule ------------------------------------
// The rule is driven by the age band, not by the author remembering to set
// `stage.view`. These boards ASK for a full sheet and a neutral zone.
for (const [label, seed] of [
  ["a U9 seed that asks for the full sheet",
    { level: "U9 / Novice", stage: { view: "full", zone: "off-zone" } }],
  ["a U7 seed with `levels` only and no view at all",
    { levels: ["U7 / Initiation"], stage: { zone: "def-zone" } }],
  ["a U9 seed that asks for the neutral zone",
    { level: "U9 / Novice", levels: ["U9 / Novice"], stage: { view: "neutral", zone: "neutral" } }],
]) {
  const { view, html } = renderBoard(seed);
  ok(`${label} still renders half-ice`, HALF_ICE.has(view));
  ok(`${label} still emits no blue line`,
    blueLineElements(html).length === 0 && !html.includes("#1F7ACC"));
  ok(`${label} still emits no centre line`, centreLineElements(html).length === 0);
}

// ---- U11+ is untouched -------------------------------------------------------
// If suppression leaked upward the fix would be wrong in the other direction:
// a U13 board genuinely has a blue line and must keep it.
{
  let missing = [];
  for (const { file, seed } of older) {
    const { html } = renderBoard(seed);
    if (!html.includes("#1F7ACC")) missing.push(file);
  }
  if (missing.length) console.log(`      U11+ boards missing their blue line: ${missing.join(", ")}`);
  ok("every U11+ seed still draws a blue line", missing.length === 0);
}

// ---- the regression guard ----------------------------------------------------
// Prove the crop alone would NOT have hidden the line, so this test cannot
// silently stop testing anything if the suppression is later removed. Render a
// real U9 seed's own half-ice view with the flag off — the pre-fix behaviour.
{
  const u9 = young.find(({ file }) => file.startsWith("u9_")) || young[0];
  const html = renderToStaticMarkup(createElement(RinkReadsRink, {
    view: u9.seed.stage.view, zone: u9.seed.stage.zone, markers: [], hideZoneLines: false,
  }));
  const blue = blueLineElements(html);
  console.log(`\n  pre-fix, ${u9.file} at view "${u9.seed.stage.view}":`);
  console.log(`    blue-line rects in frame: ${blue.length}${blue.length ? ` -> ${blue[0]}` : ""}`);
  console.log(`    centre-line rects: ${centreLineElements(html).length}`);
  console.log(`    neutral-zone dots: ${nzDots(html).length}`);
  console.log(`    zone-boundary tints: ${zoneTints(html).length}\n`);
  ok("the half-ice crop, on its own, DID still draw a blue line", blue.length > 0);
  ok("...and the centre red line", centreLineElements(html).length > 0);
  ok("...and the neutral-zone dots", nzDots(html).length > 0);
  ok("...and a zone-boundary tint along the line", zoneTints(html).length > 0);
}

// ---- every call site goes through levelsOf() ---------------------------------
// The age gate only fires on what it is handed. A caller that passes a raw
// `.levels` reads one of the two keys a seed may carry, so a `level`-only seed
// reaches RinkStage un-gated and renders a full sheet to a seven-year-old. Two
// call sites in src/review/ did exactly that. This closes the route rather than
// trusting that every seed keeps carrying both keys.
{
  const files = readdirSync(SRC, { recursive: true, withFileTypes: true })
    .filter(d => d.isFile() && /\.jsx?$/.test(d.name))
    .map(d => join(d.parentPath || d.path, d.name));
  const raw = [];
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    if (!src.includes("<RinkStage")) continue;
    for (const m of src.matchAll(/<RinkStage\b[^>]*?levels=\{([^}]*)\}/gs)) {
      if (!/levelsOf\s*\(/.test(m[1])) raw.push(`${relative(SRC, f)} · levels={${m[1].trim()}}`);
    }
  }
  ok(`every RinkStage call site derives levels via levelsOf()${raw.length ? ` — ${raw.length} do not` : ""}`,
    raw.length === 0);
  raw.forEach(r => console.log(`        ${r}`));

  // The scan has to actually find call sites, or it passes by finding nothing.
  const seen = files.filter(f => readFileSync(f, "utf8").includes("<RinkStage")).length;
  ok(`the call-site scan found RinkStage mounts to check (${seen} files)`, seen >= 3);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
