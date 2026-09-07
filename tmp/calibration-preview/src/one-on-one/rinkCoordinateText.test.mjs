import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCoordinateText, coordinateTextForValue } from './rinkCoordinateText.js';

test('clearing a coordinate and typing a minus sign cannot commit zero', () => {
  const committed = [];
  for (const text of ['', '-', '-4']) {
    const value = parseCoordinateText(text);
    if (value !== null) committed.push(value);
  }
  assert.deepEqual(committed, [-4]);
});

test('partial numbers and nonfinite values stay uncommitted', () => {
  for (const text of [' ', '.', '-.', '+', '1e', '-1e-', 'Infinity', '-Infinity', 'NaN', '1e999']) {
    assert.equal(parseCoordinateText(text), null, text);
  }
  assert.equal(parseCoordinateText('0'), 0);
  assert.equal(parseCoordinateText('-0.5'), -0.5);
  assert.equal(parseCoordinateText('12.25'), 12.25);
});

test('parent value echoes preserve the minus sign and decimal while typing a negative fraction', () => {
  assert.equal(coordinateTextForValue('-0', 0), '-0');
  assert.equal(coordinateTextForValue('-0.', 0), '-0.');
  assert.equal(coordinateTextForValue('-0.5', -0.5), '-0.5');
  assert.equal(coordinateTextForValue('12.00', 12), '12.00');
});

test('an external position change replaces stale or incomplete coordinate text', () => {
  assert.equal(coordinateTextForValue('-', 6), '6');
  assert.equal(coordinateTextForValue('', -4), '-4');
  assert.equal(coordinateTextForValue('-4', 9), '9');
  assert.equal(coordinateTextForValue('40', 28), '28');
});
