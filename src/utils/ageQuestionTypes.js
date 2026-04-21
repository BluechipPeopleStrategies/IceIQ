// Drives the review tool's age-appropriate type hints and "+ Add Question" dialog.

export const AGES = ["u7", "u9", "u11", "u13", "u15", "u18"];

export const LEVEL_FOR_AGE = {
  u7:  "U7 / Initiation",
  u9:  "U9 / Novice",
  u11: "U11 / Atom",
  u13: "U13 / Peewee",
  u15: "U15 / Bantam",
  u18: "U18 / Midget",
};

export const ALL_TYPES = ["mc", "tf", "seq", "mistake", "next", "rink"];

export const RECOMMENDED_TYPES_BY_AGE = {
  u7:  ["mc", "tf", "rink"],
  u9:  ["mc", "tf", "seq", "rink"],
  u11: ["mc", "tf", "seq", "mistake", "rink"],
  u13: ["mc", "tf", "seq", "mistake", "next", "rink"],
  u15: ["mc", "tf", "seq", "mistake", "next", "rink"],
  u18: ["mc", "tf", "seq", "mistake", "next", "rink"],
};

export const TYPE_LABELS = {
  mc: "Multiple choice",
  tf: "True / False",
  seq: "Sequence",
  mistake: "What's the mistake?",
  next: "What's next?",
};

export function isOffAgeType(age, type) {
  const rec = RECOMMENDED_TYPES_BY_AGE[age];
  if (!rec) return false;
  return !rec.includes(type);
}

// Blank template for a new question of the given type. Used by the Add dialog
// and by Reset for tool-created rows with no `original`.
export function blankQuestion(type, age) {
  const base = { cat: "", d: 1, pos: ["F", "D"], sit: "", why: "", tip: "" };
  if (type === "mc") {
    return { ...base, type: "mc", opts: Array(4).fill(""), ok: 0 };
  }
  if (type === "tf") {
    return { ...base, type: "tf", opts: ["True", "False"], ok: 0 };
  }
  if (type === "seq") {
    return { ...base, type: "seq", items: ["", "", "", ""], correct_order: [0, 1, 2, 3] };
  }
  if (type === "mistake") {
    return { ...base, type: "mistake", opts: ["", "", "", ""], ok: 0 };
  }
  if (type === "next") {
    return { ...base, type: "next", opts: ["", "", "", ""], ok: 0 };
  }
  return { ...base, type: "mc", opts: ["", ""], ok: 0 };
}
