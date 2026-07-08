
import { TWO_ON_ONE_READ_PLAY } from "./plays/twoOnOneRead.js";
import { TWO_ON_ONE_DEFENDER_HOLDS_PLAY } from "./plays/defenderHoldsMiddle.js";
import { OFF_PUCK_SUPPORT_PLAY } from "./plays/offPuckSupport.js";
import { DEFENSIVE_ANGLING_PLAY } from "./plays/defensiveAngling.js";
import { TWO_ON_ONE_READ_VARIANTS } from "./plays/twoOnOneReadVariants.js";

export const CORE_ANIMATED_PLAYS = [
  TWO_ON_ONE_READ_PLAY,
  TWO_ON_ONE_DEFENDER_HOLDS_PLAY,
  OFF_PUCK_SUPPORT_PLAY,
  DEFENSIVE_ANGLING_PLAY,
];

export const VARIANT_ANIMATED_PLAYS = [
  ...TWO_ON_ONE_READ_VARIANTS,
];

export const ALL_ANIMATED_PLAYS = [
  ...CORE_ANIMATED_PLAYS,
  ...VARIANT_ANIMATED_PLAYS,
];

export function playById(id) {
  return ALL_ANIMATED_PLAYS.find((play) => play.id === id) || CORE_ANIMATED_PLAYS[0];
}

export function playsForAge(ageBand) {
  return ALL_ANIMATED_PLAYS.filter((play) => !play.ageBands || play.ageBands.includes(ageBand));
}
