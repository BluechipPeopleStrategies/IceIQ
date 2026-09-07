import { useCallback, useEffect, useId, useRef, useState } from 'react';
import pack from './curriculum-draft.json';
import { coachReaction, getCoachForQuestion } from '../coachPersonas.js';
import { CoachFeedback } from '../play/CoachFeedback.jsx';
import SpacedMasteryProgress from './SpacedMasteryProgress.jsx';
import { NHL_200X85_PROFILE } from '../scenario-engine/rinkFrame.js';
import { HockeyPlayerArt } from '../visuals/HockeyPlayerArt.jsx';
import BoardInspection from '../visuals/BoardInspection.jsx';
import ScenarioRinkView from '../visuals/ScenarioRinkView.jsx';
import { SvgPlayerLocator } from '../visuals/PlayerLocator.jsx';
import { SvgPuckLocator } from '../visuals/PuckLocator3D.jsx';
import { CURRICULUM_AGES, CURRICULUM_STRANDS, curriculumStats, readCurriculumProgress, recordCurriculumAnswer, scoreCurriculumQuestion, validateCurriculum } from './curriculumCore.js';
import { curriculumPlayerCopy, validateCurriculumAudienceCopy } from './curriculumAudienceCopy.js';
import { useCurriculumMotion, CurriculumMotionControls } from './curriculumMotion.jsx';
import CurriculumPositionExercise from './curriculumPosition.jsx';
import { getCurriculumPositionVariant } from './curriculumPositionCore.js';
import './GuidedCurriculum.css';

const STRANDS = {
  scanning: { label: 'See the ice', icon: '◎', category: 'Vision' },
  'off-puck-support-offense': { label: 'Help the puck', icon: '↗', category: 'Puck Support' },
  'gap-control': { label: 'Protect the middle', icon: '◇', category: 'Gap Control' },
  'odd-man-reads': { label: 'Find the advantage', icon: '⇢', category: 'Rush Reads' },
};
const LEVELS = { U7: 'U7 / Initiation', U9: 'U9 / Novice', U11: 'U11 / Atom', U13: 'U13 / Peewee', U15: 'U15 / Bantam', U18: 'U18 / Midget' };
const ALL_QUESTIONS = pack.lessons.flatMap(lesson => lesson.questions);
// Paired habit checks stay in the authored source and saved history, but are
// deferred from the current one-scenario-at-a-time player experience.
const ACTIVE_QUESTIONS = ALL_QUESTIONS.filter(question => question.type === 'mc');
const QUESTION_IDS = ALL_QUESTIONS.map(question => question.id);
const CONTENT_ERRORS = [...validateCurriculum(pack), ...validateCurriculumAudienceCopy(pack)];
const GOAL_X = NHL_200X85_PROFILE.landmarks.goalLineRight[0];
const HALF_RINK = 'M 0 -12.954 H 21.9456 A 8.5344 8.5344 0 0 1 30.48 -4.4196 V 4.4196 A 8.5344 8.5344 0 0 1 21.9456 12.954 H 0 Z';

function Goal({ side = 1 }) {
  return <g transform={`scale(${side} 1)`}>
    <path d={`M ${GOAL_X} -1.829 A 1.829 1.829 0 0 0 ${GOAL_X} 1.829 Z`} fill="#8DC5ED" fillOpacity=".65" stroke="#1E63B5" strokeWidth=".09" />
    <path d={`M ${GOAL_X} -1.05 H ${GOAL_X + 1.1} V 1.05 H ${GOAL_X}`} fill="#FFFFFF99" stroke="#D3233E" strokeWidth=".17" />
    <path d={`M ${GOAL_X + .35} -1 V 1 M ${GOAL_X + .7} -1 V 1 M ${GOAL_X} -.5 H ${GOAL_X + 1.1} M ${GOAL_X} .5 H ${GOAL_X + 1.1}`} fill="none" stroke="#7893A8" strokeWidth=".045" />
  </g>;
}

