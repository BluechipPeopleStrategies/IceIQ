import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const root = new URL('../../', import.meta.url);
const cache = new URL('node_modules/.cache/rinkreads-board-inspection/', root);
mkdirSync(cache, { recursive: true });
const modules = {};
for (const [name, source] of Object.entries({ inspection: 'src/visuals/BoardInspection.jsx', curriculum: 'src/one-on-one/GuidedCurriculum.jsx' })) {
  const output = new URL(`${name}.mjs`, cache);
  await build({ entryPoints: [fileURLToPath(new URL(source, root))], outfile: fileURLToPath(output), bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, logLevel: 'silent' });
  modules[name] = await import(output.href);
}
const BoardInspection = modules.inspection.default;
const { CurriculumBoard } = modules.curriculum;
const pack = JSON.parse(readFileSync(new URL('src/one-on-one/curriculum-draft.json', root), 'utf8'));

test('closed inspection renders without browser globals and does not create another board or WebGL surface', () => {
  let renders = 0;
  const html = renderToStaticMarkup(createElement(BoardInspection, { title: 'U11 <original>', renderBoard: () => { renders++; return createElement('svg'); } }));
  assert.equal(renders, 0);
  assert.doesNotMatch(html, /<svg|<canvas|<dialog[^>]*\sopen(?:\s|>)/);
  assert.match(html, /aria-label="Enlarge board: U11 &lt;original&gt;"/);
  assert.match(html, /aria-label="Zoom out" disabled=""/);
  assert.match(html, /aria-label="Zoom in"/);
});

test('separate inspectors retain distinct accessible names and dialog descriptions', () => {
  const html = renderToStaticMarkup(createElement(Fragment, null, ...['My position', 'Coach reference'].map(title => createElement(BoardInspection, { key: title, title, renderBoard: () => null }))));
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, 4);
  assert.equal(new Set(ids).size, ids.length);
  for (const label of ['My position', 'Coach reference']) assert.ok(html.includes(`Enlarge board: ${label}`));
  for (const reference of html.matchAll(/aria-(?:labelledby|describedby)="([^"]+)"/g)) assert.ok(ids.includes(reference[1]));
});

test('all curriculum boards opt into one closed inspector while retaining the exact actors, headings and source data', () => {
  for (const lesson of pack.lessons) for (const question of lesson.questions) {
    const before = JSON.stringify(question.visual);
    const normal = renderToStaticMarkup(createElement(CurriculumBoard, { visual: question.visual, title: lesson.title, inspectable: true }));
    const readOnly = renderToStaticMarkup(createElement(CurriculumBoard, { visual: question.visual, title: lesson.title }));
    assert.equal((normal.match(/data-hockey-art=/g) || []).length, question.visual.actors.length);
    assert.equal((normal.match(/class="board-inspection-open"/g) || []).length, 1);
    assert.doesNotMatch(readOnly, /<button|<dialog|<canvas/);
    for (const actor of question.visual.actors) assert.ok(readOnly.includes(`translate(${actor.x} ${actor.y})`));
    assert.equal((readOnly.match(/data-pose="authored-heading"/g) || []).length, question.visual.actors.length);
    assert.equal(JSON.stringify(question.visual), before);
  }
});
