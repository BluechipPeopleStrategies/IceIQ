import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readBankFiles } from './experimental-bank-files.mjs';
import { loadLedger } from './lib/curriculum-ledger.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = resolve(ROOT, 'docs/factory/curriculum-map');
const AGE_ORDER = ['U7', 'U9', 'U11', 'U13', 'U15', 'U18'];
const TYPE_ORDER = ['choice', 'multi', 'sequence', 'position', 'explain'];
const TYPE_LABELS = {
  choice: 'Multiple choice', multi: 'Multi-select cues', sequence: 'Order actions',
  position: 'Move a player', explain: 'Explain / compare',
};

const DOMAIN_RULES = [
  { id: 'skating-movement', tokens: ['skating', 'skate', 'backward', 'pivot', 'agility', 'edge', 'footwork'] },
  { id: 'puck-skills', tokens: ['puck', 'passing', 'pass', 'receiv', 'shoot', 'carry', 'possession', 'retrieval', 'protection'] },
  { id: 'hockey-sense', tokens: ['scan', 'read', 'awareness', 'decision', 'timing', 'space', 'support', 'risk', 'clock'] },
  { id: 'offensive-play', tokens: ['attack', 'offensive', 'entry', 'cycle', 'support', 'pass', 'shoot', 'net front', 'point'] },
  { id: 'defensive-play', tokens: ['defend', 'defensive', 'coverage', 'gap', 'angle', 'forecheck', 'stick', 'contain', 'pressure'] },
  { id: 'transition-compete', tokens: ['transition', 'breakout', 'regroup', 'backcheck', 'recover', 'battle', 'compete', 'communication', 'faceoff', 'face-off', 'handoff'] },
];

const FORMAT_ROWS = [
  ['multiple-choice', 'Multiple choice', 'choice', 'Pick a visible fact or supported action.'],
  ['multi-select', 'Choose all that apply', 'multi', 'Select every supported cue or action when more than one can be true.'],
  ['true-false', 'True / false', null, 'Judge one specific claim against the freeze.'],
  ['tap-player-feature', 'Tap a player or feature', null, 'Identify possession, an actor, a change or a rink landmark.'],
  ['pick-spot-lane', 'Pick a spot or lane', null, 'Recognize where an action or support option is available.'],
  ['move-player', 'Move / arrange players', 'position', 'Apply positioning, spacing or coverage.'],
  ['draw-route', 'Draw a route', null, 'Connect an intended action to a path and destination.'],
  ['order-actions', 'Order actions', 'sequence', 'Recall or anticipate a supported causal order.'],
  ['match-responsibilities', 'Match responsibilities', null, 'Pair a player with a role, threat or space.'],
  ['watch-judge-why', 'Watch, judge and explain why', null, 'Evaluate a read using visible evidence.'],
  ['spot-mistake', 'Spot the mistake', null, 'Detect a missed cue and its consequence.'],
  ['pause-predict', 'Pause and predict', null, 'Anticipate a continuation and update after it.'],
  ['explain-compare', 'Explain, compare and reconsider', 'explain', 'Connect a reason to evidence and adapt to a changed cue.'],
  ['fill-blank', 'Fill the blank', null, 'Use a short word bank or typed hockey term.'],
  ['label-picture', 'Label a picture', null, 'Match a visible object or rink landmark to a name.'],
  ['match-sort', 'Match and sort', null, 'Pair equipment, body area, role or category.'],
  ['visual-checklist', 'Complete a visual checklist', null, 'Recognize a reviewed set of player items or cues.'],
  ['assemble-player', 'Assemble a player', null, 'Place visible equipment on the corresponding body region.'],
];

