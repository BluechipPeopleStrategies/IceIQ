const STORAGE_KEY = 'rinkreads_learning_world_visits_v1';

function safePart(value) {
  return encodeURIComponent(String(value || 'practice-preview'));
}

export function missionProgressKey({ playerId = 'practice-preview', ageBand = 'U11', worldId = '' } = {}) {
  return `${STORAGE_KEY}:${safePart(playerId)}:${safePart(ageBand)}:${safePart(worldId)}`;
}

function getStorage(storage) {
  if (storage) return storage;
  return typeof globalThis !== 'undefined' ? globalThis.localStorage : null;
}

export function readVisitedMissionIds(storage, scope) {
  const source = getStorage(storage);
  if (!source) return [];
  try {
    const parsed = JSON.parse(source.getItem(missionProgressKey(scope)) || '[]');
    return Array.isArray(parsed) ? [...new Set(parsed.filter(value => typeof value === 'string' && value))] : [];
  } catch {
    return [];
  }
}

export function recordMissionVisit(storage, scope, missionId) {
  if (!missionId) return readVisitedMissionIds(storage, scope);
  const source = getStorage(storage);
  const visited = readVisitedMissionIds(source, scope);
  if (visited.includes(missionId)) return visited;
  const next = [...visited, missionId];
  try { source?.setItem(missionProgressKey(scope), JSON.stringify(next)); } catch { /* local progress is best effort */ }
  return next;
}

export function summarizeMissionProgress(missions = [], visitedIds = []) {
  const validIds = new Set(missions.map(mission => mission.id));
  const visited = new Set(visitedIds.filter(id => validIds.has(id)));
  const suggested = missions.find(mission => !visited.has(mission.id));
  return {
    visitedIds: [...visited],
    visitedCount: visited.size,
    totalCount: missions.length,
    suggestedMissionId: suggested?.id || null,
  };
}

export function journeyStops(missions = []) {
  return missions.map((mission, index) => ({
    mission,
    index,
    x: index % 2 === 0 ? 64 : 256,
    y: 58 + index * 88,
    side: index % 2 === 0 ? 'right' : 'left',
  }));
}

