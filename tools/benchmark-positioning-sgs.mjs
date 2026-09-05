import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { cpus } from 'node:os';
import { fileURLToPath } from 'node:url';
import { canonicalStringify } from '../src/scenario-engine/canonicalHash.js';
import { DRAFT_VERSION, sampleDraft, validateDraft } from '../src/one-on-one/director.js';
import * as core from '../src/one-on-one/positioningSequenceCore.js';

const root = new URL('../', import.meta.url);
const sha256 = value => createHash('sha256').update(value).digest('hex');
const choices = ['stay', 'back', 'forward'];
const paths = choices.flatMap(a => choices.flatMap(b => choices.map(c => [a, b, c])));
const started = performance.now();
const sourcePaths = [
  'docs/library/gap-control.md', 'docs/library/defensive-angling.md',
  'docs/library/off-puck-support-offense.md', 'docs/library/scanning.md',
  'src/one-on-one/positioningSequenceCore.js', 'src/one-on-one/readSequenceGeometry.js',
  'src/one-on-one/director.js', 'src/scenario-engine/rinkFrame.js',
  'src/scenario-engine/generator/parameterSpace.js',
  'tools/benchmark-positioning-sgs.mjs',
];
const sourceHashes = Object.fromEntries(sourcePaths.map(path => [path, sha256(readFileSync(new URL(path, root)))]));
const templateHash = sha256(canonicalStringify(core.POSITIONING_TEMPLATES));

function geometryOnly(frame) {
  const pose = actor => ({ team: actor.team, role: actor.role, x: actor.x, y: actor.y, facing: actor.facing });
  const owner = frame.actors.find(actor => actor.id === frame.puck.owner);
  return {
    actors: frame.actors.map(pose).sort((a, b) => canonicalStringify(a).localeCompare(canonicalStringify(b))),
    puck: { x: frame.puck.x, y: frame.puck.y, owner: owner ? pose(owner) : null },
  };
}

function checkFrame(frame, template) {
  const draft = {
    version: DRAFT_VERSION, title: 'SGS benchmark snapshot', duration: 1,
    status: 'development-not-validated',
    actors: frame.actors.map(actor => ({ ...actor, frozen: false, fixedPose: null,
      keys: [{ time: 0, x: actor.x, y: actor.y, facing: actor.facing }] })),
    puck: { ...frame.puck },
  };
  const checked = validateDraft(draft);
  if (!checked.ok) throw new Error(`${template.id}: invalid snapshot: ${checked.errs.join('; ')}`);
  for (const team of ['home', 'away']) {
    if (frame.actors.filter(actor => actor.team === team && actor.role === 'skater').length !== template.teamSize) throw new Error('Unexpected team count');
  }
  if (frame.puck.owner) {
    const attached = sampleDraft(draft, 0).puck;
    if (attached.x !== frame.puck.x || attached.y !== frame.puck.y) throw new Error('Owner is not attached to the canonical stick point');
  }
}

function runPath(template, path, isolated = false) {
  let session = core.createPositioningSession(template.id);
  const freezes = [core.positioningState(session)];
  for (let read = 0; read < 3; read++) {
    const point = isolated ? template.teamSize === 1 ? { x: 27, y: -6 } : { x: 5, y: -7 }
      : core.positionChoicePoint(session, path[read]);
    session = core.movePositioningPlayer(session, point);
    try { session = core.submitPositioningRead(session, `Benchmark read ${read + 1}; no tactical conclusion.`); }
    catch (error) {
      const guard = /Players overlap/.test(error.message) ? 'bodyOverlap'
        : /illustrated pass path/.test(error.message) ? 'passPathOverlap'
          : /illustrated puck path/.test(error.message) ? 'carriedPuckOverlap' : null;
      if (!guard || isolated) throw error;
      return { completed: false, guard, blockedAtRead: read + 1 };
    }
    if (read < 2) {
      if (isolated) checkFrame(core.positioningState(core.advancePositioningPlayback(session, .5)), template);
      session = core.advancePositioningPlayback(session, 1);
      freezes.push(core.positioningState(session));
    }
  }
  if (session.phase !== 'complete' || session.answers.length !== 3) throw new Error('The path did not finish all three reads');
  if (isolated) {
    freezes.forEach(frame => checkFrame(frame, template));
    if (canonicalStringify(core.restorePositioningSession(JSON.stringify(session))) !== canonicalStringify(session)) throw new Error('The session did not restore exactly');
  }
  return { completed: true, freezeSignature: sha256(canonicalStringify(freezes.map(geometryOnly))) };
}

