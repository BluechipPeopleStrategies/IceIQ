import { GOAL_CATEGORIES } from '../data/goalStarters.js';

const asText = value => typeof value === 'string' ? value : '';
const asObject = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const STATUS = new Set(['draft', 'active', 'up-next', 'reviewed']);
const LOCAL_PREFIX = 'rinkreads_goal_plans_v1:';
const FIELD_MAP = { action: 'S', measure: 'M', schedule: 'A', why: 'R', reviewWhen: 'T' };

export function goalBand(level) {
  const n = Number(/^U(\d+)/i.exec(String(level || '').trim())?.[1]);
  return [7, 9, 11, 13, 15, 18].includes(n) ? n : 7;
}

export function goalFocusLimit(level) {
  const band = goalBand(level);
  return band <= 9 ? 1 : band <= 13 ? 2 : 3;
}

export function categoriesFor(level, goals = {}) {
  const key = Object.keys(GOAL_CATEGORIES).find(k => goalBand(k) === goalBand(level));
  const defaults = GOAL_CATEGORIES[key] || ['Skating', 'Passing', 'Teamwork'];
  // Category names are persisted keys. Keep old/custom keys reachable.
  const extraSkills = goalBand(level) >= 11 ? ['Skating', 'Passing', 'Shooting'] : [];
  return [...new Set([...defaults, ...extraSkills, ...Object.keys(asObject(goals))])].filter(Boolean);
}

export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function dateAfter(days, date = new Date()) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  return localDate(next);
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function readGoalPlan(entry, level) {
  const old = typeof entry === 'string' ? { goal: entry } : asObject(entry);
  const plan = asObject(old.plan);
  const reviewWhen = asText(old.T);
  return {
    action: asText(old.S) || asText(old.goal),
    measure: asText(old.M), schedule: asText(old.A), why: asText(old.R),
    reviewWhen,
    reviewDate: validDate(reviewWhen) ? reviewWhen : asText(plan.reviewDate),
    support: asText(plan.support),
    checks: { ...asObject(plan.checks) },
    status: STATUS.has(plan.status) ? plan.status : old.completed ? 'reviewed' : old.goal || old.S ? 'active' : 'draft',
    checkIns: Array.isArray(plan.checkIns) ? plan.checkIns : [],
    young: goalBand(level) <= 7,
  };
}

export function assessGoalPlan(plan, { level, today = localDate() } = {}) {
  const missing = [];
  const need = (field, label, condition) => { if (!condition) missing.push({ field, label }); };
  need('action', 'Choose one action you can try.', asText(plan.action).trim().length > 0);
  if (goalBand(level) <= 7) {
    need('action', 'Keep the child’s try-it phrase to six words or fewer.', asText(plan.action).trim().split(/\s+/).length <= 6);
  } else {
    need('action', 'Replace the broad aim with one visible action.', !/^(get better|improve|work hard|be better)[.!\s]*$/i.test(asText(plan.action).trim()));
    need('measure', 'Say what you will notice or record.', asText(plan.measure).trim().length > 0);
    need('schedule', 'Name a real practice opportunity.', asText(plan.schedule).trim().length > 0);
    need('why', 'Add your own reason for choosing this.', asText(plan.why).trim().length > 0);
    need('reviewDate', 'Choose today or a future date to review the plan.', validDate(plan.reviewDate) && plan.reviewDate >= today);
    need('ownAction', 'Check that the action is within your control.', plan.checks?.ownAction === true);
    need('observable', 'Check that you can observe the measure.', plan.checks?.observable === true);
    need('feasible', 'Check that the practice opportunity is realistic.', plan.checks?.feasible === true);
  }
  const text = `${plan.action || ''} ${plan.measure || ''}`;
  const hints = [];
  if (/\b(always|every time|perfect|never|zero mistakes|100%)\b/i.test(text)) hints.push('Leave room for missed attempts. You can learn from a few observed tries.');
  if (/\b(coach.{0,20}(rates|says|thinks)|best player|win every|make the team)\b/i.test(text)) hints.push('Use your own action as the target. Someone else’s verdict can be feedback.');
  if (/^(get better|improve|work hard|be better)[.!\s]*$/i.test(asText(plan.action).trim())) hints.push('Name the action: what would someone see you do?');
  return { ready: missing.length === 0, missing, hints };
}

export function activeGoalCount(goals, level, except = '') {
  return Object.entries(asObject(goals)).filter(([category, entry]) => category !== except && readGoalPlan(entry, level).status === 'active' && readGoalPlan(entry, level).action.trim()).length;
}

