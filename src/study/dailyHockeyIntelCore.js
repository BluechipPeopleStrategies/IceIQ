export const DAILY_INTEL_VERSION = 'daily-hockey-intel-v1';
export const DAILY_INTEL_AGES = ['U7', 'U9', 'U11', 'U13', 'U15', 'U18'];
export const LEGACY_INTEL_READ_KEY = 'rinkreads_insights_read_v1';

export function localDayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function nextLocalMidnight(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}
export function dailyIntelStorageKey(playerId = 'guest', ageBand) {
  return `rinkreads_daily_intel_v1:${encodeURIComponent(playerId || 'guest')}:${encodeURIComponent(ageBand || '')}`;
}

// This is a reading catalog, never question-bank admission or scored evidence.
export function eligibleDailyFacts(facts, ageBand) {
  if (!DAILY_INTEL_AGES.includes(ageBand) || !Array.isArray(facts)) return [];
  const seen = new Set();
  return facts.filter(fact => {
    if (fact?.deliveryEligible !== true || typeof fact.id !== 'string' || seen.has(fact.id)
      || !fact.ageBands?.includes(ageBand) || !fact.term || !fact.learnerText
      || !fact.sourceRefs?.some(ref => /^https:\/\//.test(ref?.url || ''))) return false;
    seen.add(fact.id);
    return true;
  });
}
function hash(text) {
  let value = 2166136261;
  for (let i = 0; i < text.length; i++) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
  return value >>> 0;
}
function validPrevious(value, identity) {
  if (!value || value.version !== DAILY_INTEL_VERSION || value.identity !== identity
    || !/^\d{4}-\d{2}-\d{2}$/.test(value.dayKey) || !/^\d{4}-\d{2}-\d{2}$/.test(value.anchorDay)
    || !Number.isSafeInteger(value.round) || value.round < 0) return false;
  for (const key of ['catalogIds', 'servedIds', 'todayIds', 'readIds']) {
    if (!Array.isArray(value[key]) || value[key].some(id => typeof id !== 'string')
      || new Set(value[key]).size !== value[key].length) return false;
  }
  return value.todayIds.length <= 3
    && [...value.todayIds, ...value.servedIds].every(id => value.catalogIds.includes(id))
    && value.readIds.every(id => value.todayIds.includes(id));
}

/** Issue up to three cards. Unopened calendar days never consume the catalog.
 * servedIds tracks cards issued in this catalog round, not correctness or mastery.
 * A new round starts only after every available card has been issued.
 */
export function selectDailyIntel({ facts, playerId = 'guest', ageBand, dayKey = localDayKey(), previous }) {
  const catalog = eligibleDailyFacts(facts, ageBand);
  const catalogIds = catalog.map(fact => fact.id).sort();
  const identity = dailyIntelStorageKey(playerId, ageBand);
  const prior = validPrevious(previous, identity) ? previous : null;
  const live = new Set(catalogIds);
  const sameDay = prior?.dayKey === dayKey;
  const todayIds = sameDay ? prior.todayIds.filter(id => live.has(id)) : [];
  let servedIds = prior ? prior.servedIds.filter(id => live.has(id)) : [];
  let round = prior?.round || 0;
  const anchorDay = prior?.anchorDay || dayKey;
  const byId = new Map(catalog.map(fact => [fact.id, fact]));
  while (todayIds.length < Math.min(3, catalog.length)) {
    let pending = catalogIds.filter(id => !servedIds.includes(id));
    if (!pending.length) { round++; servedIds = []; pending = catalogIds; }
    const unique = pending.filter(id => !todayIds.includes(id));
    // At a boundary, postpone a just-shown item to a future day in the new round.
    if (!unique.length) break;
    const concepts = new Set(todayIds.map(id => byId.get(id)?.conceptId));
    const topics = new Set(todayIds.map(id => byId.get(id)?.topic));
    const rank = id => Number(concepts.has(byId.get(id)?.conceptId)) * 2 + Number(topics.has(byId.get(id)?.topic));
    unique.sort((a, b) => rank(a) - rank(b)
      || hash(`${identity}|${anchorDay}|${round}|${a}`) - hash(`${identity}|${anchorDay}|${round}|${b}`)
      || a.localeCompare(b));
    todayIds.push(unique[0]); servedIds.push(unique[0]);
  }
  return {
    version: DAILY_INTEL_VERSION, identity, dayKey, anchorDay, round, catalogIds,
    servedIds, todayIds,
    readIds: sameDay ? prior.readIds.filter(id => todayIds.includes(id)) : [],
  };
}

export function markDailyIntelRead(state, id) {
  if (!state?.todayIds?.includes(id) || state.readIds.includes(id)) return state;
  return { ...state, readIds: [...state.readIds, id] };
}

// Keep every old stat string byte-for-byte as a value; never rewrite a corrupt
// legacy record to make this new activity appear successful.
export function appendLegacyRead(previous, factId) {
  if (!Array.isArray(previous) || previous.some(value => typeof value !== 'string') || !factId) {
    return { values: previous, added: false, valid: false };
  }
  const key = `intel:${factId}`;
  return previous.includes(key)
    ? { values: previous, added: false, valid: true }
    : { values: [...previous, key], added: true, valid: true };
}
