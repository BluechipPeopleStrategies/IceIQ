// Ephemeral "U11 Forward Sample" preview seed.
// Populates the app with enough data that every screen shows meaningfully —
// quiz history, self-ratings, goals, parent assessment, coach feedback,
// training log, insights read. No Supabase writes; the caller wires this
// into demo-mode state.

export const PREVIEW_PLAYER_ID = "__preview__";
export const PREVIEW_INSIGHTS_KEYS = [
  "90% of NHL goals come within 10 feet",
  "Average NHL shift: 45 seconds",
  "3-2-1 rule for defensive zone coverage",
  "Forecheck pressure creates 40% of turnovers",
];

function daysAgoISO(n) {
  return new Date(Date.now() - n * 86400000).toISOString();
}
function daysAgoDate(n) {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}

// 8 sessions trending 56 → 72. Each has enough per-question detail that
// calcCompetencyScores lights up positioning / decision_making / awareness.
function buildQuizHistory() {
  const sessions = [
    { day: 32, ok: [1,1,0,0,1,0,1,0,0,1] },  // 50
    { day: 28, ok: [1,1,0,1,0,1,0,1,0,1] },  // 56
    { day: 23, ok: [1,1,0,1,1,0,1,1,0,1] },  // 60
    { day: 18, ok: [1,1,1,0,1,1,1,0,1,1] },  // 65
    { day: 13, ok: [1,1,1,1,0,1,1,1,0,1] },  // 68
    { day: 9,  ok: [1,1,1,0,1,1,1,1,1,0] },  // 70
    { day: 5,  ok: [1,1,1,1,1,1,0,1,1,0] },  // 70
    { day: 2,  ok: [1,1,1,1,1,0,1,1,1,1] },  // 72
  ];
  // Pool of U11 question IDs aligned with COMPETENCY_MAPPINGS regex.
  // Each result needs {id, ok, d, cat}. We spread positioning (q1-7),
  // decision_making (q8-15), awareness (q16) across each 10-question session.
  const idBank = ["u11q1","u11q2","u11q3","u11q5","u11q8","u11q10","u11q12","u11q14","u11q16","u11q4"];
  const catBank  = ["Hockey Sense","Hockey Sense","Skating","Hockey Sense","Game Decision-Making","Game Decision-Making","Game Decision-Making","Game Decision-Making","Hockey Sense","Hockey Sense"];
  const dBank    = [1,2,1,2,2,3,2,2,3,2];
  return sessions.map(s => {
    const results = s.ok.map((ok, i) => ({
      id: idBank[i], ok: !!ok, d: dBank[i], cat: catBank[i],
    }));
    const score = Math.round(
      results.reduce((a,r) => a + (r.ok ? ({1:1,2:1.5,3:2.2}[r.d]) : 0), 0) /
      results.reduce((a,r) => a + ({1:1,2:1.5,3:2.2}[r.d]), 0) * 100
    );
    return { results, score, date: daysAgoISO(s.day) };
  });
}

// U11 / Atom skill ids from data/constants.js. Seed 17 of 21 (≥15) with a
// realistic spread; leave a few null so the "Rate yourself" nudge still has
// something to do.
function buildSelfRatings() {
  return {
    u11s1: "consistent",   u11s2: "developing",  u11s3: "proficient", u11s4: "consistent",
    u11p1: "consistent",   u11p2: "developing",  u11p3: "proficient", u11p4: "consistent",
    u11h1: "consistent",   u11h2: "proficient",  u11h3: "developing",
    u11d1: "consistent",   u11d2: "developing",
    u11c1: "proficient",   u11c2: "consistent",  u11c3: "consistent",
    u11dm1: "developing",
    // u11dm2..dm5 left null intentionally
  };
}

