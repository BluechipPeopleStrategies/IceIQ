// One equipment atlas for the overhead SVG, Canvas and generated-image adapters.
// These body sprites carry no puck, target, number or authored stick direction.
export const OVERHEAD_ART_ROOT = '/assets/characters/top-down-v2/';
export function overheadArtworkPath({ team = 'home', goalie = false } = {}) {
  return `${OVERHEAD_ART_ROOT}${goalie ? 'goalie' : 'skater'}-${team === 'away' ? 'gold' : 'navy'}.png`;
}

const images = new Map();
export function overheadArtworkImage(options) {
  if (typeof Image === 'undefined') return null;
  const path = overheadArtworkPath(options);
  if (!images.has(path)) {
    const image = new Image();
    image.src = path;
    images.set(path, image);
  }
  const image = images.get(path);
  return image.complete && image.naturalWidth > 0 ? image : null;
}

// Warm the four small shared assets before a child starts a timed drill.
// Never paint asynchronously: a late image must not reveal a hidden memory cue.
if (typeof Image !== 'undefined') {
  for (const team of ['home', 'away']) for (const goalie of [false, true]) {
    overheadArtworkImage({ team, goalie });
  }
}
