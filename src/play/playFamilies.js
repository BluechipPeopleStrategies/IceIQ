import { ALL_ANIMATED_PLAYS } from "./playCatalog.js";
import { resolveKind, isWatchNode } from "./questionKinds.js";

export const SCENARIO_FAMILIES = [
  {
    id: "two_on_one",
    title: "2-on-1 Reads",
    description: "Odd-man rush reads where the puck carrier or support player reacts to defender, goalie, and recovery pressure.",
    targetVariants: 6,
    matchTerms: ["2v1", "2-on-1", "backdoor", "defender holds middle", "goalie late", "support flat"],
    teachingArc: [
      "Defender steps up → pass to support",
      "Defender holds middle → attack open shot lane",
      "Backchecker closing → move puck before lane closes",
      "Goalie late → quick shot outcome",
      "Support too flat → avoid forcing a low-value pass",
      "Pass lane removed → puck carrier keeps attack"
    ]
  },
  {
    id: "backcheck_recovery",
    title: "Backcheck Recovery",
    description: "Recovery reads where the player decides whether to take puck, protect middle, or cover the next most dangerous threat.",
    targetVariants: 4,
    matchTerms: ["backcheck recovery", "backcheck_recovery", "pick up middle", "no one has puck"],
    teachingArc: [
      "Teammate takes puck → cover support lane",
      "No one has puck → stay with puck lane",
      "Defender gets beat → become next defender",
      "Late recovery → protect inside first"
    ]
  },
  {
    id: "forecheck_pressure",
    title: "Forecheck Pressure",
    description: "Pressure reads where the player angles the puck carrier toward a worse option.",
    targetVariants: 4,
    matchTerms: ["forecheck", "force wall", "pressure"],
    teachingArc: [
      "Approach inside-out",
      "Take away middle",
      "Force wall",
      "Recover if puck carrier escapes"
    ]
  },
  {
    id: "gap_control",
    title: "Gap Control",
    description: "Defensive spacing reads that teach when to hold middle, close space, or avoid backing in too far.",
    targetVariants: 4,
    matchTerms: ["gap control", "gap_control", "hold middle"],
    teachingArc: [
      "Hold middle",
      "Close space before blue line",
      "Do not overcommit",
      "Recover if attacker changes speed"
    ]
  },
  {
    id: "off_puck_support",
    title: "Off-Puck Support",
    description: "Support reads where the player finds useful space away from the puck.",
    targetVariants: 4,
    matchTerms: ["off-puck", "off_puck", "support window", "find the window"],
    teachingArc: [
      "Find open window",
      "Do not stand behind coverage",
      "Move as pressure changes",
      "Give puck carrier a safe option"
    ]
  },
  {
    id: "dz_breakout",
    title: "D-Zone Breakout",
    description: "Retrieval and breakout reads where the player escapes pressure and moves the puck out of the defensive zone on purpose.",
    targetVariants: 4,
    matchTerms: ["dz-breakout", "dz_breakout", "breakout", "retrieval"],
    teachingArc: [
      "Escape away from the forechecker's committed side",
      "Pressure-side outlet is a red herring → still escape first",
      "Escape lane taken away → reverse or rim",
      "Outlet covered → middle support or glass-and-out"
    ]
  },
  {
    id: "defensive_angling",
    title: "Defensive Angling",
    description: "Defensive route reads that teach players to steer attackers away from dangerous ice.",
    targetVariants: 4,
    matchTerms: ["angling", "steer wide", "steering"],
    teachingArc: [
      "Inside shoulder wins",
      "Steer wide",
      "Do not chase from behind",
      "Finish with good stick position"
    ]
  }
];

function haystackForPlay(play) {
  return [
    play?.id,
    play?.title,
    play?.concept,
    play?.sourceRef?.note,
    play?.sourceRef?.cite
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function classifyPlayFamily(play) {
  // Concept is the authored intent — match it first, so a play whose prose
  // happens to mention another family's terms (a breakout play describing the
  // "forechecker", say) still files where its author put it. The haystack scan
  // stays as the fallback for plays without a matching concept.
  const concept = String(play?.concept || "").toLowerCase();
  if (concept) {
    const byConcept = SCENARIO_FAMILIES.find((family) =>
      family.matchTerms.some((term) => concept.includes(term.toLowerCase()))
    );
    if (byConcept) return byConcept;
  }

  const haystack = haystackForPlay(play);

  return SCENARIO_FAMILIES.find((family) =>
    family.matchTerms.some((term) => haystack.includes(term.toLowerCase()))
  ) || null;
}

export function playKinds(play) {
  const kinds = new Set();
  for (const node of Object.values(play?.nodes || {})) {
    // Watch-chain nodes (autoNext, no ask) only display the setup; they are
    // not a question, so they must not inflate coverage as "read-mc".
    if (isWatchNode(node)) continue;
    const kind = resolveKind(node);
    if (kind) kinds.add(kind);
  }
  return [...kinds].sort();
}

export function buildScenarioFamilyReport(plays = ALL_ANIMATED_PLAYS) {
  const familyRows = SCENARIO_FAMILIES.map((family) => {
    const matchedPlays = plays.filter((play) => classifyPlayFamily(play)?.id === family.id);

    return {
      ...family,
      count: matchedPlays.length,
      progressRatio: family.targetVariants ? matchedPlays.length / family.targetVariants : 0,
      kindCounts: matchedPlays.reduce((acc, play) => {
        for (const kind of playKinds(play)) acc[kind] = (acc[kind] || 0) + 1;
        return acc;
      }, {}),
      plays: matchedPlays.map((play) => ({
        id: play.id,
        title: play.title,
        concept: play.concept || "",
        ageBands: play.ageBands || [],
      })),
    };
  });

  const unclassified = plays
    .filter((play) => !classifyPlayFamily(play))
    .map((play) => ({
      id: play.id,
      title: play.title,
      concept: play.concept || "",
    }));

  const warnings = [];

  for (const row of familyRows) {
    if (row.count === 0) {
      warnings.push({
        familyId: row.id,
        message: "family has no implemented plays",
      });
    }

    if (row.targetVariants && row.count < row.targetVariants) {
      warnings.push({
        familyId: row.id,
        message: `family has ${row.count}/${row.targetVariants} target variants`,
      });
    }

    const kindCount = Object.keys(row.kindCounts || {}).length;
    if (row.targetVariants && row.count >= row.targetVariants && kindCount < 2) {
      warnings.push({
        familyId: row.id,
        message: `family has ${row.count}/${row.targetVariants} target variants but only ${kindCount} question kind`,
      });
    }
  }

  for (const play of unclassified) {
    warnings.push({
      familyId: "unclassified",
      message: `${play.id} is not assigned to a scenario family`,
    });
  }

  return {
    ok: unclassified.length === 0,
    families: familyRows,
    unclassified,
    warnings,
  };
}

export function familyCompletionLabel(row) {
  if (!row.targetVariants) return "tracked";

  if (row.count >= row.targetVariants) return "complete";
  if (row.count >= Math.ceil(row.targetVariants / 2)) return "building";
  return "starter";
}
