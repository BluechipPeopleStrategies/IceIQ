import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import ScenarioRinkView from '../visuals/ScenarioRinkView.jsx';
import { speakParts, stopSpeaking, ttsSupported } from '../speak.js';
import { listenForCoachRouteTaps, portraitPointToCoachRoute } from './coachRouteSurfaceInput.js';
import {
  RINK_DISCOVERY_GEOMETRY as GEOMETRY, RINK_DISCOVERY_PROMPTS as PROMPTS, RINK_DISCOVERY_SPOTS as SPOTS,
  createRinkDiscoverySession, answerRinkDiscovery, advanceRinkDiscovery,
} from './rinkDiscoveryCore.js';
import './RinkDiscovery.css';

const FRAME = { time: 0, actors: [], puck: { ...GEOMETRY.puck } };
const OVERLAYS = { targets: SPOTS };
const BADGES = [[-10.5, -11.2], [-4, -27.3], [10, -16.7], [2, -9]];

function DiscoveryBoard({ onPoint, questionId }) {
  const svg = useRef(null), callback = useRef(onPoint);
  callback.current = onPoint;
  const interactive = typeof onPoint === 'function';
  const id = `discovery-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  useLayoutEffect(() => {
    const surface = svg.current;
    if (!surface || !interactive) return undefined;
    return listenForCoachRouteTaps(surface, event => {
      const matrix = surface.getScreenCTM();
      if (!matrix) return;
      const pointer = surface.createSVGPoint();
      pointer.x = event.clientX; pointer.y = event.clientY;
      let mapped;
      try { mapped = pointer.matrixTransform(matrix.inverse()); } catch { return; }
      const point = portraitPointToCoachRoute(mapped);
      if (point) callback.current?.(point);
    });
  }, [interactive, questionId]);

  const { bounds, circleCentres, circleRadius, goalX, puck } = GEOMETRY;
  return <div className="rd-board-wrap"><svg ref={svg} className="rd-board" viewBox="-14.5 -32 29 64" role="group" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}>
    <title id={`${id}-title`}>Find things on the rink</title>
    <desc id={`${id}-description`}>The whole rink is shown from above. Tap the thing in the question, or choose its numbered spot using the four buttons below.</desc>
    <defs><linearGradient id={`${id}-ice`} x1="0" x2="1" y1="0" y2="1"><stop stopColor="#FFFFFF" /><stop offset=".55" stopColor="#F7FCFF" /><stop offset="1" stopColor="#EAF5FC" /></linearGradient></defs>
    <g transform="rotate(-90)" pointerEvents="none">
      <rect x={bounds.minX} y={bounds.minY} width={bounds.maxX - bounds.minX} height={bounds.maxY - bounds.minY} rx="8.5344" fill={`url(#${id}-ice)`} stroke="#0B1A33" strokeWidth=".7" />
      <rect x={bounds.minX + .18} y={bounds.minY + .18} width={bounds.maxX - bounds.minX - .36} height={bounds.maxY - bounds.minY - .36} rx="8.3544" fill="none" stroke="#C6DEEC" strokeWidth=".18" />
      <line x1="0" x2="0" y1={bounds.minY} y2={bounds.maxY} stroke="#D3233E" strokeWidth=".28" />
      {GEOMETRY.blueLines.map(x => <line key={x} x1={x} x2={x} y1={bounds.minY} y2={bounds.maxY} stroke="#1E63B5" strokeWidth=".3" />)}
      {circleCentres.map(({ x, y }, index) => <g key={index} stroke={index === 0 ? '#1E63B5' : '#D3233E'}>
        <circle cx={x} cy={y} r={circleRadius} fill="none" strokeWidth=".08" />
        <circle cx={x} cy={y} r={index === 0 ? .1524 : .3} fill={index === 0 ? '#1E63B5' : '#D3233E'} strokeWidth=".06" />
      </g>)}
      {[-1, 1].map(side => <g key={side} transform={`scale(${side} 1)`}>
        <line x1={goalX} x2={goalX} y1="-10.5" y2="10.5" stroke="#D3233E" strokeWidth=".07" />
        <path d={`M ${goalX} -1.829 A 1.829 1.829 0 0 0 ${goalX} 1.829 Z`} fill="#C5E2F5" stroke="#D3233E" strokeWidth=".07" />
        <path d={`M ${goalX} -.9144 L ${goalX + 1.1} -.74 V .74 L ${goalX} .9144 Z`} fill="#FFFFFF" stroke="#D3233E" strokeWidth=".13" />
        {[-.5, 0, .5].map(y => <path key={y} d={`M ${goalX} ${y} H ${goalX + 1.1}`} stroke="#7C8994" strokeWidth=".035" />)}
        {[.3, .6, .9].map(x => <path key={x} d={`M ${goalX + x} -.74 V .74`} stroke="#7C8994" strokeWidth=".035" />)}
      </g>)}
      <circle cx={puck.x} cy={puck.y} r=".43" fill="#101820" stroke="#FFFFFF" strokeWidth=".14" />
    </g>
    <g pointerEvents="none" aria-hidden="true">{SPOTS.map((spot, index) => {
      const [x, y] = BADGES[index];
      return <g key={spot.id}><line x1={spot.y} y1={-spot.x} x2={x} y2={y} stroke="#5B6675" strokeWidth=".12" /><circle cx={x} cy={y} r="1.45" fill="#0B1A33" stroke="#F5EFE6" strokeWidth=".15" /><text x={x} y={y + .62} textAnchor="middle" fill="#FFFFFF" fontSize="1.85" fontWeight="800">{spot.label}</text></g>;
    })}</g>
  </svg></div>;
}

/** A local, untimed introduction to rink features. No profile score or AI call. */
export default function RinkDiscovery({ onBack }) {
  const [session, setSession] = useState(createRinkDiscoverySession);
  const [hint, setHint] = useState(false);
  const heading = useRef(null), navigationFrame = useRef(null);
  const prompt = PROMPTS[session.index];
  const found = session.status === 'found';
  const interactive = !session.complete && !found;
  const answer = useCallback(point => setSession(current => answerRinkDiscovery(current, point)), []);
  useEffect(() => { setHint(false); stopSpeaking(); return stopSpeaking; }, [session.index, session.complete]);
  useEffect(() => () => { if (navigationFrame.current != null) cancelAnimationFrame(navigationFrame.current); }, []);
  const returnToQuestion = () => {
    if (navigationFrame.current != null) cancelAnimationFrame(navigationFrame.current);
    navigationFrame.current = requestAnimationFrame(() => {
      navigationFrame.current = null;
      heading.current?.focus({ preventScroll: true });
      heading.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
    });
  };
  const next = () => { setSession(current => advanceRinkDiscovery(current)); returnToQuestion(); };
  const replay = () => { setSession(createRinkDiscoverySession()); setHint(false); returnToQuestion(); };

  return <section className="rink-discovery" aria-label="U7 rink discovery">
    <header className="rd-header"><div><span className="rd-eyebrow">U7 · RINK DISCOVERY</span><p>Four things to find. Take your time.</p></div>{onBack && <button type="button" className="rd-back" onClick={onBack}>Back to practice</button>}</header>
    <div className="rd-stars" aria-label={`${session.found.length} of 4 stars collected`}>{PROMPTS.map(feature => <span key={feature.id} className={session.found.includes(feature.id) ? 'earned' : ''} aria-hidden="true">★</span>)}<span>{session.found.length} / 4</span></div>
    {session.complete ? <div className="rd-finish"><h1 ref={heading} tabIndex={-1}>You explored the rink!</h1><p>You found a faceoff circle, a blue line, a net and the puck.</p><button type="button" className="rd-primary" onClick={replay}>Play again</button>{onBack && <button type="button" onClick={onBack}>Back to practice</button>}</div> : <>
      <div className="rd-question"><span>Find {session.index + 1} of 4</span><h1 ref={heading} tabIndex={-1}>{prompt.prompt}</h1><p>Tap it on the rink, or choose its number below.</p>
        <div className="rd-tools"><button type="button" aria-expanded={hint} onClick={() => setHint(value => !value)}>{hint ? 'Hide hint' : 'Show a hint'}</button>{ttsSupported() && <><button type="button" onClick={() => speakParts([prompt.prompt, hint ? prompt.hint : 'Tap it on the rink, or choose its number below.'], { rate: .82 })}>Read aloud</button><button type="button" onClick={stopSpeaking}>Stop reading</button></>}</div>
        {hint && <p className="rd-hint">{prompt.hint}</p>}
      </div>
      <ScenarioRinkView title="Explore the whole rink" state={FRAME} bounds={GEOMETRY.bounds} hideZoneLines={false} showBothGoals labelledActors={false} overlays={OVERLAYS} onIcePoint={interactive ? answer : undefined}
        fallback={<DiscoveryBoard questionId={prompt.id} onPoint={interactive ? answer : undefined} />} />
      <div className="rd-choices" role="group" aria-label="Choose a numbered spot on the rink">{SPOTS.map(spot => <button type="button" key={spot.id} disabled={!interactive} onClick={() => answer(spot)} aria-label={`Choose spot ${spot.label}`}>{spot.label}</button>)}</div>
      <div className="rd-feedback" aria-live="polite" aria-atomic="true">
        {found ? <><p><span aria-hidden="true">★ </span>{prompt.found}</p><button type="button" className="rd-primary" onClick={next}>{session.index === PROMPTS.length - 1 ? 'See my stars' : 'Next find'}</button></> : session.status === 'try-again' ? <><p>Keep looking. You can try again.</p><button type="button" onClick={() => setSession(current => ({ ...current, status: 'ready' }))}>Try again</button></> : <p>There is no rush.</p>}
      </div>
    </>}
  </section>;
}
