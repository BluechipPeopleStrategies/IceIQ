export const INTERACTION_PROFILES = {
  U7:  { label: "U7 - Playground", token: "figure", accent: "#2A6FDB", bg: "#EAF6FF", big: true, celebrate: true, timer: "none", kinds: ["read-mc", "lane-pick"] },
  U9:  { label: "U9 - Mini-games", token: "figure", accent: "#2A6FDB", bg: "#EEF7FF", big: true, celebrate: true, timer: "none", kinds: ["read-mc", "lane-pick"] },
  U11: { label: "U11 - The Trainer", token: "token", accent: "#C9A24B", bg: "#FBF8F0", big: false, celebrate: false, timer: "gentle", kinds: ["read-mc", "lane-pick", "verdict", "spot-mistake"] },
  U13: { label: "U13 - Read & React", token: "token", accent: "#C9A24B", bg: "#FBF8F0", big: false, celebrate: false, timer: "gentle", kinds: ["read-mc", "lane-pick", "verdict", "spot-mistake", "predict-next"] },
  U15: { label: "U15 - Pro Reps", token: "symbol", accent: "#0B1A33", bg: "#F3F5F8", big: false, celebrate: false, timer: "fast", kinds: ["read-mc", "lane-pick", "verdict", "spot-mistake", "predict-next"] },
  U18: { label: "U18 - Film Room", token: "symbol", accent: "#0B1A33", bg: "#EEF1F5", big: false, celebrate: false, timer: "fast", kinds: ["read-mc", "lane-pick", "verdict", "spot-mistake", "predict-next"] },
};

export const AGE_BANDS = Object.keys(INTERACTION_PROFILES);

export function profileForAge(ageBand = "U11") {
  return INTERACTION_PROFILES[ageBand] || INTERACTION_PROFILES.U11;
}

export function kindsForAge(ageBand = "U11") {
  return profileForAge(ageBand).kinds || ["read-mc", "lane-pick"];
}