export function updateGoalPlan(goals, category, patch = {}, options = {}) {
  if (!asText(category).trim()) throw new Error('Choose a goal category.');
  const previous = goals?.[category];
  const old = typeof previous === 'string' ? { goal: previous, legacyGoal: previous } : asObject(previous);
  const next = { ...old };
  const meta = { ...asObject(old.plan) };
  meta.checks = { ...asObject(meta.checks) };
  if (Object.hasOwn(patch, 'action') && patch.action !== readGoalPlan(old, options.level).action) {
    meta.checks.ownAction = false;
    meta.checks.observable = false;
  }
  if (Object.hasOwn(patch, 'measure') && patch.measure !== old.M) meta.checks.observable = false;
  if (Object.hasOwn(patch, 'schedule') && patch.schedule !== old.A) meta.checks.feasible = false;
  for (const [field, legacy] of Object.entries(FIELD_MAP)) {
    if (Object.hasOwn(patch, field)) next[legacy] = asText(patch[field]);
  }
  if (Object.hasOwn(patch, 'action')) next.goal = asText(patch.action);
  if (Object.hasOwn(patch, 'reviewDate')) {
    next.T = asText(patch.reviewDate);
    meta.reviewDate = asText(patch.reviewDate);
  }
  if (Object.hasOwn(patch, 'support')) meta.support = asText(patch.support);
  if (Object.hasOwn(patch, 'checks')) meta.checks = { ...asObject(meta.checks), ...asObject(patch.checks) };
  if (options.status !== undefined) {
    if (!STATUS.has(options.status)) throw new Error('Choose a valid plan status.');
    meta.status = options.status;
  }
  if (!meta.status) meta.status = readGoalPlan(old, options.level).status;
  meta.version = 1;
  meta.checkIns = Array.isArray(meta.checkIns) ? meta.checkIns : [];
  next.plan = meta;
  if (goalBand(options.level) <= 7 && !asText(next.T).trim()) next.T = 'Next practice';
  if (!Object.hasOwn(next, 'completed')) next.completed = false;
  if (options.status === 'active') {
    if (!assessGoalPlan(readGoalPlan(next, options.level), options).ready) throw new Error('Finish the plan checks, or save this as a draft.');
    const previouslyActive = readGoalPlan(old, options.level).status === 'active' && readGoalPlan(old, options.level).action.trim();
    if (!previouslyActive && activeGoalCount(goals, options.level, category) >= goalFocusLimit(options.level)) throw new Error('Your focus list is full. Save this Up next, or park another goal first.');
    next.completed = false;
  }
  return { ...asObject(goals), [category]: next };
}

function optionalNumber(value, label, { max = Infinity, integer = false } = {}) {
  if ((typeof value === 'string' && value.trim() === '') || value === null || value === undefined) return null;
  const number = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(number) || number < 0 || number > max || (integer && !Number.isInteger(number))) throw new Error(`Check ${label}: enter ${integer ? 'a whole number' : 'a number'} from 0${Number.isFinite(max) ? ` to ${max}` : ' upward'}, or leave it blank.`);
  return number;
}

export function normaliseCheckIn(input = {}) {
  if (!validDate(input.date)) throw new Error('Choose a valid check-in date.');
  const observation = ['tried', 'not-yet', 'not-observed'].includes(input.observation) ? input.observation : 'not-observed';
  const attempted = observation === 'not-observed' ? null : optionalNumber(input.attempted, 'attempts', { integer: true });
  const observed = observation === 'not-observed' ? null : optionalNumber(input.observed, 'observed actions', { integer: true });
  if (observed !== null && (attempted === null || observed > attempted)) throw new Error('Observed actions need an attempt count and cannot exceed it.');
  return {
    date: input.date, observation, attempted, observed,
    rpe: optionalNumber(input.rpe, 'perceived effort', { max: 10, integer: true }),
    durationMinutes: optionalNumber(input.durationMinutes, 'session minutes'),
    reflection: asText(input.reflection).trim(),
    nextAdjustment: asText(input.nextAdjustment).trim(),
    sessionLabel: asText(input.sessionLabel).trim(),
  };
}

export function addGoalCheckIn(goals, category, input) {
  if (!goals?.[category]) throw new Error('Save a goal before adding a check-in.');
  const old = typeof goals[category] === 'string' ? { goal: goals[category], legacyGoal: goals[category] } : goals[category];
  const meta = asObject(old.plan);
  const checkIn = { ...normaliseCheckIn(input), action: asText(old.S) || asText(old.goal), measure: asText(old.M) };
  return { ...goals, [category]: { ...old, plan: { ...meta, version: 1, checkIns: [...(Array.isArray(meta.checkIns) ? meta.checkIns : []), checkIn] } } };
}

export function summariseCheckIns(checkIns = []) {
  const counted = checkIns.filter(c => c.observation !== 'not-observed' && Number.isFinite(c.attempted));
  const measured = counted.filter(c => Number.isFinite(c.observed));
  return {
    recorded: checkIns.length,
    tried: checkIns.filter(c => c.observation === 'tried').length,
    notObserved: checkIns.filter(c => c.observation === 'not-observed').length,
    attempted: counted.length ? counted.reduce((sum, c) => sum + c.attempted, 0) : null,
    observed: measured.length ? measured.reduce((sum, c) => sum + c.observed, 0) : null,
  };
}

