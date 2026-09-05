export const ANALYTICS_VERSION = 1;
export const MAX_ANALYTICS_EVENTS = 3000;
export const ANALYTICS_STORAGE_KEY = 'rinkreads_experimental_practice_analytics_v1';

const EVENT_NAMES = new Set(['question_view', 'question_check', 'reflection_skip', 'question_flag', 'camera_use']);
const QUESTION_TYPES = new Set(['choice', 'multi', 'sequence', 'position', 'explain']);
const BASES = new Set(['scene', 'coaching']);
const FLAG_CATEGORIES = new Set(['Hockey decision', 'Scene or player position', 'Unclear question', 'Age or wording', 'Answer or feedback', 'Rule or safety', 'Other']);
const CAMERA_ACTIONS = new Set(['labels-on', 'labels-off', 'camera-full', 'camera-broadcast', 'camera-rink-side', 'camera-behind-net', 'camera-overhead', 'focus-change']);

const clone = value => typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
const validText = (value, max = 180) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const validVersion = value => Number.isSafeInteger(value) && value > 0;
const identity = value => `${value.scenarioId}@${value.scenarioVersion}:${value.questionId}:${value.contentHash || ''}`;
const validTimestamp = value => validText(value, 80) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;

function fallbackSessionId() {
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function makeAnonymousSessionId() {
  try {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  } catch { /* unavailable */ }
  return fallbackSessionId();
}

export function emptyPracticeAnalytics(sessionId = makeAnonymousSessionId()) {
  return { version: ANALYTICS_VERSION, sessionId: validText(sessionId, 120) ? sessionId : makeAnonymousSessionId(), events: [], droppedCount: 0 };
}

export function isValidAnalyticsEvent(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) return false;
  if (!EVENT_NAMES.has(event.event) || !validText(event.id, 220) || !validTimestamp(event.at)) return false;
  if (!validText(event.scenarioId) || !validVersion(event.scenarioVersion) || !validText(event.questionId)) return false;
  if (event.contentHash !== undefined && !validText(event.contentHash, 160)) return false;
  if (event.basis !== undefined && !BASES.has(event.basis)) return false;
  if (event.questionType !== undefined && !QUESTION_TYPES.has(event.questionType)) return false;
  if (event.viewEventId !== undefined && !validText(event.viewEventId, 220)) return false;
  if (event.event === 'question_check') {
    if (!Number.isSafeInteger(event.attemptNumber) || event.attemptNumber < 1 || typeof event.retry !== 'boolean') return false;
    if (event.basis === 'scene' && typeof event.sceneMatch !== 'boolean') return false;
    if (event.basis !== 'scene' && Object.hasOwn(event, 'sceneMatch')) return false;
  }
  if (event.event === 'reflection_skip' && event.questionType !== 'explain') return false;
  if (event.event === 'question_flag' && !FLAG_CATEGORIES.has(event.category)) return false;
  if (event.event === 'camera_use' && !CAMERA_ACTIONS.has(event.cameraAction)) return false;
  return true;
}

function normalizeMeta(meta) {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null;
  const normalized = {
    scenarioId: typeof meta.scenarioId === 'string' ? meta.scenarioId.trim() : '',
    scenarioVersion: meta.scenarioVersion,
    questionId: typeof meta.questionId === 'string' ? meta.questionId.trim() : '',
  };
  if (typeof meta.contentHash === 'string' && meta.contentHash.trim()) normalized.contentHash = meta.contentHash.trim();
  if (BASES.has(meta.basis)) normalized.basis = meta.basis;
  if (QUESTION_TYPES.has(meta.questionType)) normalized.questionType = meta.questionType;
  return validText(normalized.scenarioId) && validVersion(normalized.scenarioVersion) && validText(normalized.questionId) ? normalized : null;
}

