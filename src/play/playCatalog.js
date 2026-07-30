
import { TWO_ON_ONE_READ_PLAY } from "./plays/twoOnOneRead.js";
import { TWO_ON_ONE_DEFENDER_HOLDS_PLAY } from "./plays/defenderHoldsMiddle.js";
import { OFF_PUCK_SUPPORT_PLAY } from "./plays/offPuckSupport.js";
import { DEFENSIVE_ANGLING_PLAY } from "./plays/defensiveAngling.js";
import { TWO_ON_ONE_READ_VARIANTS } from "./plays/twoOnOneReadVariants.js";
import { GAP_CONTROL_HOLD_PLAY } from "./plays/gapControlHold.js";
import { GAP_CONTROL_PIVOT_MATCH_PLAY } from "./plays/gapControlPivotMatch.js";
import { FORECHECK_PRESSURE_PLAY } from "./plays/forecheckPressure.js";
import { FORECHECK_TAKE_AWAY_REVERSE_PLAY } from "./plays/forecheckTakeAwayReverse.js";
import { BACKCHECK_RECOVERY_PLAY } from "./plays/backcheckRecovery.js";
import { twoOnOnePassLaneRemoved } from "./plays/twoOnOnePassLaneRemoved.js";
import { twoOnOneSupportTooFlat } from "./plays/twoOnOneSupportTooFlat.js";
import { twoOnOneGoalieLateAfterPass } from "./plays/twoOnOneGoalieLateAfterPass.js";
import { backcheckRecoveryDefenderGetsBeat } from "./plays/backcheckRecoveryDefenderGetsBeat.js";
import { VERDICT_TWO_ON_ONE_FORCED_SHOT } from "./plays/verdictTwoOnOneForcedShot.js";
import { VERDICT_GAP_CONTROL_BACKING_IN } from "./plays/verdictGapControlBackingIn.js";
import { PREDICT_TWO_ON_ONE_DEFENDER_STEP } from "./plays/predictTwoOnOneDefenderStep.js";
import { SPOT_MISTAKE_FLAT_SUPPORT } from "./plays/spotMistakeFlatSupport.js";
import { SUPPORT_ANGLE_FLAT } from "./plays/supportAngleFlat.js";
import { DZ_BREAKOUT_ESCAPE_PRESSURE } from "./plays/dzBreakoutEscapePressure.js";
import { mirrorPlayY } from "./playVariants.js";

export const CORE_ANIMATED_PLAYS = [
        BACKCHECK_RECOVERY_PLAY,
FORECHECK_PRESSURE_PLAY,
  FORECHECK_TAKE_AWAY_REVERSE_PLAY,
GAP_CONTROL_HOLD_PLAY,
  GAP_CONTROL_PIVOT_MATCH_PLAY,
TWO_ON_ONE_READ_PLAY,
  TWO_ON_ONE_DEFENDER_HOLDS_PLAY,
  OFF_PUCK_SUPPORT_PLAY,
  DEFENSIVE_ANGLING_PLAY,
];

// Far-side mirrors (flip-Y, playVariants.mirrorPlayY): the same read from the
// other wing, so the correct answer moves sides and glove/blocker reads swap.
// Curated list, not a blanket doubling — add a play here once its base has
// been playtested.
export const MIRRORED_ANIMATED_PLAYS = [
  mirrorPlayY(TWO_ON_ONE_READ_PLAY, {
    id: "play_2v1_backdoor_read_u11_v1_mirror",
    title: "2-on-1: Defender steps up (far side)",
  }),
  mirrorPlayY(OFF_PUCK_SUPPORT_PLAY, {
    id: `${OFF_PUCK_SUPPORT_PLAY.id}_mirror`,
    title: `${OFF_PUCK_SUPPORT_PLAY.title} (far side)`,
  }),
  mirrorPlayY(DEFENSIVE_ANGLING_PLAY, {
    id: `${DEFENSIVE_ANGLING_PLAY.id}_mirror`,
    title: `${DEFENSIVE_ANGLING_PLAY.title} (far side)`,
  }),
];

export const VARIANT_ANIMATED_PLAYS = [
  ...TWO_ON_ONE_READ_VARIANTS,
  ...MIRRORED_ANIMATED_PLAYS,
];

export const ALL_ANIMATED_PLAYS = [
  ...CORE_ANIMATED_PLAYS,
  ...VARIANT_ANIMATED_PLAYS,

  twoOnOnePassLaneRemoved,

  twoOnOneSupportTooFlat,

  twoOnOneGoalieLateAfterPass,

  backcheckRecoveryDefenderGetsBeat,

  VERDICT_TWO_ON_ONE_FORCED_SHOT,

  VERDICT_GAP_CONTROL_BACKING_IN,

  PREDICT_TWO_ON_ONE_DEFENDER_STEP,

  SPOT_MISTAKE_FLAT_SUPPORT,

  SUPPORT_ANGLE_FLAT,

  DZ_BREAKOUT_ESCAPE_PRESSURE,
];

export function playById(id) {
  return ALL_ANIMATED_PLAYS.find((play) => play.id === id) || CORE_ANIMATED_PLAYS[0];
}

export function playsForAge(ageBand) {
  return ALL_ANIMATED_PLAYS.filter((play) => !play.ageBands || play.ageBands.includes(ageBand));
}

