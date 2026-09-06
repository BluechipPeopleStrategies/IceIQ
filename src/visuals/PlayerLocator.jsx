/** Learner identity is authored, never inferred from editing or possession. */
export function isLearnerActor(actor, learnerId = null) {
  if (!actor) return false;
  return typeof learnerId === 'string' ? actor.id === learnerId : actor.isLearner === true || actor.label === 'YOU';
}

/** Explicit question focus may be any named player. Omission retains legacy YOU. */
export function isFocusedActor(actor, focusActorId = undefined) {
  return focusActorId === undefined ? isLearnerActor(actor) : Boolean(actor && typeof focusActorId === 'string' && actor.id === focusActorId);
}

/** Three-dimensional characters use their jersey/name for identity.
 * Owner removed the persistent body halo on September 6.
 * Keep this compatibility component empty for shared gym/practice callers.
 */
export function PlayerLocator() { return null; }

export function SvgPlayerLocator({ radius = 1.5, label = 'YOU' }) {
  return <g data-player-locator={label} pointerEvents="none" fill="none">
    <circle r={radius} stroke="#FFFFFF" strokeWidth=".38" />
    <circle r={radius} stroke="#0B1A33" strokeWidth=".26" />
    <circle r={radius - .12} stroke="#DDB34F" strokeWidth=".13" />
  </g>;
}
