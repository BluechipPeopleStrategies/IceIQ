import { enumerateParameterSpace } from '../scenario-engine/generator/parameterSpace.js';
import { canonicalStringify } from '../scenario-engine/canonicalHash.js';
import { NHL_200X85_PROFILE, normalizeFacingRadians } from '../scenario-engine/rinkFrame.js';
import { createSequenceState } from './readSequenceGeometry.js';

const VERSION = 'rinkreads-positioning-session-v1';
const STATUS = 'draft-for-coach-review';
const PROOF = 'illustrative-not-physics-validated';
const { bounds, landmarks } = NHL_200X85_PROFILE;
const CORNER_RADIUS = 8.5344;
const BOARD_MARGIN = .8;
const BODY_CLEARANCE = 1.1; // Drawn-body overlap guard, not a validated contact model.
const PASS_CLEARANCE = .75; // Drawn puck/player clearance, not a tactical passing grade.
const clone = value => structuredClone(value);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const pointOf = actor => ({ x: actor.x, y: actor.y });
const axis = (id, values) => ({ id, values, loadBearing: true });

function parameterSpace(teamSize) {
  return {
    id: teamSize === 1 ? 'positioning-gap-v1' : `positioning-support-${teamSize}v${teamSize}-v1`,
    axes: teamSize === 1 ? [
      axis('carrierDepth', [12, 15]), axis('carrierWidth', [3, 6]),
      axis('defenderGap', [3.4, 5.4]), axis('insideOffset', [-.8, -2.6]),
      axis('firstAdvance', [1.8, 3]), axis('lateralCut', [-1.2, .6]),
      axis('secondAdvance', [1.6, 2.8]),
    ] : [
      axis('carrierDepth', [13, 16]), axis('carrierWidth', [4.5, 7]),
      axis('supportDepth', [-2, 1]), axis('supportWidth', [-2.5, -5.5]),
      axis('pressureGap', [3, 5]), axis('laneCover', ['in-line', 'behind-line']),
      teamSize === 2 ? axis('secondAdvance', [1.6, 2.8]) : axis('receiverDepth', [21, 23]),
    ],
  };
}

const sourceRefs = defensive => defensive ? [
  { note: 'docs/library/gap-control.md', use: 'Discuss the gap to the carrier and protecting middle ice.' },
  { note: 'docs/library/defensive-angling.md', use: 'Discuss inside position; no automatic angle or successful steer is claimed.' },
  { note: 'docs/library/scanning.md', use: 'Look again after the visible carry; no shoulder check is measured.' },
] : [
  { note: 'docs/library/off-puck-support-offense.md', use: 'Discuss space and a usable passing lane from the actual carrier.' },
  { note: 'docs/library/scanning.md', use: 'Look again after the carrier or puck moves; no shoulder check is measured.' },
];

function initialState(template) {
  const p = template.parameters;
  const positions = { F1: { x: p.carrierDepth, y: p.carrierWidth, facing: 0 } };
  if (template.teamSize === 1) {
    positions.D1 = { x: p.carrierDepth + p.defenderGap, y: p.carrierWidth + p.insideOffset, facing: Math.PI };
  } else {
    positions.F2 = { x: p.carrierDepth + p.supportDepth, y: p.supportWidth, facing: 0 };
    positions.D1 = { x: p.carrierDepth + p.pressureGap, y: p.carrierWidth - 1.6, facing: Math.PI };
    positions.D2 = {
      x: (p.carrierDepth + 1 + positions.F2.x) / 2 - (p.laneCover === 'behind-line' ? 3 : 0),
      y: (p.carrierWidth + .7 + p.supportWidth) / 2, facing: Math.PI,
    };
    if (template.teamSize >= 3) {
      positions.F3 = { x: p.receiverDepth, y: -8, facing: 0 };
      positions.D3 = { x: 25, y: -3.5, facing: Math.PI };
    }
    if (template.teamSize >= 4) {
      positions.F4 = { x: 9, y: -9, facing: 0 };
      positions.D4 = { x: 14, y: -9, facing: Math.PI };
    }
    if (template.teamSize === 5) {
      positions.F5 = { x: 10, y: 7.5, facing: 0 };
      positions.D5 = { x: 13, y: 10.2, facing: Math.PI };
    }
  }
  positions.G = { x: landmarks.goalieRight[0], y: 0, facing: Math.PI };
  const actors = Object.keys(positions).map(id => ({
    id, label: id === template.focusActorId ? 'YOU' : id,
    name: id === template.focusActorId ? 'You' : id === 'G' ? 'The goalie' : id,
    team: id.startsWith('F') ? 'home' : 'away', role: id === 'G' ? 'goalie' : 'skater',
  }));
  const opening = createSequenceState(positions, { owner: 'F1', actors });
  for (const actor of opening.actors.filter(actor => actor.id !== 'F1')) {
    actor.facing = normalizeFacingRadians(Math.atan2(opening.puck.y - actor.y, opening.puck.x - actor.x));
  }
  return opening;
}

