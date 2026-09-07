import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const output = new URL('../../node_modules/.cache/camera-view-controls/component.mjs', import.meta.url);
mkdirSync(new URL('./', output), { recursive: true });
await build({ entryPoints: [fileURLToPath(new URL('./CameraViewControls.jsx', import.meta.url))], outfile: fileURLToPath(output), bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, logLevel: 'silent' });
const { default: CameraViewControls, CAMERA_VIEW_OPTIONS } = await import(output.href);
function nodes(node) { if (Array.isArray(node)) return node.flatMap(nodes); return node?.props ? [node, ...nodes(node.props.children)] : []; }
function controller(extra = {}) {
  const state = { preset: 'broadcast', adjusting: false, panMode: false, reset: 0 }, events = [];
  const props = () => ({ preset: state.preset, adjusting: state.adjusting, panMode: state.panMode, onPresetChange(value) { events.push(['preset', value]); state.preset = value; }, onAdjustingChange(value) { events.push(['adjusting', value]); state.adjusting = value; }, onPanModeChange(value) { events.push(['pan', value]); state.panMode = value; }, onReset() { events.push(['reset']); state.reset++; }, ...extra });
  const tree = () => CameraViewControls(props());
  return { state, events, tree, html: () => renderToStaticMarkup(createElement(CameraViewControls, props())), button(label) { return nodes(tree()).find(node => node.type === 'button' && node.props['aria-label'] === label); }, click(label) { const button = this.button(label); assert.ok(button, label); button.props.onClick(); } };
}

test('four accessible camera thumbnails select their exact preset and only leave adjustment mode', () => {
  const control = controller();
  for (const option of CAMERA_VIEW_OPTIONS) {
    control.state.adjusting = true; control.click(option.label);
    assert.equal(control.state.preset, option.value); assert.equal(control.state.adjusting, false); assert.equal(control.state.reset, 0);
    const button = control.button(option.label); assert.equal(button.props['aria-pressed'], true); assert.equal(button.props.title, `${option.label} view`);
  }
  const html = control.html();
  assert.equal((html.match(/class="cvc-thumbnail"/g) || []).length, 4);
  assert.equal((html.match(/aria-label="Camera angle"/g) || []).length, 1);
  assert.doesNotMatch(html, /role="status"|Finish adjusting to answer/);
});

test('Reset, Adjust, Turn, Move and Done retain their camera-only controlled callbacks', () => {
  const control = controller(); control.click('Reset view'); assert.equal(control.state.reset, 1);
  control.click('Adjust camera'); assert.equal(control.state.adjusting, true);
  control.click('Move view'); assert.equal(control.state.panMode, true); assert.match(control.html(), /Drag to move the view/);
  control.click('Turn view'); assert.equal(control.state.panMode, false); assert.match(control.html(), /Drag to turn the view/);
  control.click('Done adjusting'); assert.equal(control.state.adjusting, false); assert.equal(control.button('Move view'), undefined);
  assert.deepEqual(control.events, [['reset'], ['adjusting', true], ['pan', true], ['pan', false], ['adjusting', false]]);
});

test('disabled controls reject stale callbacks and optional movement instruction is retained', () => {
  const control = controller({ disabled: true, adjusting: true, instruction: 'Select D1, then tap the ice.' });
  for (const label of [...CAMERA_VIEW_OPTIONS.map(option => option.label), 'Reset view', 'Done adjusting', 'Turn view', 'Move view']) { assert.equal(control.button(label).props.disabled, true); control.click(label); }
  assert.deepEqual(control.events, []);
  assert.match(controller({ instruction: 'Select D1, then tap the ice.' }).html(), /Select D1, then tap the ice/);
});

test('camera controls retain 44px targets and allow the labelled adjustment button to wrap', () => {
  const css = readFileSync(new URL('./CameraViewControls.css', import.meta.url), 'utf8');
  assert.match(css, /\.cvc-row\{[^}]*flex-wrap:wrap/);
  assert.match(css, /\.cvc-presets\{[^}]*grid-template-columns:repeat\(4,minmax\(44px,1fr\)\)[^}]*flex:1 1 186px/);
  assert.match(css, /\.cvc-actions\{[^}]*flex:0 0 auto/);
  for (const selector of ['cvc-presets button', 'cvc-icon-button', 'cvc-adjustment-modes button']) {
    const escaped = selector.replaceAll(' ', '\\s+');
    assert.match(css, new RegExp(`\\.${escaped}\\{[^}]*min-(?:width|height):44px`));
    assert.match(css, new RegExp(`\\.${escaped}\\{[^}]*min-height:44px`));
  }
  assert.match(css, /\.camera-view-controls \.cvc-thumbnail\{[^}]*width:62px[^}]*max-width:100%[^}]*height:38px/);
  assert.doesNotMatch(css, /white-space:nowrap[^}]*width:100vw/);
});

test('visible size, angle and position buttons dispatch camera commands only', () => {
  const commands = [], control = controller({ adjusting: true, onCameraCommand: command => commands.push(command) });
  for (const name of ['Zoom in', 'Zoom out', 'Rotate left', 'Rotate right', 'Lower angle', 'Higher angle', 'Move left', 'Move right', 'Move up', 'Move down']) control.click(name);
  assert.deepEqual(commands.map(command => command.type), ['zoom', 'zoom', 'rotate', 'rotate', 'tilt', 'tilt', 'pan-x', 'pan-x', 'pan-y', 'pan-y']);
  assert.deepEqual(control.events, []);
  const disabled = controller({ disabled: true, adjusting: true, onCameraCommand: command => commands.push(command) });
  disabled.click('Zoom in');
  assert.equal(commands.length, 10);
});
