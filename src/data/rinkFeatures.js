// Vocabulary for "Label the Rink" (rink-label) questions. The id is the
// stable reference used in question.correctId; name is what the player sees
// in the dropdown; aliases are accepted alternate spellings (reserved for
// future free-text input — currently unused).

export const RINK_FEATURES = [
  // Rink anatomy
  { id: "blue_line",            name: "Blue Line" },
  { id: "red_line",             name: "Center Red Line" },
  { id: "goal_line",            name: "Goal Line" },
  { id: "center_ice_dot",       name: "Center Ice Dot" },
  { id: "faceoff_circle",       name: "Face-off Circle" },
  { id: "neutral_faceoff_dot",  name: "Neutral Zone Face-off Dot" },
  { id: "endzone_faceoff_dot",  name: "End Zone Face-off Dot" },
  { id: "goal_crease",          name: "Goal Crease" },
  { id: "goalie_trapezoid",     name: "Goalie Trapezoid" },
  { id: "referee_crease",       name: "Referee Crease" },
  { id: "players_bench",        name: "Players' Bench" },
  { id: "penalty_box",          name: "Penalty Box" },
  { id: "scorekeepers_box",     name: "Scorekeepers' Box" },
  { id: "goal_net",             name: "Goal / Net" },
  { id: "boards",               name: "Boards" },
  { id: "glass",                name: "Glass" },
  { id: "neutral_zone",         name: "Neutral Zone" },
  { id: "offensive_zone",       name: "Offensive Zone" },
  { id: "defensive_zone",       name: "Defensive Zone" },
  // Player positions & on-ice officials (abbr is the standard hockey stat code)
  { id: "goalie",               name: "Goalie",            abbr: "G" },
  { id: "defenseman",           name: "Defenseman",        abbr: "D" },
  { id: "left_defenseman",      name: "Left Defenseman",   abbr: "LD" },
  { id: "right_defenseman",     name: "Right Defenseman",  abbr: "RD" },
  { id: "center",               name: "Center",            abbr: "C" },
  { id: "left_wing",            name: "Left Wing",         abbr: "LW" },
  { id: "right_wing",           name: "Right Wing",        abbr: "RW" },
  { id: "forward",              name: "Forward",           abbr: "F" },
  { id: "referee",              name: "Referee",           abbr: "REF" },
  { id: "linesman",             name: "Linesman",          abbr: "LM" },
];

export const RINK_FEATURES_BY_ID = Object.fromEntries(
  RINK_FEATURES.map(f => [f.id, f])
);

export function getRinkFeatureName(id) {
  return RINK_FEATURES_BY_ID[id]?.name || id;
}

export function getRinkFeatureAbbr(id) {
  return RINK_FEATURES_BY_ID[id]?.abbr || RINK_FEATURES_BY_ID[id]?.name || id;
}
