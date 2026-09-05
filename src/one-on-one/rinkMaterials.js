import * as THREE from 'three';
import { NHL_200X85_PROFILE } from '../scenario-engine/rinkFrame.js';

export const RINK = NHL_200X85_PROFILE;
export const GOAL_X = RINK.landmarks.goalLineRight[0];
export function world(x, y, height = 0) { return [y, height, -x]; }

export function makeIceTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1536; canvas.height = 3072;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const sx = W / RINK.widthM, sy = H / RINK.lengthM;
  const point = (x, y) => [(y + RINK.widthM / 2) * sx, (RINK.lengthM / 2 - x) * sy];
  ctx.fillStyle = '#eaf5f5'; ctx.fillRect(0, 0, W, H);
  // Seeded ice texture: no animation or per-frame random noise.
  let seed = 419;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 18000; i++) {
    const x = random() * W, y = random() * H;
    ctx.strokeStyle = i % 3 ? 'rgba(127,166,177,.09)' : 'rgba(255,255,255,.45)';
    ctx.lineWidth = .5 + random(); ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x + random() * 26 - 13, y + 5 + random() * 40); ctx.stroke();
  }
  const line = (x, colour, thick) => {
    const p = point(x, -RINK.widthM / 2);
    ctx.fillStyle = colour; ctx.fillRect(0, p[1] - thick * sy / 2, W, thick * sy);
  };
  const circle = (x, y, radius, colour, width = .07) => {
    const p = point(x, y); ctx.strokeStyle = colour; ctx.lineWidth = width * sx;
    ctx.beginPath(); ctx.ellipse(p[0], p[1], radius * sx, radius * sy, 0, 0, Math.PI * 2); ctx.stroke();
  };
  line(0, '#b95465', .28); line(-7.62, '#5088b1', .30); line(7.62, '#5088b1', .30);
  line(GOAL_X, '#bc6170', .06); line(-GOAL_X, '#bc6170', .06);
  circle(0, 0, 4.572, '#5088b1');
  for (const x of [-20.7264, 20.7264]) for (const y of [-6.7056, 6.7056]) {
    circle(x, y, 4.572, '#bc6170'); circle(x, y, .3, '#bc6170', .18);
    for (const dy of [-.58, .58]) {
      const p = point(x, y + dy); ctx.fillStyle = '#bc6170'; ctx.fillRect(p[0] - 2, p[1] - sy * .7, 4, sy * 1.4);
    }
  }
  for (const side of [-1, 1]) {
    const p = point(side * GOAL_X, 0);
    ctx.fillStyle = '#8fc2d6'; ctx.strokeStyle = '#bc6170'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(p[0], p[1], 1.829 * sx, 1.829 * sy, 0, side === 1 ? 0 : Math.PI, side === 1 ? Math.PI : 2 * Math.PI); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = 'rgba(25,64,76,.21)'; ctx.textAlign = 'center'; ctx.font = '900 100px Arial'; ctx.fillText('RINKREADS', 0, 20);
  ctx.font = '600 22px Arial'; ctx.fillText('SEE THE GAME. MAKE THE PLAY.', 0, 62); ctx.restore();
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function roundedRinkShape(inset = 0) {
  const w = RINK.widthM / 2 - inset, l = RINK.lengthM / 2 - inset, r = 8.5344 - inset;
  const s = new THREE.Shape();
  s.moveTo(-w + r, -l); s.lineTo(w - r, -l); s.quadraticCurveTo(w, -l, w, -l + r);
  s.lineTo(w, l - r); s.quadraticCurveTo(w, l, w - r, l);
  s.lineTo(-w + r, l); s.quadraticCurveTo(-w, l, -w, l - r);
  s.lineTo(-w, -l + r); s.quadraticCurveTo(-w, -l, -w + r, -l);
  return s;
}
