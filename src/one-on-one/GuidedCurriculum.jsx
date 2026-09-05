import { useEffect, useId, useRef, useState } from 'react';
import pack from './curriculum-draft.json';
import { COACH_PERSONAS, coachReaction, getCoachForQuestion } from '../coachPersonas.js';
import { CoachFeedback } from '../play/CoachFeedback.jsx';
import { NHL_200X85_PROFILE } from '../scenario-engine/rinkFrame.js';
import { HockeyPlayerArt } from '../visuals/HockeyPlayerArt.jsx';
import BoardInspection from '../visuals/BoardInspection.jsx';
import { CURRICULUM_AGES, CURRICULUM_STRANDS, curriculumStats, readCurriculumProgress, recordCurriculumAnswer, scoreCurriculumQuestion, validateCurriculum } from './curriculumCore.js';
import './GuidedCurriculum.css';

const STRANDS = {
  scanning: { label: 'See the ice', icon: '◎', category: 'Vision' },
  'off-puck-support-offense': { label: 'Help the puck', icon: '↗', category: 'Puck Support' },
  'gap-control': { label: 'Protect the middle', icon: '◇', category: 'Gap Control' },
  'odd-man-reads': { label: 'Find the advantage', icon: '⇢', category: 'Rush Reads' },
};
const LEVELS = { U7: 'U7 / Initiation', U9: 'U9 / Novice', U11: 'U11 / Atom', U13: 'U13 / Peewee', U15: 'U15 / Bantam', U18: 'U18 / Midget' };
const ALL_QUESTIONS = pack.lessons.flatMap(lesson => lesson.questions);
const QUESTION_IDS = ALL_QUESTIONS.map(question => question.id);
const CONTENT_ERRORS = validateCurriculum(pack);
const GOAL_X = NHL_200X85_PROFILE.landmarks.goalLineRight[0];
const HALF_RINK = 'M 0 -12.954 H 21.9456 A 8.5344 8.5344 0 0 1 30.48 -4.4196 V 4.4196 A 8.5344 8.5344 0 0 1 21.9456 12.954 H 0 Z';

function Goal({ side = 1 }) {
  return <g transform={`scale(${side} 1)`}>
    <path d={`M ${GOAL_X} -1.829 A 1.829 1.829 0 0 0 ${GOAL_X} 1.829 Z`} fill="#bcc5c3" stroke="#919d99" strokeWidth=".07" />
    <path d={`M ${GOAL_X} -1.05 H ${GOAL_X + 1.1} V 1.05 H ${GOAL_X}`} fill="#7e898622" stroke="#a04c3d" strokeWidth=".15" />
    <path d={`M ${GOAL_X + .35} -1 V 1 M ${GOAL_X + .7} -1 V 1 M ${GOAL_X} -.5 H ${GOAL_X + 1.1} M ${GOAL_X} .5 H ${GOAL_X + 1.1}`} fill="none" stroke="#8b9691" strokeWidth=".055" />
  </g>;
}

