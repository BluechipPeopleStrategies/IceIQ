import test from 'node:test';
import assert from 'node:assert/strict';
import { createLineupDragController } from './lineupDrag.js';

function fixture() {
  const previews = [], drops = [], captured = new Set(); let target = '1-C';
  const element = { setPointerCapture: id => captured.add(id), hasPointerCapture: id => captured.has(id), releasePointerCapture: id => captured.delete(id) };
  const event = values => ({ pointerId: 1, button: 0, buttons: 1, isPrimary: true, clientX: 10, clientY: 10, currentTarget: element, ...values });
  const controller = createLineupDragController({ findTarget: () => target, onPreview: value => previews.push(value), onDrop: (...args) => drops.push(args) });
  return { controller, previews, drops, captured, event, target(value) { target = value; } };
}
test('mouse and touch-sized drags preview then commit only a completed drop at the final target', () => {
  for (const pointerType of ['mouse', 'touch', 'pen']) {
    const f = fixture(); assert.equal(f.controller.down(f.event({ pointerType }), 'a', 'team'), true);
    f.controller.move(f.event({ clientX: 14 })); assert.equal(f.previews.length, 0);
    f.controller.move(f.event({ clientX: 20, pointerType })); assert.deepEqual(f.previews.at(-1), { playerId: 'a', x: 20, y: 10, target: '1-C' });
    f.target('bench'); assert.equal(f.controller.up(f.event({ clientX: 21, pointerType })), true);
    assert.deepEqual(f.drops, [['a', 'bench', 'team']]); assert.equal(f.previews.at(-1), null); assert.equal(f.captured.size, 0);
  }
});
test('click, outside drop, secondary pointer, cancellation, lost capture and unmount never commit a move', () => {
  const tap = fixture(); tap.controller.down(tap.event(), 'a'); tap.controller.up(tap.event()); assert.deepEqual(tap.drops, []);
  const outside = fixture(); outside.controller.down(outside.event(), 'a'); outside.controller.move(outside.event({ clientX: 50 })); outside.target(null); outside.controller.up(outside.event({ clientX: 50 })); assert.deepEqual(outside.drops, []);
  for (const interruption of ['cancel', 'lostcapture', 'unmount', 'multitouch']) {
    const f = fixture(); f.controller.down(f.event(), 'a'); f.controller.move(f.event({ clientX: 50 }));
    if (interruption === 'multitouch') f.controller.down(f.event({ pointerId: 2, isPrimary: false }), 'b'); else f.controller.cancel();
    f.controller.up(f.event({ clientX: 50 })); assert.deepEqual(f.drops, [], interruption); assert.equal(f.captured.size, 0); assert.equal(f.previews.at(-1), null);
  }
});
