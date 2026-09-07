import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const root = new URL('../../', import.meta.url);
const cache = new URL('node_modules/.cache/rinkreads-player-art/', root);
mkdirSync(cache, { recursive: true });
const modules = {};
for (const [name, path] of Object.entries({ rink: 'src/RinkReadsRink.jsx', stage: 'src/scenario/RinkStage.jsx', place: 'src/scenario/primitives/place.jsx', question: 'src/RinkReadsRinkQuestion.jsx' })) {
  const outfile = new URL(`${name}.mjs`, cache);
  await build({ entryPoints: [fileURLToPath(new URL(path, root))], outfile: fileURLToPath(outfile), bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', logLevel: 'silent' });
  modules[name] = await import(outfile.href);
}
const render = (Component, props) => renderToStaticMarkup(Component === modules.place.PlacePrimitive
  ? createElement('svg', null, createElement(Component, props)) : createElement(Component, props));
const art = html => {
  // Count actors on the board separately from the matching legend glyphs.
  const board = html.match(/<svg[^>]*data-rink-layer="actors"[\s\S]*?<\/svg>/)?.[0] || html;
  return [...board.matchAll(/<g\b[^>]*data-hockey-art="(?:skater|goalie)"[^>]*>/g)].map(match => match[0]);
};
const actors = [
  { id: 'you', kind: 'player', x: .6, y: .5, tag: 'YOU' },
  { id: 'mate', kind: 'teammate', x: .75, y: .25, tag: 'F2' },
  { id: 'd', kind: 'defender', x: .8, y: .5 },
  { id: 'g', kind: 'goalie', x: .91, y: .5 },
  { id: 'p', kind: 'puck', x: .6, y: .5 },
];

// Capture the actual component tree under React's server hook dispatcher.
// Calling a returned one-step handler checks its onAnswer contract without
// claiming to simulate stateful drag events or a browser layout.
function questionButtons(question, onAnswer) {
  let tree;
  function Capture() {
    tree = modules.question.default({ question, onAnswer });
    while (typeof tree?.type === 'function') {
      tree = tree.type.prototype?.isReactComponent ? tree.props.children : tree.type(tree.props);
    }
    return null;
  }
  renderToStaticMarkup(createElement(Capture));
  const buttons = [];
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!node || typeof node !== 'object') return;
    if (node.type === 'button') buttons.push(node);
    visit(node.props?.children);
  }
  visit(tree);
  return buttons;
}

test('legacy player artwork retains marker anchors, labels and non-player markers', () => {
  const markers = [
    { type: 'player', label: 'YOU', x: 360, y: 150 },
    { type: 'defender', label: 'D', x: 480, y: 150 },
    { type: 'goalie', x: 546, y: 150 },
    { type: 'puck', x: 365, y: 154 },
    { type: 'number', label: '2', x: 400, y: 50 },
  ];
  const before = JSON.stringify(markers);
  const html = render(modules.rink.default, { view: 'right', markers });
  assert.equal(art(html).length, 3, 'The three human markers must use the shared equipment artwork');
  for (const point of markers) assert.ok(html.includes(`translate(${point.x}, ${point.y})`));
  assert.match(html, />YOU<\/text>/);
  assert.match(html, />2<\/text>/);
  assert.equal(JSON.stringify(markers), before);
});

test('ice styling preserves the 600x300 frame, crops and goal-line coordinates', () => {
  for (const [view, viewBox] of Object.entries({ full: '-15 -15 630 330', left: '-15 -15 330 330', right: '285 -15 330 330', neutral: '198 -15 204 330' })) {
    const html = render(modules.rink.default, { view });
    assert.ok(html.includes(`viewBox="${viewBox}"`));
    if (view === 'full' || view === 'left') assert.match(html, /<rect x="39.7" y="0" width="0.6" height="300"/);
    if (view === 'full' || view === 'right') assert.match(html, /<rect x="559.7" y="0" width="0.6" height="300"/);
    assert.doesNotMatch(html, /NaN|Infinity/);
  }
});

test('unified artwork leaves canonical anchors and carried-puck display offset intact and omits hidden actors', () => {
  const before = JSON.stringify(actors);
  const html = render(modules.stage.default, { stage: { view: 'right', zone: 'off-zone' }, levels: ['U11 / Atom'], actors, hiddenIds: ['mate'] });
  assert.equal(art(html).length, 3, 'A primitive-owned actor must not appear twice');
  assert.match(html, /data-rink-actor="you"[^>]*transform="translate\(360,150\)"/);
  assert.match(html, /data-rink-actor="d"[^>]*transform="translate\(480,150\)"/);
  assert.match(html, /data-rink-actor="p"[^>]*transform="translate\(376.56,165.87\)"/);
  assert.doesNotMatch(html, /data-rink-actor="mate"/);
  assert.equal(JSON.stringify(actors), before);
});