export function CurriculumBoard({ visual, title, inspectable = false }) {
  const instance = useId().replaceAll(':', '');
  const marker = `gc-arrow-${instance}`;
  const ice = `gc-ice-${instance}`;
  const full = visual.view === 'full';
  const ownNet = visual.netContext === 'right-net-is-learners-own';
  return <figure className="gc-board">
    <div className="gc-board-heading"><span>READ THE ICE</span><b>{ownNet ? 'RIGHT NET · YOURS' : 'ATTACK THE RIGHT NET →'}</b></div>
    <svg viewBox={full ? '-32 -14.5 64 29' : '-1.5 -14.5 34 29'} role="img" aria-label={`${title}. ${visual.caption}`}>
      <title>{title}</title><desc>{visual.caption} Navy players are your teammates. Gold players are opponents. The puck is the small black dot. YOU has a separate ring.</desc>
      <defs>
        <linearGradient id={ice} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fbfdff" /><stop offset=".52" stopColor="#eaf1f5" /><stop offset="1" stopColor="#cddde5" /></linearGradient>
        <filter id={`${ice}-depth`} x="-10%" y="-15%" width="120%" height="135%"><feDropShadow dx="0" dy=".3" stdDeviation=".2" floodColor="#071528" floodOpacity=".5" /></filter>
        {full ? <rect id={`${ice}-surface`} x="-30.48" y="-12.954" width="60.96" height="25.908" rx="8.5344" /> : <path id={`${ice}-surface`} d={HALF_RINK} />}
        <marker id={marker} viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto"><path d="M 0 0 L 6 3 L 0 6 Z" fill="#495853" /></marker>
      </defs>
      <g pointerEvents="none" filter={`url(#${ice}-depth)`}>
        <use href={`#${ice}-surface`} fill="#f3f6f8" stroke="#213b51" strokeWidth=".78" />
        <use href={`#${ice}-surface`} fill="none" stroke="#d0ae65" strokeWidth=".44" />
        <use href={`#${ice}-surface`} fill={`url(#${ice})`} stroke="#edf4f7" strokeWidth=".14" />
      </g>
      <g stroke="#7d8b8260" fill="none" strokeWidth=".07">
        {[-6.2484, 6.2484].map(y => <g key={y}><circle cx="21.0312" cy={y} r="4.57" /><circle cx="21.0312" cy={y} r=".13" fill="#7d8b82" /></g>)}
        <line x1={GOAL_X} y1="-10" x2={GOAL_X} y2="10" />
        {full && <><line x1="0" y1="-12.954" x2="0" y2="12.954" /><circle cx="0" cy="0" r="4.57" /></>}
        {!visual.hideBlueLines && [-7.9248, 7.9248].filter(x => full || x > 0).map(x => <line key={x} x1={x} y1="-12.954" x2={x} y2="12.954" stroke="#697b8a" strokeWidth=".18" />)}
      </g>
      <Goal />{full && <Goal side={-1} />}
      {(visual.arrows ?? []).map((arrow, index) => <g key={index}>
        <line x1={arrow.from[0]} y1={arrow.from[1]} x2={arrow.to[0]} y2={arrow.to[1]} stroke="#495853" strokeWidth=".16" strokeDasharray=".35 .22" markerEnd={`url(#${marker})`} />
        <text x={(arrow.from[0] + arrow.to[0]) / 2} y={(arrow.from[1] + arrow.to[1]) / 2 - .9} textAnchor="middle" fontSize=".95" fontWeight="900" fill="#26342e" stroke="#e3e7dc" strokeWidth=".22" paintOrder="stroke"><title>{arrow.label}</title>{index + 1}</text>
      </g>)}
      {visual.actors.map(actor => {
        const you = actor.label === 'YOU';
        return <g key={actor.id} transform={`translate(${actor.x} ${actor.y})`}>
          {you && <circle r="1.15" fill="none" stroke="#161d18" strokeWidth=".16" strokeDasharray=".18 .12" />}
          <HockeyPlayerArt radius={.67} team={actor.team} goalie={actor.role === 'goalie'} facing={null} />
          {actor.hasPuck && <circle className="gc-puck" cx="1" cy=".58" r=".26" fill="#080d0a" stroke="#edf1e5" strokeWidth=".09" />}
          {actor.label && <text y="-1.4" textAnchor="middle" fontSize={you ? '1.03' : '.86'} fontWeight="900" fill="#17251e" stroke="#e3e7dc" strokeWidth=".22" paintOrder="stroke">{actor.label}</text>}
        </g>;
      })}
    </svg>
    <figcaption>{visual.caption}</figcaption>
    {!!visual.arrows?.length && <ol className="gc-arrow-notes">{visual.arrows.map((arrow, index) => <li key={index}>{arrow.label}</li>)}</ol>}
    <div className="gc-board-legend"><span><i className="gc-legend-home" />Your team</span><span><i className="gc-legend-away" />Opponents</span><span><i className="gc-legend-puck" />Puck</span></div>
    {inspectable && <BoardInspection title={title} renderBoard={() => <CurriculumBoard visual={visual} title={title} />} />}
  </figure>;
}

