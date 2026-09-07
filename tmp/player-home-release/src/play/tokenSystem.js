import { profileForAge } from "./interactionProfiles.js";

const ROLE_SHAPES = {
  puckCarrier: "circle-double",
  support: "circle",
  defender: "x-circle",
  goalie: "rounded-square",
  puck: "disc",
};

const ROLE_LABELS = {
  puckCarrier: "YOU",
  support: "F2",
  defender: "D1",
  goalie: "G",
  puck: "PUCK",
};

export function tokenSpec({ actor, ageBand = "U11", isDecisionActor = false }) {
  const profile = profileForAge(ageBand);
  const role = actor?.role || "support";
  const shape = ROLE_SHAPES[role] || "circle";
  const fallbackLabel = ROLE_LABELS[role] || actor?.id || "";
  const caption = isDecisionActor ? "YOU" : (actor?.label || fallbackLabel);
  return {
    id: actor?.id || "",
    role,
    team: actor?.team || "home",
    representation: profile.token,
    shape,
    caption,
    interiorLabel: actor?.label || fallbackLabel,
    colorOnly: false,
  };
}

export function validateTokenSystem() {
  const errs = [];
  for (const role of ["puckCarrier", "support", "defender", "goalie", "puck"]) {
    if (!ROLE_SHAPES[role]) errs.push(`missing shape for ${role}`);
    if (!ROLE_LABELS[role]) errs.push(`missing label for ${role}`);
  }
  const specs = [
    tokenSpec({ actor: { id: "F1", role: "puckCarrier" }, ageBand: "U7", isDecisionActor: true }),
    tokenSpec({ actor: { id: "F2", role: "support" }, ageBand: "U11" }),
    tokenSpec({ actor: { id: "D1", role: "defender" }, ageBand: "U18" }),
    tokenSpec({ actor: { id: "G", role: "goalie" }, ageBand: "U18" }),
  ];
  for (const spec of specs) {
    if (!spec.shape) errs.push(`missing shape for ${spec.id}`);
    if (!spec.caption) errs.push(`missing caption for ${spec.id}`);
    if (spec.colorOnly) errs.push(`color-only token for ${spec.id}`);
  }
  return errs;
}

