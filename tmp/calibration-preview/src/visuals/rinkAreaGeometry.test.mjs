import test from 'node:test';
import assert from 'node:assert/strict';
import { RINK_AREA_REGIONS, rinkAreaPointInsideProfile, rinkAreaRegionIntersectsBounds } from './rinkAreaGeometry.js';

test('area regions stay inside the rounded rink profile', () => {
  assert.ok(RINK_AREA_REGIONS.length >= 13);
  for (const area of RINK_AREA_REGIONS) {
    assert.ok(area.polygon.length >= 4, area.id);
    for (const point of area.polygon) assert.equal(rinkAreaPointInsideProfile(point), true, `${area.id} point ${point}`);
  }
});

test('end regions mirror across centre ice and include both side lanes', () => {
  const rightSlot = RINK_AREA_REGIONS.find(area => area.id === 'right-slot');
  const leftSlot = RINK_AREA_REGIONS.find(area => area.id === 'left-slot');
  assert.deepEqual(leftSlot.polygon, rightSlot.polygon.map(([x, y]) => [-x, y]));
  assert.ok(RINK_AREA_REGIONS.some(area => area.id === 'right-half-wall-bottom'));
  assert.ok(RINK_AREA_REGIONS.some(area => area.id === 'left-half-wall-bottom'));
});

test('region visibility follows the camera x bounds', () => {
  const rightSlot = RINK_AREA_REGIONS.find(area => area.id === 'right-slot');
  assert.equal(rinkAreaRegionIntersectsBounds(rightSlot, { minX: 10, maxX: 30, minY: -12.954, maxY: 12.954 }), true);
  assert.equal(rinkAreaRegionIntersectsBounds(rightSlot, { minX: -30, maxX: -10, minY: -12.954, maxY: 12.954 }), false);
});

