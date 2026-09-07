// Presentation only. Canonical definitions, target IDs, saved reflections and
// AI payloads keep their existing wording/data. Never write these labels back
// into a session or use them as the recall-card storage basis.
export const U11_PLAYER_COPY = Object.freeze({
  firstPrompt: 'You have the puck. Look at D1, F2 and the goalie. Would you pass, shoot or carry? What helped you decide?',
  progressLabels: ['Look and choose', 'Look again', 'Help without the puck'],
  firstCues: [
    'D1 is between you and the net, near your shooting line.',
    'F2 is across the ice and a little closer to the net than you.',
    'The puck is to one side. The goalie is nearer the middle.',
  ],
  actionCopy: {
    pass: { label: 'Pass', detail: 'Send the puck to F2.' },
    shoot: { label: 'Shoot', detail: 'Shoot toward the net.' },
    carry: { label: 'Carry', detail: 'Keep the puck and skate toward the boards.' },
  },
  firstReasonPlaceholder: 'I would… because I noticed…',
  firstDiscussion: 'This opening allows discussion of pass, shoot or carry. Ask the player to explain the defender, teammate or goalie cue behind the choice. The shown outcomes are examples; they do not certify an action or predict a goal.',
  thirdReasonPlaceholder: 'I chose this space because…',
  branches: {
    pass: {
      consequence: 'F2 receives your pass. D1 and the goalie move toward F2’s side.',
      prompt: 'F2 has the puck. What should F2 do next?',
      cue: 'Look at D1, the goalie and the space between F2 and YOU.',
      targets: {
        'return-lane': { label: 'Pass back to YOU', summary: 'F2 passes back to YOU. F2 no longer has the puck.' },
        'hold-wide': { label: 'Carry into the wide space', summary: 'F2 carries toward the boards. YOU stay closer to the middle.' },
        'shoot-open': { label: 'Shoot toward the net', summary: 'F2 shoots toward the net. The puck is loose in front of the goal.' },
      },
    },
    shoot: {
      consequence: 'You shoot toward the net. The puck is loose ahead of F2.',
      prompt: 'The puck is loose. Where should F2 go?',
      cue: 'Look at the puck, D1 and the space around F2.',
      targets: {
        'rebound-space': { label: 'Move toward the loose puck', summary: 'F2 moves closer to the loose puck. No one has it yet.' },
        'high-support': { label: 'Space behind the puck', summary: 'F2 moves into space farther from the net than the loose puck. No one has it yet.' },
      },
    },
    carry: {
      consequence: 'You carry toward the boards. D1 moves toward your side. F2 stays across the ice.',
      prompt: 'You still have the puck. Would you pass to F2 or keep carrying?',
      cue: 'Look at the passing line to F2 and the space beside D1.',
      targets: {
        'support-middle': { label: 'Pass to F2 in the middle', summary: 'F2 moves toward the middle and receives your pass. YOU no longer have the puck.' },
        'attack-outside': { label: 'Keep carrying outside', summary: 'You carry farther along the side of the rink and keep the puck. F2 remains without the puck.' },
      },
    },
  },
});