function curriculumBoardBounds(visual) {
  if (visual.view === 'full') return [-32, -14.5, 64, 29];
  const points = [...visual.actors, ...(visual.arrows ?? []).flatMap(arrow => [arrow.from, arrow.to].map(([x, y]) => ({ x, y }))),
    ...visual.actors.filter(actor => actor.hasPuck).map(actor => ({ x: actor.x + 1, y: actor.y + .58 }))];
  const left = Math.max(-1.5, Math.min(7.2, ...points.map(point => point.x - 3.5)));
  const top = Math.max(-14.5, Math.min(-8, ...points.map(point => point.y - 3.5)));
  const bottom = Math.min(14.5, Math.max(8, ...points.map(point => point.y + 3.5)));
  return [left, top, 32 - left, bottom - top];
}

function curriculumBoardLabels(visual, bounds, radius) {
  const labels = [], fontSize = Math.max(1.16, bounds[2] * .044);
  const overlaps = (a, b) => Math.abs(a.x - b.x) < (a.width + b.width) / 2 + .2 && Math.abs(a.y - b.y) < (a.height + b.height) / 2 + .2;
  const obstacles = [...visual.actors.map(actor => ({ ...actor, width: radius * 2.1, height: radius * 2.1 })),
    ...visual.actors.filter(actor => actor.hasPuck).map(actor => ({ x: actor.x + 1, y: actor.y + .58, width: 1.2, height: 1.2 })),
    ...(visual.arrows ?? []).map(arrow => ({ x: (arrow.from[0] + arrow.to[0]) / 2, y: (arrow.from[1] + arrow.to[1]) / 2 - .9, width: 1.6, height: 1.6 }))];
  for (const actor of visual.actors.filter(actor => actor.label)) {
    const width = Math.max(2.1, actor.label.length * fontSize * .62 + .65), height = fontSize * 1.4;
    const near = radius + height / 2 + .35;
    const offsets = [[0, -near], [0, near], [-width / 2 - radius - .35, 0], [width / 2 + radius + .35, 0], [0, -near - 2], [0, near + 2], [-3, -4], [3, 4], [-3, 4], [3, -4]];
    const candidates = offsets.map(([dx, dy]) => ({ x: Math.max(bounds[0] + width / 2 + .25, Math.min(bounds[0] + bounds[2] - width / 2 - .25, actor.x + dx)), y: Math.max(bounds[1] + height / 2 + .25, Math.min(bounds[1] + bounds[3] - height / 2 - .25, actor.y + dy)), width, height }));
    const score = candidate => [...obstacles, ...labels].reduce((sum, obstacle) => sum + (overlaps(candidate, obstacle) ? 1 : 0), 0);
    const box = candidates.reduce((best, candidate) => score(candidate) < score(best) ? candidate : best);
    const distance = Math.hypot(box.x - actor.x, box.y - actor.y) || 1;
    const edge = Math.min(1, (radius + .2) / distance);
    labels.push({ ...box, actor, fontSize, leaderX: actor.x + (box.x - actor.x) * edge, leaderY: actor.y + (box.y - actor.y) * edge });
  }
  return labels;
}