export function normalizeAnalyticsEvent(event) {
  if (!isValidAnalyticsEvent(event)) return null;
  const copy = { event: event.event, id: event.id, at: event.at, scenarioId: event.scenarioId, scenarioVersion: event.scenarioVersion, questionId: event.questionId };
  for (const field of ['contentHash', 'basis', 'questionType']) if (event[field] !== undefined) copy[field] = event[field];
  if (event.event === 'question_check') Object.assign(copy, { attemptNumber: event.attemptNumber, retry: event.retry, ...(event.viewEventId ? { viewEventId: event.viewEventId } : {}), ...(event.basis === 'scene' ? { sceneMatch: event.sceneMatch } : {}) });
  if (event.event === 'reflection_skip' && event.viewEventId) copy.viewEventId = event.viewEventId;
  if (event.event === 'question_flag') copy.category = event.category;
  if (event.event === 'camera_use') copy.cameraAction = event.cameraAction;
  return copy;
}

export function restorePracticeAnalytics(raw, { sessionId = makeAnonymousSessionId() } = {}) {
  let parsed;
  try { parsed = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return emptyPracticeAnalytics(sessionId); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || parsed.version !== ANALYTICS_VERSION) return emptyPracticeAnalytics(sessionId);
  const restored = emptyPracticeAnalytics(validText(parsed.sessionId, 120) ? parsed.sessionId : sessionId);
  const inputEvents = Array.isArray(parsed.events) ? parsed.events : [];
  const validEvents = inputEvents.map(normalizeAnalyticsEvent).filter(Boolean);
  restored.events = validEvents.slice(-MAX_ANALYTICS_EVENTS);
  const invalidCount = inputEvents.length - validEvents.length;
  const overflowCount = validEvents.length - restored.events.length;
  const storedDropped = Number.isSafeInteger(parsed.droppedCount) && parsed.droppedCount >= 0 ? parsed.droppedCount : 0;
  restored.droppedCount = storedDropped + invalidCount + Math.max(0, overflowCount);
  return restored;
}

function eventId(state) {
  return `${state.sessionId}:${state.events.length + state.droppedCount + 1}`;
}

function append(state, event) {
  const normalized = normalizeAnalyticsEvent(event);
  if (!normalized) return { ...state, droppedCount: state.droppedCount + 1 };
  const events = [...state.events, normalized];
  const overflow = Math.max(0, events.length - MAX_ANALYTICS_EVENTS);
  return { ...state, events: overflow ? events.slice(overflow) : events, droppedCount: state.droppedCount + overflow };
}

function save(storage, key, state) {
  try { storage?.setItem(key, JSON.stringify(state)); return true; } catch { return false; }
}

function storageFor(storage) {
  if (storage) return storage;
  try { return globalThis.localStorage; } catch { return null; }
}