const BACKLOG_CANDIDATES = [
  { id: 'u7-rink-vocabulary-label', ageBands: ['U7'], focus: 'Rink landmarks and beginner vocabulary', format: 'label-picture / tap-player-feature', geometryIntent: 'One small cross-ice scene with a net, boards, blue line and puck; every label must point to a visible feature.', sources: ['hockey-canada-downloads', 'usa-adm-one-sheet'], why: 'The current bank has no label-picture or feature-tap delivery. Start with identification before asking for a tactical read.' },
  { id: 'u7-small-space-sharing', ageBands: ['U7'], focus: 'Sharing the puck in a small space', format: 'true-false / pick-spot-lane', geometryIntent: 'Two or three players on a scaled cross-ice area, with a clear available teammate and a visible blocked lane.', sources: ['hockey-canada-small-area', 'usa-adm-one-sheet'], why: 'A concrete small-space read can add a delivery format while keeping the question at one visible cue.' },
  { id: 'u9-receive-on-the-move', ageBands: ['U9'], focus: 'Passing and receiving while moving', format: 'tap-player-feature / pick-spot-lane', geometryIntent: 'Receiver moving into open ice with one safe-looking but blocked alternative; no hidden speed or guaranteed completion.', sources: ['hockey-canada-u9-pathway', 'iihf-passing-moving'], why: 'The official U9 pathway foregrounds skating, puck control, passing and receiving; the current map should test the receiver’s visible option directly.' },
  { id: 'u11-scan-before-receive', ageBands: ['U11'], focus: 'Scan before the first touch', format: 'true-false / watch-judge-why', geometryIntent: 'Freeze a receiver, pressure player and support player before the puck arrives; ask only about displayed cues.', sources: ['hockey-canada-skating', 'iihf-passing-moving'], why: 'This supplies a missing factual format and makes scanning a visible observation rather than a generic reminder.' },
  { id: 'u11-small-area-decision', ageBands: ['U11'], focus: 'Decision making under repeated small-area pressure', format: 'order-actions / explain-compare', geometryIntent: 'A bounded 2v2 or 3v3 read with two successive freezes and a stated condition for the next decision.', sources: ['iihf-small-area', 'hockey-canada-small-area'], why: 'Small-area research supports varying player count and surface as a design input; it does not supply a universal answer key.' },
  { id: 'u13-coverage-match', ageBands: ['U13'], focus: 'Match a defender to the changing threat', format: 'match-responsibilities / spot-mistake', geometryIntent: 'Three attackers and defenders with one explicit switch cue; every candidate assignment must be visible and coach-reviewed.', sources: ['iihf-3v3', 'hockey-canada-downloads'], why: 'The current bank has many coverage scenarios but no matching or mistake format, so delivery variety can deepen the same visible decision.' },
  { id: 'u15-u18-pace-update', ageBands: ['U15', 'U18'], focus: 'Update the read when space and player count change', format: 'pause-predict / draw-route', geometryIntent: 'A controlled first freeze followed by one authored continuation; show the changed lane before asking for the next read.', sources: ['iihf-small-area', 'hockey-canada-downloads'], why: 'Older bands need more open updating and route explanation, while the source supports changing practice environments rather than a fixed quota.' },
  { id: 'goalie-observation-track', ageBands: ['U9', 'U11', 'U13', 'U15', 'U18'], focus: 'Goalie angle, depth and recovery observations', format: 'tap-player-feature / watch-judge-why', geometryIntent: 'Use a visible shooter, net and goalie position; keep save outcome and technical execution separate from the observation.', sources: ['hockey-canada-downloads', 'iihf-development-hub'], why: 'The ledger has a goalie domain, but the current composed experimental bank is skater-question heavy; add goalie observations only with a reviewed source and age fit.' },
];

