// Verdict play for the gap-control family (fills the family's verdict-kind gap;
// see docs/factory/next-scenario-variants.md "Gap control: Too much backing in").
// The defender on screen backs straight in toward the goalie; the learner judges
// the read, then justifies the better play. Judge the read, never the player.
export const VERDICT_GAP_CONTROL_BACKING_IN = {
  id: "verdict_gap_control_backing_in_u11_v1",
  type: "animated-play",
  title: "Gap control: Judge the backing-in defender",
  concept: "gap-control",
  ageBands: ["U11", "U13"],
  view: "half-right",
  start: "watch",
  space: { units: "rink-200x85" },
  sourceRef: {
    note: "docs/library/gap-control.md",
    cite: "USA Hockey's Skill Progression Manual (2019) lists 'protect center of the ice' and gap control as 10U/12U defensive team-play concepts; Hockey Canada's U11/U13 Player Pathways independently place gap control in the same age band. Backing straight in surrenders the gap and the middle.",
    url: "https://cdn1.sportngin.com/attachments/document/0066/4690/Skill_Progression_Manual_19_FINAL.pdf",
  },
  actors: [
    { id: "A1", team: "away", role: "puckCarrier", label: "A1" },
    { id: "D1", team: "home", role: "defender", label: "YOU" },
    { id: "A2", team: "away", role: "support", label: "A2" },
    { id: "G", team: "home", role: "goalie", label: "G" },
  ],
  nodes: {
    watch: {
      id: "watch",
      q: "Watch the entry. The defender keeps backing straight in toward the goalie.",
      enter: { A1: [110, 50], D1: [150, 43], A2: [135, 24], G: [187, 42] },
      pos: { A1: [150, 48], D1: [176, 43], A2: [150, 25], G: [187, 42] },
      puck: [150, 48],
      motions: [
        { kind: "skate", from: [110, 50], to: [150, 48], actor: "A1" },
        { kind: "skate", from: [150, 43], to: [176, 43], actor: "D1", label: "backing in" },
      ],
      autoNext: { next: "judge", ms: 2600 },
    },
    judge: {
      id: "judge",
      q: "The defender backed all the way in. Was that the right read?",
      pos: { A1: [152, 48], D1: [176, 43], A2: [151, 25], G: [187, 42] },
      puck: [152, 48],
      ask: {
        kind: "verdict",
        q: "The defender backed all the way in. Was that the right read?",
        opts: [
          { id: "right_read", t: "Right read", no: "Backing straight in hands the attacker time and the whole middle.", next: "debrief" },
          { id: "too_much", t: "Too much space given up", ok: true, why: "Closing the gap earlier, while protecting the middle, keeps the attacker to the outside.", next: "debrief" },
          { id: "timing", t: "Right idea, wrong timing", u13Only: true, no: "It is not timing. Backing all the way in removes the gap entirely.", next: "debrief" },
        ],
        justify: {
          q: "What was the better play?",
          opts: [
            { id: "close_early", t: "Close the gap earlier while protecting the middle", evidence: "D1", ok: true },
            { id: "race_out", t: "Race to the blue line to challenge hard", evidence: "A1", no: "Overcommitting out high lets the attacker beat you wide or cut inside." },
          ],
        },
      },
    },
    debrief: {
      id: "debrief",
      terminal: true,
      q: "Good gap control closes space early and keeps the attacker outside. Backing into the goalie surrenders the middle.",
      pos: { A1: [176, 58], D1: [168, 50], A2: [160, 26], G: [187, 42] },
      puck: [176, 58],
      motions: [
        { kind: "blocked", from: [168, 50], to: [187, 42], label: "middle protected" },
      ],
    },
  },
};
