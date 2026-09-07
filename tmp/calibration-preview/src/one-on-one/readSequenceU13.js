import { createSequenceState } from './readSequenceGeometry.js';

function pose(x, y, facing = 0) {
  return { x, y, facing };
}

function state(F1, F2, D1, G, owner, looseAt = null) {
  const result = createSequenceState({ F1, F2, D1, G }, { owner, looseAt });
  const goalie = result.actors.find(actor => actor.id === 'G');
  // Point the direction marker at the actual puck, including its stick offset.
  // This authored orientation does not measure a goalie's stance or technique.
  goalie.facing = Math.atan2(result.puck.y - goalie.y, result.puck.x - goalie.x);
  return result;
}

const LOOSE_PUCK = { x: 23.2, y: 3.2 };

// D1 begins on the actual puck-to-F2 lane, away from the net-centre line.
// Only the Carry continuation illustrates the subsequent lane switch.
const INITIAL_STATE = state(
  pose(17, 5), pose(17, -5), pose(17.5, 0.35, Math.PI), pose(25, -1.2), 'F1',
);

const BRANCHES = {
  shoot: {
    actionLabel: 'Shoot',
    consequence: 'In this example, your shot sends the puck into the shown space short of the goalie. The puck remains loose while the players move.',
    state: state(
      pose(18.5, 5), pose(19, -4.5), pose(19, 0.5, Math.PI), pose(25, 1.5), null, LOOSE_PUCK,
    ),
    read2: {
      prompt: 'The puck is still loose. Which space should F2 support?',
      cue: 'Look at the loose puck, your position and D1 before choosing a space.',
      targets: [
        {
          id: 'inside-support', label: 'Inside support space', kind: 'space', x: 22, y: -1,
          summary: 'F2 moves toward the inside space you chose. The puck remains loose short of the goalie. Show where you could help without crowding F2.',
          moveActorId: 'F1',
          state: state(
            pose(19, 4.6), pose(22, -1), pose(20, 0.4, Math.PI), pose(25, 2), null, LOOSE_PUCK,
          ),
        },
        {
          id: 'wide-support', label: 'Wider support space', kind: 'space', x: 20, y: -5,
          summary: 'F2 moves into the wider space you chose. The puck remains loose short of the goalie. Show where you could help with F2 on that side.',
          moveActorId: 'F1',
          state: state(
            pose(19, 4.6), pose(20, -5), pose(20, 0.4, Math.PI), pose(25, 2), null, LOOSE_PUCK,
          ),
        },
      ],
    },
  },
  carry: {
    actionLabel: 'Carry',
    consequence: 'In this example, you carry outside and keep the puck. D1 moves nearer the shot line, F2 moves farther forward, and the goalie shifts across.',
    state: state(
      pose(20, 5), pose(22, -4.5), pose(23.8, 3.5, Math.PI), pose(25, 1.5), 'F1',
    ),
    read2: {
      prompt: 'The players have moved. Where should the puck go next?',
      cue: 'Look again at D1, the goalie and F2. What changed?',
      targets: [
        {
          id: 'pass-f2', label: 'F2', kind: 'receiver', x: 22, y: -4.5,
          summary: 'Your pass reaches F2 across the ice. You are now without the puck. Show where you could help F2.',
          moveActorId: 'F1',
          state: state(
            pose(21, 5), pose(22, -4.5), pose(24, 3, Math.PI), pose(25, -0.4), 'F2',
          ),
        },
        {
          id: 'outside-space', label: 'Outside space', kind: 'space', x: 22, y: 6.5,
          summary: 'You keep the puck and carry farther outside. F2 is without the puck. Show how F2 could help from here.',
          moveActorId: 'F2',
          state: state(
            pose(22, 6.5), pose(22, -4), pose(24, 3.5, Math.PI), pose(25, 2), 'F1',
          ),
        },
      ],
    },
  },
};