// These are configurations of two planning families, not admitted questions or
// independently reviewed lessons. Only requested states are materialized.
export const POSITIONING_TEMPLATES = Object.freeze([1, 2, 3, 4, 5].flatMap(teamSize => {
  const space = parameterSpace(teamSize);
  return enumerateParameterSpace(space).map((parameters, index) => {
    const defensive = teamSize === 1;
    const template = {
      id: `positioning-${teamSize}v${teamSize}-${String(index + 1).padStart(3, '0')}-v1`,
      title: defensive ? 'Defend the middle' : 'Stay available as the play moves',
      ageBand: 'U11', teamSize, focusActorId: defensive ? 'D1' : 'F2',
      concept: defensive ? 'gap-control' : 'off-puck-support-offense',
      sourceRefs: Object.freeze(sourceRefs(defensive).map(Object.freeze)),
      parameters: Object.freeze(parameters), parameterSpaceId: space.id,
      status: STATUS, proofMode: PROOF, scope: 'local-planning-prototype',
      attackingDirection: '+x', rinkProfileId: NHL_200X85_PROFILE.id,
      poseProvenance: 'Authored opening: F1 faces the attacking end; other skaters and G face the actual puck. F1 faces its carry path; the support-family D1 pressure pose faces F1. G turns toward each resulting puck freeze. The selected player keeps their submitted pose.',
      evidenceBoundary: 'Illustrated player and puck movements for coach discussion. No tactical score, physics approval, measured learning or bank admission.',
      get initialState() { return initialState(template); },
    };
    return Object.freeze(template);
  });
}));

const templatesById = new Map(POSITIONING_TEMPLATES.map(template => [template.id, template]));

function getTemplate(id) {
  const template = templatesById.get(id);
  if (!template) throw new RangeError('Choose a known positioning template.');
  return template;
}

function checkedSession(session) {
  const template = getTemplate(session?.templateId);
  if (session.version !== VERSION || !['read', 'playback', 'complete'].includes(session.phase)
      || !Number.isInteger(session.readIndex) || session.readIndex < 0 || session.readIndex > 2
      || !Array.isArray(session.answers) || !Number.isFinite(session.playbackProgress)
      || session.playbackProgress < 0 || session.playbackProgress > 1) throw new TypeError('The positioning session is invalid.');
  const expected = session.phase === 'read' ? session.readIndex : session.readIndex + 1;
  if (session.answers.length !== expected || (session.phase === 'complete' && session.readIndex !== 2)
      || (session.phase === 'playback' && session.readIndex === 2)) throw new TypeError('The positioning read order is invalid.');
  return template;
}

function boundedPoint(point) {
  if (![point?.x, point?.y].every(Number.isFinite)) throw new TypeError('The position needs finite rink coordinates.');
  const margin = BOARD_MARGIN;
  let x = clamp(point.x, margin, bounds.maxX - margin);
  let y = clamp(point.y, bounds.minY + margin, bounds.maxY - margin);
  const cornerX = bounds.maxX - CORNER_RADIUS;
  const cornerY = Math.sign(y || 1) * (bounds.maxY - CORNER_RADIUS);
  if (x > cornerX && Math.abs(y) > bounds.maxY - CORNER_RADIUS) {
    const distance = Math.hypot(x - cornerX, y - cornerY);
    const radius = CORNER_RADIUS - margin;
    if (distance > radius) {
      x = cornerX + (x - cornerX) * radius / distance;
      y = cornerY + (y - cornerY) * radius / distance;
    }
  }
  return { x, y };
}