function CurriculumSession({ playerId, ageBand }) {
  const [age, setAge] = useState(() => CURRICULUM_AGES.find(value => value === String(ageBand).split(' ')[0]) || 'U11');
  const [lessonIndex, setLessonIndex] = useState(0);
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState(null);
  const [complete, setComplete] = useState(false);
  const [coachId, setCoachId] = useState('auto');
  const [notice, setNotice] = useState('');
  const answerLocked = useRef(false);
  const promptRef = useRef(null), feedbackRef = useRef(null), pendingFocus = useRef(null);
  useEffect(() => {
    if (!pendingFocus.current) return;
    const target = pendingFocus.current === 'feedback' ? feedbackRef.current : promptRef.current;
    target?.focus({ preventScroll: true });
    pendingFocus.current = null;
  }, [age, lessonIndex, step, answer, complete]);
  const key = `rinkreads_guided_curriculum_v1:${playerId}`;
  const [progress, setProgress] = useState(() => {
    try { return readCurriculumProgress(localStorage.getItem(key), QUESTION_IDS); } catch { return {}; }
  });
  const lessons = CURRICULUM_STRANDS.map(strand => pack.lessons.find(lesson => lesson.ageBand === age && lesson.curriculumStrand === strand));
  const lesson = lessons[lessonIndex];
  const question = lesson.questions[step];
  const meta = STRANDS[lesson.curriculumStrand];
  const coach = COACH_PERSONAS.find(item => item.id === coachId) || getCoachForQuestion({ id: question.id, cat: meta.category }, LEVELS[age], 'Forward');
  const total = curriculumStats(progress, ALL_QUESTIONS);
  const current = curriculumStats(progress, lesson.questions);
  const ageStats = curriculumStats(progress, lessons.flatMap(item => item.questions));
  const result = answer === null ? null : scoreCurriculumQuestion(question, answer);
  const options = question.type === 'tf' ? [{ value: true, text: 'True' }, { value: false, text: 'False' }] : question.opts.map((text, value) => ({ value, text }));

  function resetQuestion() { pendingFocus.current = 'prompt'; answerLocked.current = false; setAnswer(null); }
  function openLesson(index) { setLessonIndex(index); setStep(0); setComplete(false); resetQuestion(); }
  function chooseAge(next) { setAge(next); openLesson(0); }
  function submit(value) {
    if (answerLocked.current) return;
    answerLocked.current = true; pendingFocus.current = 'feedback';
    const next = recordCurriculumAnswer(progress, question.id, scoreCurriculumQuestion(question, value));
    setProgress(next); setAnswer(value);
    try { localStorage.setItem(key, JSON.stringify({ version: 1, answers: next })); }
    catch { setNotice('Your points are kept for this visit. This browser could not save them for later.'); }
  }
  function advance() {
    if (step === 0) { setStep(1); resetQuestion(); } else { pendingFocus.current = 'prompt'; setComplete(true); }
  }

  return <section className="gc-root" aria-label="Guided hockey curriculum">
    <header className="gc-header"><div><p className="gc-kicker">RINKREADS / YOUR NEXT READ</p><h1>See the ice.<br /><em>Make your choice.</em></h1><p className="gc-intro">Four hockey habits. Two quick reads in each lesson.<br />Take your time. Learn from the picture.</p></div><div className="gc-score"><strong>{total.points.toLocaleString()}</strong><span>PRACTICE POINTS</span><small>{total.mastered} of {total.total} reads mastered<br />Saved on this device</small></div></header>
    <div className="gc-age-row"><div className="gc-age-pills" aria-label="Choose age group">{CURRICULUM_AGES.map(value => <button key={value} aria-pressed={age === value} onClick={() => chooseAge(value)}>{value}</button>)}</div><span>{ageStats.attempted} / {ageStats.total} reads explored in {age}</span></div>
    <nav className="gc-lesson-cards" aria-label={`${age} lessons`}>{lessons.map((item, index) => {
      const stats = curriculumStats(progress, item.questions);
      return <button key={item.id} className={index === lessonIndex ? 'active' : ''} aria-current={index === lessonIndex ? 'step' : undefined} onClick={() => openLesson(index)}><span className="gc-card-top"><b>{String(index + 1).padStart(2, '0')}</b><i>{stats.mastered === 2 ? '✓' : STRANDS[item.curriculumStrand].icon}</i></span><strong>{item.title}</strong><span className="gc-card-bottom">{STRANDS[item.curriculumStrand].label}<b>{stats.mastered === 2 ? '2 / 2 mastered' : `${stats.attempted} / 2 explored`}</b></span></button>;
    })}</nav>
    <article className="gc-workspace">
      <div className="gc-workspace-head"><div><p className="gc-kicker">{age} · LESSON {lessonIndex + 1} OF 4</p><h2>{lesson.title}</h2></div><label className="gc-coach-picker">YOUR COACH<select aria-label="Guided lesson coach" value={coachId} onChange={event => setCoachId(event.target.value)}><option value="auto">Match this lesson</option>{COACH_PERSONAS.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
      <div className="gc-teaching"><span>THE HABIT</span><p>{lesson.teachingPoint}</p><small>{lesson.learnerAction}</small></div>
      <div className="gc-play-area"><CurriculumBoard inspectable visual={question.visual} title={lesson.title} /><div className="gc-question-panel">
        {complete ? <div className="gc-complete" role="status"><span className="gc-complete-icon">{current.mastered === 2 ? '★' : '↻'}</span><p className="gc-kicker">LESSON EXPLORED</p><h3 ref={promptRef} tabIndex={-1}>{current.mastered === 2 ? 'You found both reads.' : 'Keep building this read.'}</h3><p>{current.mastered} of 2 reads mastered · {current.points} points</p><p className="gc-complete-tip">{lesson.teachingPoint}</p><button className="gc-primary" onClick={() => openLesson((lessonIndex + 1) % lessons.length)}>{lessonIndex === lessons.length - 1 ? 'Return to the first lesson' : 'Next lesson →'}</button><button className="gc-text-button" onClick={() => openLesson(lessonIndex)}>Review this lesson</button><small>Points are earned once per question. Reviewing keeps your progress.</small></div> : <>
          <div className="gc-steps" aria-label={`Question ${step + 1} of 2`}><span className={step === 0 ? 'active' : 'done'}>1 · Choose the play</span><span className={step === 1 ? 'active' : ''}>2 · Check the habit</span></div>
          <p className="gc-question-kind">{question.type === 'mc' ? 'CHOOSE ONE ANSWER' : 'TRUE OR FALSE'} · SAME ICE, SAME MOMENT</p><h3 id="gc-question-prompt" ref={promptRef} tabIndex={-1}>{question.sit}</h3>
          <div className="gc-options" role="group" aria-labelledby="gc-question-prompt">{options.map(option => {
            const correct = answer !== null && option.value === question.ok;
            const chosen = answer === option.value;
            return <button key={String(option.value)} disabled={answer !== null} aria-pressed={chosen} className={`${correct ? 'correct' : ''} ${chosen && !correct ? 'incorrect' : ''}`} onClick={() => submit(option.value)}><b>{correct ? '✓' : chosen ? '×' : question.type === 'mc' ? String.fromCharCode(65 + option.value) : option.value ? 'T' : 'F'}</b><span>{option.text}</span></button>;
          })}</div>
          {result !== null && <div className="gc-answer-feedback" ref={feedbackRef} tabIndex={-1}><CoachFeedback coach={coach} correct={result} headline={coachReaction(coach, result, LEVELS[age], step)} explanation={question.why} /><p className="gc-tip"><b>KEEP THIS:</b> {question.tip}</p><div className="gc-feedback-actions"><button className="gc-primary" onClick={advance}>{step === 0 ? 'Check the habit →' : 'Finish lesson →'}</button>{!result && <button className="gc-text-button" onClick={resetQuestion}>Try this read again</button>}</div><small>{result ? 'This question is mastered. Its 100 points are counted once.' : 'Read the feedback, then try again or continue.'}</small></div>}
        </>}
      </div></div>
      <details className="gc-source"><summary>Teaching notes & lesson source <span>Authored preview · awaiting review</span></summary><p>{lesson.ageRationale}</p><p>{lesson.sourceRef.reason}</p><code>{lesson.sourceRef.note}</code>{lesson.sourceRef.url && <a href={lesson.sourceRef.url} target="_blank" rel="noreferrer">Reference used by the source note ↗</a>}<small>{lesson.sourceRef.evidenceScope}</small></details>
    </article>
    {notice && <p className="gc-storage-notice" role="status">{notice}</p>}
    <footer className="gc-footer">Guided learning preview · Practice points are separate from your Game Sense Score.</footer>
  </section>;
}

export default function GuidedCurriculum({ playerId = 'practice-preview', ageBand = 'U11' }) {
  if (CONTENT_ERRORS.length) return <section className="gc-root" role="alert"><h2>These lessons need a content check.</h2><p>The curriculum could not be opened safely.</p></section>;
  return <CurriculumSession key={`${playerId}:${ageBand}`} playerId={playerId} ageBand={ageBand} />;
}
