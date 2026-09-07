import { useCallback, useMemo, useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import RinkActorAnswer from './RinkActorAnswer.jsx';
import { puckLabelObstacles } from './puckLabelPlacement.js';
import { placeRinkActionCue } from './rinkActionPlacement.js';
import './RinkActionCue.css';

/** A neutral, select-only cue. The lesson owns the authored action and confirmation. */
export default function RinkActionCue({ action, point, actors, puck, height = .9, offset = [42, 0], onAnswer, enabled = true, label }) {
  const button = useRef(null), connector = useRef(null);
  const projected = useMemo(() => new Vector3(), []);
  const { invalidate } = useThree();
  const attach = useCallback(node => { button.current = node; if (node) invalidate(); }, [invalidate]);
  useFrame(({ camera, size }) => {
    if (!button.current) return;
    camera.updateMatrixWorld();
    const project = (x, y, z) => {
      projected.set(y, z, -x).project(camera);
      return { x: (projected.x + 1) * size.width / 2, y: (1 - projected.y) * size.height / 2 };
    };
    const anchor = project(point.x, point.y, height);
    const obstacles = puckLabelObstacles(actors || [point], project);
    if (puck && Number.isFinite(puck.x) && Number.isFinite(puck.y)) {
      const center = project(puck.x, puck.y, .075);
      obstacles.push({ x: center.x - 12, y: center.y - 12, width: 24, height: 24 });
    }
    const placement = placeRinkActionCue({ anchor, viewport: size, offset, obstacles,
      labelSize: { width: button.current.offsetWidth, height: button.current.offsetHeight } });
    if (!placement) return;
    button.current.style.transform = `translate(${placement.offsetX}px, ${placement.offsetY}px) translate(-50%, -50%)`;
    if (connector.current) {
      connector.current.style.width = `${placement.leaderLength}px`;
      connector.current.style.transform = `rotate(${placement.leaderAngle}rad)`;
    }
  });
  const text = action === 'pass' ? 'Pass' : action === 'shoot' ? 'Shoot' : 'Carry';
  return <Html center position={[point.y, height, -point.x]} zIndexRange={[24, 14]} style={{ pointerEvents: enabled ? 'auto' : 'none' }}>
    <span className="rink-action-anchor">
      <span ref={connector} className="rink-action-connector" aria-hidden="true" />
      <span ref={attach} className="rink-action-offset" style={{ transform: `translate(${offset[0]}px, ${offset[1]}px) translate(-50%, -50%)` }}>
        <RinkActorAnswer actorId={action} onAnswer={onAnswer} enabled={enabled} className="rink-action-cue" aria-label={label || text}>
          <span className="rink-action-pill">
            <svg viewBox="0 0 16 16" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              {action === 'shoot' ? <><circle cx="8" cy="8" r="4" /><path d="M8 1v3m0 8v3M1 8h3m8 0h3" /></>
                : action === 'pass' ? <><path d="M2 8h11m-4-4 4 4-4 4" /><circle cx="2" cy="8" r=".6" /></>
                  : <><path d="M3 13c8 0-4-10 9-10m-3-2 3 2-3 3" /></>}
            </g></svg>{text}
          </span>
        </RinkActorAnswer>
      </span>
    </span>
  </Html>;
}