function reasonText(reason) {
  if (typeof reason !== 'string' || !reason.trim()) throw new TypeError('Add a short reason for this position.');
  if (reason.trim().length > 600) throw new RangeError('Keep the reason to 600 characters or fewer.');
  return reason.trim();
}

function positioned(state, actorId, point) {
  const result = clone(state);
  if (point) Object.assign(result.actors.find(actor => actor.id === actorId), pointOf(point));
  return result;
}

function ownedState(actors, owner, faceGoalie = false) {
  const state = createSequenceState(Object.fromEntries(actors.map(actor => [actor.id, actor])), { owner, actors });
  if (faceGoalie) {
    const goalie = state.actors.find(actor => actor.id === 'G');
    goalie.facing = normalizeFacingRadians(Math.atan2(state.puck.y - goalie.y, state.puck.x - goalie.x));
  }
  return state;
}

function continuation(template, state, readIndex) {
  const actors = clone(state.actors);
  const carrier = actors.find(actor => actor.id === 'F1');
  const p = template.parameters;
  if (readIndex === 1 && template.teamSize >= 3) {
    return { kind: 'pass', to: ownedState(actors, 'F3', true) };
  }
  const dx = readIndex === 0 ? template.teamSize === 1 ? p.firstAdvance : 2.4 : p.secondAdvance;
  const dy = template.teamSize === 1 ? p.lateralCut * (readIndex === 0 ? 1 : -.5) : .4;
  carrier.x += dx;
  carrier.y += dy;
  carrier.facing = normalizeFacingRadians(Math.atan2(dy, dx));
  if (template.teamSize >= 2) {
    const defender = actors.find(actor => actor.id === 'D1');
    defender.x = carrier.x + 2.4;
    defender.y = carrier.y + .8;
    defender.facing = normalizeFacingRadians(Math.atan2(carrier.y - defender.y, carrier.x - defender.x));
  }
  return { kind: 'carry', to: ownedState(actors, 'F1', true) };
}

function closestDistance(fromA, toA, fromB, toB) {
  const dx = fromA.x - fromB.x, dy = fromA.y - fromB.y;
  const vx = (toA.x - fromA.x) - (toB.x - fromB.x);
  const vy = (toA.y - fromA.y) - (toB.y - fromB.y);
  const speedSquared = vx * vx + vy * vy;
  const t = speedSquared ? clamp(-(dx * vx + dy * vy) / speedSquared, 0, 1) : 0;
  return Math.hypot(dx + vx * t, dy + vy * t);
}

function assertClearIllustration(from, to, kind) {
  for (let i = 0; i < from.actors.length; i++) for (let j = i + 1; j < from.actors.length; j++) {
    if (closestDistance(from.actors[i], to.actors[i], from.actors[j], to.actors[j]) < BODY_CLEARANCE) {
      throw new RangeError('Players overlap in this illustrated continuation. Keep the idea for coach discussion or choose another spot.');
    }
  }
  if (kind === 'pass') for (const actor of from.actors.filter(actor => !['F1', 'F3'].includes(actor.id))) {
    const target = to.actors.find(item => item.id === actor.id);
    if (closestDistance(from.puck, to.puck, actor, target) < PASS_CLEARANCE) {
      throw new RangeError('This position crosses the illustrated pass path. Keep the idea for coach discussion or choose another spot.');
    }
  }
  if (kind !== 'pass' && from.puck.owner) {
    const carrier = from.actors.find(actor => actor.id === from.puck.owner);
    const endCarrier = to.actors.find(actor => actor.id === carrier.id);
    const turn = Math.atan2(Math.sin(endCarrier.facing - carrier.facing), Math.cos(endCarrier.facing - carrier.facing));
    const offset = { x: from.puck.x - carrier.x, y: from.puck.y - carrier.y };
    const steps = Math.max(1, Math.ceil(Math.abs(turn) / .12));
    // Bound the curved stick path between segment samples. The offset comes
    // from the canonical owned state, not a second authored stick length.
    const arcMargin = Math.hypot(offset.x, offset.y) * (turn / steps) ** 2 / 8;
    const at = (a, b, p) => ({ x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p });
    const puckAt = p => {
      if (p === 0) return from.puck;
      if (p === 1) return to.puck;
      const centre = at(carrier, endCarrier, p), angle = turn * p;
      return { x: centre.x + offset.x * Math.cos(angle) - offset.y * Math.sin(angle),
        y: centre.y + offset.x * Math.sin(angle) + offset.y * Math.cos(angle) };
    };
    for (let step = 0; step < steps; step++) {
      const start = step / steps, end = (step + 1) / steps;
      for (const actor of from.actors.filter(actor => actor.id !== carrier.id)) {
        const target = to.actors.find(item => item.id === actor.id);
        if (closestDistance(puckAt(start), puckAt(end), at(actor, target, start), at(actor, target, end)) < PASS_CLEARANCE + arcMargin) {
          throw new RangeError('The illustrated puck path meets a player at this position. Keep the idea for coach discussion or choose another spot.');
        }
      }
    }
  }
}