const BACKLOG_SOURCES = [
  { id: 'hockey-canada-small-area', title: 'Hockey Canada Skill Development | Small Area Games and Drill Stations', url: 'https://www.hockeycanada.ca/en-ca/hockey-programs/players/essentials/positions-skills/small-area', use: 'Context for scaling space and player count for younger development; not a question answer key.' },
  { id: 'hockey-canada-skating', title: 'Hockey Canada Skill Development | Skating', url: 'https://www.hockeycanada.ca/en-ca/hockey-programs/players/essentials/positions-skills/skating', use: 'Context for skating, puck handling, passing and receiving progressions.' },
  { id: 'hockey-canada-downloads', title: 'Hockey Canada Player Development Downloads', url: 'https://www.hockeycanada.ca/en-ca/hockey-programs/players/essentials/downloads', use: 'Official entry point for age-specific pathways, core skills and practice resources; inspect the relevant document before authoring a claim.' },
  { id: 'hockey-canada-u9-pathway', title: 'Hockey Canada Canadian Player Pathway: U9 Hockey', url: 'https://cdn.hockeycanada.ca/hockey-canada/Hockey-Programs/Coaching/u9-program/downloads/2026/u9-player-pathway-e.pdf', use: 'Supports U9 emphasis on skating, puck control, passing, receiving and shooting, with rules introduced in age-appropriate sequence.' },
  { id: 'usa-adm-one-sheet', title: 'USA Hockey American Development Model', url: 'https://portal.usahockey.com/cx/president/hockey-devlopment/adm_one-sheet.pdf', use: 'Cross-reference for small spaces, constant motion and age-banded development; Canadian rules remain separate.' },
  { id: 'iihf-small-area', title: 'IIHF Research on Small-Area Games', url: 'https://www.iihf.com/en/static/20840/research-on-small-area-games', use: 'Research context for changing game format, player involvement, action density and decision opportunities.' },
  { id: 'iihf-passing-moving', title: 'IIHF: Passing and stick handling while moving', url: 'https://www.iihf.com/en/coaching/18608/passing-and-stick-handling-while-moving', use: 'Practice example combining passing, moving, reaction and reading the game; not a universal scoring rubric.' },
  { id: 'iihf-3v3', title: 'IIHF: 3vs3', url: 'https://www.iihf.com/en/coaching/18775/3vs3', use: 'Practice context for playing skills, game sense, roles and competing.' },
  { id: 'iihf-development-hub', title: 'IIHF Development Hub', url: 'https://www.iihf.com/en/statichub/4625/development', use: 'Official coaching and development resource index; specific goalie claims need a specific reviewed source.' },
];

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);
const countBy = (values, mapper = value => value) => Object.fromEntries([...new Set(values.map(mapper))].sort().map(key => [key, values.filter(value => mapper(value) === key).length]));
const increment = (object, key, amount = 1) => { object[key] = (object[key] || 0) + amount; };
const sortedCounts = object => Object.fromEntries(Object.entries(object).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
const ageSort = (a, b) => AGE_ORDER.indexOf(a) - AGE_ORDER.indexOf(b);
const canonicalGeometry = scenario => ({
  actors: (scenario.setup?.actors || []).map(actor => ({ id: actor.id, role: actor.role, team: actor.team, x: actor.x, y: actor.y, facing: actor.facing })).sort((a, b) => a.id.localeCompare(b.id)),
  puck: scenario.setup?.puck || null,
});
const geometryHash = scenario => hash(canonicalGeometry(scenario));
const fieldsFor = scenario => ({
  tags: Array.isArray(scenario.tags) ? scenario.tags : [],
  topic: scenario.topic || '', family: scenario.family || '', objective: scenario.objective || '',
});
const signalFor = scenario => {
  const fields = fieldsFor(scenario);
  const haystack = [fields.topic, fields.family, fields.objective, ...fields.tags].join(' ').toLowerCase();
  return DOMAIN_RULES.map(rule => ({
    domainId: rule.id,
    matchedTokens: rule.tokens.filter(token => haystack.includes(token)),
  })).filter(signal => signal.matchedTokens.length);
};

function makeGroupRows(scenarios, keyFn) {
  const groups = new Map();
  for (const scenario of scenarios) {
    const key = keyFn(scenario);
    const keys = Array.isArray(key) ? key : [key];
    for (const groupKey of keys) {
      if (!groups.has(groupKey)) groups.set(groupKey, { key: groupKey, scenarios: [], questions: [], geometries: new Set(), ages: new Set(), topics: new Set(), families: new Set(), tags: new Set(), objectives: new Set() });
      const group = groups.get(groupKey);
      group.scenarios.push(scenario);
      group.questions.push(...scenario.questions);
      group.geometries.add(scenario.geometryHash);
      group.ages.add(scenario.ageBand); group.topics.add(scenario.topic); group.families.add(scenario.family);
      for (const tag of scenario.tags || []) group.tags.add(tag);
      if (scenario.objective) group.objectives.add(scenario.objective);
    }
  }
  return [...groups.values()].map(group => ({
    key: group.key, ageBands: [...group.ages].sort(ageSort), scenarios: group.scenarios.length,
    questions: group.questions.length, uniqueOpeningGeometry: group.geometries.size,
    questionPerGeometry: Number((group.questions.length / Math.max(1, group.geometries.size)).toFixed(2)),
    topics: group.topics.size, families: group.families.size,
    typeCounts: sortedCounts(countBy(group.questions, question => question.type)),
    basisCounts: sortedCounts(countBy(group.questions, question => question.basis)),
    topTags: [...group.tags].sort().slice(0, 12),
    sampleObjectives: [...group.objectives].slice(0, 4),
  }));
}

function buildScenarioRows(bank, domainNames) {
  return bank.map(scenario => {
    const domains = signalFor(scenario);
    return {
      id: scenario.id, version: scenario.version, ageBand: scenario.ageBand, title: scenario.title,
      family: scenario.family, topic: scenario.topic, objective: scenario.objective, tags: scenario.tags || [],
      questions: scenario.questions.length, typeCounts: sortedCounts(countBy(scenario.questions, question => question.type)),
      basisCounts: sortedCounts(countBy(scenario.questions, question => question.basis)), geometryHash: scenario.geometryHash,
      domainSignals: domains.map(signal => ({ domainId: signal.domainId, domainName: domainNames[signal.domainId], matchedTokens: signal.matchedTokens })),
      sources: (scenario.sources || []).map(source => ({ id: source.id, title: source.title, url: source.url, section: source.section, use: source.use })),
      questionRows: scenario.questions.map(question => ({ id: question.id, type: question.type, basis: question.basis, prompt: question.prompt })),
    };
  });
}

export function buildCoverageReport({ bank, ledger = loadLedger() } = {}) {
  const inputBank = bank || readBankFiles().bank;
  const domainNames = Object.fromEntries(ledger.domains.map(domain => [domain.id, domain.name]));
  const scenarios = inputBank.map(scenario => ({ ...scenario, geometryHash: geometryHash(scenario) }));
  const questions = scenarios.flatMap(scenario => scenario.questions.map(question => ({ ...question, scenario })));
  const scenarioRows = buildScenarioRows(scenarios, domainNames);
  const domainRows = ledger.domains.map(domain => {
    const matched = scenarios.filter(scenario => signalFor(scenario).some(signal => signal.domainId === domain.id));
    const domainQuestions = matched.flatMap(scenario => scenario.questions);
    return {
      id: domain.id, name: domain.name, definition: domain.definition,
      concepts: ledger.concepts.filter(concept => concept.domainId === domain.id).map(concept => ({ id: concept.id, name: concept.name, definition: concept.definition })),
      signalScenarios: matched.length, signalQuestions: domainQuestions.length,
      uniqueOpeningGeometry: new Set(matched.map(scenario => scenario.geometryHash)).size,
      ageBands: AGE_ORDER.filter(age => matched.some(scenario => scenario.ageBand === age)),
      topTopics: [...new Set(matched.map(scenario => scenario.topic))].slice(0, 8),
      mappingMethod: 'Signal map from actual scenario tags, topic, family and objective; this is an inventory aid, not an authored concept binding.',
    };
  });
  const directConceptRows = ledger.concepts.map(concept => {
    const needles = [concept.id.replaceAll('-', ' '), concept.name.toLowerCase()];
    const matched = scenarios.filter(scenario => {
      const fields = fieldsFor(scenario); const values = [fields.topic, fields.family, fields.objective, ...fields.tags].join(' ').toLowerCase();
      return needles.some(needle => values.includes(needle));
    });
    const conceptQuestions = matched.flatMap(scenario => scenario.questions);
    return {
      id: concept.id, name: concept.name, domainId: concept.domainId, anchor: !!concept.anchor,
      definition: concept.definition, signalScenarios: matched.length, signalQuestions: conceptQuestions.length,
      uniqueOpeningGeometry: new Set(matched.map(scenario => scenario.geometryHash)).size,
      depthByAge: AGE_ORDER.map(age => { const node = ledger.nodes.find(item => item.ageId === age && item.conceptId === concept.id); return { ageBand: age, depth: node?.depth || '-', targetCount: node?.targetCount ?? null }; }),
      matchingFields: 'Exact concept id or concept name phrase in the current tags/topic/family/objective.',
    };
  });
  const ageRows = makeGroupRows(scenarios, scenario => scenario.ageBand).sort((a, b) => ageSort(a.key, b.key)).map(row => ({ ageBand: row.key, ...row, key: undefined }));
  const topicRows = makeGroupRows(scenarios, scenario => scenario.topic).sort((a, b) => a.key.localeCompare(b.key)).map(row => ({ topic: row.key, ...row, key: undefined }));
  const familyRows = makeGroupRows(scenarios, scenario => scenario.family).sort((a, b) => a.key.localeCompare(b.key)).map(row => ({ family: row.key, ...row, key: undefined }));
  const typeRows = AGE_ORDER.flatMap(age => TYPE_ORDER.map(type => {
    const scoped = scenarios.filter(scenario => scenario.ageBand === age);
    const qs = scoped.flatMap(scenario => scenario.questions).filter(question => question.type === type);
    return { ageBand: age, type, label: TYPE_LABELS[type], questions: qs.length, scenarios: new Set(qs.map(question => question.id.split('-q')[0])).size, uniqueOpeningGeometry: new Set(scoped.filter(scenario => scenario.questions.some(question => question.type === type)).map(scenario => scenario.geometryHash)).size };
  }));
  const actualTypeCounts = countBy(questions, question => question.type);
  const actualTypeAges = Object.fromEntries(TYPE_ORDER.map(type => [type, AGE_ORDER.filter(age => typeRows.some(row => row.ageBand === age && row.type === type && row.questions > 0))]));
  const formatRows = FORMAT_ROWS.map(([id, label, sourceType, description]) => ({
    id, label, description, observedType: sourceType, currentQuestionCount: sourceType ? actualTypeCounts[sourceType] || 0 : 0,
    currentScenarioCount: sourceType ? new Set(scenarios.filter(scenario => scenario.questions.some(question => question.type === sourceType)).map(scenario => scenario.id)).size : 0,
    ageBands: sourceType ? actualTypeAges[sourceType] : [], status: sourceType ? 'observed' : 'unseen in current composed bank',
    interpretation: sourceType ? 'Observed delivery type; volume is descriptive.' : 'Backlog signal only; absence is not a quality verdict.',
  }));
  const sourceMap = new Map();
  for (const scenario of scenarios) for (const source of scenario.sources || []) {
    const key = `${source.url}|${source.section}`;
    if (!sourceMap.has(key)) sourceMap.set(key, { id: source.id, title: source.title, url: source.url, section: source.section, use: source.use, scenarios: new Set(), questions: 0, ageBands: new Set() });
    const row = sourceMap.get(key); row.scenarios.add(scenario.id); row.questions += scenario.questions.length; row.ageBands.add(scenario.ageBand);
  }
  const sourceRows = [...sourceMap.values()].map(row => ({ ...row, scenarios: row.scenarios.size, ageBands: [...row.ageBands].sort(ageSort) })).sort((a, b) => b.questions - a.questions || a.title.localeCompare(b.title));
  const domainSignalCounts = countBy(scenarios.flatMap(scenario => signalFor(scenario).map(signal => signal.domainId)));
  return {
    meta: { generatedAt: '2026-09-05', status: 'descriptive inventory / planning aid', source: 'tools/build-curriculum-coverage.mjs', ledgerVersion: ledger.meta?.version || null, ages: AGE_ORDER, signalMethod: 'Scenario-level domain signals use actual tags, topic, family and objective text. They do not replace explicit concept binding or coach review.', currentQuestionFields: 'Question rows retain actual id, type, basis and prompt; scenario rows retain actual tags, objective and source references.' },
    overview: { scenarios: scenarios.length, questions: questions.length, uniqueOpeningGeometry: new Set(scenarios.map(scenario => scenario.geometryHash)).size, questionPerGeometry: Number((questions.length / Math.max(1, new Set(scenarios.map(scenario => scenario.geometryHash)).size)).toFixed(2)), ages: countBy(scenarios, scenario => scenario.ageBand), topics: new Set(scenarios.map(scenario => scenario.topic)).size, families: new Set(scenarios.map(scenario => scenario.family)).size, sourceReferences: sourceRows.length, observedQuestionTypes: actualTypeCounts, basisCounts: countBy(questions, question => question.basis), domainSignalCounts, caveats: ['Question volume is not mastery coverage.', 'One opening geometry can support several question prompts; unique geometry is counted from canonical setup actors and puck only.', 'Domain signals are transparent text matches over current scenario metadata, not authored curriculum bindings.', 'Unseen delivery formats are backlog candidates, not automatic defects.'] },
    domains: domainRows,
    concepts: directConceptRows,
    ageRows,
    topicRows,
    familyRows,
    typeRows,
    formatRows,
    sourceRows,
    backlogSources: BACKLOG_SOURCES,
    backlogCandidates: BACKLOG_CANDIDATES,
    scenarios: scenarioRows,
    qualityReviewRubric: [
      'Context: Is the situation age-appropriate, concrete and readable from the displayed freeze?',
      'Complexity: Does the question require a meaningful cue combination or change, rather than a reworded duplicate?',
      'Answer contract: Are all accepted choices supported by the visible facts, with plausible distractors and no guaranteed outcome?',
      'Transfer: Does the prompt ask the learner to update or compare a read under a stated condition?',
      'Source and scope: Does each factual or rule claim have a reviewed source and an explicit boundary between observation, coaching and execution?',
    ],
  };
}

function htmlEscape(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function buildHtml(report) {
  const embedded = JSON.stringify(report).replaceAll('<', '\\u003c');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Curriculum coverage map</title><style>
:root{color-scheme:light;--navy:#0b1a33;--navy2:#132b4f;--gold:#c9a24b;--ice:#eef7f8;--line:#c8d8df;--ink:#1b2a3a;--muted:#5c6d7c;--white:#fff}*{box-sizing:border-box}body{margin:0;background:linear-gradient(140deg,#f7fbfc,#e8f2f4);color:var(--ink);font:14px/1.45 system-ui,-apple-system,Segoe UI,sans-serif}header{background:linear-gradient(120deg,var(--navy),var(--navy2));color:#fff;padding:28px clamp(18px,4vw,54px);box-shadow:0 6px 22px #0b1a3326}h1{margin:0 0 5px;font-size:clamp(25px,4vw,40px);letter-spacing:-.03em}header p{margin:0;color:#d5e4ef;max-width:860px}.shell{max-width:1450px;margin:auto;padding:20px clamp(14px,3vw,42px) 50px}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:12px;margin:0 0 18px}.card,.panel{background:#ffffffd9;border:1px solid #ffffff;box-shadow:0 7px 20px #16324a12;border-radius:15px}.card{padding:15px}.card b{display:block;font-size:25px;color:var(--navy)}.card span{color:var(--muted);font-size:12px}.toolbar{display:flex;flex-wrap:wrap;gap:9px;align-items:end;margin-bottom:14px}.toolbar label{display:grid;gap:4px;color:var(--muted);font-size:12px}.toolbar select,.toolbar input,.tabs button{border:1px solid var(--line);background:#fff;color:var(--ink);border-radius:9px;padding:8px 10px}.tabs{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:14px}.tabs button{cursor:pointer}.tabs button.active{background:var(--navy);color:#fff;border-color:var(--navy)}.panel{padding:16px;overflow:auto}.panel h2{font-size:19px;margin:0 0 5px;color:var(--navy)}.note{color:var(--muted);margin:0 0 12px}.table-wrap{overflow:auto;border:1px solid var(--line);border-radius:10px}table{border-collapse:collapse;width:100%;min-width:720px;background:#fff}th,td{padding:9px 10px;border-bottom:1px solid #e3ebee;text-align:left;vertical-align:top}th{position:sticky;top:0;background:#f0f6f7;color:var(--navy);font-size:12px;white-space:nowrap}tr:last-child td{border-bottom:0}.num{font-variant-numeric:tabular-nums;text-align:right}.pill{display:inline-block;padding:2px 7px;margin:1px 3px 1px 0;border-radius:99px;background:#e3eef3;color:var(--navy);font-size:12px}.pill.gold{background:#f6edcf}.muted{color:var(--muted)}.heatmap{display:grid;grid-template-columns:150px repeat(6,minmax(70px,1fr));gap:3px;min-width:700px}.heatmap div{padding:8px;background:#edf5f6;border-radius:5px}.heatmap .head{background:var(--navy);color:#fff;font-weight:700}.heatmap .rowhead{font-weight:700;background:#dcebef}.foot{color:var(--muted);font-size:12px;margin-top:18px}.links a{color:#0d536a}.backlog{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px}.candidate{padding:14px;border:1px solid var(--line);border-radius:12px;background:var(--ice)}.candidate h3{color:var(--navy);margin:0 0 5px;font-size:16px}.candidate p{margin:6px 0}.candidate b{color:var(--navy)}code{font-size:12px;color:#174a64}
</style></head><body><header><div class="shell"><h1>Curriculum coverage map</h1><p>Current composed experimental bank inventory: volume, delivery formats, geometry reuse, metadata signals and reviewable backlog candidates. Counts describe what exists; they do not certify mastery, quality or curriculum admission.</p></div></header><main class="shell"><div id="cards" class="cards"></div><div class="toolbar"><label>Age<select id="age"><option value="">All ages</option></select></label><label>Topic<select id="topic"><option value="">All topics</option></select></label><label>Search metadata<input id="search" type="search" placeholder="topic, family, tag or objective"></label><span class="muted">Data: <a class="links" href="coverage.json">coverage.json</a> · <a class="links" href="README.md">README</a></span></div><nav id="tabs" class="tabs" aria-label="Coverage views"></nav><section id="content" class="panel"></section><p class="foot">Generated by <code>tools/build-curriculum-coverage.mjs</code>. The ledger supplies the six domains and age-depth nodes; current scenario metadata is retained as the evidence layer.</p></main><script id="coverage-data" type="application/json">${embedded}</script><script>
const DATA=JSON.parse(document.getElementById('coverage-data').textContent),ages=DATA.meta.ages,tabs=[['overview','Overview'],['age','Age'],['topic','Topic'],['family','Family'],['format','Formats'],['domain','Domains'],['source','Sources'],['backlog','Backlog']];let view='overview';const state={age:'',topic:'',search:''};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const pills=(v, gold=false)=>(Array.isArray(v)?v:Object.entries(v||{}).map(([k,n])=>k+': '+n)).map(x=>'<span class="pill '+(gold?'gold':'')+'">'+esc(x)+'</span>').join('');const table=(heads,rows)=>'<div class="table-wrap"><table><thead><tr>'+heads.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table></div>';
function filteredScenarios(){return DATA.scenarios.filter(s=>(!state.age||s.ageBand===state.age)&&(!state.topic||s.topic===state.topic)&&(!state.search||[s.id,s.title,s.family,s.topic,s.objective,...s.tags].join(' ').toLowerCase().includes(state.search.toLowerCase())))}
function renderCards(){const o=DATA.overview;document.getElementById('cards').innerHTML=[['scenarios',o.scenarios],['questions',o.questions],['unique geometry',o.uniqueOpeningGeometry],['questions / geometry',o.questionPerGeometry],['topics',o.topics],['families',o.families],['source refs',o.sourceReferences]].map(([l,n])=>'<div class="card"><b>'+esc(n)+'</b><span>'+l+'</span></div>').join('')}
function renderHeat(){const cells=DATA.typeRows;return '<div class="heatmap"><div class="head">Question type</div>'+ages.map(a=>'<div class="head">'+a+'</div>').join('')+TYPE_ORDER.map(t=>'<div class="rowhead">'+esc(TYPE_LABELS[t])+'</div>'+ages.map(a=>{const r=cells.find(x=>x.ageBand===a&&x.type===t);return '<div title="'+r.questions+' questions across '+r.scenarios+' scenarios">'+r.questions+' <span class="muted">('+r.scenarios+' s)</span></div>'}).join('')).join('')+'</div>'}
const TYPE_ORDER=${JSON.stringify(TYPE_ORDER)},TYPE_LABELS=${JSON.stringify(TYPE_LABELS)};
function render(){renderCards();document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('active',b.dataset.view===view));const c=document.getElementById('content'),ss=filteredScenarios();if(view==='overview'){c.innerHTML='<h2>Observed shape</h2><p class="note">The bank contains '+DATA.overview.questions+' questions over '+DATA.overview.uniqueOpeningGeometry+' unique opening geometries. Several prompts can share one scene; that ratio is a production inventory measure.</p>'+renderHeat()+'<h2 style="margin-top:20px">Question basis</h2>'+table(['Basis','Questions'],Object.entries(DATA.overview.basisCounts).map(([k,n])=>'<tr><td>'+esc(k)+'</td><td class="num">'+n+'</td></tr>'))+'<h2 style="margin-top:20px">Review boundary</h2><ul>'+DATA.qualityReviewRubric.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>'}
else if(view==='age'){c.innerHTML='<h2>Age inventory</h2><p class="note">Age rows combine scenario count, question count, type mix, basis and geometry reuse.</p>'+table(['Age','Scenarios','Questions','Unique geometry','Q / geometry','Topics','Families','Types','Basis'],DATA.ageRows.filter(r=>!state.age||r.ageBand===state.age).map(r=>'<tr><td>'+esc(r.ageBand)+'</td><td class="num">'+r.scenarios+'</td><td class="num">'+r.questions+'</td><td class="num">'+r.uniqueOpeningGeometry+'</td><td class="num">'+r.questionPerGeometry+'</td><td class="num">'+r.topics+'</td><td class="num">'+r.families+'</td><td>'+pills(r.typeCounts)+'</td><td>'+pills(r.basisCounts,true)+'</td></tr>'))}
else if(view==='topic'){c.innerHTML='<h2>Topic inventory</h2><p class="note">Topics use the authored scenario topic field. Filter by age or search actual objectives/tags to inspect context.</p>'+table(['Topic','Ages','Scenarios','Questions','Unique geometry','Q / geometry','Families','Types','Sample objective'],DATA.topicRows.filter(r=>(!state.age||r.ageBands.includes(state.age))&&(!state.topic||r.topic===state.topic)).map(r=>'<tr><td>'+esc(r.topic)+'</td><td>'+pills(r.ageBands)+'</td><td class="num">'+r.scenarios+'</td><td class="num">'+r.questions+'</td><td class="num">'+r.uniqueOpeningGeometry+'</td><td class="num">'+r.questionPerGeometry+'</td><td class="num">'+r.families+'</td><td>'+pills(r.typeCounts)+'</td><td>'+esc(r.sampleObjectives?.[0])+'</td></tr>'))}
else if(view==='family'){c.innerHTML='<h2>Family inventory</h2><p class="note">Families are the authored situation families; distinct family labels do not imply distinct learning complexity.</p>'+table(['Family','Ages','Scenarios','Questions','Unique geometry','Topics','Types','Tags'],DATA.familyRows.filter(r=>!state.age||r.ageBands.includes(state.age)).map(r=>'<tr><td>'+esc(r.family)+'</td><td>'+pills(r.ageBands)+'</td><td class="num">'+r.scenarios+'</td><td class="num">'+r.questions+'</td><td class="num">'+r.uniqueOpeningGeometry+'</td><td class="num">'+r.topics+'</td><td>'+pills(r.typeCounts)+'</td><td>'+pills(r.topTags)+'</td></tr>'))}
else if(view==='format'){c.innerHTML='<h2>Delivery formats</h2><p class="note">Observed types are exact current question types. Unseen rows identify formats for review and authoring; they are not automatic content defects.</p>'+table(['Format','Observed type','Questions','Scenarios','Ages','Status','Purpose'],DATA.formatRows.map(r=>'<tr><td>'+esc(r.label)+'</td><td>'+esc(r.observedType||'—')+'</td><td class="num">'+r.currentQuestionCount+'</td><td class="num">'+r.currentScenarioCount+'</td><td>'+pills(r.ageBands)+'</td><td>'+esc(r.status)+'</td><td>'+esc(r.description)+'</td></tr>'))}
else if(view==='domain'){c.innerHTML='<h2>Ledger domain signals</h2><p class="note">These six domains come from the current ledger. Counts are signal matches over actual scenario tags, topics, families and objectives, so one scenario can appear in several domains.</p>'+table(['Domain','Signal scenarios','Signal questions','Unique geometry','Ages','Concepts','Method'],DATA.domains.map(r=>'<tr><td><b>'+esc(r.name)+'</b><br><span class="muted">'+esc(r.definition)+'</span></td><td class="num">'+r.signalScenarios+'</td><td class="num">'+r.signalQuestions+'</td><td class="num">'+r.uniqueOpeningGeometry+'</td><td>'+pills(r.ageBands)+'</td><td>'+pills(r.concepts.map(x=>x.name))+'</td><td class="muted">'+esc(r.mappingMethod)+'</td></tr>'))+'<h2 style="margin-top:20px">Concept signals</h2>'+table(['Concept','Domain','Signal scenarios','Signal questions','Geometry','Depth by age'],DATA.concepts.map(r=>'<tr><td>'+esc(r.name)+(r.anchor?' <span class="pill gold">anchor</span>':'')+'</td><td>'+esc(DATA.domains.find(d=>d.id===r.domainId)?.name||r.domainId)+'</td><td class="num">'+r.signalScenarios+'</td><td class="num">'+r.signalQuestions+'</td><td class="num">'+r.uniqueOpeningGeometry+'</td><td>'+r.depthByAge.map(x=>esc(x.ageBand+': '+x.depth)).join(' · ')+'</td></tr>'))}
else if(view==='source'){c.innerHTML='<h2>Source reference inventory</h2><p class="note">These are the actual source references attached to current scenarios. A source count shows provenance reuse, not claim validation.</p>'+table(['Source','Section','Scenarios','Questions','Ages','Use'],DATA.sourceRows.map(r=>'<tr><td class="links"><a href="'+esc(r.url)+'" target="_blank" rel="noreferrer">'+esc(r.title)+'</a><br><code>'+esc(r.id)+'</code></td><td>'+esc(r.section)+'</td><td class="num">'+r.scenarios+'</td><td class="num">'+r.questions+'</td><td>'+pills(r.ageBands)+'</td><td>'+esc(r.use)+'</td></tr>'))}
else{c.innerHTML='<h2>Reviewable backlog candidates</h2><p class="note">Candidates connect observed format/domain signals to official development references. They are prompts for authoring and review, not quotas or approved content.</p><div class="backlog">'+DATA.backlogCandidates.map(r=>'<article class="candidate"><h3>'+esc(r.id)+'</h3><p><b>Ages:</b> '+esc(r.ageBands.join(', '))+'</p><p><b>Focus:</b> '+esc(r.focus)+'</p><p><b>Format:</b> '+esc(r.format)+'</p><p><b>Geometry intent:</b> '+esc(r.geometryIntent)+'</p><p><b>Why review:</b> '+esc(r.why)+'</p><p><b>References:</b> '+r.sources.map(id=>{const s=DATA.backlogSources.find(x=>x.id===id);return s?'<a href="'+esc(s.url)+'" target="_blank" rel="noreferrer">'+esc(s.title)+'</a>':''}).join(' · ')+'</p></article>').join('')+'</div>'} }
document.getElementById('age').innerHTML+=[...ages].map(a=>'<option>'+a+'</option>').join('');document.getElementById('topic').innerHTML+=[...new Set(DATA.topicRows.map(x=>x.topic))].sort().map(t=>'<option>'+esc(t)+'</option>').join('');document.getElementById('tabs').innerHTML=tabs.map(([id,label])=>'<button type="button" data-view="'+id+'">'+label+'</button>').join('');document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>{view=b.dataset.view;render()});for(const id of ['age','topic','search'])document.getElementById(id).oninput=e=>{state[id]=e.target.value;render()};render();
</script></body></html>`;
}

function buildReadme(report) {
  const observed = report.formatRows.filter(row => row.status === 'observed').map(row => `${row.label} (${row.currentQuestionCount})`).join(', ');
  return `# Curriculum coverage map

Generated 2026-09-05 by tools/build-curriculum-coverage.mjs from tools/experimental-bank-files.mjs and the current composed bank.

## What this measures

The current inventory contains **${report.overview.scenarios} scenarios**, **${report.overview.questions} questions**, and **${report.overview.uniqueOpeningGeometry} unique opening geometries**. The ratio is **${report.overview.questionPerGeometry} questions per geometry**. Geometry is a canonical hash of each scenario setup's actors and puck; it does not inspect question wording or prove that two prompts teach the same thing.

The report retains each scenario's authored age, topic, family, tags, objective and source references. It also keeps compact question rows with the current question ID, type, basis and prompt. Use coverage.json for the complete data and index.html for the interactive age/topic views.

## Delivery formats

Observed current types are: ${observed}. The format table also lists delivery modes that are not present in this composed bank, including true/false, feature taps, routes, responsibility matching, mistake spotting, prediction and vocabulary activities. Unseen formats are backlog signals, not automatic quality findings.

## Curriculum mapping boundary

The six domains and 31 concepts come from src/data/curriculum-ledger.json. Scenario-level domain counts are transparent signals from the actual tags, topic, family and objective fields. They are an inventory aid; they are not explicit authored concept bindings. Concept rows show exact concept-name/id phrase matches where they exist, alongside each ledger node's age depth. Counts do not estimate mastery, learning transfer or question quality.

## Review before authoring

Use the short rubric in coverage.json and the Backlog view:

1. **Context:** the age-appropriate situation is readable from the displayed freeze.
2. **Complexity:** the question requires a meaningful cue combination or change, not a reworded duplicate.
3. **Answer contract:** accepted choices are supported by visible facts; distractors are plausible; no outcome is guaranteed.
4. **Transfer:** the learner updates or compares a read under a stated condition.
5. **Source and scope:** factual/rule claims have a reviewed source, with observation, coaching and execution kept distinct.

## Official development references used for backlog prompts

These links are primary or official development resources used to frame candidate work. They support design context; they do not automatically establish a RinkReads answer key:

${report.backlogSources.map(source => `- [${source.title}](${source.url}) — ${source.use}`).join('\n')}

## Limits

- This is a current-bank inventory and planning artifact, not a curriculum-admission report.
- Counts are not targets, quotas, mastery coverage or a quality ranking.
- Domain signals may overlap; a scenario can contribute to several domains.
- Backlog candidates need authored geometry, exact answer contracts, age review and source review before they become content.
`;
}

export function writeCoverageArtifacts(report, outputDir = OUTPUT) {
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(resolve(outputDir, 'coverage.json'), JSON.stringify(report, null, 2) + '\n');
  writeFileSync(resolve(outputDir, 'index.html'), buildHtml(report));
  writeFileSync(resolve(outputDir, 'README.md'), buildReadme(report));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = buildCoverageReport();
  writeCoverageArtifacts(report);
  console.log(JSON.stringify({ output: 'docs/factory/curriculum-map', scenarios: report.overview.scenarios, questions: report.overview.questions, uniqueOpeningGeometry: report.overview.uniqueOpeningGeometry, observedQuestionTypes: report.overview.observedQuestionTypes }, null, 2));
}
