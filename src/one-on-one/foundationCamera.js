export const CAMERA_LIMITS = { azimuth: .38, minPolar: .04, maxPolar: .95, minDistance: 46, maxDistance: 110 };
export function foundationCamera(view = 'perspective') {
  return view === 'overhead' ? [0, 88, .1] : [8, 64, 56];
}
// Original SVG pixels map to the same metre-based plane used by the board geometry.
export function foundationPixelToWorld(x, y) { return [(x - 350) / 9.7, .025, (y - 190) / 9.7]; }
