import { DRAFT_VERSION, sampleDraft, validateDraft } from './director.js';

const BASE_ACTORS = Object.freeze([
  { id: 'F1', label: 'YOU', team: 'home', role: 'skater' },
  { id: 'F2', label: 'F2', team: 'home', role: 'skater' },
  { id: 'D1', label: 'D1', team: 'away', role: 'skater' },
  { id: 'G', label: 'G', team: 'away', role: 'goalie' },
]);

export function createSequenceState(positions, { owner, looseAt = null, actors = BASE_ACTORS } = {}) {
  const draft = {
    version: DRAFT_VERSION,
    title: 'Connected 2v1 authored state',
    duration: 1,
    actors: actors.map(actor => ({
      ...actor,
      // The director needs a label for validation; younger boards may hide it
      // while retaining a plain-language name for controls and explanations.
      label: actor.label === '' ? actor.name : actor.label,
      frozen: false,
      fixedPose: null,
      keys: [{ time: 0, ...positions[actor.id] }],
    })),
    puck: { owner: owner ?? null },
    sourceRef: { note: 'docs/library/odd-man-reads.md' },
    status: 'development-not-validated',
  };
  const checked = validateDraft(draft);
  if (!checked.ok) throw new Error(`Invalid authored read-sequence geometry: ${checked.errs.join('; ')}`);
  const frame = sampleDraft(draft, 0);
  return {
    actors: frame.actors.map(({ id, label, team, role, x, y, facing }) => {
      const authoredActor = actors.find(actor => actor.id === id);
      const name = authoredActor?.name;
      return { id, label: authoredActor?.label ?? label, team, role, x, y, facing, ...(name == null ? {} : { name }) };
    }),
    puck: looseAt ? { owner: null, x: looseAt.x, y: looseAt.y } : { owner: frame.puck.owner, x: frame.puck.x, y: frame.puck.y },
  };
}
