import { createSequenceState as stateFromLayout } from './readSequenceGeometry.js';

function pose(x, y, facing) {
  return { x, y, facing };
}

function layout(F1, F2, D1, G) {
  return { F1, F2, D1, G };
}

const INITIAL_STATE = stateFromLayout(layout(
  pose(10, 4, 0),
  pose(13.1, -4.5, 0),
  pose(16.1, 1.5, Math.PI),
  pose(25.1, 0.4, Math.atan2(4 - 0.4, 10 - 25.1)),
), { owner: 'F1' });

const CHANGED_CUE_ID = 'd1-pass-lane-v1';
// A separate opening freeze, not the next state of any chosen branch.
// Only D1's position changes: the midpoint of the visible puck-to-F2 line.
const CHANGED_CUE_STATE = stateFromLayout(Object.fromEntries(INITIAL_STATE.actors.map(actor => [
  actor.id,
  actor.id === 'D1' ? pose(12.05, 0.1, actor.facing) : pose(actor.x, actor.y, actor.facing),
])), { owner: 'F1' });

const FIRST_BRANCHES = {
  pass: {
    actionLabel: 'Pass',
    consequence: 'Your pass reaches F2 before D1 can turn into the lane. D1 and the goalie shift toward the new puck side.',
    state: stateFromLayout(layout(
      pose(12.2, 3.2, 0), pose(16.8, -4.1, 0.15), pose(15.4, 0.7, -2.7), pose(24.8, -1.3, Math.PI),
    ), { owner: 'F2' }),
    read2: {
      prompt: 'F2 has the puck and D1 and the goalie have shifted. Tap the next receiver or space you want to use before the window changes.',
      cue: 'Read the new puck side, D1’s stick line, and whether F1 is still available inside.',
      targets: [
        {
          id: 'return-lane', label: 'F1 return lane', kind: 'receiver', x: 17.3, y: 1.2,
          summary: 'You use F1 as a return option while D1 is still turning. The pass is authored to arrive; it is not a universal promise that this lane stays open.',
          moveActorId: 'F2',
          state: stateFromLayout(layout(
            pose(17.3, 1.2, 0), pose(17.1, -3.5, 0.3), pose(17.2, -0.8, -2.7), pose(24.3, -1.1, Math.PI),
          ), { owner: 'F1' }),
        },
        {
          id: 'hold-wide', label: 'Hold the wide space', kind: 'space', x: 19, y: -5.5,
          summary: 'F2 carries into the wide lane while F1 stays inside as support.',
          moveActorId: 'F1',
          state: stateFromLayout(layout(
            pose(15.4, 2.3, 0), pose(18.9, -5.4, 0.1), pose(17.2, -1, -2.8), pose(24.4, -1.7, Math.PI),
          ), { owner: 'F2' }),
        },
        {
          id: 'shoot-open', label: 'Shoot through the open lane', kind: 'space', x: 23.2, y: -1.3,
          summary: 'F2 shoots through the lane that opened after D1 shifted. The puck finishes loose, so the next support read still matters.',
          moveActorId: 'F1',
          state: stateFromLayout(layout(
            pose(14.8, 2.5, 0), pose(18.1, -3.5, 0.2), pose(16.4, 0.2, -2.8), pose(25.3, -1.4, 2.95),
          ), { owner: null, looseAt: { x: 23.2, y: -0.9 } }),
        },
      ],
    },
  },
  shoot: {
    actionLabel: 'Shoot',
    consequence: 'Your low shot reaches the net area through partial coverage and leaves a loose puck in visible space. No goal is assumed.',
    state: stateFromLayout(layout(
      pose(13, 3.4, 0), pose(15.2, -4.1, 0), pose(17, 1, Math.PI), pose(24.6, -0.2, Math.PI),
    ), { owner: null, looseAt: { x: 21.2, y: -2.1 } }),
    read2: {
      prompt: 'The puck is loose after the authored shot. Tap the space you want your group to support next.',
      cue: 'Notice the loose puck, F2’s route, and which side of D1 remains reachable.',
      targets: [
        {
          id: 'rebound-space', label: 'Loose-puck side', kind: 'space', x: 20.4, y: -2.2,
          summary: 'F2 closes toward the loose-puck side while the puck remains unclaimed.',
          moveActorId: 'F1',
          state: stateFromLayout(layout(
            pose(14.6, 2.4, 0), pose(19.7, -2.3, 0.2), pose(18.1, 0.3, -2.8), pose(24.4, -0.8, Math.PI),
          ), { owner: null, looseAt: { x: 21.2, y: -2.1 } }),
        },
        {
          id: 'high-support', label: 'High support lane', kind: 'space', x: 16.1, y: -5,
          summary: 'F2 stays above the loose puck as a safety and passing option if possession is recovered.',
          moveActorId: 'F1',
          state: stateFromLayout(layout(
            pose(14.6, 2.5, 0), pose(16.1, -5, 0), pose(18, 0.5, -2.8), pose(24.4, -0.7, Math.PI),
          ), { owner: null, looseAt: { x: 21.2, y: -2.1 } }),
        },
      ],
    },
  },
  carry: {
    actionLabel: 'Carry',
    consequence: 'You carry outside D1’s shoulder. D1 turns with you and F2 stays available away from the puck.',
    state: stateFromLayout(layout(
      pose(16.1, 5.8, 0.1), pose(14.5, -3.8, 0), pose(17.1, 2.2, -2.9), pose(24.8, 0.7, Math.PI),
    ), { owner: 'F1' }),
    read2: {
      prompt: 'You carried outside and D1 turned. Tap the teammate or open lane you want to use next.',
      cue: 'Read whether F2 has become available inside and how much outside ice remains.',
      targets: [
        {
          id: 'support-middle', label: 'F2 in the middle seam', kind: 'receiver', x: 17.2, y: -1.5,
          summary: 'You connect with F2 in the middle seam as D1 continues outside. F1 becomes the off-puck support for the final read.',
          moveActorId: 'F1',
          state: stateFromLayout(layout(
            pose(18, 5.4, 0.1), pose(17.2, -1.5, 0.1), pose(18, 2.8, -2.9), pose(24.6, 0.2, Math.PI),
          ), { owner: 'F2' }),
        },
        {
          id: 'attack-outside', label: 'Keep the outside lane', kind: 'space', x: 18.7, y: 6,
          summary: 'F1 keeps possession in the outside lane. The next read is how F2 can stay useful as pressure closes.',
          moveActorId: 'F2',
          state: stateFromLayout(layout(
            pose(18.7, 6, 0.1), pose(15.4, -3.1, 0), pose(18, 3, -2.9), pose(24.6, 0.7, Math.PI),
          ), { owner: 'F1' }),
        },
      ],
    },
  },
};