export function CurriculumBoard({ visual, title, inspectable = false, sceneView = false, playing = false, time = 0, onAvailabilityChange }) {
  const instance = useId().replaceAll(':', '');
  const marker = `gc-arrow-${instance}`;
  const ice = `gc-ice-${instance}`;
  const full = visual.view === 'full';
  const ownNet = visual.netContext === 'right-net-is-learners-own';
  const bounds = curriculumBoardBounds(visual);
  const young = visual.actors.every(actor => !actor.label || actor.label === 'YOU');
  const radius = young ? 1.65 : 1.16;
  const labels = curriculumBoardLabels(visual, bounds, radius);
  const tacticalBoard = <svg viewBox={bounds.join(' ')} role="img" aria-label={`${title}. ${visual.caption}`}>
      <title>{title}</title><desc>{visual.caption} Navy players are your teammates. Gold players are opponents. The puck is the small black dot. The player labelled YOU has a separate ring.</desc>
      <defs>
        <linearGradient id={ice} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#F7FCFF" /><stop offset="1" stopColor="#EAF5FC" /></linearGradient>
        <filter id={`${ice}-depth`} x="-10%" y="-15%" width="120%" height="135%"><feDropShadow dx="0" dy=".3" stdDeviation=".2" floodColor="#071528" floodOpacity=".5" /></filter>
        {full ? <rect id={`${ice}-surface`} x="-30.48" y="-12.954" width="60.96" height="25.908" rx="8.5344" /> : <path id={`${ice}-surface`} d={HALF_RINK} />}
        <marker id={marker} viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto"><path d="M 0 0 L 6 3 L 0 6 Z" fill="#0B1A33" /></marker>
      </defs>
      <g pointerEvents="none" filter={`url(#${ice}-depth)`}>
        <use href={`#${ice}-surface`} fill="#F7FCFF" stroke="#0B1A33" strokeWidth=".78" />
        <use href={`#${ice}-surface`} fill="none" stroke="#B6CDE0" strokeWidth=".35" />
        <use href={`#${ice}-surface`} fill={`url(#${ice})`} stroke="#FFFFFF" strokeWidth=".12" />
      </g>
      <g stroke="#D3233E" fill="none" strokeWidth=".09">
        {[-6.2484, 6.2484].map(y => <g key={y}><circle cx="21.0312" cy={y} r="4.57" /><circle cx="21.0312" cy={y} r=".18" fill="#D3233E" /></g>)}
        <line x1={GOAL_X} y1="-10" x2={GOAL_X} y2="10" />
        {full && <><line x1="0" y1="-12.954" x2="0" y2="12.954" /><circle cx="0" cy="0" r="4.57" stroke="#1E63B5" /></>}
        {!visual.hideBlueLines && [-7.9248, 7.9248].filter(x => full || x > 0).map(x => <line key={x} x1={x} y1="-12.954" x2={x} y2="12.954" stroke="#1E63B5" strokeWidth=".22" />)}
      </g>
      <Goal />{full && <Goal side={-1} />}
      {(visual.arrows ?? []).map((arrow, index) => <g key={index}>
        <line x1={arrow.from[0]} y1={arrow.from[1]} x2={arrow.to[0]} y2={arrow.to[1]} stroke="#0B1A33" strokeWidth=".16" strokeDasharray=".35 .22" markerEnd={`url(#${marker})`} />
        <text x={(arrow.from[0] + arrow.to[0]) / 2} y={(arrow.from[1] + arrow.to[1]) / 2 - .9} textAnchor="middle" fontSize="1.16" fontWeight="900" fill="#0B1A33" stroke="#F7FCFF" strokeWidth=".26" paintOrder="stroke"><title>{arrow.label}</title>{index + 1}</text>
      </g>)}
      {visual.actors.map(actor => {
        const you = actor.label === 'YOU';
        return <g key={actor.id} transform={`translate(${actor.x} ${actor.y})`}>
          {you && <SvgPlayerLocator radius={radius + .3} />}
          <HockeyPlayerArt radius={radius} team={actor.team} goalie={actor.role === 'goalie'} facing={actor.facing * 180 / Math.PI} showStick />
          {actor.hasPuck && <SvgPuckLocator x={1} y={.58} />}
        </g>;
      })}
      {labels.map(label => <g key={`label-${label.actor.id}`} pointerEvents="none" className="gc-actor-label">
        <line x1={label.leaderX} y1={label.leaderY} x2={label.x} y2={label.y} stroke="#0B1A33" strokeOpacity=".5" strokeWidth=".07" />
        <rect x={label.x - label.width / 2} y={label.y - label.height / 2} width={label.width} height={label.height} rx=".35" fill={label.actor.label === 'YOU' ? '#0B1A33' : '#F7FCFF'} stroke={label.actor.team === 'away' ? '#B98C30' : '#0B1A33'} strokeWidth=".07" />
        <text x={label.x} y={label.y} dy=".35em" textAnchor="middle" fontSize={label.fontSize} fontWeight="800" fill={label.actor.label === 'YOU' ? '#FFFFFF' : '#0B1A33'}>{label.actor.label}</text>
      </g>)}
    </svg>;
  const owner = visual.actors.find(actor => actor.hasPuck);
  const sceneState = {
    actors: visual.actors.map(actor => ({ ...actor, role: actor.role === 'goalie' ? 'goalie' : 'skater', name: actor.label || (actor.role === 'goalie' ? 'The goalie' : actor.team === 'home' ? 'Your teammate' : 'An opponent') })),
    puck: owner ? { owner: owner.id, x: owner.x + 1, y: owner.y + .58 } : null,
  };
  return <figure className="gc-board">
    <div className="gc-board-heading"><span>READ THE ICE</span><b>{ownNet ? 'YOUR NET' : 'ATTACK THIS NET'}</b></div>
    {sceneView ? <ScenarioRinkView state={sceneState} title={`${title}. ${visual.caption}`} fallback={tacticalBoard}
      playing={playing} time={time} onAvailabilityChange={onAvailabilityChange}
      bounds={{ minX: bounds[0], maxX: bounds[0] + bounds[2], minY: bounds[1], maxY: bounds[1] + bounds[3] }}
      hideZoneLines={!!visual.hideBlueLines} labelledActors={!young} showBothGoals={full}
      teamLabels={{ home: 'Your team', away: 'Opponents' }} overlays={{ arrows: visual.arrows ?? [] }} /> : tacticalBoard}
    <figcaption>{visual.caption}</figcaption>
    {!!visual.arrows?.length && <ol className="gc-arrow-notes">{visual.arrows.map((arrow, index) => <li key={index}>{arrow.label}</li>)}</ol>}
    <div className="gc-board-legend"><span><i className="gc-legend-home" />Your team</span><span><i className="gc-legend-away" />Opponents</span><span><i className="gc-legend-puck" />Puck</span></div>
    {inspectable && <BoardInspection title={title} renderBoard={() => <CurriculumBoard sceneView visual={visual} title={title} />} />}
  </figure>;
}

