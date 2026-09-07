// Pure scoring for the Baylor's Pick tracking drill on the shared 0-1000
// per-shift scale: 200 per tracked teammate, +150 for a perfect shift,
// +250 for calling the ball carrier. Perfect shift with the ball = 1000.

export const POINTS_PER_TARGET = 200;
export const PERFECT_BONUS = 150;
export const BALL_BONUS = 250;

export function shiftPoints(correctCount, targets, gotBall) {
  const base = Math.max(0, correctCount) * POINTS_PER_TARGET;
  const perfect = correctCount >= targets ? PERFECT_BONUS : 0;
  const ball = gotBall ? BALL_BONUS : 0;
  return base + perfect + ball;
}
