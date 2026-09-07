export function practiceStorageKey(namespace, playerId = 'practice-preview') {
  return `${namespace}:${playerId || 'practice-preview'}`;
}

// Earlier development builds used an unscoped device library. Only the preview
// may read it; signing in must never claim another person's old device data.
export function readPracticeValue(storage, namespace, playerId = 'practice-preview') {
  const scoped = storage.getItem(practiceStorageKey(namespace, playerId));
  if (scoped !== null) return scoped;
  return !playerId || playerId === 'practice-preview' ? storage.getItem(namespace) : null;
}
