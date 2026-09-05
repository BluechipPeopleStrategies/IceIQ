export function parseCoordinateText(text) {
  if (!text.trim()) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

export function coordinateTextForValue(text, value) {
  return parseCoordinateText(text) === value ? text : String(value);
}