export function CurriculumSession({ playerId, ageBand, initialLessonId }) {
  const [age, setAge] = useState(() => CURRICULUM_AGES.find(value => value === String(ageBand).split(' ')[0]) || 'U11');
  const [lessonIndex, setLessonIndex] = useState(() => {
    const initialLesson = pack.lessons.find(lesson => lesson.id === initialLessonId && lesson.ageBand === age);
    return Math.max(0, CURRICULUM_STRANDS.indexOf(initialLesson?.curriculumStrand));
  });
  const [answer, setAnswer] = useState(null);
  const [answerFormat, setAnswerFormat] = useState('mc');
  const [notice, setNotice] = useState('');
  const [sceneAvailable, setSceneAvailable] = useState(false), [boardVersion, setBoardVersion] = useState(0);
  const sceneAvailableRef = useRef(false), boardIdentityRef = useRef('');
  const firstSceneReady = useRef(false);
  const answerLocked = useRef(false);
  const promptRef = useRef(null), feedbackRef = useRef(null), pendingFocus = useRef(null);
  useEffect(() => {
    if (!pendingFocus.current) return;
    const target = pendingFocus.current === 'feedback' ? feedbackRef.current : promptRef.current;
    target?.focus({ preventScroll: true });
    pendingFocus.current = null;
  }, [age, lessonIndex, answer]);
  const key = `rinkreads_guided_curriculum_v1:${playerId}`;
  const [progress, setProgress] = useState(() => {
    try { return readCurriculumProgress(localStorage.getItem(key), QUESTION_IDS); } catch { return {}; }
  });
  const lessons = CURRICULUM_STRANDS.map(strand => pack.lessons.find(lesson => lesson.ageBand === age && lesson.curriculumStrand === strand));
  const lesson = lessons[lessonIndex];
  const question = lesson.questions.find(item => item.type === 'mc');
  const boardIdentity = `${question.id}:${boardVersion}`;
  boardIdentityRef.current = boardIdentity;
  const onAvailabilityChange = useCallback(available => {
    if (boardIdentityRef.current !== boardIdentity) return;
    sceneAvailableRef.current = available === true; setSceneAvailable(available === true);
  }, [boardIdentity]);
  const positionVariant = getCurriculumPositionVariant(question);
  const placingPlayer = answerFormat === 'position' && !!positionVariant;
  const copy = curriculumPlayerCopy(lesson, question);
  const motion = useCurriculumMotion(question, sceneAvailableRef);
  useEffect(() => {
    if (!sceneAvailable) { if (motion.playing) motion.pause(); return; }
    if (!firstSceneReady.current) {
      firstSceneReady.current = true;
      if (motion.supported && !motion.reducedMotion && motion.phase === 'paused') motion.play();
    }
  }, [sceneAvailable, motion.questionId, motion.phase, motion.reducedMotion]);
  const canAnswer = sceneAvailable && motion.canAnswer;
  const visibleMotion = { ...motion, play: () => { if (sceneAvailableRef.current) motion.play(); }, replay: () => { if (sceneAvailableRef.current) motion.replay(); } };
  const meta = STRANDS[lesson.curriculumStrand];
  const coach = getCoachForQuestion({ id: question.id, cat: meta.category }, LEVELS[age], 'Forward');
  const total = curriculumStats(progress, ALL_QUESTIONS);
  const activeStats = curriculumStats(progress, ACTIVE_QUESTIONS);
  const ageStats = curriculumStats(progress, lessons.flatMap(item => item.questions.filter(q => q.type === 'mc')));
  const result = answer === null ? null : scoreCurriculumQuestion(question, answer);
  const options = copy.options.map((text, value) => ({ value, text }));

  function resetQuestion() { pendingFocus.current = 'prompt'; answerLocked.current = false; setAnswer(null); }
  function resetBoard() { sceneAvailableRef.current = false; setSceneAvailable(false); firstSceneReady.current = false; setBoardVersion(value => value + 1); }
  function openLesson(index) {
    resetBoard();
    setAnswerFormat('mc'); setLessonIndex(index); resetQuestion();
  }
  function chooseAnswerFormat(format) {
    if (format === answerFormat) return;
    resetBoard();
    setAnswerFormat(format);
  }
  function chooseAge(next) { setAge(next); openLesson(0); }
  function submit(value) {
    if (answerLocked.current || !sceneAvailableRef.current || !canAnswer) return;
    answerLocked.current = true; pendingFocus.current = 'feedback';
    const next = recordCurriculumAnswer(progress, question.id, scoreCurriculumQuestion(question, value));
    setProgress(next); setAnswer(value);
    try { localStorage.setItem(key, JSON.stringify({ version: 1, answers: next })); }
    catch { setNotice('Your practice history is kept for this visit. This browser could not save it for later.'); }
  }
  return <section className="gc-root" aria-label="Guided hockey curriculum">
    <header className="gc-header"><div><p className="gc-kicker">RINKREADS / YOUR NEXT READ</p><h1>See the ice.<br /><em>Make your choice.</em></h1><p className="gc-intro">Guided starters. One scenario at a time.<br />Take your time. Learn from what you see.</p></div><div className="gc-score"><strong>{total.points.toLocaleString()}</strong><span>HISTORICAL PRACTICE POINTS</span><small>{activeStats.attempted} of {activeStats.total} scenarios explored<br />Saved on this device</small></div></header>
    <div className="gc-age-row"><div className="gc-age-pills" aria-label="Choose age group">{CURRICULUM_AGES.map(value => <button key={value} aria-pressed={age === value} onClick={() => chooseAge(value)}>{value}</button>)}</div><span>{ageStats.attempted} / {ageStats.total} reads explored in {age}</span></div>
    <nav className="gc-lesson-cards" aria-label={`${age} lessons`}>{lessons.map((item, index) => {
      const stats = curriculumStats(progress, item.questions.filter(q => q.type === 'mc'));
      return <button key={item.id} className={index === lessonIndex ? 'active' : ''} aria-current={index === lessonIndex ? 'step' : undefined} onClick={() => openLesson(index)}><span className="gc-card-top"><b>{String(index + 1).padStart(2, '0')}</b><i>{STRANDS[item.curriculumStrand].icon}</i></span><strong>{item.title}</strong><span className="gc-card-bottom">{STRANDS[item.curriculumStrand].label}<b>{stats.attempted ? 'Explored' : 'Ready to try'}</b></span></button>;
    })}</nav>
    <article className="gc-workspace">
      <div className="gc-workspace-head"><div><p className="gc-kicker">{age} · LESSON {lessonIndex + 1} OF 4</p><h2>{lesson.title}</h2></div></div>
      <div className="gc-teaching"><span>THE HABIT</span><p>{copy.teachingPoint}</p><small>{copy.learnerAction}</small></div>
      <SpacedMasteryProgress eligible={false} previewReason="These guided starters are draft practice. Your answers stay in practice history. Eligible library questions build mastery across days." />
      {positionVariant && <div className="gc-format-picker" role="group" aria-label="How to answer"><button type="button" aria-pressed={!placingPlayer} onClick={() => chooseAnswerFormat('mc')}>Choose an answer</button><button type="button" aria-pressed={placingPlayer} onClick={() => chooseAnswerFormat('position')}>Move the player</button></div>}
      {placingPlayer ? <CurriculumPositionExercise question={question} playerId={playerId} /> : <div className="gc-play-area"><div><CurriculumBoard key={boardIdentity} sceneView visual={{ ...motion.visual, caption: copy.visualCaption }} title={lesson.title} playing={motion.playing && sceneAvailable} time={motion.time} onAvailabilityChange={onAvailabilityChange} />
        <fieldset disabled={!sceneAvailable} style={{ border: 0, padding: 0, margin: 0 }}><CurriculumMotionControls motion={visibleMotion} /></fieldset>
      </div><div className="gc-question-panel">
          <p className="gc-question-kind">CHOOSE YOUR PLAY · SAME ICE, SAME MOMENT</p><h3 id="gc-question-prompt" ref={promptRef} tabIndex={-1}>{copy.prompt}</h3>
          <div className="gc-options" role="group" aria-labelledby="gc-question-prompt">{options.map(option => {
            const correct = answer !== null && option.value === question.ok;
            const chosen = answer === option.value;
            return <button key={String(option.value)} data-curriculum-option={option.value} disabled={answer !== null || !canAnswer} aria-pressed={chosen} className={`${correct ? 'correct' : ''} ${chosen && !correct ? 'incorrect' : ''}`} onClick={() => submit(option.value)}><b>{correct ? '✓' : chosen ? '×' : String.fromCharCode(65 + option.value)}</b><span>{option.text}</span></button>;
          })}</div>
          {!sceneAvailable && <p className="gc-storage-notice" role="status">The rink must be ready before you choose your play. If loading failed, use Retry 3D rink.</p>}
          {result !== null && <div className="gc-answer-feedback" ref={feedbackRef} tabIndex={-1}><CoachFeedback coach={coach} correct={result} headline={coachReaction(coach, result, LEVELS[age], 0)} explanation={copy.explanation} /><div className="gc-feedback-actions"><button className="gc-primary" onClick={() => openLesson((lessonIndex + 1) % lessons.length)}>{lessonIndex === lessons.length - 1 ? 'Back to first lesson' : 'Next lesson →'}</button>{!result && <button className="gc-text-button" onClick={resetQuestion}>Try this read again</button>}</div><small>{result ? 'Read completed. One answer does not establish mastery.' : 'Read the feedback, then try again or continue.'}</small></div>}
      </div></div>}
    </article>
    {notice && <p className="gc-storage-notice" role="status">{notice}</p>}
    <footer className="gc-footer">Guided learning preview · Practice points are separate from your Game Sense Score.</footer>
  </section>;
}

export default function GuidedCurriculum({ playerId = 'practice-preview', ageBand = 'U11', initialLessonId }) {
  if (CONTENT_ERRORS.length) return <section className="gc-root" role="alert"><h2>These lessons need a content check.</h2><p>The curriculum could not be opened safely.</p></section>;
  return <CurriculumSession key={`${playerId}:${ageBand}:${initialLessonId || 'first'}`} playerId={playerId} ageBand={ageBand} initialLessonId={initialLessonId} />;
}