export function createPracticeAnalyticsStore({ storage = null, key = ANALYTICS_STORAGE_KEY, sessionId, now = () => new Date().toISOString() } = {}) {
  const target = storageFor(storage);
  let storageStatus = target ? 'available' : 'memory-only';
  const persisted = (() => { try { return target?.getItem(key); } catch { storageStatus = 'unavailable'; return null; } })();
  let state = restorePracticeAnalytics(persisted, { sessionId });
  let lastViewKey = null;
  const latestViewIds = new Map();
  for (const event of state.events) if (event.event === 'question_view') latestViewIds.set(identity(event), event.id);

  function commit(next) {
    state = next;
    if (target && save(target, key, state)) storageStatus = 'persisted';
    else if (target) storageStatus = 'memory-only';
    return { ...clone(state), storageStatus };
  }
  function metadata(meta) {
    const normalized = normalizeMeta(meta);
    return normalized ? { ...normalized, at: String(now()) } : null;
  }
  function recordQuestionView(meta) {
    const normalized = metadata(meta);
    if (!normalized) return { ...clone(state), storageStatus };
    const viewKey = identity(normalized);
    if (viewKey === lastViewKey) return { ...clone(state), storageStatus };
    lastViewKey = viewKey;
    const id = eventId(state);
    const next = commit(append(state, { ...normalized, event: 'question_view', id }));
    latestViewIds.set(viewKey, id);
    return next;
  }
  function recordQuestionCheck(meta) {
    const normalized = metadata(meta);
    if (!normalized) return { ...clone(state), storageStatus };
    const keyForQuestion = identity(normalized);
    const prior = state.events.filter(event => event.event === 'question_check' && identity(event) === keyForQuestion).length;
    const event = { ...normalized, event: 'question_check', id: eventId(state), attemptNumber: prior + 1, retry: prior > 0, ...(latestViewIds.get(keyForQuestion) ? { viewEventId: latestViewIds.get(keyForQuestion) } : {}) };
    if (normalized.basis === 'scene' && typeof meta.sceneMatch === 'boolean') event.sceneMatch = meta.sceneMatch;
    lastViewKey = null;
    return commit(append(state, event));
  }
  function recordReflectionSkip(meta) {
    const normalized = metadata(meta);
    if (!normalized || normalized.questionType !== 'explain') return { ...clone(state), storageStatus };
    const keyForQuestion = identity(normalized);
    lastViewKey = null;
    return commit(append(state, { ...normalized, event: 'reflection_skip', id: eventId(state), ...(latestViewIds.get(keyForQuestion) ? { viewEventId: latestViewIds.get(keyForQuestion) } : {}) }));
  }
  function recordQuestionFlag(meta) {
    const normalized = metadata(meta);
    if (!normalized) return { ...clone(state), storageStatus };
    const category = FLAG_CATEGORIES.has(meta.category) ? meta.category : 'Other';
    lastViewKey = null;
    return commit(append(state, { ...normalized, event: 'question_flag', id: eventId(state), category }));
  }
  function recordCameraUse(meta) {
    const normalized = metadata(meta);
    if (!normalized || !CAMERA_ACTIONS.has(meta.cameraAction)) return { ...clone(state), storageStatus };
    lastViewKey = null;
    return commit(append(state, { ...normalized, event: 'camera_use', id: eventId(state), cameraAction: meta.cameraAction }));
  }
  return {
    getState: () => ({ ...clone(state), storageStatus }),
    recordQuestionView,
    recordQuestionCheck,
    recordReflectionSkip,
    recordQuestionFlag,
    recordCameraUse,
    exportJSON: () => JSON.stringify(state, null, 2),
    clear: () => { try { target?.removeItem(key); storageStatus = target ? 'persisted' : 'memory-only'; } catch { storageStatus = 'memory-only'; } lastViewKey = null; latestViewIds.clear(); state = emptyPracticeAnalytics(state.sessionId); return { ...clone(state), storageStatus }; },
  };
}

function aggregateKey(event) {
  return identity(event);
}

