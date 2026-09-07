import { useEffect, useMemo, useRef, useState } from 'react';
import ScenarioRinkView from '../visuals/ScenarioRinkView.jsx';
import { scenarioScene, scenarioOverlays, scenarioTitle, toScenarioWorld, fromScenarioWorld } from './scenario3DAdapter.js';
import { scorePoint } from './primitives/point-scorer.js';
import { scorePlace } from './primitives/place-scorer.js';
import { scorePath } from './primitives/path-scorer.js';
import { scoreSelection } from './primitives/selection-scorer.js';
import { scoreSequence } from './primitives/sequence-scorer.js';
import { isCoachRoutePoint } from '../one-on-one/coachRouteSurfaceInput.js';
import './Scenario3DInteraction.css';

// The renderer supports polylines. Draw the authored normalized ellipse in its
// metric projection; do not replace its unequal axes with a metric radius.
function renderOverlays(overlays) {
  return { ...overlays, polylines: [...overlays.polylines, ...overlays.regions.map(region => ({
    id: region.id, color: region.color, dashed: true, width: 2, opacity: .9,
    points: Array.from({ length: 81 }, (_, index) => {
      const angle = index / 80 * Math.PI * 2;
      return [region.x + Math.cos(angle) * region.radiusX, region.y + Math.sin(angle) * region.radiusY];
    }),
  }))] };
}