const perFormat = [];
for (let teamSize = 1; teamSize <= 5; teamSize++) {
  const templates = core.POSITIONING_TEMPLATES.filter(template => template.teamSize === teamSize);
  const signatures = new Set();
  const summary = {
    teamSize, family: teamSize === 1 ? 'gap-and-inside-position' : 'off-puck-support',
    rawConfigurations: templates.length,
    distinctParameterSets: new Set(templates.map(template => canonicalStringify(template.parameters))).size,
    distinctExactFreezeSequences: 0, isolatedPlacementPathsCompleted: 0,
    predefinedChoicePaths: { attempted: 0, completed: 0, blocked: 0,
      blockedByGuard: { bodyOverlap: 0, carriedPuckOverlap: 0, passPathOverlap: 0 },
      blockedAtRead: { 1: 0, 2: 0, 3: 0 } },
  };
  for (const template of templates) {
    const isolated = runPath(template, null, true);
    signatures.add(isolated.freezeSignature);
    summary.isolatedPlacementPathsCompleted++;
    for (const path of paths) {
      const result = runPath(template, path);
      summary.predefinedChoicePaths.attempted++;
      if (result.completed) summary.predefinedChoicePaths.completed++;
      else {
        summary.predefinedChoicePaths.blocked++;
        summary.predefinedChoicePaths.blockedByGuard[result.guard]++;
        summary.predefinedChoicePaths.blockedAtRead[result.blockedAtRead]++;
      }
    }
  }
  summary.distinctExactFreezeSequences = signatures.size;
  if (templates.length !== 128 || signatures.size !== 128) throw new Error(`${teamSize}v${teamSize} did not contain 128 distinct actual freeze sequences`);
  perFormat.push(summary);
}

const sum = field => perFormat.reduce((total, item) => total + item[field], 0);
const sumPaths = field => perFormat.reduce((total, item) => total + item.predefinedChoicePaths[field], 0);
const report = {
  version: 'sgs-positioning-benchmark-v1', measuredAt: new Date().toISOString(),
  command: 'node tools/benchmark-positioning-sgs.mjs', nodeVersion: process.version,
  hardware: { platform: process.platform, architecture: process.arch, cpuModel: cpus()[0]?.model || null, logicalCpuCount: cpus().length },
  scope: 'Local planning prototype; two teaching families in five team formats. No bank admission or approval is performed.',
  rawConfigurations: sum('rawConfigurations'), distinctParameterSetsWithinFormats: sum('distinctParameterSets'),
  distinctExactFreezeSequences: sum('distinctExactFreezeSequences'),
  isolatedPlacementPathsCompleted: sum('isolatedPlacementPathsCompleted'),
  predefinedChoicePaths: { attempted: sumPaths('attempted'), completed: sumPaths('completed'), blocked: sumPaths('blocked') },
  physicsEvaluated: 0, physicsClean: null, aiReviewed: 0, aiApproved: null, admitted: 0,
  poseProvenance: core.POSITIONING_TEMPLATES[0].poseProvenance,
  plannedEvidenceFields: ['selected input method/choice ID per answer', 'source-file content hashes bound to each saved session'],
  elapsedMs: Math.round(performance.now() - started), templateHash, sourceHashes, perFormat,
  method: [
    'Enumerate 128 declared load-bearing parameter combinations in each of five formats. No mirrors, prose alternatives or random jitter add credit.',
    'For each configuration, fingerprint only the exact initial/read-two/read-three actor poses, teams/roles and puck/owner pose from an isolated-placement path; IDs, display labels, titles and parameter labels do not enter that geometry hash.',
    'The isolated point is D1 at (27,-6) for 1v1 and F2 at (5,-7) for larger formats. These are deliberate geometry probes, not suggested hockey positions.',
    'Try all 27 sequences of Stay/Back/Forward, resolving each choice from the actual current read origin. A guard ends that button path; later choices are not executed.',
    'Guard categories describe overlap in the illustration. Blocked does not mean a wrong hockey answer; completed does not mean a correct answer or a successful real play.',
    'Director snapshot validation, exact owner attachment and saved-session reconstruction are checked for every isolated path. These checks do not replace the gated physics/tactical/AI/promotion pipeline.',
    'Physics-clean and AI-approved are null because neither assessment ran. Their evaluated counts and actual admissions are zero.',
  ],
};

