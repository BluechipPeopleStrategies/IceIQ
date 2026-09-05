// Presentation only. Every figure fits the caller's existing circular footprint;
// no actor, hit radius, facing, timer or task state is created or changed here.
const NAVY = '#0B1A33';
const GOLD = '#C9A24B';
const BONE = '#F5EFE6';
const SLATE = '#5B6675';

function ellipse(ctx, x, y, rx, ry, fill) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

/** Neutral icon; authored facing, when supplied, is zero-right and clockwise. */
export function drawHockeyPlayer(ctx, { x, y, r, team = 'home', goalie = false, jersey = null, facing = null }) {
  if (![x, y, r].every(Number.isFinite) || r <= 0) return;
  const colour = jersey || (team === 'away' ? GOLD : NAVY);
  const trim = colour === NAVY ? GOLD : NAVY;
  ctx.save();
  ctx.translate(x, y);
  if (Number.isFinite(facing)) ctx.rotate((facing + 90) * Math.PI / 180);
  ctx.scale(r, r);
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.clip();

  ellipse(ctx, 0, .72, .78, .15, 'rgba(11,26,51,.20)');
  // Skates, shin protection and shorts are separate from the jersey silhouette.
  for (const side of [-1, 1]) {
    ctx.fillStyle = NAVY;
    ctx.fillRect(side * .23 - .15, .63, .3, .13);
    ctx.fillStyle = BONE;
    ctx.fillRect(side * .23 - (goalie ? .14 : .09), .34, goalie ? .28 : .18, .31);
    ctx.fillStyle = SLATE;
    ctx.fillRect(side * .23 - .15, .77, .32, .035);
  }
  ctx.fillStyle = NAVY;
  ctx.fillRect(-.36, .23, .72, .2);
  ctx.beginPath();
  ctx.moveTo(-.25, -.35);
  ctx.lineTo(-.62, -.19);
  ctx.lineTo(-.68, .19);
  ctx.lineTo(-.47, .29);
  ctx.lineTo(-.35, .02);
  ctx.lineTo(-.36, .31);
  ctx.lineTo(.36, .31);
  ctx.lineTo(.35, .02);
  ctx.lineTo(.47, .29);
  ctx.lineTo(.68, .19);
  ctx.lineTo(.62, -.19);
  ctx.lineTo(.25, -.35);
  ctx.closePath();
  ctx.fillStyle = colour;
  ctx.fill();
  ctx.strokeStyle = BONE;
  ctx.lineWidth = .055;
  ctx.stroke();
  ctx.fillStyle = trim;
  ctx.fillRect(-.35, .16, .7, .085);
  ctx.fillStyle = BONE;
  ctx.fillRect(-.35, .25, .7, .035);
  ellipse(ctx, -.59, .23, .14, .15, NAVY);
  ellipse(ctx, .59, .23, .14, .15, NAVY);

  // Helmet and full cage remain legible at small sizes without inventing a
  // stick direction or a stance that would become a tactical clue.
  ellipse(ctx, 0, -.48, .27, .29, NAVY);
  ellipse(ctx, -.07, -.61, .13, .055, 'rgba(245,239,230,.28)');
  ctx.fillStyle = BONE;
  ctx.fillRect(-.22, -.51, .44, .18);
  ctx.strokeStyle = SLATE;
  ctx.lineWidth = .035;
  for (const at of [-.14, 0, .14]) {
    ctx.beginPath(); ctx.moveTo(at, -.5); ctx.lineTo(at, -.32); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(-.22, -.42); ctx.lineTo(.22, -.42); ctx.stroke();
  ctx.restore();
}

/** A puck stays at the exact caller centre/radius; its optional ring is unchanged. */
export function drawHockeyPuck(ctx, x, y, r, { ringWidth = 0, ringColour = BONE } = {}) {
  if (![x, y, r].every(Number.isFinite) || r <= 0) return;
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = '#080D16'; ctx.fill();
  if (ringWidth > 0) {
    ctx.strokeStyle = ringColour; ctx.lineWidth = ringWidth; ctx.stroke();
  }
  ellipse(ctx, x, y - r * .26, r * .64, r * .24, '#26364A');
  ctx.beginPath(); ctx.arc(x - r * .08, y - r * .15, r * .48, Math.PI * 1.08, Math.PI * 1.65);
  ctx.strokeStyle = 'rgba(245,239,230,.55)'; ctx.lineWidth = Math.max(.6, r * .11); ctx.stroke();
  ctx.restore();
}

/** Keep task labels on a compact contrasting chest plate, centred as before. */
export function drawHockeyLabel(ctx, text, x, y, r, { ink = BONE, plate = NAVY, scale = .8 } = {}) {
  ctx.save();
  ctx.font = `800 ${Math.round(r * scale)}px Inter, system-ui, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const width = Math.min(r * 1.78, Math.max(r * .8, ctx.measureText(String(text)).width + r * .22));
  ctx.fillStyle = plate; ctx.fillRect(x - width / 2, y - r * .35, width, r * .7);
  ctx.fillStyle = ink; ctx.fillText(String(text), x, y, r * 1.65);
  ctx.restore();
}