function buildGoals() {
  return {
    "Skating": {
      goal: "Clean backward crossovers both ways by end of March",
      S: "Work on backward crossovers in both directions during every practice warm-up",
      M: "Video myself once a week and track clean reps out of 10",
      A: "Yes — my forward crossovers are solid, this is the next step",
      R: "Better mobility helps me defend the rush and transition faster",
      T: "End of March — 12 weeks from now",
      completed: false,
    },
    "Rush Reads": {
      goal: "Make the right call on 2-on-1s 8 out of 10 tries",
      S: "Practice 2-on-1 reads in small-area games — when to shoot vs pass",
      M: "Coach tracks my 2-on-1 decisions for 4 weeks",
      A: "Yes — we do this drill every Thursday",
      R: "Rush reads are where most even-strength goals come from at my level",
      T: "By the end of February",
      completed: false,
    },
    "Game IQ": {
      goal: "Read forecheck pressure before turning on the puck",
      S: "Scan the ice before receiving a breakout pass and read forecheck angle",
      M: "Goal: fewer than 2 forced turnovers per game, tracked by coach",
      A: "Yes — this is what my coach keeps telling me to work on",
      R: "Clean breakouts are the starting point for everything in the O-zone",
      T: "Next 8 games",
      completed: false,
    },
  };
}

function buildParentRatings() {
  return {
    passion:       "often",
    readiness:     "sometimes",
    effort:        "often",
    adversity:     "sometimes",
    sportsmanship: "often",
    confidence:    "sometimes",
    coachability:  "often",
    balance:       "sometimes",
    updated_at:    daysAgoDate(4),
  };
}

// demoCoachData shape: { ratings, notes, coaches }.
// Ratings/notes keyed by skill id. Coaches array is optional (tabs UI).
function buildCoachRatings() {
  return {
    ratings: {
      u11s1:  "consistent",
      u11s3:  "proficient",
      u11p1:  "consistent",
      u11p4:  "developing",
      u11h1:  "consistent",
      u11h3:  "developing",
      u11d1:  "consistent",
      u11c1:  "proficient",
      u11dm1: "developing",
    },
    notes: {
      u11s3:  "Explosive first three strides — keep loading the outside edge on the first push.",
      u11p4:  "Gets shoved off pucks too easily along the wall. Work on wider base + stick under.",
      u11dm1: "Tends to pass every 2-on-1. Sometimes the shot is the right play — read the goalie.",
    },
    coaches: [
      { name: "Coach Reynolds", role: "Head Coach", ratings: null, notes: null },
    ],
  };
}

function buildTrainingSessions() {
  return [
    { date: daysAgoDate(2),  type: "power_skating", value: 60, unit: "min", coach: "Kim Ellis",     price: 55, notes: "Tight-turn ladders — felt great on the off side by the end" },
    { date: daysAgoDate(5),  type: "skills",        value: 45, unit: "min", coach: "Marcus Tran",   price: 40, notes: "Deking under pressure; 3v3 small-area" },
    { date: daysAgoDate(7),  type: "pucks_shot",    value: 150, unit: "pucks", coach: "",           price: 0,  notes: "Backyard net, mixed wrist + snap" },
    { date: daysAgoDate(11), type: "power_skating", value: 60, unit: "min", coach: "Kim Ellis",     price: 55, notes: "Edge work + inside/outside transitions" },
    { date: daysAgoDate(16), type: "skills",        value: 60, unit: "min", coach: "Marcus Tran",   price: 40, notes: "Saucer passes through sticks" },
    { date: daysAgoDate(22), type: "other",         value: 30, unit: "min", coach: "Self",          price: 0,  notes: "Stickhandling + balance board at home" },
  ];
}

export function buildU11ForwardPreview() {
  const quizHistory = buildQuizHistory();
  return {
    player: {
      id: PREVIEW_PLAYER_ID,
      name: "Alex (Sample)",
      level: "U11 / Atom",
      position: "Forward",
      season: "2025-26",
      sessionLength: 7,
      colorblind: false,
      coachCode: "",
      __preview: true,
      selfRatings: buildSelfRatings(),
      parentRatings: buildParentRatings(),
      goals: buildGoals(),
      quizHistory,
    },
    coachRatings: buildCoachRatings(),
    trainingSessions: buildTrainingSessions(),
    insightsReadKeys: PREVIEW_INSIGHTS_KEYS,
  };
}
