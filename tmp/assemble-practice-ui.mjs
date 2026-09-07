import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const root = new URL('../', import.meta.url);
const candidate = new URL('./practice-ui-release/', import.meta.url);
function edit(path, changes) {
  const url = new URL(path,candidate);
  let text = fs.readFileSync(url,'utf8');
  for (const [before,after] of changes) {
    if (!text.includes(before)) throw Error(`Missing edit in ${path}: ${before}`);
    text=text.replace(before,after);
  }
  fs.writeFileSync(url,text);
}
edit('src/one-on-one/PracticeHub.jsx',[
  ["import CoachLab from './CoachLab.jsx';","import CoachLab, { draftFromPlay } from './CoachLab.jsx';"],
  ['  function askAboutDraft(draft)', '  function openDraft(play){try{openDirector(draftFromPlay(play))}catch(e){setError(e.message)}}\n  function askAboutDraft(draft)'],
  ["initialConcept={navigation.conceptId||''} playerId", "initialConcept={navigation.conceptId||''} onOpenDraft={openDraft} playerId"],
  ['<ExperimentalPractice initialAge={navigation.ageBand}', '<ExperimentalPractice initialAge={learningAge}'],
]);
edit('src/one-on-one/PracticeLibrary.jsx',[
  ["ageBand='U11'})", "ageBand='U11',initialConcept=''})"],
  ["[concept,setConcept]=useState('')", "[concept,setConcept]=useState(initialConcept)"],
]);
edit('src/one-on-one/GuidedCurriculum.jsx',[
  ["import pack from './curriculum-draft.json';", "import pack from './curriculum-draft.json';\nimport { initialGuidedLessonIndex } from './learningNavigation.js';"],
  ['function CurriculumSession({ playerId, ageBand })', 'function CurriculumSession({ playerId, ageBand, initialLessonId })'],
  ['const [lessonIndex, setLessonIndex] = useState(0);', 'const [lessonIndex, setLessonIndex] = useState(() => initialGuidedLessonIndex(pack.lessons, CURRICULUM_STRANDS, ageBand, initialLessonId));'],
  ["ageBand = 'U11' })", "ageBand = 'U11', initialLessonId })"],
  ['key={`${playerId}:${ageBand}`} playerId={playerId} ageBand={ageBand}', 'key={`${playerId}:${ageBand}:${initialLessonId||\'first\'}`} playerId={playerId} ageBand={ageBand} initialLessonId={initialLessonId}'],
]);
edit('src/one-on-one/lessonCore.js',[["source.concept||''", "source.concept||String(source.nodeId||'').match(/^u(?:7|9|11|13|15|18)\\.(.+)$/i)?.[1]||''"]]);
edit('src/one-on-one/LearningWorlds.jsx',[["behavior: 'instant'", "behavior: 'auto'"]]);
// The new teaching rig is scoped to scenario presentation. Older games keep
// their existing stride, stick-action and goalie-save animation code intact.
fs.copyFileSync(new URL('src/one-on-one/Skater.jsx',root),new URL('src/one-on-one/ScenarioSkater.jsx',candidate));
fs.writeFileSync(new URL('src/one-on-one/Skater.jsx',candidate),execFileSync('git',['show','HEAD:src/one-on-one/Skater.jsx'],{cwd:root}));
edit('src/visuals/ScenarioRink3D.jsx',[["import Skater from '../one-on-one/Skater.jsx';","import Skater from '../one-on-one/ScenarioSkater.jsx';"],
  ["style={{ pointerEvents: cameraAdjusting ? 'none' : 'auto' }}", "style={{ pointerEvents: cameraAdjusting || dragging ? 'none' : 'auto' }}"],
  ['onAnswer={onActorAnswer} enabled={!cameraAdjusting} className', 'onAnswer={onActorAnswer} enabled={!cameraAdjusting && !dragging} className'],
]);
// Retain the legacy arena's selection semantics; its animations stay unchanged.
edit('src/one-on-one/PracticeScene.jsx',[
  ["import { isFocusedActor } from '../visuals/PlayerLocator.jsx';\n",''],
  ['selectedActor, focusActorId, showGuides','selectedActor, showGuides'],
  [' isLearner={isFocusedActor(a,focusActorId)}',''],
  [" isLearner={focusActorId === undefined ? state?.setup?.role !== 'defender' : focusActorId === 'attacker'}",''],
  [" isLearner={focusActorId === undefined ? state?.setup?.role === 'defender' : focusActorId === 'defender'}",''],
]);
let paths = JSON.parse(fs.readFileSync(new URL('./practice-ui-files.json',import.meta.url),'utf8').replace(/^\uFEFF/,''));
paths=paths.filter(path=>path!=='src/one-on-one/Skater.jsx');
paths.push('src/one-on-one/ScenarioSkater.jsx','src/one-on-one/PracticeLibrary.jsx','src/one-on-one/GuidedCurriculum.jsx','src/one-on-one/lessonCore.js','src/one-on-one/learningNavigation.js','src/one-on-one/learningNavigation.test.mjs');
fs.writeFileSync(new URL('./practice-ui-files.json',import.meta.url),JSON.stringify([...new Set(paths)],null,2));
console.log(`Assembled ${paths.length} scoped files`);
