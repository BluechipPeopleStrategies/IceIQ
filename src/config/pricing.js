// IceIQ pricing tiers
// Single source of truth for what each tier includes.
// Prices in CAD.

export const FREE = {
  name: "Free",
  price: 0,
  profiles: 1,
  ageGroups: 1,
  sessionHistory: 5,
  questionFormats: ["multipleChoice"],
  positionFilter: false,
  adaptiveEngine: false,
  smartGoals: false,
  progressSnapshots: false,
  coachDashboard: false,
};

export const PRO = {
  name: "Pro",
  monthlyCAD: 12.99,
  annualCAD: 89.99,
  profiles: 1,
  ageGroups: "all",
  sessionHistory: "unlimited",
  questionFormats: "all",
  positionFilter: true,
  adaptiveEngine: true,
  smartGoals: true,
  progressSnapshots: true,
  coachDashboard: false,
};

export const FAMILY = {
  name: "Family",
  monthlyCAD: 19.99,
  annualCAD: 139.99,
  profiles: 3,
  ageGroups: "all",
  sessionHistory: "unlimited",
  questionFormats: "all",
  positionFilter: true,
  adaptiveEngine: true,
  smartGoals: true,
  progressSnapshots: true,
  coachDashboard: false,
};

export const TEAM = {
  name: "Team",
  monthlyCAD: 49.99,
  seasonPassCAD: 249.99,
  seasonStart: "September",
  seasonEnd: "March",
  seasonExpiryDate: "April 1",
  reenrollmentPromptDate: "August 15",
  maxPlayers: 20,
  ageGroups: "all",
  questionFormats: "all",
  positionFilter: true,
  adaptiveEngine: true,
  smartGoals: true,
  progressSnapshots: true,
  coachDashboard: true,
};

// Convenience exports
export const TIERS = { FREE, PRO, FAMILY, TEAM };
export const TIER_ORDER = ["FREE", "PRO", "FAMILY", "TEAM"];