function checkAnswer(answer, state, template, index) {
  const origin = pointOf(state.actors.find(actor => actor.id === template.focusActorId));
  if (answer?.number !== index + 1 || answer.actorId !== template.focusActorId
      || canonicalStringify(answer.beforeState) !== canonicalStringify(state)
      || canonicalStringify(answer.origin) !== canonicalStringify(origin)
      || canonicalStringify(boundedPoint(answer.point)) !== canonicalStringify(answer.point)
      || reasonText(answer.reason) !== answer.reason) throw new TypeError('A saved positioning answer does not match its actual freeze.');
  return positioned(state, template.focusActorId, answer.point);
}

function readOriginState(session, template) {
  let state = template.initialState;
  for (let index = 0; index < session.readIndex; index++) {
    const from = checkAnswer(session.answers[index], state, template, index);
    const { to, kind } = continuation(template, from, index);
    assertClearIllustration(from, to, kind);
    state = to;
  }
  return state;
}

function interpolate(from, to, progress, kind) {
  if (progress === 0) return clone(from);
  if (progress === 1) return clone(to);
  const actors = from.actors.map(actor => {
    const end = to.actors.find(item => item.id === actor.id);
    const angle = Math.atan2(Math.sin(end.facing - actor.facing), Math.cos(end.facing - actor.facing));
    return { ...actor, x: actor.x + (end.x - actor.x) * progress, y: actor.y + (end.y - actor.y) * progress,
      facing: normalizeFacingRadians(actor.facing + angle * progress) };
  });
  if (kind === 'carry') return ownedState(actors, 'F1');
  return { actors, puck: { owner: null, x: from.puck.x + (to.puck.x - from.puck.x) * progress, y: from.puck.y + (to.puck.y - from.puck.y) * progress } };
}

export function createPositioningSession(templateId = POSITIONING_TEMPLATES[0].id) {
  getTemplate(templateId);
  return { version: VERSION, templateId, phase: 'read', readIndex: 0, answers: [], point: null, playbackProgress: 0 };
}

export function positioningState(session) {
  const template = checkedSession(session);
  const state = readOriginState(session, template);
  if (session.phase === 'read') return positioned(state, template.focusActorId, session.point && boundedPoint(session.point));
  const from = checkAnswer(session.answers[session.readIndex], state, template, session.readIndex);
  if (session.phase === 'complete') return from;
  const { to, kind } = continuation(template, from, session.readIndex);
  assertClearIllustration(from, to, kind);
  return interpolate(from, to, session.playbackProgress, kind);
}

export function movePositioningPlayer(session, point) {
  checkedSession(session);
  if (session.phase !== 'read') throw new Error('Finish the playing example before moving the player for the next read.');
  positioningState(session);
  return { ...clone(session), point: boundedPoint(point) };
}

export function positionChoicePoint(session, choice) {
  const template = checkedSession(session);
  if (session.phase !== 'read') throw new Error('Choose a position during a read.');
  if (!['stay', 'back', 'forward'].includes(choice)) throw new RangeError('Choose Stay, Back or Forward.');
  const origin = readOriginState(session, template).actors.find(actor => actor.id === template.focusActorId);
  const ownNetDirection = template.teamSize === 1 ? 1 : -1;
  if (choice === 'stay') return pointOf(origin);
  const cornerX = bounds.maxX - CORNER_RADIUS, cornerY = bounds.maxY - CORNER_RADIUS;
  const maxX = Math.abs(origin.y) > cornerY
    ? cornerX + Math.sqrt(Math.max(0, (CORNER_RADIUS - BOARD_MARGIN) ** 2 - (Math.abs(origin.y) - cornerY) ** 2)) - 1e-9
    : bounds.maxX - BOARD_MARGIN;
  return { x: clamp(origin.x + (choice === 'back' ? 3 : -3) * ownNetDirection, BOARD_MARGIN, maxX), y: origin.y };
}

