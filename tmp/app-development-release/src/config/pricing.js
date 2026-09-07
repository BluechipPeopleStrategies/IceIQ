// RinkReads pricing tiers
// Single source of truth for what each tier includes.
// Prices in CAD.

export const FREE = {
  name: "Free",
  price: 0,
  profiles: 1,
  ageGroups: 1,
  sessionHistory: 5,
  questionFormats: ["multipleChoice"],
  positionFilter: true,
  adaptiveEngine: false,
  smartGoals: false,
  progressSnapshots: false,
  coachDashboard: false,
  weeklyChallenge: false,
};

export const PRO = {
  name: "RinkReads Pro",
  // Hockey season (Sept–Mar): 7 months
  hockeySeasonCAD: 89.99,
  hockeySeasonMonths: "Sept–Mar",
  profiles: 1,
  ageGroups: "all",
  sessionHistory: "unlimited",
  questionFormats: "all",
  positionFilter: true,
  adaptiveEngine: true,
  smartGoals: true,
  progressSnapshots: true,
  coachDashboard: false,
  weeklyChallenge: true,
};

export const FAMILY = {
  name: "RinkReads Family",
  // Hockey season (Sept–Mar): 7 months
  hockeySeasonCAD: 139.99,
  hockeySeasonMonths: "Sept–Mar",
  profiles: 3,
  ageGroups: "all",
  sessionHistory: "unlimited",
  questionFormats: "all",
  positionFilter: true,
  adaptiveEngine: true,
  smartGoals: true,
  progressSnapshots: true,
  coachDashboard: false,
  weeklyChallenge: true,
};

export const TEAM = {
  name: "RinkReads Team",
  // Hockey season only (Sept–Mar): 7 months
  hockeySeasonCAD: 249.99,
  hockeySeasonMonths: "Sept–Mar",
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
  weeklyChallenge: true,
};

// Convenience exports
export const TIERS = { FREE, PRO, FAMILY, TEAM };
export const TIER_ORDER = ["FREE", "PRO", "FAMILY", "TEAM"];
