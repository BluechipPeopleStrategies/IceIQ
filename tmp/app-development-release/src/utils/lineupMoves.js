/** A lineup move changes assignments only; the roster remains the player list. */
export function moveLineupPlayer(chart, playerId, targetSlot, { rosterIds, slotIds }) {
  if (!chart || typeof chart !== 'object' || Array.isArray(chart)) throw new Error('The lineup could not be read. Reload it before moving a player.');
  if (!rosterIds.includes(playerId)) throw new Error('That player is no longer on this roster.');
  if (targetSlot !== null && !slotIds.includes(targetSlot)) throw new Error('Choose a lineup position or the bench.');
  const occupied = Object.values(chart).filter(slot => slotIds.includes(slot));
  if (targetSlot !== null && new Set(occupied).size !== occupied.length) throw new Error('Two players share a saved position. Move one of them to the bench before rearranging players.');
  const fromSlot = slotIds.includes(chart[playerId]) ? chart[playerId] : null;
  const displacedId = targetSlot ? Object.keys(chart).find(id => id !== playerId && chart[id] === targetSlot) || null : null;
  const next = { ...chart };
  if (targetSlot) next[playerId] = targetSlot; else delete next[playerId];
  if (displacedId) { if (fromSlot) next[displacedId] = fromSlot; else delete next[displacedId]; }
  return { chart: next, playerId, fromSlot, targetSlot, displacedId, changed: JSON.stringify(next) !== JSON.stringify(chart) };
}