export function submitPositioningRead(session, reason) {
  const template = checkedSession(session);
  if (session.phase !== 'read') throw new Error('This positioning read has already been submitted.');
  if (!session.point) throw new Error('Choose Stay, Back, Forward or a position on the rink.');
  const text = reasonText(reason);
  const beforeState = readOriginState(session, template);
  const from = positioned(beforeState, template.focusActorId, boundedPoint(session.point));
  const next = session.readIndex < 2 ? continuation(template, from, session.readIndex) : { to: from, kind: 'position' };
  assertClearIllustration(from, next.to, next.kind);
  return {
    ...clone(session), phase: session.readIndex === 2 ? 'complete' : 'playback', point: null, playbackProgress: 0,
    answers: [...clone(session.answers), { number: session.readIndex + 1, actorId: template.focusActorId,
      origin: pointOf(beforeState.actors.find(actor => actor.id === template.focusActorId)),
      point: pointOf(from.actors.find(actor => actor.id === template.focusActorId)), reason: text, beforeState }],
  };
}

export function advancePositioningPlayback(session, progress) {
  checkedSession(session);
  if (session.phase !== 'playback') throw new Error('No positioning continuation is playing.');
  if (!Number.isFinite(progress)) throw new TypeError('Playback progress must be finite.');
  positioningState(session);
  const next = { ...clone(session), playbackProgress: clamp(progress, 0, 1) };
  if (next.playbackProgress === 1) {
    next.phase = 'read';
    next.readIndex += 1;
    next.playbackProgress = 0;
  }
  return next;
}

export function positioningRead(session) {
  const template = checkedSession(session);
  const state = positioningState(session);
  const defensive = template.teamSize === 1;
  const holder = state.puck.owner;
  const prompts = defensive ? [
    'F1 has the puck. Where should YOU defend from?',
    'F1 has carried into a new space. Would you stay or adjust?',
    'F1 still has the puck. Where would you defend from here?',
  ] : [
    'F1 has the puck. Where could YOU be available?',
    'F1 has moved with the puck. Would you stay or adjust?',
    `${template.teamSize >= 3 ? 'F3' : 'F1'} has the puck. Where could YOU help from here?`,
  ];
  return {
    number: session.readIndex + 1, actorId: template.focusActorId, possession: holder,
    prompt: session.phase === 'playback' ? session.readIndex === 1 && template.teamSize >= 3 ? 'Watch the pass from F1 to F3.' : 'Watch F1 carry into the shown space.' : session.phase === 'complete' ? 'Your three positions are ready to discuss.' : prompts[session.readIndex],
    cue: defensive ? 'Look at F1, the middle of the ice and the net you are defending.' : `Look at ${holder || 'the puck'}, the defenders and the space between teammates.`,
    choiceHints: { stay: 'Keep your position at the start of this read.', back: 'Move up to three metres toward your own net.', forward: 'Move up to three metres up ice, away from your own net.' },
    directionExplanation: defensive ? 'You defend the net F1 is attacking. Back is toward your own net; Forward is up ice toward the other end.' : 'Your own net is at the other end. Back is toward your own net; Forward is toward the attacking end.',
  };
}

export function restorePositioningSession(raw) {
  try {
    const saved = typeof raw === 'string' ? JSON.parse(raw) : raw;
    checkedSession(saved);
    let session = createPositioningSession(saved.templateId);
    for (const answer of saved.answers) {
      if (session.phase === 'playback') session = advancePositioningPlayback(session, 1);
      session = submitPositioningRead(movePositioningPlayer(session, answer.point), answer.reason);
    }
    if (saved.phase === 'read' && session.phase === 'playback') session = advancePositioningPlayback(session, 1);
    if (saved.phase === 'playback') session = advancePositioningPlayback(session, saved.playbackProgress);
    if (saved.phase === 'read' && saved.point) session = movePositioningPlayer(session, saved.point);
    return canonicalStringify(session) === canonicalStringify(saved) ? session : null;
  } catch { return null; }
}
