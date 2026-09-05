import { Billboard } from '@react-three/drei';

/** Learner identity is authored, never inferred from editing or possession. */
export function isLearnerActor(actor, learnerId = null) {
  if (!actor) return false;
  return typeof learnerId === 'string' ? actor.id === learnerId : actor.isLearner === true || actor.label === 'YOU';
}

/** Explicit question focus may be any named player. Omission retains legacy YOU. */
export function isFocusedActor(actor, focusActorId = undefined) {
  return focusActorId === undefined ? isLearnerActor(actor) : Boolean(actor && typeof focusActorId === 'string' && actor.id === focusActorId);
}

const RINGS = [
  { inner: .76, outer: .91, color: '#FFFFFF' },
  { inner: .70, outer: .84, color: '#0B1A33' },
  { inner: .64, outer: .75, color: '#E1B957' },
];

/** A camera-facing outline centered on the body, tied to the actor transform.
 * Skater renders equipment in the following Group order, after these overlays,
 * so the opaque identity outline cannot erase a crossing stick or limb.
 * Keep depthWrite false: the outline must not block the later real equipment.
 */
export function PlayerLocator() {
  return <group name="learner-locator">
    <Billboard position={[0, .85, 0]}>
    {RINGS.map((ring, index) => <mesh key={ring.color} position={[0, 0, index * .002]} renderOrder={90 + index}>
      <ringGeometry args={[ring.inner, ring.outer, 48]} />
      <meshBasicMaterial color={ring.color} depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>)}
    </Billboard>
  </group>;
}

export function SvgPlayerLocator({ radius = 1.5, label = 'YOU' }) {
  return <g data-player-locator={label} pointerEvents="none" fill="none">
    <circle r={radius} stroke="#FFFFFF" strokeWidth=".38" />
    <circle r={radius} stroke="#0B1A33" strokeWidth=".26" />
    <circle r={radius - .12} stroke="#DDB34F" strokeWidth=".13" />
  </g>;
}
