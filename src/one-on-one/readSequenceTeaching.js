import { currentSequenceState, getReadSequenceDefinition, getSelectedSecondTarget } from './readSequenceCore.js';

export function possessionSentence(state) {
  const actor = state.actors.find(item => item.id === state.puck?.owner);
  if (!actor) return 'The puck is loose. No player has possession.';
  const name = actor.label || actor.name || actor.id;
  return name === 'YOU' || name === 'You' ? 'You have the puck.' : `${name} has the puck.`;
}

/** The question follows the actual freeze, not the action chosen two reads ago. */
export function thirdReadTeaching(session, { routeMode = false } = {}) {
  const state = currentSequenceState(session);
  const target = getSelectedSecondTarget(session);
  const actor = state.actors.find(item => item.id === (session.third?.actorId || target?.moveActorId));
  if (!actor) return null;
  const young = getReadSequenceDefinition(session.scenarioId).ageBand === 'U9';
  const name = young ? 'the highlighted player' : actor.label || actor.name || actor.id;
  const move = routeMode ? `Plan a path for ${name}.` : `Move ${name} to show your idea.`;
  if (!state.puck.owner) return {
    kind: 'recovery',
    step: 'READ 3 · REACT TO THE LOOSE PUCK',
    prompt: `The puck is still loose. What should ${name === 'YOU' ? 'you' : name} do next? ${move}`,
    cue: 'No one has recovered the puck. Decide whether to go toward it or protect space while your teammate goes. Explain who will try to get it.',
    reasonLabel: 'Who will get the puck, and how does your move help?',
    finalTitle: 'Your plan for the loose puck',
    finalCue: 'This board shows your proposed positions. Moving a player did not award possession or take another shot.',
  };
  const owner = state.actors.find(item => item.id === state.puck.owner);
  const ownerName = owner.label || owner.name || owner.id;
  return {
    kind: 'support',
    step: 'READ 3 · HELP THE PUCK CARRIER',
    prompt: `${possessionSentence(state)} Where can ${name === 'YOU' ? 'you' : name} help? ${move}`,
    cue: `${ownerName === 'YOU' ? 'YOU still have' : `${ownerName} still has`} the puck. Find useful space and a passing lane without crowding the puck carrier.`,
    reasonLabel: 'How can the puck carrier use the space you chose?',
    finalTitle: 'Your support plan',
    finalCue: `${possessionSentence(state)} The highlighted player's new position is your support idea.`,
  };
}