test('goalie team and youngest-band identity rules survive the artwork change', () => {
  for (const [zone, team] of [['def-zone', 'home'], ['off-zone', 'away']]) {
    const html = render(modules.stage.default, { stage: { view: 'full', zone }, levels: ['U9 / Novice'], actors });
    assert.ok(art(html).some(tag => tag.includes('data-hockey-art="goalie"') && tag.includes(`data-team="${team}"`)));
    assert.match(html, />YOU<\/text>/);
    assert.doesNotMatch(html, />F2<\/text>/);
    assert.doesNotMatch(html, /viewBox="-15 -15 630 330"/);
  }
});

test('only an authored nondegenerate facing point supplies a direction to the player art', () => {
  const directed = [{ id: 'a', kind: 'teammate', x: .5, y: .5, facing: { x: .6, y: .7 } }];
  const html = render(modules.stage.default, { stage: { view: 'full' }, levels: ['U11'], actors: directed });
  assert.match(html, /data-facing="45(?:\.0+)?"/);
  const neutral = render(modules.stage.default, { stage: { view: 'full' }, levels: ['U11'], actors: [{ ...directed[0], facing: { x: .5, y: .5 } }] });
  assert.equal(art(neutral).length, 1);
  assert.doesNotMatch(neutral, /data-facing="-?\d/);
});

test('placement uses the same artwork at authored starts without revealing targets or recording an answer', () => {
  let answers = 0;
  const html = render(modules.place.PlacePrimitive, {
    interaction: { items: ['you', 'mate'], prompt: 'Move both players.' },
    correct: { kind: 'place', placements: [{ id: 'you', x: .8, y: .4, tolerance: .05 }, { id: 'mate', x: .9, y: .6, tolerance: .05 }] },
    actors, svgPoint: () => ({ x: .7, y: .7 }), view: 'right', locked: false, onAnswer: () => { answers++; },
  });
  assert.equal(art(html).length, 2);
  assert.match(html, /translate\(360,150\)/);
  assert.match(html, /translate\(450,75\)/);
  assert.match(html, />F2<\/text>/);
  assert.doesNotMatch(html, /<ellipse[^>]*cx="(?:480|540)"/);
  assert.equal(answers, 0);
});

test('legacy selection and sequence use equipment at the same authored points without revealing answers', () => {
  for (const type of ['multi-tap', 'sequence-rink']) {
    let answers = 0;
    const question = { id: `test-${type}`, type, q: 'Choose a player.', rink: { view: 'right' }, markers: [
      { type: 'player', x: 350, y: 160, label: 'YOU', correct: true, order: 2 },
      { type: 'defender', x: 460, y: 140, label: 'D', correct: false, order: 1 },
    ] };
    const before = JSON.stringify(question);
    const html = render(modules.question.default, { question, onAnswer: () => { answers++; } });
    assert.equal(art(html).length, 2);
    assert.match(html, /translate\(350,160\)/);
    assert.match(html, /translate\(460,140\)/);
    assert.match(html, /<circle cx="0" cy="0" r="11"/);
    assert.match(html, />YOU<\/text>/);
    assert.doesNotMatch(html, /also here|>missed<|The numbers show the correct order/);
    assert.equal(answers, 0);
    assert.equal(JSON.stringify(question), before);
  }
});

test('image assessment keeps its authored fit and overlay locations with no zoom controls', () => {
  for (const aspect of ['16:9', undefined]) {
    const question = { id: 'image-hit', type: 'hot-spots', q: 'Choose a spot.', media: { type: 'image', url: '/test-rink.png', alt: 'Rink from the player view', aspect }, spots: [{ x: .6, y: .4, correct: true }] };
    const html = render(modules.question.default, { question });
    assert.match(html, /src="\/test-rink.png"/);
    assert.match(html, /alt="Rink from the player view"/);
    assert.match(html, new RegExp(`object-fit:${aspect ? 'cover' : 'contain'}`));
    if (aspect) assert.match(html, /aspect-ratio:16\/9/);
    assert.match(html, /left:60%;top:40%/);
    assert.match(html, /aria-label="Option 1"/);
    assert.doesNotMatch(html, /Zoom|Enlarge|data-hockey-art/);
  }
});

test('all four image-native interactions retain the exact coordinate and answer objects used by their handlers', () => {
  for (const type of ['hot-spots', 'rink-label', 'rink-drag', 'rink-match']) {
    const question = { id: `image-${type}`, type, q: 'Choose a spot.', media: { type: 'image', url: '/test-rink.png', aspect: '16:9' },
      spots: [{ x: .6, y: .4, correct: true, correctId: 'blue_line', correctChip: 'blue_line', options: ['blue_line', 'red_line'] }],
      chips: ['blue_line'], options: ['blue_line', 'red_line'] };
    const before = JSON.stringify(question);
    const result = modules.question.scaleNormalizedCoordsForRender(question);
    assert.equal(result, question);
    assert.equal(result.spots, question.spots);
    assert.equal(result.spots[0], question.spots[0], 'The render and hit/answer handler receive the same authored spot');
    const html = render(modules.question.default, { question });
    assert.match(html, /left:60%;top:40%/);
    assert.doesNotMatch(html, /Question data incomplete/);
    assert.equal(JSON.stringify(question), before);
  }
});

test('legacy image-backed SVG paths still scale their geometry once and retain answer identities', () => {
  const question = { id: 'legacy-image-svg', type: 'drag-target', q: 'Pass to a target.', media: { type: 'image', url: '/test-rink.png' },
    puckStart: { x: .2, y: .5 }, targets: [{ id: 'open', x: .8, y: .25, radius: .1, verdict: 'best' }],
    lanes: [{ id: 'pass', x1: .2, y1: .5, x2: .8, y2: .25, correct: true }],
    idealPath: [{ x: .2, y: .5 }, { x: .8, y: .25 }] };
  const before = JSON.stringify(question);
  const result = modules.question.scaleNormalizedCoordsForRender(question);
  assert.deepEqual(result.puckStart, { x: 120, y: 150 });
  assert.deepEqual(result.targets[0], { id: 'open', x: 480, y: 75, radius: 6, verdict: 'best' });
  assert.deepEqual(result.lanes[0], { id: 'pass', x1: 120, y1: 150, x2: 480, y2: 75, correct: true });
  assert.deepEqual(result.idealPath, [{ x: 120, y: 150 }, { x: 480, y: 75 }]);
  assert.equal(modules.question.scaleNormalizedCoordsForRender(result), result, 'Already scaled geometry stays unchanged');
  assert.equal(JSON.stringify(question), before);
  const procedural = { ...question, media: undefined };
  assert.equal(modules.question.scaleNormalizedCoordsForRender(procedural), procedural);
});

test('an unspecified goalie team stays neutral in artwork treatment and legend text', () => {
  const html = render(modules.stage.default, { stage: { view: 'full' }, levels: ['U13'], actors: [actors[3]] });
  assert.match(html, /filter:grayscale\(1\)/);
  assert.match(html, />goalie<\/span>/);
  assert.doesNotMatch(html, />your goalie<|>their goalie</);
});

test('the real image-hotspot handler reports the chosen authored verdict after normalization', () => {
  for (const correct of [true, false]) {
    const question = { id: 'hotspot-handler', type: 'hot-spots', q: 'Choose a spot.', media: { type: 'image', url: '/test-rink.png' }, spots: [{ x: .6, y: .4, correct }] };
    const before = JSON.stringify(question), answers = [];
    const button = questionButtons(question, answer => answers.push(answer)).find(item => item.props['aria-label'] === 'Option 1');
    assert.ok(button);
    button.props.onClick();
    assert.deepEqual(answers, [correct]);
    assert.equal(JSON.stringify(question), before);
  }
});

test('the real image-label handler keeps correct and incorrect feature IDs distinct', () => {
  for (const [label, expected] of [['Blue Line', true], ['Centre Red Line', false]]) {
    const question = { id: 'label-handler', type: 'rink-label', q: 'Name the feature.', media: { type: 'image', url: '/test-rink.png' }, spots: [{ x: .6, y: .4, correctId: 'blue_line', options: ['blue_line', 'red_line'] }] };
    const before = JSON.stringify(question), answers = [];
    const button = questionButtons(question, answer => answers.push(answer)).find(item => item.props.children === label);
    assert.ok(button);
    button.props.onClick();
    assert.deepEqual(answers, [expected]);
    assert.equal(JSON.stringify(question), before);
  }
});
