// Rink is 60m x 30m, ice plane at y=0, length axis is world x, width axis is world z.

export function normalizedToWorld({ x, y }) {
  return {
    x: (x - 0.5) * 60,
    y: 0,
    z: (y - 0.5) * 30,
  };
}

export function worldToNormalized({ x, z }) {
  return {
    x: x / 60 + 0.5,
    y: z / 30 + 0.5,
  };
}