export const U13_READ_SEQUENCE = Object.freeze({
  id: 'u13-lane-switch-three-reads-v1',
  title: 'Read the lane switch.',
  ageBand: 'U13',
  status: 'draft-for-coach-review',
  actions: Object.freeze(['shoot', 'carry']),
  ui: Object.freeze({
    ageLabel: 'Read the lane switch',
    labelledActors: true,
    kicker: 'WORKED SHOOT / CARRY COMPARISON',
    heroAccent: 'Read the change.',
    intro: 'This worked example compares Shoot and Carry. Carry shows a lane change; Shoot leads to loose-puck support. Watch your chosen play, then explain how the other attacker could help.',
    note: 'Shoot and Carry show different continuations. Discuss what each one shows.',
    openingBoardCue: 'Find D1, F2, the goalie and the puck before you choose.',
    progressLabels: Object.freeze(['Look and choose', 'Read the change', 'Plan your support']),
    stageDescription: 'YOU and F2 attack the right net. D1 and the goalie defend. Navy circles are your team and gold shapes defend. The puck and players move after your choice.',
    firstCues: Object.freeze(['Where is D1 compared with the puck?', 'Where are F2 and the goalie?', 'What space can you see?']),
    actionCopy: Object.freeze({
      shoot: { label: 'Shoot', detail: 'Send the puck toward the net area.' },
      carry: { label: 'Carry', detail: 'Keep the puck and skate into outside space.' },
    }),
    firstReasonLabel: 'What did you notice?',
    firstReasonPlaceholder: 'I noticed…',
    firstDiscussion: 'Use D1, F2, the goalie and the space you saw to explain your choice. In this worked comparison, Carry shows a lane change and Shoot leads to loose-puck support. Either choice can start a discussion; completing the play does not prove you have mastered the lane switch.',
    thirdCue: 'Look at the puck, D1 and the space between players. Explain how your position fits this play.',
    thirdReasonPlaceholder: 'This position helps because…',
  }),
  firstPrompt: 'You have the puck. Would you shoot or carry here? What on the ice supports your choice?',
  firstRubric: Object.freeze({
    mode: 'open',
    mustNotice: Object.freeze([
      'D1 starts between the actual puck and F2, away from the line toward the net centre.',
      'F2 starts across the ice at a similar depth to the puck carrier.',
      'The goalie and outside space are visible cues to discuss alongside D1.',
    ]),
    acceptableActions: Object.freeze(['shoot', 'carry']),
    avoid: Object.freeze([
      'Choosing an action only because there are two attackers.',
      'Claiming the Carry movement forces every defender to leave the pass lane.',
      'Treating a completed authored play as proof of lane-switch mastery.',
      'Treating the illustrated shot as evidence of contact, a scoring result or a possession recovery by either team.',
    ]),
    followUpCue: 'Read the players and puck again after the movement.',
  }),
  sourceRefs: Object.freeze([
    { note: 'docs/library/odd-man-reads.md', use: 'Discuss the defender, goalie and available shot or pass lane, then read again as positions change.' },
    { note: 'docs/library/two-on-one-pass-lane-removed.md', use: 'The opening illustrates D1 in the pass lane. Shoot or Carry remain discussion choices; an extra attacker does not require a pass.' },
    { note: 'docs/library/two-on-one-support-too-flat.md', use: 'The opening teammate is at similar depth; Carry illustrates F2 changing depth alongside the defender movement.' },
    { note: 'docs/library/off-puck-support-offense.md', use: 'Discuss open ice and usable passing lines on the Carry possession branches. Shoot loose-puck positioning is an ungraded coach discussion.' },
    { note: 'src/data/curriculum-ledger.json', use: 'Age scope: U13 odd-man reads and decision-making have development emphasis; off-puck support on offense has mastery emphasis under semi-controlled conditions. These curriculum labels do not validate this authored example or prove learner mastery.' },
  ]),
  evidenceBoundary: 'This is a newly authored Shoot/Carry worked comparison for coach review. Only Carry illustrates the lane switch; Shoot illustrates a loose puck and support choices. The positions and movement are diagram examples, not measured reach thresholds or validated skating physics. The shot ends short of the goalie without an asserted contact or scoring result. Completion, support placement, route planning and recall receive no automatic tactical or AI grade and do not establish lane-switch mastery.',
  initialState: INITIAL_STATE,
  branches: BRANCHES,
});
