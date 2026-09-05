import {
  getReadSequenceDefinition,
  getSelectedSecondTarget,
  restoreReadSequence,
  serializeReadSequence,
  U9_READ_SEQUENCE,
  U11_READ_SEQUENCE,
} from './readSequenceCore.js';

const MOMENTS = ['opening', 'after-first', 'after-second'];

// Recall describes these specific authored events; teaching prompts may reveal
// a card's place in the lesson or ask for a new action, so they are not reused.
const RECALL_COPY = {
  [U9_READ_SEQUENCE.id]: {
    pass: {
      caption: 'Your teammate has the puck',
      description: 'You passed across the ice. Your teammate has the puck.',
      targets: {
        'return-pass': {
          caption: 'Pass back to YOU',
          description: 'Your teammate passed back to you. They are across the ice without the puck.',
        },
        'carry-space': {
          caption: 'Your teammate carries wide',
          description: 'Your teammate carried into the outside space with the puck. You are on the other side.',
        },
      },
    },
    carry: {
      caption: 'You carry outside',
      description: 'You carried into the outside space with the puck. Your teammate is across the ice.',
      targets: {
        'pass-teammate': {
          caption: 'Pass across the ice',
          description: 'You passed to your teammate across the ice. You are outside without the puck.',
        },
        'keep-puck': {
          caption: 'You carry farther',
          description: 'You carried farther toward the net with the puck. Your teammate is across the ice.',
        },
      },
    },
  },
  [U11_READ_SEQUENCE.id]: {
    pass: {
      caption: 'Pass to F2',
      description: 'F2 has the puck across the ice. D1 and the goalie have shifted toward that side.',
      targets: {
        'return-lane': {
          caption: 'Return pass to F1',
          description: 'F1 has received the pass. F2 is across the ice without the puck.',
        },
        'hold-wide': {
          caption: 'F2 carries wide',
          description: 'F2 has carried into wider ice with the puck. F1 is nearer the middle.',
        },
        'shoot-open': {
          caption: 'F2 shoots; puck loose',
          description: 'F2 has shot toward the net. The puck is loose beyond D1.',
        },
      },
    },
    shoot: {
      caption: 'Shot leaves the puck loose',
      description: 'The puck is loose near the net area. F2 is across the ice from F1.',
      targets: {
        'rebound-space': {
          caption: 'F2 approaches the loose puck',
          description: 'F2 is close to the loose puck. Neither attacker has possession.',
        },
        'high-support': {
          caption: 'F2 stays high',
          description: 'F2 is farther from the net than the loose puck. Neither attacker has possession.',
        },
      },
    },
    carry: {
      caption: 'F1 carries outside',
      description: 'F1 has the puck outside D1. F2 is across the ice without it.',
      targets: {
        'support-middle': {
          caption: 'Pass to F2 inside',
          description: 'F2 has received the puck nearer the middle. F1 is outside D1 without it.',
        },
        'attack-outside': {
          caption: 'F1 carries farther outside',
          description: 'F1 has carried farther toward the net with the puck. F2 is across the ice without it.',
        },
      },
    },
  },
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function pathIdFor(scenarioId, action, targetId) {
  return `${scenarioId}:${action}:${targetId}`;
}

function cardIdsFor(pathId) {
  return MOMENTS.map(moment => `${pathId}:${moment}`);
}

// These are authored freezes from the selected play. The learner's final
// support placement, route and optional changed cue are separate reflections.
export function createReadSequenceRecall(completedSession) {
  if (completedSession?.version !== 'rinkreads-read-sequence-session-v1' || completedSession.phase !== 'complete') {
    throw new Error('Finish all three reads before recalling their order.');
  }
  const session = restoreReadSequence(serializeReadSequence(completedSession), completedSession.scenarioId);
  if (!session) throw new Error('A valid completed reflection is required for recall.');

  const definition = getReadSequenceDefinition(session.scenarioId);
  const branch = definition.branches[session.first.action];
  const target = getSelectedSecondTarget(session);
  const pathId = pathIdFor(definition.id, session.first.action, target.id);
  const chronologicalIds = cardIdsFor(pathId);
  const fixedOpening = definition.ageBand === 'U9';
  const branchCopy = RECALL_COPY[definition.id]?.[session.first.action];
  const targetCopy = branchCopy?.targets[target.id];
  if (!branchCopy || !targetCopy) throw new Error('This play needs authored recall descriptions.');
  const cards = [
    {
      id: chronologicalIds[0],
      state: clone(definition.initialState),
      caption: 'Puck with YOU',
      description: 'You have the puck. Your teammate is across the ice.',
    },
    {
      id: chronologicalIds[1],
      state: clone(branch.state),
      caption: branchCopy.caption,
      description: branchCopy.description,
    },
    {
      id: chronologicalIds[2],
      state: clone(target.state),
      caption: targetCopy.caption,
      description: targetCopy.description,
    },
  ];

  return {
    scenarioId: definition.id,
    pathId,
    ageBand: definition.ageBand,
    cards,
    chronologicalIds,
    initialOrder: fixedOpening
      ? [chronologicalIds[0], chronologicalIds[2], chronologicalIds[1]]
      : [chronologicalIds[1], chronologicalIds[2], chronologicalIds[0]],
    fixedOpening,
    sourceRefs: clone(definition.sourceRefs),
  };
}

function validateOrder(recall, orderedIds) {
  if (!recall || typeof recall.scenarioId !== 'string') throw new TypeError('A recall play is required.');
  const definition = getReadSequenceDefinition(recall.scenarioId);
  const knownPath = Object.entries(definition.branches).some(([action, branch]) =>
    branch.read2.targets.some(target => pathIdFor(definition.id, action, target.id) === recall.pathId));
  if (!knownPath) throw new Error('The recall path does not belong to this scenario.');

  const expectedIds = cardIdsFor(recall.pathId);
  const fixedOpening = definition.ageBand === 'U9';
  if (recall.ageBand !== definition.ageBand || recall.fixedOpening !== fixedOpening ||
      !Array.isArray(recall.chronologicalIds) || recall.chronologicalIds.length !== expectedIds.length ||
      !expectedIds.every((id, index) => recall.chronologicalIds[index] === id) ||
      !Array.isArray(recall.cards) || recall.cards.length !== expectedIds.length ||
      !expectedIds.every((id, index) => recall.cards[index]?.id === id)) {
    throw new Error('The recall cards do not match their scenario path.');
  }
  if (!Array.isArray(orderedIds) || orderedIds.length !== expectedIds.length ||
      new Set(orderedIds).size !== expectedIds.length || !expectedIds.every((_, index) => expectedIds.includes(orderedIds[index]))) {
    throw new Error('The order must contain each card from this play exactly once.');
  }
  if (fixedOpening && orderedIds[0] !== expectedIds[0]) throw new Error('Keep the opening card first.');
  return expectedIds;
}

// This checks remembered chronology only, never the quality of a hockey choice.
export function checkReadSequenceRecallOrder(recall, orderedIds) {
  const expectedIds = validateOrder(recall, orderedIds);
  return { matchesPlay: orderedIds.every((id, index) => id === expectedIds[index]) };
}

export function moveReadSequenceRecallCard(recall, orderedIds, id, direction) {
  validateOrder(recall, orderedIds);
  if (direction !== -1 && direction !== 1) throw new TypeError('Move a card one position earlier or later.');
  const index = orderedIds.indexOf(id);
  if (index < 0) throw new Error('Choose a card from this play.');
  const next = [...orderedIds];
  if (recall.fixedOpening && index === 0) return next;
  const destination = Math.max(recall.fixedOpening ? 1 : 0, Math.min(next.length - 1, index + direction));
  [next[index], next[destination]] = [next[destination], next[index]];
  return next;
}
