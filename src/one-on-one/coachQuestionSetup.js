import { addActor, removeActor } from './director.js';
import { reviseCoachQuestion, validateCoachQuestion } from './coachQuestionCore.js';

function changeSnapshots(question, update) {
  const next = reviseCoachQuestion(question, {
    initialDraft: update(question.initialDraft),
    referenceDraft: update(question.referenceDraft),
    view: 'full',
  });
  const errors = validateCoachQuestion(next, { requireReady: false });
  if (errors.length) throw new TypeError(errors.join('; '));
  return next;
}

export function resizeQuestionTeam(question, team, count) {
  if (!['home', 'away'].includes(team) || !Number.isInteger(count) || count < 1 || count > 6) throw new RangeError('Choose 1–6 skaters per side.');
  return changeSnapshots(question, draft => {
    let next = draft;
    const skaters = () => next.actors.filter(actor => actor.team === team && actor.role === 'skater');
    while (skaters().length < count) next = addActor(next, team, 'skater');
    while (skaters().length > count) next = removeActor(next, skaters().at(-1).id);
    return next;
  });
}

export function setQuestionGoalie(question, team, included) {
  if (!['home', 'away'].includes(team)) throw new RangeError('Unknown team');
  return changeSnapshots(question, draft => {
    const goalies = draft.actors.filter(actor => actor.team === team && actor.role === 'goalie');
    if (included) return goalies.length ? draft : addActor(draft, team, 'goalie');
    return goalies.reduce((next, actor) => removeActor(next, actor.id), draft);
  });
}

export function setQuestionPuckOwner(question, actorId) {
  if (!question.initialDraft.actors.some(actor => actor.id === actorId && actor.role === 'skater')) throw new RangeError('Choose a skater to start with the puck.');
  return changeSnapshots(question, draft => ({ ...draft, puck: { ...draft.puck, owner: actorId } }));
}
