import { createSequenceState } from './readSequenceGeometry.js';

const ACTORS = Object.freeze([
  { id: 'F1', label: 'YOU', name: 'You', team: 'home', role: 'skater' },
  { id: 'F2', label: '', name: 'Your teammate', team: 'home', role: 'skater' },
  { id: 'D1', label: '', name: 'The defender', team: 'away', role: 'skater' },
  { id: 'G', label: '', name: 'The goalie', team: 'away', role: 'goalie' },
]);

function pose(x, y, facing = 0) {
  return { x, y, facing };
}

function state(F1, F2, D1, G, owner) {
  return createSequenceState({ F1, F2, D1, G }, { owner, actors: ACTORS });
}

// All skaters begin inside the attacking zone. The teammate is separated
// across the ice; the defender covers the middle route toward the net, not
// the cross-ice pass. Outside ice remains available for a carry choice.
const INITIAL_STATE = state(
  pose(14, 4), pose(17, -4), pose(19, 3, Math.PI),
  pose(25, 0.5, Math.atan2(3.5, -11)), 'F1',
);

const BRANCHES = {
  pass: {
    actionLabel: 'Pass',
    consequence: 'Your pass reaches your teammate. You stay on the other side while the defender moves toward the middle.',
    state: state(
      pose(14.5, 4), pose(18, -4, 0.1), pose(20, 0, Math.PI),
      pose(25, -0.7, 3.3), 'F2',
    ),
    read2: {
      prompt: 'Your teammate has the puck. Where should it go next?',
      cue: 'Look at the path back to you and the space beside your teammate.',
      targets: [
        {
          id: 'return-pass', label: 'Pass back to you', kind: 'receiver', x: 14.5, y: 4,
          summary: 'Your teammate passes back to you. They stay on the other side, ready for your next support idea.',
          moveActorId: 'F2',
          state: state(
            pose(14.5, 4), pose(18.5, -4, 0.1), pose(20.2, 0.4, Math.PI),
            pose(25, -0.1, 2.9), 'F1',
          ),
        },
        {
          id: 'carry-space', label: 'Skate into this space', kind: 'space', x: 20, y: -5,
          summary: 'Your teammate keeps the puck and skates into the space you chose. You are now the player helping without the puck.',
          moveActorId: 'F1',
          state: state(
            pose(16, 4), pose(20, -5, -0.25), pose(20.5, -1, Math.PI),
            pose(25, -0.9, 3.3), 'F2',
          ),
        },
      ],
    },
  },
  carry: {
    actionLabel: 'Carry',
    consequence: 'You keep the puck and skate into the outside space. The defender shifts toward you. Your teammate stays on the other side.',
    state: state(
      pose(17, 6, 0.1), pose(17, -4), pose(20, 3.5, Math.PI),
      pose(25, 0.9, 2.8), 'F1',
    ),
    read2: {
      prompt: 'You still have the puck. Where do you want to take it next?',
      cue: 'Look at your teammate and the space ahead of you.',
      targets: [
        {
          id: 'pass-teammate', label: 'Pass to your teammate', kind: 'receiver', x: 17, y: -4,
          summary: 'Your pass reaches your teammate on the other side. You become the player helping without the puck.',
          moveActorId: 'F1',
          state: state(
            pose(17.5, 6, 0.1), pose(17, -4), pose(20.5, 2, Math.PI),
            pose(25, -0.5, 3.3), 'F2',
          ),
        },
        {
          id: 'keep-puck', label: 'Keep skating into this space', kind: 'space', x: 19, y: 6.5,
          summary: 'You keep the puck and skate farther into the space you chose. Move your teammate to show how they could help.',
          moveActorId: 'F2',
          state: state(
            pose(19, 6.5, 0.1), pose(18, -4), pose(20.3, 3.8, Math.PI),
            pose(25, 1.2, 2.8), 'F1',
          ),
        },
      ],
    },
  },
};

export const U9_READ_SEQUENCE = Object.freeze({
  id: 'u9-connected-support-three-reads-v1',
  title: 'Look. Choose. Help a teammate.',
  ageBand: 'U9',
  status: 'draft-for-coach-review',
  actions: Object.freeze(['pass', 'carry']),
  ui: Object.freeze({
    kicker: 'FIND A TEAMMATE',
    heroAccent: 'Help a teammate.',
    intro: 'Look at the players. Choose where the puck goes. Then help without it.',
    note: 'Take your time. Tell someone what you noticed.',
    progressLabels: Object.freeze(['Look and choose', 'Look again', 'Help without the puck']),
    stageDescription: 'Navy circles are your team. Gold shapes defend. The puck and players move after your choice. Only the player marked YOU has a name on the ice.',
    firstCues: Object.freeze(['Where is your teammate?', 'Where is the defender?', 'What space can you see?']),
    actionCopy: Object.freeze({
      pass: { label: 'Pass', detail: 'Send the puck to your teammate.' },
      carry: { label: 'Carry', detail: 'Keep the puck and skate into space.' },
    }),
    firstReasonLabel: 'What did you see?',
    firstReasonPlaceholder: 'I saw…',
    firstDiscussion: 'Point to what you noticed. Tell a coach why you wanted to pass or carry. You can discuss either choice using the players and space you see.',
    thirdCue: 'Look at the puck, the defender and the space between players. Where could the player without the puck help?',
    thirdReasonPlaceholder: 'This helps because…',
  }),
  firstPrompt: 'You have the puck. What do you want to try?',
  firstRubric: Object.freeze({
    mode: 'open',
    mustNotice: Object.freeze([
      'The teammate is across the ice with a clear path from the puck.',
      'The defender is in the middle route toward the net.',
      'Outside space remains available beside the puck carrier.',
    ]),
    acceptableActions: Object.freeze(['pass', 'carry']),
    avoid: Object.freeze([
      'Choosing only because there are two attackers.',
      'Treating a successful authored pass as proof that every pass will arrive.',
      'Claiming that this screen measured a shoulder check.',
    ]),
    followUpCue: 'Look again after the puck or players move.',
  }),
  sourceRefs: Object.freeze([
    { note: 'docs/library/scanning.md', use: 'Look for a teammate, pressure and space before choosing; no head movement is measured.' },
    { note: 'docs/library/off-puck-support-offense.md', use: 'Discuss open space and a useful passing path for the player without the puck.' },
    { note: 'docs/library/two-on-one-pass-lane-removed.md', use: 'Look at the visible lane and available space rather than requiring a pass because two attackers are present.' },
    { note: 'docs/library/two-on-one-support-too-flat.md', use: 'A teammate being present does not decide the action; this U9 draft uses simple spacing instead of the older-age flat-support comparison.' },
  ]),
  evidenceBoundary: 'These positions and movements are authored illustrations for coach review. The chosen pass transfers the puck; the chosen carry keeps it. No head turn is measured, no outcome is guaranteed, and support placement or routes receive no automatic tactical or AI grade.',
  initialState: INITIAL_STATE,
  branches: BRANCHES,
});