// Training-log entries are user/device data. Keep copied context useful even
// when an older entry has no type or label; a missing label must not break the
// goal check-in form.
export function trainingSessionContext(session = {}) {
  const label = asText(session.label).trim() || asText(session.type).trim().replace(/[_-]+/g, ' ');
  return {
    date: asText(session.date),
    sessionLabel: label,
    durationMinutes: session.unit === 'min' && session.value !== null && session.value !== undefined
      ? String(session.value)
      : '',
  };
}

function storageFor(storage) {
  if (storage) return storage;
  if (typeof window !== 'undefined') return window.localStorage;
  throw new Error('Device storage is unavailable.');
}

export function readGoalSupplement(playerId, storage) {
  if (!playerId) return {};
  const raw = storageFor(storage).getItem(`${LOCAL_PREFIX}${encodeURIComponent(playerId)}`);
  if (!raw) return {};
  let saved;
  try { saved = JSON.parse(raw); } catch { throw new Error('The saved device plan could not be read. It has not been overwritten.'); }
  if (!saved || saved.version !== 1 || saved.playerId !== playerId || !saved.goals || typeof saved.goals !== 'object' || Array.isArray(saved.goals)) throw new Error('The saved device plan has an unsupported format. It has not been overwritten.');
  return saved.goals;
}

export function mergeGoalSupplement(goals, saved) {
  return { ...asObject(goals), ...asObject(saved) };
}

export function writeGoalSupplement(playerId, category, goal, storage) {
  if (!playerId) throw new Error('A player profile is needed to save a device plan.');
  if (!asText(category).trim()) throw new Error('Choose a goal category.');
  const target = storageFor(storage);
  const saved = readGoalSupplement(playerId, target);
  target.setItem(`${LOCAL_PREFIX}${encodeURIComponent(playerId)}`, JSON.stringify({ version: 1, playerId, goals: { ...saved, [category]: goal } }));
}

const THEMES = {
  skating: [
    ['Stop with control', 'Finish a stop in balance during the practice station', 'Mark whether I stayed balanced on four observed stops'],
    ['Turn around a marker', 'Look toward my next marker before starting a turn', 'Record four turns and mark when I looked before turning'],
  ],
  passing: [
    ['Show my stick for passes', 'Show my stick target before a partner starts a pass', 'Mark whether I showed a target on four partner attempts'],
    ['Look for my partner', 'Find my partner before beginning a short practice pass', 'Record four passes and mark when I looked before passing'],
  ],
  shooting: [
    ['Look at my target', 'Choose a target before each shot I record in a practice drill', 'Record my chosen target and where four practice shots went'],
    ['Finish my shooting turn', 'Use one shooting cue agreed at the practice station', 'Write the cue and mark whether I tried it on four shots'],
  ],
  puck: [
    ['Look up with the puck', 'Lift my eyes to find a marker during a puck-control drill', 'Record four tries and mark when I found the marker'],
    ['Keep my puck close', 'Use one puck-control cue while moving around a marker', 'Name my cue and note what happened on four observed tries'],
  ],
  teammate: [
    ['Cheer for a teammate', 'Offer a teammate one useful encouragement during practice', 'After practice, write what I said and how the moment went'],
    ['Ask for another try', 'Ask one clear question when I do not understand a drill', 'Write my question and the part of the drill it clarified'],
  ],
  defense: [
    ['Look for the puck', 'Find the puck and my next assignment before a defensive drill rep', 'Record four reps and mark when I named both before starting'],
    ['Face the play', 'Practise one defensive skating cue agreed with my coach', 'Name the cue and record whether I tried it on four reps'],
  ],
  read: [
    ['Find an open teammate', 'Look for a teammate and nearby pressure before a practice decision', 'Record four decisions and name the teammate and pressure I saw'],
    ['Look before I move', 'Explain one option I noticed after a paused practice play', 'Save the play situation, my option and one cue that supported it'],
  ],
};

export function makeGoalStarters(level, category) {
  const band = goalBand(level);
  const name = category.toLowerCase();
  const theme = /leadership|teamwork/.test(name) ? 'teammate'
    : /skat|edge/.test(name) ? 'skating' : /passing/.test(name) ? 'passing'
    : /shot|shoot/.test(name) ? 'shooting' : /puck/.test(name) ? 'puck'
    : /defen|gap|physical/.test(name) ? 'defense' : 'read';
  return THEMES[theme].map(([short, action, measure], index) => {
    if (band <= 7) return { id: `${theme}-${index}`, label: short, action: short };
    if (band === 9) return {
      id: `${theme}-${index}`, label: short, action: short,
      measure: `After the drill, tell my helper whether I tried to ${short.charAt(0).toLowerCase() + short.slice(1)}.`,
      schedule: 'At my next practice, in a drill where this fits',
    };
    return {
      id: `${theme}-${index}`, label: short, action, measure,
      schedule: band <= 13 ? 'At my next practice, in a suitable drill with time to note a few tries' : 'During the next planned practice block, with a short review afterward',
    };
  });
}