function aggregate(events, getKey, extra = () => ({})) {
  const map = new Map();
  for (const event of events) {
    const key = getKey(event);
    const prior = map.get(key) || { key, count: 0, ...extra(event) };
    prior.count += 1;
    map.set(key, prior);
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

export function buildPracticeInsights(input) {
  const state = input?.version === ANALYTICS_VERSION && Array.isArray(input.events) ? input : emptyPracticeAnalytics('report');
  const events = state.events.filter(isValidAnalyticsEvent);
  const views = events.filter(event => event.event === 'question_view');
  const checks = events.filter(event => event.event === 'question_check');
  const flags = events.filter(event => event.event === 'question_flag');
  const skips = events.filter(event => event.event === 'reflection_skip');
  const cameraUses = events.filter(event => event.event === 'camera_use');
  const sceneChecks = checks.filter(event => event.basis === 'scene');
  const coachingChecks = checks.filter(event => event.basis === 'coaching');
  const sceneMatches = sceneChecks.filter(event => event.sceneMatch === true);
  const completionMap = new Map();
  for (const event of [...views, ...checks, ...skips]) {
    const key = aggregateKey(event);
    const row = completionMap.get(key) || { key, scenarioId: event.scenarioId, scenarioVersion: event.scenarioVersion, questionId: event.questionId, contentHash: event.contentHash, views: 0, checkedAttempts: 0, viewIds: new Set(), checkedViewIds: new Set(), skippedViewIds: new Set(), unassociatedChecks: 0, unassociatedSkips: 0 };
    if (event.event === 'question_view') row.views += 1;
    if (event.event === 'question_view') row.viewIds.add(event.id);
    if (event.event === 'question_check') {
      row.checkedAttempts += 1;
      if (event.viewEventId) row.checkedViewIds.add(event.viewEventId);
      else row.unassociatedChecks += 1;
    }
    if (event.event === 'reflection_skip') {
      if (event.viewEventId) row.skippedViewIds.add(event.viewEventId);
      else row.unassociatedSkips += 1;
    }
    completionMap.set(key, row);
  }
  const completionRates = [...completionMap.values()].map(row => {
    const checkedViewIds = new Set([...row.checkedViewIds].filter(viewId => row.viewIds.has(viewId)));
    const skippedViewIds = new Set([...row.skippedViewIds].filter(viewId => row.viewIds.has(viewId)));
    const engagedViewIds = new Set([...checkedViewIds, ...skippedViewIds]);
    const hasForeignAssociation = [...row.checkedViewIds, ...row.skippedViewIds].some(viewId => !row.viewIds.has(viewId));
    const reliable = row.unassociatedChecks === 0 && row.unassociatedSkips === 0 && !hasForeignAssociation;
    return { key: row.key, scenarioId: row.scenarioId, scenarioVersion: row.scenarioVersion, questionId: row.questionId, contentHash: row.contentHash, totalViews: row.views, checkedAttempts: row.checkedAttempts, distinctViewIDsWithCheck: checkedViewIds.size, distinctViewIDsWithReflectionSkip: skippedViewIds.size, distinctViewIDsWithCheckOrSkip: engagedViewIds.size, reliable, rate: reliable && row.views ? Math.min(1, engagedViewIds.size / row.views) : null };
  });
  const mostRetried = aggregate(checks.filter(event => event.retry), aggregateKey, event => ({ scenarioId: event.scenarioId, scenarioVersion: event.scenarioVersion, questionId: event.questionId, contentHash: event.contentHash }));
  const mostFlagged = aggregate(flags, event => `${aggregateKey(event)}:${event.category}`, event => ({ scenarioId: event.scenarioId, scenarioVersion: event.scenarioVersion, questionId: event.questionId, contentHash: event.contentHash, category: event.category }));
  const framingUsage = aggregate(checks.filter(event => event.questionType), event => event.questionType, event => ({ format: event.questionType }));
  const cameraUsage = aggregate(cameraUses, event => event.cameraAction, event => ({ action: event.cameraAction }));
  return {
    version: ANALYTICS_VERSION,
    sessionId: state.sessionId,
    sampleSizes: {
      views: views.length,
      checkedAttempts: checks.length,
      retries: checks.filter(event => event.retry).length,
      flags: flags.length,
      reflectionSkips: skips.length,
      sceneChecks: sceneChecks.length,
      sceneMatches: sceneMatches.length,
      coachingChecks: coachingChecks.length,
      cameraUses: cameraUses.length,
    },
    mostViewed: aggregate(views, aggregateKey, event => ({ scenarioId: event.scenarioId, scenarioVersion: event.scenarioVersion, questionId: event.questionId, contentHash: event.contentHash })),
    mostRetried,
    mostFlagged,
    completionRates,
    sceneMatch: { checks: sceneChecks.length, matches: sceneMatches.length, rate: sceneChecks.length ? sceneMatches.length / sceneChecks.length : null },
    framingUsage,
    framingUsageLabel: 'Question formats checked',
    cameraUsage,
    cameraUsageLabel: 'Camera controls used',
    storageStatus: state.storageStatus || 'unknown',
    droppedCount: Number.isSafeInteger(state.droppedCount) ? state.droppedCount : 0,
    definitions: { completionRate: 'distinct question-view events with a check or optional reflection skip divided by total question-view events for the exact identity; retries on one view do not inflate the rate, optional skips are engagement rather than failure, and the rate is omitted when view association is unavailable.', sceneMatch: 'only scene-basis checks with an explicit sceneMatch value are included.', scope: 'This report describes local data kept in this browser and may span visits on this device.' },
  };
}
