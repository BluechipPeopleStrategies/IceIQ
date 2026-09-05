/** Compact visual identity only; never rename an actor in the lesson model. */
export function compactActorLabel(actor) {
  if (!actor) return '';
  if (actor.role === 'goalie' || /^(the )?goalie$/i.test(actor.label || '')) return 'G';
  if (actor.label === 'YOU') return 'YOU';
  const namedTeam = /^(?:Navy|Gold)\s*(\d+)$/i.exec(actor.label || '');
  if (namedTeam) return namedTeam[1];
  if (['home','away'].includes(actor.team) && /^[HA]\d+$/.test(actor.label || '')) return actor.label.slice(1);
  if (/^[A-Z]{1,2}\d{0,2}$/.test(actor.label || '')) return actor.label;
  return actor.id || actor.label || actor.name || '';
}

export function actorDisplayName(actor) {
  const label = compactActorLabel(actor);
  return /^\d+$/.test(label) ? `${actor.team === 'home' ? 'Navy' : 'Gold'} ${label}` : actor?.label || actor?.name || label;
}

export function actorJerseyNumber(actor, fallback) {
  const label = compactActorLabel(actor);
  return /^\d+$/.test(label) ? label : String(fallback);
}
