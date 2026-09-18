// Public sample entry, not authentication or authorization.
export const PREVIEW_CODE = 'FIRST-SHIFT';
export function matchesPreviewCode(value) {
  return String(value ?? '').trim().toUpperCase().replace(/[\s-]/g, '') === 'FIRSTSHIFT';
}
export const previewAge = value => ['U7', 'U9', 'U11'].includes(value) ? value : 'U7';
export const previewPlayerId = age => `public-preview-v1:${previewAge(age)}`;
export const previewGuidance = {
  U7: 'Explore one thing at a time. Find a rink spot, name a piece of gear, or look at a hockey role with a grown-up. Try again whenever you like. Learning the words is one small part of learning to play.',
  U9: 'Revisit familiar rink spots, try the gear match, and explore every role. The role pictures are examples, and players move as the game changes. Ask your coach how the words and pictures connect to the hockey you play.',
  U11: 'Compare the roles, explain which clue helped you find a rink spot, and practise recognizing referee signals. A diagram or signal match is a starting point. Talk with your coach about how it applies to a real play.',
};