export default function Scenario3DInteraction({ scenario, ageBand, locked = false, revealed = false, interactive = true, onAnswer, onAvailabilityChange }) {
  const kind = scenario.interaction.kind;
  const items = scenario.interaction.items || [];
  const candidates = Array.isArray(scenario.interaction.from) ? scenario.interaction.from : [];
  const sourceActor = scenario.actors.find(actor => actor.id === scenario.interaction.from);
  const [positions, setPositions] = useState(() => Object.fromEntries(items.map(id => { const actor = scenario.actors.find(a => a.id === id); return [id, { x: actor.x, y: actor.y }]; })));
  const [selected, setSelected] = useState(items[0] || null);
  const [moved, setMoved] = useState([]);
  const [picked, setPicked] = useState([]);
  const [point, setPoint] = useState(null);
  const [path, setPath] = useState(sourceActor ? [{ x: sourceActor.x, y: sourceActor.y }] : []);
  const [cursor, setCursor] = useState(sourceActor ? { x: sourceActor.x, y: sourceActor.y } : { x: .5, y: .5 });
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(false);
  const visibleMs = useRef(0);
  const answered = useRef(false);
  const availableNow = useRef(false);
  const lockedNow = useRef(locked || revealed || !interactive);
  lockedNow.current = locked || revealed || !interactive;
  const disabled = locked || revealed || !ready || answered.current || !interactive;
  const canAct = () => availableNow.current && !lockedNow.current && !answered.current;
  const availability = value => { availableNow.current = value; setReady(value); onAvailabilityChange?.(value); };
  useEffect(() => {
    if (!ready || hidden || !scenario.scanWindow?.showMs) return undefined;
    const start = Date.now();
    const timer = setTimeout(() => setHidden(true), Math.max(0, scenario.scanWindow.showMs - visibleMs.current));
    return () => { visibleMs.current += Date.now() - start; clearTimeout(timer); };
  }, [ready, hidden, scenario.scanWindow?.showMs]);
  const scene = useMemo(() => scenarioScene(scenario, { positions, hiddenKinds: hidden && !revealed ? scenario.scanWindow?.hideKinds || [] : [] }), [scenario, positions, hidden, revealed]);
  const labels = Object.fromEntries(scenarioScene(scenario).state.actors.map(actor => [actor.id, actor.label]));
  const overlays = scenarioOverlays(scenario, { revealed, path, point, picked });
  const emit = result => {
    if (!canAct()) return;
    answered.current = true;
    onAnswer?.(result);
  };
  function move(id, worldPoint) {
    if (!canAct() || !items.includes(id) || !isCoachRoutePoint(worldPoint)) return;
    let normalized;
    try { normalized = fromScenarioWorld(worldPoint); } catch { return; }
    setPositions(previous => ({ ...previous, [id]: normalized }));
    setMoved(previous => previous.includes(id) ? previous : [...previous, id]);
  }
  function icePoint(worldPoint) {
    if (!canAct() || !isCoachRoutePoint(worldPoint)) return;
    let p;
    try { p = fromScenarioWorld(worldPoint); } catch { return; }
    if (kind === 'point') { setPoint(p); const result = scorePoint(p, scenario.correct); emit({ ok: result.ok, reason: result.reason, point: p }); }
    if (kind === 'path') { setPath(previous => [...previous, p]); setCursor(p); }
  }
  function choose(id) {
    if (!canAct() || !candidates.includes(id)) return;
    if (kind === 'sequence') {
      if (picked.includes(id)) return;
      const next = [...picked, id]; setPicked(next);
      if (next.length >= scenario.correct.ids.length) emit({ ...scoreSequence(next, scenario.correct.ids), picked: next });
    } else if (kind === 'selection') {
      if (scenario.correct.ids.length === 1) { setPicked([id]); emit({ ...scoreSelection([id], scenario.correct.ids, { ordered: scenario.interaction.order === 'ordered' }), picked: [id] }); }
      else setPicked(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id]);
    }
  }
  function check() {
    if (!canAct()) return;
    if (kind === 'place' && items.every(id => moved.includes(id))) {
      const result = scorePlace(positions, scenario.correct);
      emit({ ok: result.ok, reason: result.reason, placements: result.placements, positions: structuredClone(positions) });
    } else if (kind === 'path' && path.length > 1) {
      const result = scorePath(path, scenario.correct, { defenders: scenario.actors.filter(actor => actor.kind === 'defender') });
      emit({ ok: result.ok, reason: result.reason, userPath: structuredClone(path), intercepterId: result.intercepterId });
    } else if (kind === 'selection' && picked.length) emit({ ...scoreSelection(picked, scenario.correct.ids, { ordered: scenario.interaction.order === 'ordered' }), picked: [...picked] });
  }
  function nudge(dx, dy) {
    if (!canAct()) return;
    const p = kind === 'place' ? positions[selected] : cursor;
    if (!p) return;
    const next = { x: Math.min(.98, Math.max(.02, p.x + dx)), y: Math.min(.98, Math.max(.02, p.y + dy)) };
    if (!isCoachRoutePoint(toScenarioWorld(next))) return;
    if (kind === 'place') move(selected, toScenarioWorld(next)); else setCursor(next);
  }
  const keyboard = event => {
    const delta = { ArrowLeft: [-.01, 0], ArrowRight: [.01, 0], ArrowUp: [0, -.01], ArrowDown: [0, .01] }[event.key];
    if (delta) { event.preventDefault(); nudge(...delta); }
  };
  if (interactive && !disabled && ['point', 'path'].includes(kind)) overlays.regions.push({ id: 'keyboard-cursor', ...toScenarioWorld(cursor), radiusX: .3, radiusY: .3, color: '#7CCDF6' });
  // Convert cursor after adding it so it uses the same 3D-only marks.
  const renderedOverlays = renderOverlays(overlays);
  return <div className="scenario-answer-3d">
    <ScenarioRinkView {...scene} title={scenarioTitle(scenario)} overlays={renderedOverlays} onAvailabilityChange={availability}
      ageBand={ageBand ?? scenario.ageBand ?? scenario.level} startingView={scenario.startingView} questionId={scenario.id}
      selectedActorId={kind === 'place' ? selected : null}
      editableIds={!disabled && kind === 'place' ? items : []} onSelect={id => { if (!disabled && items.includes(id)) setSelected(id); }}
      onMove={!disabled && kind === 'place' ? move : undefined}
      onIcePoint={!disabled && ['point', 'path'].includes(kind) ? icePoint : undefined}
      selectableIds={!disabled && ['selection', 'sequence'].includes(kind) ? candidates : []}
      onActorAnswer={!disabled ? choose : undefined} />
    {interactive && <div className="scenario-answer-controls">
      {!ready && <p role="status">The answer controls will open when the rink is ready.</p>}
      {kind === 'place' && <><div className="scenario-answer-pills" role="group" aria-label="Player to move">{items.map(id => <button key={id} type="button" disabled={disabled} aria-pressed={selected === id} onClick={() => setSelected(id)}>{labels[id]}{moved.includes(id) ? ' · moved' : ''}</button>)}</div>
        <button className="scenario-answer-check" type="button" onClick={check} disabled={disabled || !items.every(id => moved.includes(id))}>Check positions</button></>}
      {['selection', 'sequence'].includes(kind) && <><div className="scenario-answer-pills" role="group" aria-label={kind === 'sequence' ? 'Choose players in order' : 'Choose a player'}>{candidates.map(id => <button key={id} type="button" disabled={disabled || (kind === 'sequence' && picked.includes(id))} aria-pressed={picked.includes(id)} onClick={() => choose(id)}>{kind === 'sequence' && picked.includes(id) ? `${picked.indexOf(id) + 1}. ` : ''}{labels[id] || id}</button>)}</div>
        {kind === 'selection' && scenario.correct.ids.length > 1 && <button className="scenario-answer-check" type="button" onClick={check} disabled={disabled || !picked.length}>Check choices</button>}
        {kind === 'sequence' && <button type="button" disabled={disabled || !picked.length} onClick={() => setPicked([])}>Start order again</button>}</>}
      {kind === 'path' && <><p>Add points on the ice to build the route, then check it.</p><div className="scenario-answer-pills"><button type="button" disabled={disabled || path.length < 2} onClick={() => setPath(previous => previous.slice(0, -1))}>Undo last point</button><button className="scenario-answer-check" type="button" disabled={disabled || path.length < 2} onClick={check}>Check route</button></div></>}
      {['place', 'point', 'path'].includes(kind) && <details className="scenario-answer-keyboard"><summary>Move with buttons or arrow keys</summary><div role="group" aria-label="Move on the rink" tabIndex={disabled ? -1 : 0} onKeyDown={keyboard}>
        <p>Left and right move along the length of the rink. Up and down move across it.</p>
        {[['←', -.01, 0, 'Left'], ['↑', 0, -.01, 'Up'], ['↓', 0, .01, 'Down'], ['→', .01, 0, 'Right']].map(([symbol, dx, dy, label]) => <button type="button" key={label} disabled={disabled} aria-label={`Move ${label.toLowerCase()}`} onClick={() => nudge(dx, dy)}>{symbol}</button>)}
        {kind !== 'place' && <button type="button" disabled={disabled} onClick={() => icePoint(toScenarioWorld(cursor))}>{kind === 'point' ? 'Choose this spot' : 'Add this point'}</button>}
      </div></details>}
    </div>}
  </div>;
}
