import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DEPTH_SLOTS, getDepthChart, moveAssignment } from '../utils/depthChart.js';
import { createLineupDragController } from './lineupDrag.js';
import './LineupCard.css';

const slotName = id => { const slot = DEPTH_SLOTS.find(item => item.id === id); return slot ? slot.role === 'G' ? `${slot.label} goalie` : `${slot.role === 'F' ? 'Line' : 'Pair'} ${slot.line} · ${slot.label}` : 'Bench'; };
function Jersey() { return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="m10 4-7 6 4 6 4-3v15h10V13l4 3 4-6-7-6-3 3h-6Z" /><path d="M11 22h10M5 11l4 4m14 0 4-4" className="lc-jersey-trim" /></svg>; }
function Grip() { return <svg viewBox="0 0 20 24" aria-hidden="true">{[6, 12, 18].flatMap(y => [7, 13].map(x => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.4" />))}</svg>; }
function PlayerFace({ player }) { return <><span className="lc-jersey"><Jersey /></span><span className="lc-player-copy"><strong>{player.name}</strong><small>{player.position || 'Position open'}{Number.isFinite(player.iq) ? ` · GS ${player.iq}` : ''}</small></span></>; }

/** Coach-private lineup, sharing the existing team/chart storage and quest flag. */
export default function LineupCard({ teamId, roster = [], onChange }) {
  const [open, setOpen] = useState(true), [saved, setSaved] = useState(() => ({ teamId, chart: getDepthChart(teamId) }));
  const [picker, setPicker] = useState(null), [pickerValue, setPickerValue] = useState(''), [notice, setNotice] = useState(''), [drag, setDrag] = useState(null);
  const root = useRef(null), pickerInput = useRef(null), latest = useRef(null), dragControl = useRef(null), suppressClick = useRef(false), mounted = useRef(true);
  const chart = saved.teamId === teamId ? saved.chart : getDepthChart(teamId);
  const validSlots = new Set(DEPTH_SLOTS.map(slot => slot.id));
  const playerForSlot = id => roster.find(player => chart[player.id] === id);
  const bench = roster.filter(player => !validSlots.has(chart[player.id]));
  const playerName = id => roster.find(player => player.id === id)?.name || 'Player';
  function commit(playerId, target) {
    const result = moveAssignment(teamId, playerId, target === 'bench' ? null : target, roster.map(player => player.id));
    if (!result.ok) { setNotice(result.message); return; }
    setSaved({ teamId, chart: result.chart }); setPicker(null);
    setNotice(result.displacedId ? `${playerName(playerId)} and ${playerName(result.displacedId)} swapped places.` : `${playerName(playerId)} is ${result.targetSlot ? `at ${slotName(result.targetSlot)}` : 'on the bench'}.`);
    if (result.changed) onChange?.();
  }
  latest.current = { teamId, commit };
  if (!dragControl.current) dragControl.current = createLineupDragController({
    findTarget(x, y) { const target = document.elementFromPoint(x, y)?.closest('[data-lineup-drop]'); return target && root.current?.contains(target) ? target.dataset.lineupDrop : null; },
    onPreview(value) { if (mounted.current) setDrag(value); },
    onDrop(playerId, target, originTeam) { if (latest.current.teamId === originTeam) latest.current.commit(playerId, target); },
  });
  useEffect(() => { setSaved({ teamId, chart: getDepthChart(teamId) }); setPicker(null); setNotice(''); dragControl.current.cancel(); }, [teamId]);
  useEffect(() => { mounted.current = true; const cancel = () => dragControl.current.cancel(); window.addEventListener('blur', cancel); return () => { mounted.current = false; window.removeEventListener('blur', cancel); dragControl.current.cancel(); }; }, []);
  useEffect(() => { pickerInput.current?.focus(); }, [picker]);

  function editSlot(slotId) { setPicker({ kind: 'slot', id: slotId }); setPickerValue(playerForSlot(slotId)?.id || ''); }
  function editPlayer(playerId) { setPicker({ kind: 'player', id: playerId }); setPickerValue(validSlots.has(chart[playerId]) ? chart[playerId] : 'bench'); }
  function grab(event, playerId) { if (dragControl.current.down(event, playerId, teamId)) { event.preventDefault(); event.stopPropagation(); setPicker(null); suppressClick.current = false; } }
  function handleClick(event, playerId) { event.stopPropagation(); if (suppressClick.current) { suppressClick.current = false; return; } editPlayer(playerId); }
  function savePicker() {
    if (picker.kind === 'player') commit(picker.id, pickerValue);
    else if (pickerValue) commit(pickerValue, picker.id);
    else { const holder = playerForSlot(picker.id); if (holder) commit(holder.id, 'bench'); else setPicker(null); }
  }
  function slotCell(slot) {
    const player = playerForSlot(slot.id);
    return <div key={slot.id} className={`lc-slot ${player ? 'has-player' : 'is-empty'} ${drag?.target === slot.id ? 'is-drop-target' : ''} ${drag?.playerId === player?.id ? 'is-dragging' : ''}`} data-lineup-drop={slot.id}>
      <button type="button" className="lc-slot-pick" aria-label={`${slotName(slot.id)}: ${player?.name || 'Empty'}. Choose a player.`} title={player?.name} aria-expanded={picker?.kind === 'slot' && picker.id === slot.id} onClick={() => editSlot(slot.id)}><span className="lc-position">{slot.label}</span>{player ? <PlayerFace player={player} /> : <span className="lc-empty-copy">Add player <span aria-hidden="true">＋</span></span>}</button>
      {player && <button type="button" className="lc-grab" aria-label={`Move ${player.name}`} title={`Drag ${player.name}, or tap to choose a position`} onPointerDown={event => grab(event, player.id)} onClick={event => handleClick(event, player.id)}><Grip /></button>}
    </div>;
  }
  const draggingPlayer = roster.find(player => player.id === drag?.playerId);
  const ghost = draggingPlayer && <div className="lc-drag-ghost" aria-hidden="true" style={{ left: Math.max(8, Math.min(drag.x + 12, (typeof window !== 'undefined' ? window.innerWidth : 1000) - 202)), top: drag.y - 30 }}><PlayerFace player={draggingPlayer} /><span>{drag.target === 'bench' ? 'Bench' : drag.target ? slotName(drag.target) : 'Choose a position'}</span></div>;
  return <section ref={root} className="lineup-card" aria-label="Lineup card" onPointerDownCapture={() => { suppressClick.current = false; }} onClickCapture={event => { if (suppressClick.current && event.detail !== 0) { event.preventDefault(); event.stopPropagation(); } suppressClick.current = false; }} onPointerMove={event => { if (dragControl.current.move(event)) event.preventDefault(); }} onPointerUp={event => { if (dragControl.current.up(event)) suppressClick.current = true; }} onPointerCancel={() => { if (dragControl.current.cancel()) suppressClick.current = true; }} onLostPointerCapture={() => dragControl.current.cancel()} onKeyDown={event => { if (event.key === 'Escape') { dragControl.current.cancel(); setPicker(null); } }}>
    <button type="button" className="lc-heading" aria-expanded={open} onClick={() => { dragControl.current.cancel(); setPicker(null); setOpen(value => !value); }}><span><span className="lc-eyebrow">COACH ONLY</span><strong>Lineup card</strong></span><span className="lc-roster-count">{roster.length} players <span aria-hidden="true">{open ? '−' : '+'}</span></span></button>
    {open && <>{roster.length === 0 ? <p className="lc-help">Invite players to start building your lineup.</p> : <>
      <p className="lc-help">Drag the grip to move a player. Drop on a teammate to swap, or tap a card to choose.</p>
      {picker && <section className="lc-picker" role="group" aria-label={picker.kind === 'slot' ? `Assign ${slotName(picker.id)}` : `Move ${playerName(picker.id)}`}>
        <label>{picker.kind === 'slot' ? slotName(picker.id) : playerName(picker.id)}<select ref={pickerInput} aria-label={picker.kind === 'slot' ? `Player for ${slotName(picker.id)}` : `Position for ${playerName(picker.id)}`} value={pickerValue} onChange={event => setPickerValue(event.target.value)}>{picker.kind === 'slot' ? <><option value="">Empty slot</option>{roster.map(player => <option key={player.id} value={player.id}>{player.name} · {slotName(chart[player.id])}</option>)}</> : <><option value="bench">Bench</option>{DEPTH_SLOTS.map(slot => <option key={slot.id} value={slot.id}>{slotName(slot.id)}{playerForSlot(slot.id) ? ` · ${playerForSlot(slot.id).name}` : ' · Empty'}</option>)}</>}</select></label><div><button type="button" className="lc-save" onClick={savePicker}>Save position</button><button type="button" onClick={() => setPicker(null)}>Cancel</button></div>
      </section>}
      <div className="lc-lines"><div className="lc-unit-heading"><h3>Forward lines</h3><span>LW · C · RW</span></div>{[1, 2, 3].map(line => <div className="lc-line" key={`F${line}`}><span className="lc-line-number" aria-label={`Line ${line}`}>{line}</span><div className="lc-forward-slots">{DEPTH_SLOTS.filter(slot => slot.role === 'F' && slot.line === line).map(slotCell)}</div></div>)}
        <div className="lc-unit-heading"><h3>Defence pairs</h3><span>LD · RD</span></div>{[1, 2, 3].map(line => <div className="lc-line" key={`D${line}`}><span className="lc-line-number" aria-label={`Pair ${line}`}>{line}</span><div className="lc-defence-slots">{DEPTH_SLOTS.filter(slot => slot.role === 'D' && slot.line === line).map(slotCell)}</div></div>)}
        <div className="lc-unit-heading"><h3>Goaltenders</h3><span>Starter · Backup</span></div><div className="lc-goalie-slots">{DEPTH_SLOTS.filter(slot => slot.role === 'G').map(slotCell)}</div>
      </div>
      <section className={`lc-bench ${drag?.target === 'bench' ? 'is-drop-target' : ''}`} data-lineup-drop="bench" aria-label="Bench drop area"><div className="lc-unit-heading"><h3>Bench</h3><span>{bench.length} players</span></div>{bench.length ? <div className="lc-bench-players">{bench.map(player => <div className={`lc-bench-player ${drag?.playerId === player.id ? 'is-dragging' : ''}`} key={player.id}><button type="button" className="lc-bench-pick" onClick={() => editPlayer(player.id)} aria-label={`Choose a position for ${player.name}`}><PlayerFace player={player} /></button><button type="button" className="lc-grab" aria-label={`Move ${player.name}`} title={`Drag ${player.name}, or tap to choose a position`} onPointerDown={event => grab(event, player.id)} onClick={event => handleClick(event, player.id)}><Grip /></button></div>)}</div> : <p className="lc-help">Drop a player here to take them off a line.</p>}</section>
      <p className="lc-private">Saved on this device. Only you can see this lineup.</p>
    </> }<p className="lc-status" role="status" aria-live="polite">{notice}</p></>}
    {ghost && (typeof document !== 'undefined' && document.body ? createPortal(ghost, document.body) : ghost)}
  </section>;
}
