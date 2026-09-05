import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const root = new URL('../../', import.meta.url);
const pack = JSON.parse(readFileSync(new URL('./curriculum-draft.json', import.meta.url), 'utf8'));
const questions = pack.lessons.flatMap(lesson => lesson.questions);
const copyAudit = JSON.parse(readFileSync(new URL('docs/one-on-one/evidence/curriculum-camera-copy-audit.json', root), 'utf8'));
const sha = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
// Original parsed pack before poses and the later authorized camera-neutral
// copy pass, verified against Git 73d5dd9b5b621b82a3be45effbbba671a237ebf9.
// Reverse only the explicit audited text edits before testing this baseline;
// never silently replace it with a new whole-pack hash to admit text changes.
const ORIGINAL_PACK_SHA = '687f5babd5ca1bf210570fa6835785a215bfc03b1afba85afb5ec350c098a03a';

test('authored poses and audited camera-neutral copy preserve every other original curriculum field', () => {
  const original = structuredClone(pack);
  assert.equal(sha(original), copyAudit.afterPackSha256);
  assert.equal(copyAudit.originalPackSha256BeforePoses, ORIGINAL_PACK_SHA);
  const seen = new Set();
  for (const edit of copyAudit.edits) {
    assert.match(edit.path, /^lessons\/\d+\/questions\/\d+\/(sit|why|tip|opts\/\d+|visual\/caption|visual\/arrows\/\d+\/label)$/);
    assert.equal(seen.has(edit.path), false, 'Each changed text field is recorded exactly once');
    seen.add(edit.path);
    const path = edit.path.split('/');
    let parent = original;
    for (const key of path.slice(0, -1)) parent = parent[key];
    const key = path.at(-1);
    assert.equal(parent[key], edit.after, `${edit.questionId}: current copy must match the reviewed edit`);
    assert.equal(typeof edit.before, 'string');
    parent[key] = edit.before;
  }
  assert.equal(sha(original), copyAudit.beforePackSha256, 'Reversing the authorized text changes restores the exact posed pack');
  delete original.poseProvenance;
  for (const lesson of original.lessons) for (const question of lesson.questions) {
    for (const actor of question.visual.actors) delete actor.facing;
  }
  assert.equal(sha(original), ORIGINAL_PACK_SHA);
  assert.equal(questions.length, 48);
  for (const lesson of pack.lessons) assert.deepEqual(lesson.questions[0].visual, lesson.questions[1].visual);
});

test('all 48 questions use camera-neutral copy and retain answer order, age labels and paired captions', () => {
  assert.equal(copyAudit.questionsReviewed, 48);
  assert.equal(copyAudit.changedQuestions, 48);
  assert.equal(copyAudit.pairedCaptionsRewritten, 24);
  assert.equal(copyAudit.changedTextFields, copyAudit.edits.length);
  assert.equal(copyAudit.status, 'authored-copy-for-coach-review');
  const forbidden = /\b(above|below|upper|lower)\b|\b(?:right net|net on the right)\b|\byou (?:still |currently |already )?(?:wants|has|provides|offers|needs|faces|protects|influences|is|leaves|reads)\b/i;
  for (const lesson of pack.lessons) for (const question of lesson.questions) {
    const strings = [question.sit, question.why, question.tip, ...(question.opts || []), question.visual.caption, ...question.visual.arrows.map(arrow => arrow.label)];
    for (const text of strings) assert.doesNotMatch(text, forbidden, question.id);
    if (['U7', 'U9'].includes(lesson.ageBand)) {
      for (const text of strings) assert.doesNotMatch(text, /\b[FDHA][123]\b/, `${question.id}: young copy does not introduce role labels`);
      assert.deepEqual(question.visual.actors.map(actor => actor.label).filter(Boolean), ['YOU']);
    }
  }
  // The original-pack restoration above protects exact option indexes/ok keys,
  // source refs, actor geometry/facing and all untouched prose. This additional
  // digest makes the non-copy contract explicit in the durable audit.
  const nonCopy = structuredClone(pack);
  for (const lesson of nonCopy.lessons) for (const question of lesson.questions) {
    for (const key of ['sit', 'why', 'tip']) delete question[key];
    if (question.opts) question.opts = question.opts.map(() => '<option text>');
    delete question.visual.caption;
    for (const arrow of question.visual.arrows) delete arrow.label;
  }
  assert.equal(sha(nonCopy), copyAudit.nonCopyContractSha256);
});

test('all 48 scenes have finite distinct headings and noncarriers including goalies face the actual offset puck', () => {
  let goalies = 0;
  for (const question of questions) {
    const actors = question.visual.actors;
    const carrier = actors.find(actor => actor.hasPuck);
    const puck = { x: carrier.x + 1, y: carrier.y + .58 };
    assert.equal(carrier.facing, 0, `${question.id}: carrier keeps the existing puck side`);
    const headings = new Set();
    for (const actor of actors) {
      assert.ok(Number.isFinite(actor.facing), `${question.id}/${actor.id}: finite radians`);
      headings.add(actor.facing.toFixed(9));
      if (actor === carrier) continue;
      const dx = puck.x - actor.x, dy = puck.y - actor.y, distance = Math.hypot(dx, dy);
      assert.ok(distance > 0);
      const ux = Math.cos(actor.facing), uy = Math.sin(actor.facing);
      assert.ok(Math.abs((ux * dy - uy * dx) / distance) < 1e-12, `${question.id}/${actor.id}: points at the puck, not the carrier centre`);
      assert.ok((ux * dx + uy * dy) / distance > 1 - 1e-12, `${question.id}/${actor.id}: faces toward, not away`);
      if (actor.role === 'goalie') goalies++;
    }
    assert.ok(headings.size > 1, `${question.id}: actors no longer share one neutral heading`);
  }
  assert.ok(goalies > 0, 'the goalie-facing checks must exercise real authored goalies');
});

