// Cross-catalog curriculum matrix (docs/factory/claude-ten-hour-project,
// Task B, 2026-09-07).
//
// tools/build-curriculum-coverage.mjs already inventories ONE catalog: the
// composed experimental one-on-one bank (readBankFiles()). This tool adds
// the other LIVE catalogs found on this checkout by inspecting
// tools/build-question-catalog.mjs, its loaders, and src/qbLoader.js:
//
//   - experimental-bank      readBankFiles()  1600 q / 200 scenarios, the
//                            catalog build-curriculum-coverage.mjs already
//                            covers. Reused here, not recomputed differently.
//   - legacy-live-bank       src/data/bank.json, loaded at runtime by
//                            src/qbLoader.js (loadQB()) and consumed by
//                            App.jsx, PlayerLearningHome, LearningWorlds,
//                            PracticeLibrary, questionOfDay, review,
//                            screens, speedRound, teamChallenges. This is
//                            the actual per-age static bank the assignment
//                            asked us to look for; it carries an explicit
//                            `nodeId` (and often `conceptId`) binding straight
//                            into src/data/curriculum-ledger.json, which is
//                            STRONGER evidence than the experimental bank's
//                            own text-signal matching.
//   - scenario-engine-seed   src/scenario/seeds/*.json (top level only --
//                            _pending/ and _retired/ are excluded from the
//                            live glob in src/qbLoader.js and are excluded
//                            here too, but inspected for the U15/U18 check).
//                            Merged into the live QB by loadQB() at runtime.
//   - pov-questions          src/data/povQuestions.json. Authored, but NOT
//                            imported/fetched by any src/**/*.{js,jsx} file
//                            found by an exhaustive grep -- see
//                            navigationExposure below. Included for
//                            completeness; it changes no U15/U18 verdict
//                            because it has no U15/U18 rows either.
//
// Explicitly excluded, with the reason recorded here rather than silently
// dropped:
//   - src/data/scene-manifest.json: an authoring-time scene/asset registry
//     (id/file/alt per rendered PNG), not a question/answer catalog, and not
//     imported by any runtime code either.
//   - src/data/questions.json.ship.tmp: flagged as build cruft by
//     tools/lib/deadcode-scan.test.mjs ("scanCruft flags .ship.tmp"); an 8.8MB
//     stale artifact, not a live catalog.
//   - src/cognitive-gym/*: timed reaction/decision drills with no age/domain
//     ledger tagging -- a different content type than a curriculum-mapped
//     question, out of scope for this matrix.
//
// Reused, not reinvented: DOMAIN_RULES and AGE_ORDER from
// tools/build-curriculum-coverage.mjs (via tools/lib/curriculum-domain-signals.mjs),
// the curriculum ledger loader/accessors from tools/lib/curriculum-ledger.mjs,
// questionContentHash from tools/question-batch-core.mjs, and the same
// combined-review.json / choice-repairs-60 review-status lookup already used
// by tools/build-question-catalog.mjs.
import { ALL_ANIMATED_PLAYS } from '../src/play/playCatalog.js';
import { mkdirSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { readBankFiles, readJson } from './experimental-bank-files.mjs';
import { AGE_ORDER, hash as sha256, geometryHash } from './build-curriculum-coverage.mjs';
import { loadLedger, conceptById, domainById } from './lib/curriculum-ledger.mjs';
import { domainSignalsForText, conceptSignalsForText } from './lib/curriculum-domain-signals.mjs';
import { classifyChangedCue, U11_MANUAL_VERIFICATION } from './lib/curriculum-changed-cue.mjs';
import { contextZoneForText, cognitiveDemandFor, evidenceStrength } from './lib/curriculum-matrix-helpers.mjs';
import { questionContentHash } from './question-batch-core.mjs';
import { selectPracticeQuestions } from '../src/one-on-one/practiceQuestionSelection.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = resolve(ROOT, 'docs/factory/followthrough-close');
const AGE_LABEL_TO_BAND = Object.fromEntries(['U7 / Initiation', 'U9 / Novice', 'U11 / Atom', 'U13 / Peewee', 'U15 / Bantam', 'U18 / Midget'].map(label => [label, label.split(' / ')[0]]));
// A seed's actors[] mixes players and the puck in one array (kind:'puck' for
// the puck); adapt it to the {setup:{actors,puck}} shape geometryHash()
// already expects from the experimental bank, so both catalogs share the
// exact same canonical-geometry hash instead of a second implementation.
const seedGeometryHash = seed => geometryHash({ setup: { actors: (seed.actors || []).filter(a => a.kind !== 'puck').map(a => ({ id: a.id, role: a.kind, team: a.tag, x: a.x, y: a.y, facing: null })), puck: (seed.actors || []).find(a => a.kind === 'puck') || null } });

// ---------------------------------------------------------------------------
// Catalog 1: experimental bank (reuses tools/experimental-bank-files.mjs and
// the same explicit-binding file build-curriculum-coverage.mjs reads).
// ---------------------------------------------------------------------------
export function loadExperimentalRows(ledger, overrides = {}) {
  const bank = overrides.bank || readBankFiles().bank;
  const bindingPath = resolve(ROOT, 'src/one-on-one/experimentalCurriculumBindings.json');
  const bindingRows = overrides.bindingRows || (existsSync(bindingPath) ? readJson(bindingPath).rows : []);
  const bindingByScenario = new Map(bindingRows.map(row => [row.scenarioId, row]));

  const reviewPath = resolve(ROOT, 'docs/factory/research/question-review/combined-review.json');
  const catalogReviewPath = resolve(ROOT, 'docs/factory/research/question-review/catalog-review.json');
  const review = overrides.review || (existsSync(reviewPath) ? readJson(reviewPath) : (existsSync(catalogReviewPath) ? readJson(catalogReviewPath) : { coverage: [] }));
  const reviewByQuestion = new Map(review.coverage.map(row => [row.questionId, row]));
  const repairsPath = resolve(ROOT, 'docs/factory/coaching-panel/choice-repairs-60/release-report.json');
  const repairReport = overrides.repairReport !== undefined ? overrides.repairReport : (existsSync(repairsPath) ? readJson(repairsPath) : null);
  const repairsByQuestion = new Map(repairReport?.status === 'applied-and-source-verified' && repairReport.humanCoachApproval === false ? repairReport.rows.map(r => [r.questionId, r]) : []);

  const rows = [];
  for (const scenario of bank) {
    const binding = bindingByScenario.get(scenario.id);
    const bindingValid = binding && binding.scenarioVersion === scenario.version && scenario.questions.every(q => binding.questionHashes?.[q.id] === questionContentHash(scenario, q));
    const metadataText = [scenario.topic, scenario.family, scenario.objective, ...(scenario.tags || [])].join(' ');
    const keywordDomains = domainSignalsForText(metadataText).map(s => s.domainId);
    const keywordConcepts = conceptSignalsForText(metadataText, ledger).map(s => s.conceptId);

    // Reuse the same routine-practice rule the app itself uses (keep the
    // first authored reflection; a direct link may request another) instead
    // of re-deriving which explain question is "required".
    const requiredIds = new Set(selectPracticeQuestions(scenario).map(q => q.id));
    const { questions: _questions, version: _version, ...sceneOnly } = scenario;
    const sceneContentHash = sha256(sceneOnly);
    const openingGeometryHash = geometryHash(scenario);
    for (const question of scenario.questions) {
      const hash = questionContentHash(scenario, question);
      let conceptIds = [], mappingMethod = 'unmapped';
      if (bindingValid && binding.conceptIds?.length) { conceptIds = binding.conceptIds; mappingMethod = 'explicit-scene-binding'; }
      else if (keywordConcepts.length) { conceptIds = keywordConcepts; mappingMethod = 'keyword-signal-match'; }
      else if (keywordDomains.length) { mappingMethod = 'keyword-signal-match'; } // domain-only signal, no concept id resolved
      const domainIds = conceptIds.length ? [...new Set(conceptIds.map(id => conceptById(ledger, id)?.domainId).filter(Boolean))] : keywordDomains;

      const record = reviewByQuestion.get(question.id);
      const repair = repairsByQuestion.get(question.id);
      const currentRepair = repair?.scenarioId === scenario.id && repair?.version === scenario.version && repair?.contentHash === hash;
      const reviewStatus = currentRepair ? 'independently-reviewed-experimental-repair' : (record?.contentHash === hash ? record.status : 'awaiting-ai-review');

      const manualOverride = scenario.ageBand === 'U11' ? U11_MANUAL_VERIFICATION[question.id] : undefined;
      const auto = classifyChangedCue(question);
      const changedCueGenuine = manualOverride !== undefined ? manualOverride : auto.genuine;

      rows.push({
        questionId: question.id,
        catalog: 'experimental-bank',
        sceneId: scenario.id,
        sceneVersion: scenario.version,
        sceneContentHash,
        questionContentHash: hash,
        openingGeometryHash,
        ageBand: scenario.ageBand,
        domainId: domainIds[0] || 'unmapped',
        domainName: domainIds[0] ? domainById(ledger, domainIds[0])?.name || domainIds[0] : 'unmapped',
        allDomainIds: domainIds,
        conceptId: conceptIds[0] || 'unmapped',
        conceptName: conceptIds[0] ? conceptById(ledger, conceptIds[0])?.name || conceptIds[0] : 'unmapped',
        allConceptIds: conceptIds,
        domainConceptMappingMethod: mappingMethod,
        learningObjective: scenario.objective || 'unknown',
        objectiveSource: scenario.objective ? 'authored-objective-field' : 'unknown',
        format: question.type,
        cognitiveDemand: cognitiveDemandFor({ type: question.type, basis: question.basis, changedCueGenuine }),
        reflectionType: question.type === 'explain' ? (requiredIds.has(question.id) ? 'required' : 'optional-reflection') : 'n/a',
        contextZone: contextZoneForText([scenario.topic, scenario.family, ...(scenario.tags || [])].join(' ')),
        sourceSupport: (scenario.sources || []).length ? scenario.sources.map(s => ({ title: s.title, url: s.url })) : 'none-cited',
        reviewStatus,
        navigationExposure: 'reachable-in-live-app',
        changedCueGenuine,
        changedCueManuallyVerified: manualOverride !== undefined,
        evidenceStrength: evidenceStrength({ mappingMethod, hasObjective: !!scenario.objective, hasSource: !!(scenario.sources || []).length, reviewStatus }),
        evidenceRationale: mappingMethod === 'explicit-scene-binding' ? `Scene binding: ${binding.rationale}` : (mappingMethod === 'keyword-signal-match' ? `Keyword signal only (scene binding missing/stale/needs-taxonomy-review): matched ${keywordConcepts.join(', ') || keywordDomains.join(', ')}` : 'No explicit binding and no keyword signal in tags/topic/family/objective.'),
      });
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Catalog 2: legacy live bank (src/data/bank.json via src/qbLoader.js). Rows
// here carry an explicit nodeId ("{age}.{conceptId}") straight into the
// ledger -- the strongest evidence tier in this matrix when it resolves to a
// real concept id.
// ---------------------------------------------------------------------------
export function loadLegacyBankRows(ledger, overrides = {}) {
  const bank = overrides.bank || readJson(resolve(ROOT, 'src/data/bank.json'));
  const rows = [];
  for (const levelLabel of Object.keys(bank)) {
    const ageBand = AGE_LABEL_TO_BAND[levelLabel] || levelLabel;
    for (const q of bank[levelLabel]) {
      const nodeParts = typeof q.nodeId === 'string' ? q.nodeId.split('.') : null;
      const nodeConceptId = nodeParts && nodeParts.length >= 2 ? nodeParts.slice(1).join('.') : (q.conceptId || null);
      const concept = nodeConceptId ? conceptById(ledger, nodeConceptId) : null;
      const nodeIdValid = !!concept;
      const metadataText = [q.cat, ...(q.concepts || []), q.concept, q.sit].filter(Boolean).join(' ');
      let mappingMethod = 'unmapped', domainId = null, conceptId = null;
      if (nodeIdValid) { mappingMethod = 'explicit-nodeId-binding'; domainId = concept.domainId; conceptId = concept.id; }
      else {
        const keywordDomains = domainSignalsForText(metadataText).map(s => s.domainId);
        const keywordConcepts = conceptSignalsForText(metadataText, ledger).map(s => s.conceptId);
        if (keywordConcepts.length) { mappingMethod = 'keyword-signal-match'; conceptId = keywordConcepts[0]; domainId = conceptById(ledger, conceptId)?.domainId; }
        else if (keywordDomains.length) { mappingMethod = 'keyword-signal-match'; domainId = keywordDomains[0]; }
      }
      const changedCue = classifyChangedCue({ type: q.type, basis: q.type === 'tf' ? 'scene' : 'coaching', prompt: q.sit });
      rows.push({
        questionId: q.id,
        catalog: 'legacy-live-bank',
        sceneId: q.media?.sceneId || q.id,
        sceneVersion: 'unversioned',
        sceneContentHash: sha256(q),
        questionContentHash: sha256(q),
        openingGeometryHash: 'not-applicable-static-image-row',
        ageBand,
        domainId: domainId || 'unmapped',
        domainName: domainId ? domainById(ledger, domainId)?.name || domainId : 'unmapped',
        allDomainIds: domainId ? [domainId] : [],
        conceptId: conceptId || 'unmapped',
        conceptName: conceptId ? conceptById(ledger, conceptId)?.name || conceptId : 'unmapped',
        allConceptIds: conceptId ? [conceptId] : [],
        domainConceptMappingMethod: mappingMethod,
        learningObjective: q.concept || concept?.name || 'unknown',
        objectiveSource: q.concept ? 'authored-concept-label' : (concept ? 'ledger-concept-via-nodeId' : 'unknown'),
        format: q.type,
        cognitiveDemand: cognitiveDemandFor({ type: q.type, basis: q.type === 'tf' ? 'scene' : 'coaching', changedCueGenuine: changedCue.genuine }),
        reflectionType: 'n/a',
        contextZone: contextZoneForText(`${q.cat || ''} ${q.sit || ''}`),
        sourceSupport: 'none-cited',
        reviewStatus: 'not-in-review-pipeline',
        navigationExposure: 'reachable-in-live-app',
        changedCueGenuine: changedCue.genuine,
        changedCueManuallyVerified: false,
        evidenceStrength: evidenceStrength({ mappingMethod, hasObjective: !!q.concept, hasSource: false, reviewStatus: 'not-in-review-pipeline' }),
        evidenceRationale: nodeIdValid ? `Explicit nodeId "${q.nodeId}" resolves to ledger concept "${concept.id}".` : (q.nodeId ? `nodeId "${q.nodeId}" does NOT resolve to any ledger concept id -- mapping drift, not missing content.` : 'No nodeId on this row; resolved by keyword signal only.'),
      });
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Catalog 3: scenario-engine seeds (src/scenario/seeds/*.json, top level
// only -- matches the glob src/qbLoader.js actually loads at runtime).
// ---------------------------------------------------------------------------
export function loadScenarioSeedRows(ledger, overrides = {}) {
  let seeds = overrides.seeds;
  if (!seeds) {
    const dir = resolve(ROOT, 'src/scenario/seeds');
    const files = existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith('.json')) : [];
    seeds = files.map(file => readJson(resolve(dir, file)));
  }
  const rows = [];
  for (const seed of seeds) {
    if (seed.type !== 'scenario') continue;
    const ageBand = AGE_LABEL_TO_BAND[seed.level] || (Array.isArray(seed.levels) ? AGE_LABEL_TO_BAND[seed.levels[0]] : null) || 'unknown';
    const nodeParts = typeof seed.nodeId === 'string' ? seed.nodeId.split('.') : null;
    const nodeConceptId = nodeParts && nodeParts.length >= 2 ? nodeParts.slice(1).join('.') : null;
    const concept = nodeConceptId ? conceptById(ledger, nodeConceptId) : null;
    const metadataText = [seed.cat, ...(seed.themes || [])].join(' ');
    let mappingMethod = 'unmapped', domainId = null, conceptId = null;
    if (concept) { mappingMethod = 'explicit-nodeId-binding'; domainId = concept.domainId; conceptId = concept.id; }
    else {
      const keywordDomains = domainSignalsForText(metadataText).map(s => s.domainId);
      const keywordConcepts = conceptSignalsForText(metadataText, ledger).map(s => s.conceptId);
      if (keywordConcepts.length) { mappingMethod = 'keyword-signal-match'; conceptId = keywordConcepts[0]; domainId = conceptById(ledger, conceptId)?.domainId; }
      else if (keywordDomains.length) { mappingMethod = 'keyword-signal-match'; domainId = keywordDomains[0]; }
    }
    rows.push({
      questionId: seed.id,
      catalog: 'scenario-engine-seed',
      sceneId: seed.id,
      sceneVersion: 'unversioned',
      sceneContentHash: sha256(seed),
      questionContentHash: sha256(seed),
      openingGeometryHash: Array.isArray(seed.actors) && seed.actors.length ? seedGeometryHash(seed) : 'not-applicable-no-actor-coordinates',
      ageBand,
      domainId: domainId || 'unmapped',
      domainName: domainId ? domainById(ledger, domainId)?.name || domainId : 'unmapped',
      allDomainIds: domainId ? [domainId] : [],
      conceptId: conceptId || 'unmapped',
      conceptName: conceptId ? conceptById(ledger, conceptId)?.name || conceptId : 'unmapped',
      allConceptIds: conceptId ? [conceptId] : [],
      domainConceptMappingMethod: mappingMethod,
      learningObjective: (seed.themes || []).join(', ') || 'unknown',
      objectiveSource: seed.themes?.length ? 'authored-themes' : 'unknown',
      format: seed.type,
      cognitiveDemand: 'unknown',
      reflectionType: 'n/a',
      contextZone: contextZoneForText(`${seed.cat || ''} ${(seed.themes || []).join(' ')} ${seed.stage?.zone || ''}`),
      sourceSupport: 'none-cited',
      reviewStatus: 'not-in-review-pipeline',
      navigationExposure: 'reachable-in-live-app',
      changedCueGenuine: false,
      changedCueManuallyVerified: false,
      evidenceStrength: evidenceStrength({ mappingMethod, hasObjective: !!seed.themes?.length, hasSource: false, reviewStatus: 'not-in-review-pipeline' }),
      evidenceRationale: concept ? `Explicit nodeId "${seed.nodeId}" resolves to ledger concept "${concept.id}".` : (seed.nodeId === undefined ? 'Seed has no nodeId field at all.' : `nodeId "${seed.nodeId}" does NOT resolve to any ledger concept id -- mapping drift, not missing content.`),
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Catalog 4: POV questions (src/data/povQuestions.json). Authored, but an
// exhaustive grep of src/**/*.{js,jsx} for "povQuestions" found zero
// importers/fetchers -- so it is included for completeness with
// navigationExposure:'not-reachable-in-app', not silently dropped.
// ---------------------------------------------------------------------------
export function loadPovQuestionRows(ledger, overrides = {}) {
  const path = resolve(ROOT, 'src/data/povQuestions.json');
  const data = overrides.data || (existsSync(path) ? readJson(path) : null);
  if (!data) return [];
  const rows = [];
  for (const image of data.images || []) {
    const ageBand = (image.ageGroups || [])[0] || 'unknown';
    const metadataText = [image.archetype, image.cognitiveSkill, image.readTrigger, image.povType].filter(Boolean).join(' ');
    const keywordDomains = domainSignalsForText(metadataText).map(s => s.domainId);
    const keywordConcepts = conceptSignalsForText(metadataText, ledger).map(s => s.conceptId);
    const domainId = keywordDomains[0] || (keywordConcepts[0] ? conceptById(ledger, keywordConcepts[0])?.domainId : null);
    for (const q of image.questions || []) {
      rows.push({
        questionId: q.id || `${image.id}-${sha256(q)}`,
        catalog: 'pov-questions',
        sceneId: image.id,
        sceneVersion: data.version || 'unversioned',
        sceneContentHash: sha256(image),
        questionContentHash: sha256(q),
        openingGeometryHash: 'not-applicable-static-image-row',
        ageBand,
        domainId: domainId || 'unmapped',
        domainName: domainId ? domainById(ledger, domainId)?.name || domainId : 'unmapped',
        allDomainIds: domainId ? [domainId] : [],
        conceptId: keywordConcepts[0] || 'unmapped',
        conceptName: keywordConcepts[0] ? conceptById(ledger, keywordConcepts[0])?.name || keywordConcepts[0] : 'unmapped',
        allConceptIds: keywordConcepts,
        domainConceptMappingMethod: (keywordConcepts.length || keywordDomains.length) ? 'keyword-signal-match' : 'unmapped',
        learningObjective: image.archetype || 'unknown',
        objectiveSource: image.archetype ? 'authored-concept-label' : 'unknown',
        format: q.format || 'unknown',
        cognitiveDemand: 'unknown',
        reflectionType: 'n/a',
        contextZone: contextZoneForText(`${image.zone || ''} ${image.archetype || ''}`),
        sourceSupport: 'none-cited',
        reviewStatus: 'not-in-review-pipeline',
        navigationExposure: 'not-reachable-in-app',
        changedCueGenuine: false,
        changedCueManuallyVerified: false,
        evidenceStrength: 'low',
        evidenceRationale: 'Authored image/question metadata; no code path in src/**/*.{js,jsx} imports or fetches povQuestions.json (grep-verified 2026-09-07), so this content is not currently reachable by a player or coach.',
      });
    }
  }
  return rows;
}

// One age-specific opportunity per decision node. contentUnitId preserves
// the shared authored identity so age availability is not mistaken for new content.
export function loadAnimatedPlayRows(ledger, overrides = {}) {
 const rows=[];
 for(const play of overrides.plays || ALL_ANIMATED_PLAYS){
  for(const [nodeId,node] of Object.entries(play.nodes || {})){
   if(!(node.ask?.q||node.q) || !node.ask?.opts?.length)continue;
   const concept=conceptById(ledger,play.concept),domain=concept?domainById(ledger,concept.domainId):null;
   const text=[play.title,play.concept,node.ask.q||node.q,...node.ask.opts.map(o=>o.t)].join(' ');
   const signals=domainSignalsForText(text);
   for(const ageBand of play.ageBands || AGE_ORDER){rows.push({
    catalog:'animated-play',questionId:`${play.id}:${nodeId}:${ageBand}`,contentUnitId:`${play.id}:${nodeId}`,
    sceneId:play.id,sceneVersion:play.version||null,sceneContentHash:sha256(play),questionContentHash:sha256({prompt:node.ask.q||node.q,ask:node.ask}),openingGeometryHash:'not-applicable:animated-play',
    ageBand,domainId:domain?.id||'unmapped',domainName:domain?.name||'Unmapped',conceptId:concept?.id||'unmapped',conceptName:concept?.name||'Unmapped',
    domainConceptMappingMethod:concept?'explicit-play-concept':'unmapped',learningObjective:play.concept||play.title,objectiveSource:'authored play concept',
    format:'animated-choice',cognitiveDemand:'apply',reflectionType:'n/a',contextZone:contextZoneForText(text),sourceSupport:play.sourceRef?.url||'none-cited',
    reviewStatus:'inventory-only-not-cleared',navigationExposure:'reachable-in-live-app',changedCueGenuine:false,changedCueManuallyVerified:false,evidenceStrength:concept?'medium':'low',
    secondaryDomainSignals:signals,
    evidenceRationale:`Authored animated decision node ${nodeId}, reachable via ReadThePlay / PracticeLibrary / LearningWorlds; age availability from play.ageBands. Domain uses exact concept lookup only. Secondary text signals describe possible cross-domain content, not a curriculum binding.`,
   });}
  }
 }
 return rows;
}

export function buildFullCurriculumMatrix(overrides = {}) {
  const ledger = overrides.ledger || loadLedger();
  const rawExperimentalBank = overrides.experimental?.bank || readBankFiles().bank;
  const rows = [
    ...loadExperimentalRows(ledger, overrides.experimental),
    ...loadLegacyBankRows(ledger, overrides.legacy),
    ...loadScenarioSeedRows(ledger, overrides.seeds),
    ...loadPovQuestionRows(ledger, overrides.pov),
    ...loadAnimatedPlayRows(ledger, overrides.animated),
  ];

  const byCatalog = {};
  for (const row of rows) (byCatalog[row.catalog] ||= []).push(row);

  // Three distinct counts, deliberately not conflated:
  //   totalQuestions          every row above.
  //   distinctScenes          unique (catalog, sceneId) pairs -- how many
  //                           authored scenes/images/rows exist, independent
  //                           of how many questions were paraphrased off one.
  //   uniqueOpeningGeometry   unique canonical actor+puck layout hash, ONLY
  //                           computable for catalogs whose schema records
  //                           actor coordinates (experimental-bank and
  //                           scenario-engine-seed). For legacy-live-bank and
  //                           pov-questions the "scene" is a static image
  //                           file with no recorded coordinates, so this is
  //                           reported as 'not-applicable' rather than
  //                           silently coerced to sceneId or scene count.
  //   distinctDecisionPattern unique (conceptId, cognitiveDemand, basis-ish
  //                           format) tuple actually tested. This is the
  //                           measure the assignment is really asking for
  //                           when it warns "many paraphrases do not
  //                           constitute broad coverage" -- uniqueOpeningGeometry
  //                           only tells you the starting picture differs,
  //                           not that a different KIND of decision is being
  //                           tested from it.
  const distinctScenes = new Set(rows.map(r => `${r.catalog}::${r.sceneId}`)).size;
  const distinctDecisionPattern = new Set(rows.map(r => `${r.conceptId}::${r.cognitiveDemand}::${r.format}`)).size;

  const geometryEligible = rows.filter(r => typeof r.openingGeometryHash === 'string' && !r.openingGeometryHash.startsWith('not-applicable'));
  const uniqueOpeningGeometry = new Set(geometryEligible.map(r => r.openingGeometryHash)).size;

  const requiredQuestions = rows.filter(r => r.reflectionType !== 'optional-reflection').length;
  const optionalReflections = rows.filter(r => r.reflectionType === 'optional-reflection').length;

  const ages = AGE_ORDER;
  const domainsByAge = ages.map(age => {
    const ageRows = rows.filter(r => r.ageBand === age);
    return {
      ageBand: age,
      totalQuestions: ageRows.length,
      distinctScenes: new Set(ageRows.map(r => `${r.catalog}::${r.sceneId}`)).size,
      byCatalog: Object.fromEntries([...new Set(ageRows.map(r => r.catalog))].map(c => [c, ageRows.filter(r => r.catalog === c).length])),
      byDomain: Object.fromEntries([...new Set(ageRows.map(r => r.domainId))].sort().map(d => [d, ageRows.filter(r => r.domainId === d).length])),
    };
  });

  const skatingMovementByAge = ages.map(age => {
    const ageRows = rows.filter(r => r.ageBand === age);
    const matches = ageRows.filter(r => r.domainId === 'skating-movement');
    return { ageBand: age, totalQuestions: ageRows.length, skatingMovementQuestions: matches.length, catalogsWithMatch: [...new Set(matches.map(r => r.catalog))], secondarySignalQuestionIds:ageRows.filter(r=>r.secondaryDomainSignals?.some(s=>s.domainId==='skating-movement')).map(r=>r.questionId) };
  });

  const skatingMovementLedgerDepth = ['edges-balance', 'agility-mobility', 'backward-transitions', 'deception-with-feet'].map(conceptId => {
    const concept = conceptById(ledger, conceptId);
    return { conceptId, depthByAge: Object.fromEntries(ledger.nodes.filter(n => n.conceptId === conceptId).map(n => [n.ageId, n.depth])) };
  });

  const u11Prompts = rawExperimentalBank.filter(s => s.ageBand === 'U11').flatMap(s => s.questions.map(q => q.prompt || ''));
  const u11ChangedCue = {
    totalU11Questions: rows.filter(r => r.catalog === 'experimental-bank' && r.ageBand === 'U11').length,
    genuineChangedCueQuestions: rows.filter(r => r.catalog === 'experimental-bank' && r.ageBand === 'U11' && r.changedCueGenuine).length,
    manuallyVerifiedCount: Object.keys(U11_MANUAL_VERIFICATION).length,
    manuallyVerifiedGenuineCount: Object.values(U11_MANUAL_VERIFICATION).filter(Boolean).length,
    naiveImagineSupposeKeywordCount: u11Prompts.filter(prompt => /^\s*(imagine|suppose)/i.test(prompt)).length,
    disclosure: 'Rule-based classification of all U11 experimental prompts with the saved manual exception ledger. The earlier 171 hand-read candidate claim was not reproducible and is withdrawn. Counts describe this classifier, not exhaustive semantic coverage; unmarked phrasing may be missed.',
  };

  const mappingDriftRows = rows.filter(r => r.evidenceRationale.includes('mapping drift, not missing content'));

  // Ranked, confidence-labeled gap backlog. This EXTENDS/CORRECTS
  // tools/build-curriculum-coverage.mjs's own BACKLOG_CANDIDATES rather than
  // leaving it untouched, per the assignment's instruction: this task's
  // findings changed the picture on ranks 1 and 2 below (skating-movement is
  // now requires mapping review after including animated content + the ledger's own
  // locked depth targets, not just an experimental-bank signal gap; and the
  // U11 cause-and-effect pattern turns out to already be real and sizeable
  // once paraphrase-only "Imagine/Suppose" counting is replaced with the
  // explicit rule, which changes the recommendation from "add volume" to
  // "name and extend an already-proven pattern").
  const gapBacklog = [
    {
      rank: 1,
      id: 'u15-u18-skating-movement-mapping-review',
      classification: 'mapping and coverage review; product-wide absence not established',
      confidence: 'limited',
      ageBands: ['U15', 'U18'],
      evidence: 'The original four inventories yielded zero primary skating-movement assignments at U15/U18. They omitted animated plays, including play_gap_control_pivot_match_speed_u13_v1, which is available at both ages and asks about pivoting and matching speed. Primary defensive concepts can contain skating cues. Inspect secondary signals and unknown mappings before deciding whether new content is needed. This is not a finding of product-wide absence.',
      recommendedSmallPilot: 'After reviewing existing animated content and confirming the precise unfilled objective, consider the prior gap plan\'s recommendation: 2 new U15 scenes and 2 new U18 scenes (4 total, 8 questions) pairing a skating/edge cue with the same geometry-comparison question pattern already used throughout the bank.',
    },
    {
      rank: 2,
      id: 'u11-cause-and-effect-family-name-and-extend',
      classification: 'missing-mapping (of an already-real pattern), not missing content',
      confidence: 'medium-high',
      ageBands: ['U11'],
      evidence: `The prior return's "Imagine/Suppose" keyword count (14/400, 3.5%) undercounted: applying the explicit changed-cue rule in tools/lib/curriculum-changed-cue.mjs (state-change narration + read-update ask, with a saved manual exception ledger) finds ${u11ChangedCue.genuineChangedCueQuestions}/${u11ChangedCue.totalU11Questions} (${(u11ChangedCue.genuineChangedCueQuestions / u11ChangedCue.totalU11Questions * 100).toFixed(1)}%) genuine changed-cue reasoning questions already exist at U11 -- almost 4x the naive count. The gap is that this pattern is scattered across many scenes' q5/q10 slots rather than named as its own family/objective anywhere in the metadata.`,
      recommendedSmallPilot: 'Do not add volume first. Name the existing pattern as an explicit family (e.g. "read-the-change") in 3-5 already-existing U11 scenes\' objective/tags fields as a mapping fix, THEN author 2-3 new scenes under that name if a coach review confirms the pilot is worth extending. Separately worth checking (not done in this pass; see TASK-B-SUMMARY.md disclosure): whether U13 (0.5% naive keyword rate, the lowest of any age) shows the same undercount once the same explicit rule is hand-applied there.',
    },
    { rank: 3, id: 'pov-questions-orphaned-catalog', classification: 'missing-navigation-exposure', confidence: 'high', ageBands: ['U7', 'U9', 'U11', 'U13'], evidence: `src/data/povQuestions.json contains ${byCatalog['pov-questions']?.length || 0} authored questions across 24 images (U7/U9/U11/U13 only, no U15/U18), but an exhaustive grep of src/**/*.{js,jsx} found zero importers or fetch() calls referencing it -- this content cannot currently be reached by any player or coach.`, recommendedSmallPilot: 'Decide (Codex/Thomas call, not a content decision): either wire src/data/povQuestions.json into a live screen, or explicitly retire/archive it. Leaving authored content silently unreachable is itself the defect, independent of the content\'s quality.' },
    { rank: 4, id: 'scenario-seed-nodeid-drift', classification: 'missing-mapping', confidence: 'medium', ageBands: ['U9', 'U11', 'U13'], evidence: `${mappingDriftRows.filter(r => r.catalog === 'scenario-engine-seed').length} scenario-engine-seed rows carry a nodeId that does not resolve to any id in src/data/curriculum-ledger.json (e.g. "u13.cycle", "u13.offensive-zone-play", "u9.support-the-puck", "u11.defensive-zone-coverage" -- see rows where domainConceptMappingMethod is "unmapped" and evidenceRationale mentions "mapping drift").`, recommendedSmallPilot: 'A mapping cleanup pass (fix the nodeId strings to a real ledger concept id, or add the missing concept to the ledger) -- not new content authoring.' },
    { rank: 5, id: 'u7-rink-vocabulary-label', classification: 'weak-content', confidence: 'low', ageBands: ['U7'], evidence: 'Carried forward from docs/factory/curriculum-map backlogCandidates and prior-return/curriculum-gap-plan.json rank 2 -- not independently re-verified in this pass.', recommendedSmallPilot: '2 new U7 scenes (4 questions) using the existing "choice" type identifying a rink landmark.' },
    { rank: 6, id: 'u9-receive-on-the-move', classification: 'weak-content', confidence: 'low', ageBands: ['U9'], evidence: 'Carried forward from docs/factory/curriculum-map backlogCandidates and prior-return/curriculum-gap-plan.json rank 3 -- not independently re-verified in this pass.', recommendedSmallPilot: '2 new U9 scenes (4 questions) freezing a receiver just before the puck arrives.' },
    { rank: 7, id: 'u13-coverage-match', classification: 'weak-content', confidence: 'low', ageBands: ['U13'], evidence: 'Carried forward from docs/factory/curriculum-map backlogCandidates and prior-return/curriculum-gap-plan.json rank 8 -- not independently re-verified in this pass.', recommendedSmallPilot: '2 new U13 scenes (4 questions) with an explicit mid-scene coverage handoff/switch cue.' },
    { rank: 8, id: 'goalie-observation-track', classification: 'weak-content', confidence: 'low', ageBands: ['U9', 'U11', 'U13', 'U15', 'U18'], evidence: 'Carried forward, lowest confidence by design (needs a goaltending-specific source review before any scene is authored) -- not independently re-verified in this pass.', recommendedSmallPilot: 'Do not draft content yet; identify a specific reviewed goaltending source first.' },
  ];

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      status: 'descriptive inventory / planning aid, provisional-not-reviewed',
      source: 'tools/build-full-curriculum-matrix.mjs',
      catalogs: [
        {id:'animated-play',description:'Authored decision nodes from playCatalog.js, expanded by declared age availability; contentUnitId identifies shared content.',liveInApp:true,rowCount:byCatalog['animated-play']?.length||0},
        { id: 'experimental-bank', description: 'Composed experimental one-on-one bank (tools/experimental-bank-files.mjs).', liveInApp: true, rowCount: byCatalog['experimental-bank']?.length || 0 },
        { id: 'legacy-live-bank', description: 'src/data/bank.json, loaded by src/qbLoader.js and consumed across App.jsx/PlayerLearningHome/LearningWorlds/PracticeLibrary/questionOfDay/review/screens/speedRound/teamChallenges.', liveInApp: true, rowCount: byCatalog['legacy-live-bank']?.length || 0 },
        { id: 'scenario-engine-seed', description: 'src/scenario/seeds/*.json (top level only), merged into the live QB by src/qbLoader.js collectScenarios().', liveInApp: true, rowCount: byCatalog['scenario-engine-seed']?.length || 0 },
        { id: 'pov-questions', description: 'src/data/povQuestions.json -- authored, but zero importers/fetchers found in src/**/*.{js,jsx}.', liveInApp: false, rowCount: byCatalog['pov-questions']?.length || 0 },
      ],
      excludedCatalogs: [
        { id: 'scene-manifest', path: 'src/data/scene-manifest.json', reason: 'Authoring-time scene/asset registry (image id/file/alt), not a question catalog; also not imported by any runtime code.' },
        { id: 'questions-ship-tmp', path: 'src/data/questions.json.ship.tmp', reason: 'Flagged as build cruft by tools/lib/deadcode-scan.test.mjs; stale 8.8MB artifact, not live.' },
        { id: 'cognitive-gym', path: 'src/cognitive-gym/', reason: 'Timed reaction/decision drills with no age/domain ledger tagging -- a different content type than a curriculum-mapped question.' },
        { id: 'scenario-seeds-pending-retired', path: 'src/scenario/seeds/_pending/, src/scenario/seeds/_retired/', reason: 'Excluded from the live glob src/qbLoader.js actually reads; inspected for the U15/U18 check (no matches) but not counted as live rows here.' },
      ],
      counting: {
        totalQuestions: rows.length,
        countingUnit: "Inventory rows, including age-specific animated opportunities and unreachable POV content; not a count of distinct live questions.",
        liveOpportunityRows: rows.filter(r=>r.catalog!=="pov-questions").length,
        unreachableRows: rows.filter(r=>r.catalog==="pov-questions").length,
        animatedDistinctDecisions: new Set(rows.filter(r=>r.catalog==="animated-play").map(r=>r.contentUnitId)).size,
        distinctScenes,
        uniqueOpeningGeometry,
        uniqueOpeningGeometryScope: 'experimental-bank + scenario-engine-seed only (legacy-live-bank and pov-questions record a static image, not actor/puck coordinates) -- see meta.geometryNote.',
        distinctDecisionPattern,
        geometryNote: 'uniqueOpeningGeometry and distinctDecisionPattern measure different things and are NOT interchangeable: uniqueOpeningGeometry is a canonical hash of actor+puck starting positions (an authoring/production-diversity measure -- do two scenes start from a physically different picture?). distinctDecisionPattern groups by (conceptId, cognitiveDemand, format) (a coverage-breadth measure -- how many different KINDS of decision are actually being tested?). A bank can have many unique geometries all testing the same decision pattern, or few geometries paraphrased into many decision-pattern labels; neither count alone proves broad coverage.',
        requiredQuestions,
        optionalReflections,
      },
    },
    domainsByAge,
    skatingMovementByAge,
    skatingMovementLedgerDepth,
    u11ChangedCue,
    mappingDriftRows: mappingDriftRows.map(r => ({ catalog: r.catalog, questionId: r.questionId, sceneId: r.sceneId, ageBand: r.ageBand, evidenceRationale: r.evidenceRationale })),
    gapBacklog,
    rows,
  };
}

function csvCell(value) {
  if(value && typeof value==='object')value=JSON.stringify(value);
  const stringValue = Array.isArray(value) ? value.map(v => (typeof v === 'object' ? v.title || v.url || JSON.stringify(v) : v)).join(' | ') : (typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? ''));
  return '"' + stringValue.replace(/^[=+@-]/, "'$&").replaceAll('"', '""').replace(/[\r\n]+/g, ' ') + '"';
}

const CSV_COLUMNS = ['questionId', 'contentUnitId', 'secondaryDomainSignals', 'catalog', 'sceneId', 'sceneVersion', 'sceneContentHash', 'questionContentHash', 'openingGeometryHash', 'ageBand', 'domainId', 'domainName', 'conceptId', 'conceptName', 'domainConceptMappingMethod', 'learningObjective', 'objectiveSource', 'format', 'cognitiveDemand', 'reflectionType', 'contextZone', 'sourceSupport', 'reviewStatus', 'navigationExposure', 'changedCueGenuine', 'changedCueManuallyVerified', 'evidenceStrength', 'evidenceRationale'];

export function buildCsv(report) {
  const rows = [CSV_COLUMNS.map(csvCell).join(',')];
  for (const row of report.rows) rows.push(CSV_COLUMNS.map(col => csvCell(row[col])).join(','));
  return rows.join('\r\n') + '\r\n';
}

// Standalone report: no external analytics, no write controls, readable at
// 390px (mobile card list) and desktop (filterable table). Filters are
// age/domain/concept/format per the assignment; catalog and evidence
// strength are included too since they are the load-bearing distinctions
// this task's findings turned on.
export function buildReportHtml(report) {
  const embedded = JSON.stringify({
    rows: report.rows,
    meta: report.meta,
    skatingMovementByAge: report.skatingMovementByAge,
    skatingMovementLedgerDepth: report.skatingMovementLedgerDepth,
    u11ChangedCue: report.u11ChangedCue,
    gapBacklog: report.gapBacklog,
    mappingDriftRows: report.mappingDriftRows,
  }).replaceAll('<', '\\u003c');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RinkReads curriculum matrix (inventoried catalogs)</title><style>
:root{color-scheme:light;--navy:#0b1a33;--navy2:#132b4f;--gold:#c9a24b;--ice:#eef7f8;--line:#c8d8df;--ink:#1b2a3a;--muted:#5c6d7c;--white:#fff}*{box-sizing:border-box}body{margin:0;background:linear-gradient(140deg,#f7fbfc,#e8f2f4);color:var(--ink);font:14px/1.45 system-ui,-apple-system,Segoe UI,sans-serif}header{background:linear-gradient(120deg,var(--navy),var(--navy2));color:#fff;padding:24px clamp(14px,4vw,54px)}h1{margin:0 0 5px;font-size:clamp(20px,4vw,32px);letter-spacing:-.03em}header p{margin:0;color:#d5e4ef;max-width:900px;font-size:13px}.shell{max-width:1450px;margin:auto;padding:16px clamp(10px,3vw,42px) 50px}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:10px;margin:0 0 16px}.card,.panel{background:#ffffffd9;border:1px solid #fff;box-shadow:0 7px 20px #16324a12;border-radius:14px}.card{padding:13px}.card b{display:block;font-size:22px;color:var(--navy)}.card span{color:var(--muted);font-size:11px}.toolbar{display:flex;flex-wrap:wrap;gap:8px;align-items:end;margin-bottom:12px}.toolbar label{display:grid;gap:3px;color:var(--muted);font-size:11px}.toolbar select,.toolbar input{border:1px solid var(--line);background:#fff;color:var(--ink);border-radius:8px;padding:7px 9px;font-size:13px;min-width:120px}.tabs{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}.tabs button{cursor:pointer;border:1px solid var(--line);background:#fff;border-radius:8px;padding:7px 10px;font-size:12px}.tabs button.active{background:var(--navy);color:#fff;border-color:var(--navy)}.panel{padding:14px;overflow:auto}.panel h2{font-size:17px;margin:0 0 5px;color:var(--navy)}.note{color:var(--muted);margin:0 0 10px;font-size:12.5px}.table-wrap{overflow:auto;border:1px solid var(--line);border-radius:10px;max-height:70vh}table{border-collapse:collapse;width:100%;min-width:900px;background:#fff}th,td{padding:7px 8px;border-bottom:1px solid #e3ebee;text-align:left;vertical-align:top;font-size:12.5px}th{position:sticky;top:0;background:#f0f6f7;color:var(--navy);font-size:11px;white-space:nowrap}tr:last-child td{border-bottom:0}.pill{display:inline-block;padding:2px 6px;margin:1px 2px 1px 0;border-radius:99px;background:#e3eef3;color:var(--navy);font-size:11px}.pill.warn{background:#fbe6cf;color:#7a4a12}.pill.bad{background:#fbdada;color:#7a1212}.pill.good{background:#d9f0e0;color:#12602f}.muted{color:var(--muted)}.backlog{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px}.candidate{padding:12px;border:1px solid var(--line);border-radius:10px;background:var(--ice)}.candidate h3{color:var(--navy);margin:0 0 4px;font-size:14px}.candidate p{margin:5px 0;font-size:12.5px}code{font-size:11px;color:#174a64}
#mobileCards{display:none}
@media(max-width:600px){.table-wrap:has(+ #mobileCards){display:none}#mobileCards{display:block;overflow-wrap:anywhere}}
.mrow{background:#fff;border:1px solid var(--line);border-radius:10px;padding:10px;margin-bottom:8px;font-size:12.5px}
.mrow b{color:var(--navy);display:block;margin-bottom:3px}
</style></head><body><header><div class="shell"><h1>RinkReads curriculum matrix — inventoried catalogs</h1><p>Cross-catalog inventory: experimental bank, legacy live bank (src/data/bank.json), scenario-engine seeds, animated decision plays, and the unreachable pov-questions catalog. Descriptive inventory / planning aid, provisional-not-reviewed. No content-quality certification implied.</p></div></header><main class="shell"><div id="cards" class="cards"></div><div class="toolbar"><label>Age<select id="age"><option value="">All ages</option></select></label><label>Catalog<select id="catalog"><option value="">All catalogs</option></select></label><label>Domain<select id="domain"><option value="">All domains</option></select></label><label>Concept<select id="concept"><option value="">All concepts</option></select></label><label>Format<select id="format"><option value="">All formats</option></select></label><label>Search<input id="search" type="search" placeholder="id, objective, rationale"></label></div><nav id="tabs" class="tabs" aria-label="Views"></nav><section id="content" class="panel"></section><p class="muted" style="margin-top:16px;font-size:12px">Data: <a href="curriculum-matrix.json">curriculum-matrix.json</a> · <a href="curriculum-matrix.csv">curriculum-matrix.csv</a> · Generated by tools/build-full-curriculum-matrix.mjs.</p></main>
<script id="matrix-data" type="application/json">${embedded}</script><script>
const DATA=JSON.parse(document.getElementById('matrix-data').textContent);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={age:'',catalog:'',domain:'',concept:'',format:'',search:''};
let view='rows';
const tabs=[['rows','Rows'],['skating','Skating &amp; Movement check'],['changedcue','U11 changed-cue check'],['drift','Mapping drift'],['backlog','Gap backlog']];
function filteredRows(){return DATA.rows.filter(r=>(!state.age||r.ageBand===state.age)&&(!state.catalog||r.catalog===state.catalog)&&(!state.domain||r.domainId===state.domain)&&(!state.concept||r.conceptId===state.concept)&&(!state.format||r.format===state.format)&&(!state.search||[r.questionId,r.sceneId,r.learningObjective,r.evidenceRationale].join(' ').toLowerCase().includes(state.search.toLowerCase())))}
function renderCards(){const c=DATA.meta.counting;document.getElementById('cards').innerHTML=[['inventory rows',c.totalQuestions],['live opportunity rows',c.liveOpportunityRows],['unreachable rows',c.unreachableRows],['distinct animated decisions',c.animatedDistinctDecisions],['distinct scenes',c.distinctScenes],['unique opening geometry',c.uniqueOpeningGeometry],['distinct decision patterns',c.distinctDecisionPattern],['required questions',c.requiredQuestions],['optional reflections',c.optionalReflections]].map(([l,n])=>'<div class="card"><b>'+esc(n)+'</b><span>'+l+'</span></div>').join('')}
function table(heads,rows){return '<div class="table-wrap"><table><thead><tr>'+heads.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table></div>'}
function renderRows(){
 const rows=filteredRows();
 const shown=rows.slice(0,400);
 document.getElementById('content').innerHTML='<h2>Question rows</h2><p class="note">'+rows.length+' matching questions'+(rows.length>400?' (showing first 400 — narrow the filters to see more)':'')+'. Evidence strength: <span class="pill good">high</span> explicit binding, <span class="pill warn">medium/low</span> keyword signal only, <span class="pill bad">unknown</span> unmapped.</p>'
  +table(['Question','Catalog','Age','Domain','Concept','Format','Cognitive demand','Mapping','Evidence','Nav'],shown.map(r=>'<tr><td><code>'+esc(r.questionId)+'</code><br><span class="muted">'+esc(r.sceneId)+'</span></td><td>'+esc(r.catalog)+'</td><td>'+esc(r.ageBand)+'</td><td>'+esc(r.domainName)+'</td><td>'+esc(r.conceptName)+'</td><td>'+esc(r.format)+'</td><td>'+esc(r.cognitiveDemand)+'</td><td>'+esc(r.domainConceptMappingMethod)+'</td><td><span class="pill '+(r.evidenceStrength==='high'?'good':r.evidenceStrength==='unknown'?'bad':'warn')+'">'+esc(r.evidenceStrength)+'</span></td><td>'+esc(r.navigationExposure==='reachable-in-live-app'?'live':'not reachable')+'</td></tr>'))
  +'<div id="mobileCards">'+shown.map(r=>'<div class="mrow"><b>'+esc(r.questionId)+'</b>'+esc(r.catalog)+' · '+esc(r.ageBand)+' · '+esc(r.domainName)+' / '+esc(r.conceptName)+'<br>Format: '+esc(r.format)+' · Demand: '+esc(r.cognitiveDemand)+'<br>Mapping: '+esc(r.domainConceptMappingMethod)+' <span class="pill '+(r.evidenceStrength==='high'?'good':r.evidenceStrength==='unknown'?'bad':'warn')+'">'+esc(r.evidenceStrength)+'</span> '+esc(r.navigationExposure==='reachable-in-live-app'?'· live':'· not reachable')+'</div>').join('')+'</div>';
}
function renderSkating(){
 const rows=DATA.skatingMovementByAge;
 document.getElementById('content').innerHTML='<h2>U15/U18 Skating &amp; Movement recheck</h2><p class="note">Ledger-designed depth (locked 2026-06-04) expects refinement-level skating-movement content through U15/U18, not just U7-U13. Primary mappings and secondary signals have different meanings. Animated plays include skating cues; product-wide absence is not established. Unreachable POV content is inventoried separately.</p>'
  +table(['Age','Total questions','Skating-movement matches','Catalogs with a match','Secondary skating signals'],rows.map(r=>'<tr><td>'+esc(r.ageBand)+'</td><td>'+r.totalQuestions+'</td><td>'+(r.skatingMovementQuestions===0?'<span class="pill bad">0</span>':r.skatingMovementQuestions)+'</td><td>'+(r.catalogsWithMatch.map(c=>'<span class="pill">'+esc(c)+'</span>').join('')||'<span class="muted">none</span>')+'</td><td>'+r.secondarySignalQuestionIds.length+'</td></tr>'))
  +'<h2 style="margin-top:16px">Ledger depth targets (compare with mappings and actual content)</h2>'
  +table(['Concept','U7','U9','U11','U13','U15','U18'],DATA.skatingMovementLedgerDepth.map(c=>'<tr><td>'+esc(c.conceptId)+'</td>'+['U7','U9','U11','U13','U15','U18'].map(a=>'<td>'+esc(c.depthByAge[a]||'-')+'</td>').join('')+'</tr>'))
  +'<p class="note" style="margin-top:10px">Depth legend: I=introduced, D=developing, M=mastery emphasis, R=refinement at speed under opposed conditions. Depth targets describe intended progression; zero primary mappings cannot establish missing content.</p>';
}
function renderChangedCue(){
 const d=DATA.u11ChangedCue;
 document.getElementById('content').innerHTML='<h2>U11 "changed-cue" reasoning recheck</h2>'
  +table(['Metric','Value'],[['Total U11 questions (experimental bank)',d.totalU11Questions],['Naive "Imagine/Suppose" keyword count (prior method)',d.naiveImagineSupposeKeywordCount],['Changed-cue matches (rule + saved manual ledger)',d.genuineChangedCueQuestions],['Candidates hand-verified',d.manuallyVerifiedCount],['Of those, confirmed genuine',d.manuallyVerifiedGenuineCount]].map(([k,v])=>'<tr><td>'+esc(k)+'</td><td><b>'+esc(v)+'</b></td></tr>'))
  +'<p class="note" style="margin-top:10px">'+esc(d.disclosure)+'</p>';
}
function renderDrift(){
 const rows=DATA.mappingDriftRows;
 document.getElementById('content').innerHTML='<h2>Mapping drift (nodeId does not resolve to a real ledger concept)</h2><p class="note">'+rows.length+' rows. This is a mapping defect, not a missing-content finding -- the content exists, the binding is stale or was authored against a concept id the locked ledger never had.</p>'
  +table(['Question','Catalog','Age','Scene','Note'],rows.map(r=>'<tr><td>'+esc(r.questionId)+'</td><td>'+esc(r.catalog)+'</td><td>'+esc(r.ageBand)+'</td><td>'+esc(r.sceneId)+'</td><td>'+esc(r.evidenceRationale)+'</td></tr>'));
}
function renderBacklog(){
 document.getElementById('content').innerHTML='<h2>Ranked, confidence-labeled gap backlog</h2><div class="backlog">'+DATA.gapBacklog.map(g=>'<article class="candidate"><h3>#'+g.rank+' '+esc(g.id)+'</h3><p><span class="pill '+(g.confidence==='high'?'good':g.confidence.includes('low')?'bad':'warn')+'">'+esc(g.confidence)+' confidence</span> <span class="pill">'+esc(g.classification)+'</span></p><p><b>Ages:</b> '+esc(g.ageBands.join(', '))+'</p><p><b>Evidence:</b> '+esc(g.evidence)+'</p><p><b>Recommended next step:</b> '+esc(g.recommendedSmallPilot)+'</p></article>').join('')+'</div>';
}
function render(){
 renderCards();
 document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
 if(view==='rows')renderRows();else if(view==='skating')renderSkating();else if(view==='changedcue')renderChangedCue();else if(view==='drift')renderDrift();else renderBacklog();
}
document.getElementById('age').innerHTML+=[...new Set(DATA.rows.map(r=>r.ageBand))].sort().map(a=>'<option>'+esc(a)+'</option>').join('');
document.getElementById('catalog').innerHTML+=[...new Set(DATA.rows.map(r=>r.catalog))].sort().map(a=>'<option>'+esc(a)+'</option>').join('');
document.getElementById('domain').innerHTML+=[...new Set(DATA.rows.map(r=>r.domainId))].sort().map(a=>'<option>'+esc(a)+'</option>').join('');
document.getElementById('concept').innerHTML+=[...new Set(DATA.rows.map(r=>r.conceptId))].sort().map(a=>'<option>'+esc(a)+'</option>').join('');
document.getElementById('format').innerHTML+=[...new Set(DATA.rows.map(r=>r.format))].sort().map(a=>'<option>'+esc(a)+'</option>').join('');
document.getElementById('tabs').innerHTML=tabs.map(([id,label])=>'<button type="button" data-view="'+id+'">'+label+'</button>').join('');
document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>{view=b.dataset.view;render()});
for(const id of ['age','catalog','domain','concept','format','search'])document.getElementById(id).oninput=e=>{state[id]=e.target.value;render()};
render();
</script></body></html>`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  mkdirSync(OUTPUT, { recursive: true });
  const report = buildFullCurriculumMatrix();
  writeFileSync(resolve(OUTPUT, 'curriculum-matrix.json'), JSON.stringify(report, null, 2) + '\n');
  writeFileSync(resolve(OUTPUT, 'curriculum-matrix.csv'), buildCsv(report));
  writeFileSync(resolve(OUTPUT, 'curriculum-report.html'), buildReportHtml(report));
  console.log(JSON.stringify({
    output: OUTPUT,
    generationCommand: 'node tools/build-full-curriculum-matrix.mjs',
    ...report.meta.counting,
    catalogs: report.meta.catalogs.map(c => ({ id: c.id, rowCount: c.rowCount, liveInApp: c.liveInApp })),
  }, null, 2));
}