export const U11_READ_SEQUENCE = Object.freeze({
  id: 'u11-connected-2v1-three-reads-v1',
  title: 'Three reads. One shifting 2-on-1.',
  ageBand: 'U11',
  status: 'draft-for-coach-review',
  sourceRefs: Object.freeze([
    { note: 'docs/library/odd-man-reads.md', use: 'Read visible defender commitment before choosing an action.' },
    { note: 'docs/library/two-on-one-pass-lane-removed.md', use: 'A 2-on-1 does not automatically require a pass.' },
    { note: 'docs/library/two-on-one-support-too-flat.md', use: 'Support alignment affects whether the pass is useful.' },
    { note: 'docs/library/off-puck-support-offense.md', use: 'Off-puck support needs both space and a usable lane.' },
  ]),
  evidenceBoundary: 'Positions, transitions, puck outcomes and timing are newly authored illustrative states for coach review. They do not promise a goal, certify a choice, or add movement that the selected branch did not make.',
  firstPrompt: 'D1 partly shades your shot lane and F2 is slightly flat. What do you do, and what visible cue matters most?',
  firstRubric: Object.freeze({
    mode: 'open',
    mustNotice: Object.freeze(['D1 partly covers the shot route rather than removing every option.', 'F2 is available but slightly flat, so pass timing and support alignment matter.', 'The goalie starts nearer the middle while the puck begins off-centre.']),
    acceptableActions: Object.freeze(['pass', 'shoot', 'carry']),
    avoid: Object.freeze(['Pass only because the rush is a 2-on-1.', 'Treat a shot as a guaranteed goal.', 'Match a fixed coordinate instead of explaining the visible lane.']),
    followUpCue: 'After the play changes, re-scan the puck side, defender and usable support.',
  }),
  initialState: INITIAL_STATE,
  branches: FIRST_BRANCHES,
});


export { CHANGED_CUE_ID, CHANGED_CUE_STATE };
