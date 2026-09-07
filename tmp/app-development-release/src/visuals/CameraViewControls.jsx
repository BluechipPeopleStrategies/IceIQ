import { getReadSceneCamera } from '../one-on-one/readSequenceVisuals.js';
import './CameraViewControls.css';

export const CAMERA_VIEW_OPTIONS = Object.freeze([
  { value: 'broadcast', label: 'Broadcast' }, { value: 'rink-side', label: 'Rink side' },
  { value: 'behind-net', label: 'Behind net' }, { value: 'overhead', label: 'Overhead' },
]);

// Project one rink through the actual camera presets. The ice markings, boards
// and goals stay identical; only the viewing angle changes.
function thumbnailTransform(view) {
  const camera = getReadSceneCamera({ minX: -32, maxX: 32, minY: -14, maxY: 14 }, 88 / 52, view);
  const back = camera.position.map((v, i) => v - camera.target[i]);
  const length = Math.hypot(...back);
  const [x, y, z] = back.map(v => v / length);
  const horizontal = Math.hypot(x, z);
  const right = [z / horizontal, 0, -x / horizontal];
  const up = [-y * x / horizontal, horizontal, -y * z / horizontal];
  const scale = 88 / (camera.right - camera.left);
  return `matrix(${-right[2] * scale} ${up[2] * scale} ${right[0] * scale} ${-up[0] * scale} 44 25)`;
}

/** Small illustrations describe camera positions; they are never scenario art. */
export function CameraViewThumbnail({ view }) {
  return <svg className="cvc-thumbnail" viewBox="0 0 88 52" width="62" height="38" aria-hidden="true" focusable="false">
    <g transform="translate(0 2.2)" className="cvc-rink-shadow"><rect transform={thumbnailTransform(view)} x="-30.48" y="-12.954" width="60.96" height="25.908" rx="8.5344" /></g>
    <g transform={thumbnailTransform(view)}>
      <rect className="cvc-ice" x="-30.48" y="-12.954" width="60.96" height="25.908" rx="8.5344" />
      <path className="cvc-blue-line" d="M-7.62-12.954v25.908M7.62-12.954v25.908" />
      <path className="cvc-red-line" d="M0-12.954v25.908M-27-10v20M27-10v20" />
      <circle className="cvc-centre-circle" r="4.572" />
      {[-20.7, 20.7].flatMap(x => [-6.7, 6.7].map(y => <circle key={`${x}:${y}`} className="cvc-faceoff" cx={x} cy={y} r="4.572" />))}
      <path className="cvc-net" d="M-27-1.8h-2v3.6h2ZM27-1.8h2v3.6h-2Z" />
      <circle className="cvc-centre-dot" r=".65" />
    </g>
  </svg>;
}

function ResetIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 7a8 8 0 1 1-1 8M5 3v5h5" /></svg>; }
function AdjustIcon({ active }) { return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">{active ? <path d="m5 12 4 4L19 6" /> : <><path d="M4 7h16M4 17h16M8 4v6M16 14v6" /><circle cx="8" cy="7" r="2" /><circle cx="16" cy="17" r="2" /></>}</svg>; }

/** Controlled camera UI shared by every rink; it never changes lesson state. */
export default function CameraViewControls({ preset, onPresetChange, adjusting = false, onAdjustingChange, panMode = false, onPanModeChange, onReset, onCameraCommand, presetOptions = CAMERA_VIEW_OPTIONS, disabled = false, instruction = '' }) {
  const commandButton = (label, symbol, type, direction) => <button type="button" disabled={disabled} aria-label={label} title={label} onClick={() => { if (!disabled) onCameraCommand?.({ type, direction }); }}><span aria-hidden="true">{symbol}</span><span>{label}</span></button>;
  return <div className="camera-view-controls">
    <div className="cvc-row">
      <div className="cvc-presets" role="group" aria-label="Camera angle">{presetOptions.map(({ value, label }) => <button type="button" key={value} disabled={disabled} aria-label={label} title={`${label} view`} aria-pressed={preset === value} onClick={() => { if (disabled) return; onPresetChange(value); onAdjustingChange(false); }}><CameraViewThumbnail view={value} /><span>{label}</span></button>)}</div>
      <div className="cvc-actions" role="group" aria-label="Camera controls">
        <button type="button" disabled={disabled} className="cvc-icon-button" aria-label="Reset view" title="Reset view" onClick={() => { if (!disabled) onReset(); }}><ResetIcon /></button>
        <button type="button" disabled={disabled} className="cvc-icon-button cvc-adjust-button" aria-label={adjusting ? 'Done adjusting' : 'Adjust camera'} title={adjusting ? 'Done adjusting' : 'Adjust camera'} aria-pressed={adjusting} aria-expanded={adjusting} onClick={() => { if (!disabled) onAdjustingChange(!adjusting); }}><AdjustIcon active={adjusting} /><span>{adjusting ? 'Done' : 'Adjust view'}</span></button>
      </div>
    </div>
    {adjusting ? <div className="cvc-adjustment-panel">
      {onCameraCommand && <div className="cvc-direct-controls">
        <div role="group" aria-label="Scenario size"><span className="cvc-control-label">Zoom</span><div>{commandButton('Zoom out', '−', 'zoom', -1)}{commandButton('Zoom in', '+', 'zoom', 1)}</div></div>
        <div role="group" aria-label="Scenario angle"><span className="cvc-control-label">Angle</span><div>{commandButton('Rotate left', '↶', 'rotate', 1)}{commandButton('Rotate right', '↷', 'rotate', -1)}{commandButton('Lower angle', '↘', 'tilt', 1)}{commandButton('Higher angle', '↗', 'tilt', -1)}</div></div>
        <div role="group" aria-label="Scenario position"><span className="cvc-control-label">Move rink</span><div>{commandButton('Move left', '←', 'pan-x', -1)}{commandButton('Move right', '→', 'pan-x', 1)}{commandButton('Move up', '↑', 'pan-y', 1)}{commandButton('Move down', '↓', 'pan-y', -1)}</div></div>
      </div>}
      <div className="cvc-adjustment"><div className="cvc-adjustment-modes" role="group" aria-label="Camera adjustment type"><button type="button" disabled={disabled} aria-label="Turn view" aria-pressed={!panMode} onClick={() => { if (!disabled) onPanModeChange(false); }}>Turn</button><button type="button" disabled={disabled} aria-label="Move view" aria-pressed={panMode} onClick={() => { if (!disabled) onPanModeChange(true); }}>Move</button></div><p role="status">Drag to {panMode ? 'move the view' : 'turn the view'}. Pinch or scroll to zoom. Arrow keys also work. Finish adjusting to answer.</p></div>
    </div>
      : instruction ? <p className="cvc-instruction">{instruction}</p> : null}
  </div>;
}
CameraViewControls.displayName = 'CameraViewControls';