test('pose provenance marks the new illustration as coach review and excludes gaze or tactical grading claims', () => {
  assert.equal(pack.poseProvenance?.version, 'curriculum-authored-facing-v1');
  assert.equal(pack.poseProvenance?.status, 'authored-presentation-for-coach-review');
  assert.equal(pack.poseProvenance?.units, 'radians');
  assert.deepEqual(pack.poseProvenance?.puckOffset, { x: 1, y: .58 });
  assert.match(pack.poseProvenance?.evidenceBoundary || '', /not measured gaze/);
  assert.match(pack.poseProvenance?.evidenceBoundary || '', /not validated tactical orientation/);
  assert.match(pack.poseProvenance?.evidenceBoundary || '', /not used to grade/);
});

const cache = new URL('node_modules/.cache/rinkreads-curriculum-presentation/', root);
mkdirSync(cache, { recursive: true });
const output = new URL('board.mjs', cache);
await build({
  entryPoints: [fileURLToPath(new URL('src/one-on-one/GuidedCurriculum.jsx', root))],
  outfile: fileURLToPath(output), bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, logLevel: 'silent',
  plugins: [{ name: 'capture-presentation-boundaries', setup(api) {
    api.onResolve({ filter: /HockeyPlayerArt\.jsx$/ }, () => ({ path: 'art', namespace: 'pose-test' }));
    api.onResolve({ filter: /ScenarioRinkView\.jsx$/ }, () => ({ path: 'scene', namespace: 'pose-test' }));
    api.onLoad({ filter: /.*/, namespace: 'pose-test' }, args => ({ contents: args.path === 'art'
      ? 'export function HockeyPlayerArt(props) { globalThis.__rrCurriculumPose.art.push(props); return null; }'
      : 'export default function Scene(props) { globalThis.__rrCurriculumPose.scenes.push(props); return props.fallback; }' }));
  } }],
});
const { CurriculumBoard } = await import(output.href);

const actualOutput = new URL('actual-board.mjs', cache);
await build({
  entryPoints: [fileURLToPath(new URL('src/one-on-one/GuidedCurriculum.jsx', root))],
  outfile: fileURLToPath(actualOutput), bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, logLevel: 'silent',
});
const { CurriculumBoard: ActualCurriculumBoard } = await import(actualOutput.href);

test('every static curriculum board renders explicit stick equipment and authored-heading artwork', () => {
  for (const question of questions) {
    const html = renderToStaticMarkup(createElement(ActualCurriculumBoard, { visual: question.visual, title: question.id }));
    assert.equal((html.match(/data-equipment="stick"/g) || []).length, question.visual.actors.length, question.id);
    assert.equal((html.match(/data-pose="authored-heading"/g) || []).length, question.visual.actors.length, question.id);
    assert.doesNotMatch(html, /data-pose="neutral"|rotate\(NaN|<canvas/);
    assert.match(html, question.visual.netContext === 'right-net-is-learners-own' ? /YOUR NET/ : /ATTACK THIS NET/);
    assert.doesNotMatch(html, /RIGHT NET|right net|ATTACK THE RIGHT/);
  }
});

test('SVG and 3D consume the same authored headings without changing the puck, player identities or data', () => {
  const before = JSON.stringify(pack);
  try {
    for (const question of questions) {
      globalThis.__rrCurriculumPose = { art: [], scenes: [] };
      const html = renderToStaticMarkup(createElement(CurriculumBoard, { visual: question.visual, title: question.id, sceneView: true }));
      const capture = globalThis.__rrCurriculumPose;
      assert.equal(capture.scenes.length, 1);
      assert.equal(capture.art.length, question.visual.actors.length);
      const carrier = question.visual.actors.find(actor => actor.hasPuck);
      assert.deepEqual(capture.scenes[0].state.puck, { owner: carrier.id, x: carrier.x + 1, y: carrier.y + .58 });
      assert.match(html, /class="gc-puck" cx="1" cy="\.58"/);
      question.visual.actors.forEach((actor, index) => {
        const sprite = capture.art[index], scene = capture.scenes[0].state.actors[index];
        assert.ok(Math.abs(sprite.facing - actor.facing * 180 / Math.PI) < 1e-10, `${question.id}/${actor.id}: SVG degrees`);
        assert.equal(sprite.showStick, true);
        assert.equal(scene.facing, actor.facing, `${question.id}/${actor.id}: 3D radians`);
        assert.deepEqual([scene.id, scene.x, scene.y, scene.team, scene.role], [actor.id, actor.x, actor.y, actor.team, actor.role]);
      });
    }
    assert.equal(JSON.stringify(pack), before);
  } finally { delete globalThis.__rrCurriculumPose; }
});
