import { useEffect, useId, useRef } from 'react';
import { NHL_200X85_PROFILE } from '../scenario-engine/rinkFrame.js';
import { isCoachRoutePoint, listenForCoachRouteTaps, portraitPointToCoachRoute } from './coachRouteSurfaceInput.js';

const { bounds, lengthM, widthM, landmarks } = NHL_200X85_PROFILE;
const NAVY = '#0B1A33', GOLD = '#C9A24B', BONE = '#F5EFE6';

// A portrait view of the same canonical metres used by the 3D rink. This
// surface only reports pending points; actor selection and editing stay outside.
export default function CoachRouteBoard({ frame, actorId, points = [], onPoint }) {
  const svg = useRef(null);
  const callback = useRef(onPoint);
  callback.current = onPoint;
  const interactive = typeof onPoint === 'function';
  const labelId = useId();
  const actors = frame?.actors || [];
  const actor = actors.find(item => item.id === actorId);
  const route = points.filter(isCoachRoutePoint);

  useEffect(() => {
    const surface = svg.current;
    if (!surface || !interactive) return undefined;
    return listenForCoachRouteTaps(surface, event => {
      const matrix = surface.getScreenCTM();
      if (!matrix) return;
      const rect = surface.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return;
      const screenPoint = surface.createSVGPoint();
      screenPoint.x = event.clientX;
      screenPoint.y = event.clientY;
      let mapped;
      try { mapped = screenPoint.matrixTransform(matrix.inverse()); }
      catch { return; }
      const point = portraitPointToCoachRoute(mapped);
      if (point) callback.current(point);
    });
  }, [interactive]);

  return <svg ref={svg} className="coach-route-board" viewBox="-14.5 -32 29 64" role="group" aria-labelledby={labelId}
    style={{ display: 'block', width: '100%', height: '100%', minHeight: 360, background: '#14243C', touchAction: interactive ? 'pan-y' : 'auto' }}>
    <title id={labelId}>{actor?.label || 'Selected player'} route planning board</title>
    <desc>The whole rink is shown from above. Navy circles are teammates, gold diamonds are opponents, and the small dark dot is the puck. The start ring stays at the original position. {interactive ? 'Tap the ice to add a route point, or use the coordinate controls below. Points remain a plan until Apply.' : 'The line shows your pending route. Players show the current preview moment.'}</desc>
    <g transform="rotate(-90)">
      <rect x={bounds.minX} y={bounds.minY} width={lengthM} height={widthM} rx="8.5344" fill={BONE} stroke="#9AA8B3" strokeWidth=".18" />
      <g fill="none" stroke="#75889c" strokeWidth=".09" opacity=".65">
        <line x1="0" x2="0" y1={bounds.minY} y2={bounds.maxY} /><circle r="4.57" />
        {[-1, 1].map(side => <g key={side} transform={`scale(${side} 1)`}>
          <line x1={landmarks.blueLineRightMid[0]} x2={landmarks.blueLineRightMid[0]} y1={bounds.minY} y2={bounds.maxY} stroke="#41658d" strokeWidth=".16" />
          <line x1={landmarks.goalLineRight[0]} x2={landmarks.goalLineRight[0]} y1="-9" y2="9" stroke="#a55960" />
          {[-1, 1].map(ySide => <circle key={ySide} cx={landmarks.circleTopRight[0]} cy={ySide * Math.abs(landmarks.circleTopRight[1])} r="4.57" />)}
          <path d={`M ${landmarks.goalLineRight[0]} -1.05 H ${landmarks.goalLineRight[0] + 1.05} V 1.05 H ${landmarks.goalLineRight[0]}`} stroke={NAVY} strokeWidth=".18" />
        </g>)}
      </g>
      {route.length > 1 && <polyline points={route.map(point => `${point.x},${point.y}`).join(' ')} fill="none" stroke={NAVY} strokeWidth=".22" strokeLinejoin="round" strokeDasharray=".4 .2" pointerEvents="none" />}
      {actors.map(item => <g key={item.id} transform={`translate(${item.x} ${item.y})`} pointerEvents="none">
        {item.id === actorId && <circle r="1.4" fill="none" stroke="#886714" strokeWidth=".2" strokeDasharray=".25 .13" />}
        {item.role === 'goalie'
          ? <rect x="-.7" y="-.9" width="1.4" height="1.8" rx=".12" fill={item.team === 'home' ? NAVY : GOLD} stroke={NAVY} strokeWidth=".1" />
          : item.team === 'home'
            ? <circle r=".78" fill={NAVY} stroke="#ffffff" strokeWidth=".13" />
            : <path d="M 0 -1 L .9 0 L 0 1 L -.9 0 Z" fill={GOLD} stroke={NAVY} strokeWidth=".13" />}
        <path d="M .25 0 H 1.15" transform={`rotate(${item.facing * 180 / Math.PI})`} stroke={BONE} strokeWidth=".13" />
        <text transform="rotate(90)" y="-1.6" textAnchor="middle" fontSize=".92" fontWeight="800" fontFamily="Inter,Arial,sans-serif" fill={NAVY} stroke={BONE} strokeWidth=".12" paintOrder="stroke">{item.label || item.id}</text>
      </g>)}
      {route.map((point, index) => index === 0
        ? <circle key="origin" cx={point.x} cy={point.y} r="1.7" fill="none" stroke="#886714" strokeWidth=".17" pointerEvents="none" />
        : <g key={index} transform={`translate(${point.x} ${point.y})`} pointerEvents="none"><circle r=".63" fill={NAVY} stroke={BONE} strokeWidth=".12" /><text transform="rotate(90)" y=".29" textAnchor="middle" fill={BONE} fontSize=".85" fontWeight="750" fontFamily="Inter,Arial,sans-serif">{index}</text></g>)}
      {[frame?.puck?.x, frame?.puck?.y].every(Number.isFinite) && <circle cx={frame.puck.x} cy={frame.puck.y} r=".3" fill="#111820" stroke={BONE} strokeWidth=".1" pointerEvents="none" />}
    </g>
  </svg>;
}