const jsonPath = new URL('docs/one-on-one/sgs-benchmark.json', root);
const markdownPath = new URL('docs/one-on-one/sgs-benchmark.md', root);
writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
const rows = perFormat.map(item => `| ${item.teamSize}v${item.teamSize} | ${item.rawConfigurations} | ${item.distinctExactFreezeSequences} | ${item.predefinedChoicePaths.completed} | ${item.predefinedChoicePaths.blocked} |`).join('\n');
writeFileSync(markdownPath, `# SGS positioning prototype benchmark\n\nMeasured ${report.measuredAt} with ${report.nodeVersion}. Reproduce with \`${report.command}\`. Runtime: **${(report.elapsedMs / 1000).toFixed(2)} seconds** on this host.\n\nThis is **640 configurations of two teaching families across five team formats**, not 640 reviewed lessons. All remain local coach-review drafts.\n\n| Format | Configurations | Distinct exact freeze sequences | Button paths completed | Button paths blocked |\n|---|---:|---:|---:|---:|\n${rows}\n| Total | ${report.rawConfigurations} | ${report.distinctExactFreezeSequences} | ${report.predefinedChoicePaths.completed} | ${report.predefinedChoicePaths.blocked} |\n\nAll ${report.isolatedPlacementPathsCompleted} isolated-placement probes completed, validated their snapshots/owner attachment, and restored exactly. Each configuration also attempted all 27 Stay/Back/Forward sequences (${report.predefinedChoicePaths.attempted} paths total). The JSON contains guard categories and the read where each path stopped. **Guard-blocked is not an incorrect hockey answer; completion is not proof of good positioning.**\n\nThe geometry fingerprint includes only the actual three freezes, excluding configuration IDs, labels of parameters and titles. The family axes change carrier depth/width, defender gap or inside position, support spacing/lane cover and the subsequent carry or receiver depth. No mirror or cosmetic variation earns uniqueness credit.\n\nPhysics assessed: **0**; physics-clean: **unassessed**. AI reviewed: **0**; AI approved: **unassessed**. Admitted to the bank: **0**. Movement guards describe the illustration and do not certify biomechanics, contact, skating speed, tactical correctness or learning effects.\n\nTemplate SHA-256: \`${templateHash}\`. Exact source and core hashes, timings, per-format counts and methods are in [sgs-benchmark.json](sgs-benchmark.json). Sources: [Gap Control](../library/gap-control.md), [Defensive Angling](../library/defensive-angling.md), [Off-Puck Support](../library/off-puck-support-offense.md), [Scanning](../library/scanning.md).\n`);
writeFileSync(markdownPath, `\nAuthored pose provenance: ${report.poseProvenance}\n\nSaved answers currently bind the registered template, exact before-state, chosen point and reason. **Input-method/choice-ID capture and per-session source-file hash binding remain planned.** The source hashes in this benchmark identify this measured implementation; they do not add those fields to saved sessions.\n`, { flag: 'a' });
console.log(JSON.stringify({ rawConfigurations: report.rawConfigurations, distinctExactFreezeSequences: report.distinctExactFreezeSequences,
  isolatedPlacementPathsCompleted: report.isolatedPlacementPathsCompleted, predefinedChoicePaths: report.predefinedChoicePaths,
  elapsedMs: report.elapsedMs, templateHash, outputs: [fileURLToPath(jsonPath), fileURLToPath(markdownPath)] }, null, 2));
