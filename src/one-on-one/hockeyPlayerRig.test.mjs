import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3, Raycaster, Vector3 } from 'three';
import { CARRY_OFFSET } from './simulation.js';

let rigModule = {};
try { rigModule = await import('./hockeyPlayerRig.js'); } catch {}

test('shared hockey rig has bounded athlete proportions, finite surfaces and a phone-conscious mesh budget', () => {
  assert.equal(typeof rigModule.buildHockeyPlayerRig, 'function', 'The shared detailed ready-stance rig must exist.');
  for (const goalie of [false, true]) {
    const rig = rigModule.buildHockeyPlayerRig({ goalie, colour: '#0B1A33', number: '12' });
    try {
      rig.group.updateMatrixWorld(true);
      const bounds = new Box3().setFromObject(rig.group), size = bounds.getSize(new Vector3());
      assert.ok(size.y > 1.55 && size.y < 1.85, 'The rig must remain an athlete-sized body in canonical metres.');
      assert.ok(size.x < 1.5 && size.z < 1.5, 'No limb or stick should produce a giant silhouette.');
      let meshes = 0, triangles = 0;
      rig.group.traverse(part => {
        if (!part.isMesh) return;
        meshes++;
        const positions = part.geometry.getAttribute('position');
        triangles += (part.geometry.index?.count || positions.count) / 3;
        assert.ok([...positions.array].every(Number.isFinite));
      });
      assert.ok(meshes <= 14, 'Static equipment should be merged by material to limit draw calls.');
      assert.ok(triangles < 35000, 'Detailed players must stay within the bounded geometry budget.');
    } finally { rig.dispose(); }
  }
});

test('the neutral ready stance glides without lunging at any speed or shot clock', () => {
  const rig = rigModule.buildHockeyPlayerRig({ colour: '#C9A24B' });
  try {
    const transforms = () => {
      const result = [];
      rig.group.traverse(part => result.push([part.position.toArray(), part.rotation.toArray(), part.scale.toArray()]));
      return result;
    };
    const initial = transforms(), actor = { x: 8, y: 3, facing: Math.PI / 3, vx: 8, vy: -6 };
    const before = structuredClone(actor);
    for (const time of [0, .2, 1, 10, 999]) { rig.update(actor, time, time - .05); assert.deepEqual(transforms(), initial); }
    assert.deepEqual(actor, before, 'A presentation rig must never mutate simulation state.');
    assert.equal(rig.group.userData.pose, 'balanced-ready');
  } finally { rig.dispose(); }
});

test('home and away helmets match their jersey, equipment differs for goalies and real stick surfaces reach the carry offset', () => {
  for (const colour of ['#0B1A33', '#C9A24B']) {
    const rig = rigModule.buildHockeyPlayerRig({ colour });
    const goalie = rigModule.buildHockeyPlayerRig({ colour, goalie: true });
    try {
      const helmet = rig.group.children.find(part => part.name === 'equipment-helmet');
      assert.equal(`#${helmet.material.color.getHexString()}`.toUpperCase(), colour.toUpperCase());
      assert.ok(goalie.group.userData.parts.includes('catching-glove'));
      assert.ok(goalie.group.userData.parts.includes('goalie-blocker'));
      assert.ok(goalie.group.userData.parts.includes('goalie-pad-channels'));
      const contact = new Vector3(CARRY_OFFSET.lateral, .052, -CARRY_OFFSET.forward);
      let closest = Infinity;
      rig.group.traverse(part => {
        if (!part.isMesh) return;
        const positions = part.geometry.getAttribute('position');
        for (let index = 0; index < positions.count; index++) {
          const point = new Vector3().fromBufferAttribute(positions, index);
          closest = Math.min(closest, point.distanceTo(contact));
        }
      });
      assert.ok(closest < .11, 'The shaped blade must stay beside the actual simulation carry offset.');
    } finally { rig.dispose(); goalie.dispose(); }
  }
});

test('unknown stick authority can hide stick parts and owned GPU resources dispose once', () => {
  const rig = rigModule.buildHockeyPlayerRig({ showStick: false });
  assert.equal(rig.group.userData.parts.some(name => name.startsWith('stick-')), false);
  const disposals = [];
  rig.group.traverse(part => {
    if (!part.isMesh) return;
    let calls = 0;
    part.geometry.addEventListener('dispose', () => calls++);
    disposals.push(() => calls);
  });
  rig.dispose(); rig.dispose();
  assert.ok(disposals.length > 0);
  assert.ok(disposals.every(count => count() === 1));
});

test('the face opening exposes skin through the full cage instead of a helmet shell covering the eyes', () => {
  for (const goalie of [false, true]) {
    const rig = rigModule.buildHockeyPlayerRig({ goalie });
    try {
      rig.group.updateMatrixWorld(true);
      const ray = new Raycaster(new Vector3(.025, 1.54, -1), new Vector3(0, 0, 1));
      const hit = ray.intersectObject(rig.group, true)[0];
      assert.equal(hit?.object.name, 'equipment-skin', 'A clear cage opening must show the light face, not an opaque helmet.');
    } finally { rig.dispose(); }
  }
});

test('overhead visible uniform surfaces are overwhelmingly the actual team colour, including the shoulders and helmet', () => {
  // Sample the first rendered surface, not metadata or triangle counts: hidden
  // navy fabric must not compensate for large gold shoulders above it.
  for (const colour of ['#0B1A33', '#C9A24B']) for (const goalie of [false, true]) {
    const rig = rigModule.buildHockeyPlayerRig({ colour, goalie });
    try {
      rig.group.updateMatrixWorld(true);
      const ray = new Raycaster(), down = new Vector3(0, -1, 0);
      let primary = 0, contrast = 0, helmetPrimary = 0, helmetContrast = 0;
      const team = colour.slice(1).toLowerCase(), opposite = team === '0b1a33' ? 'c9a24b' : '0b1a33';
      for (let ix = 0; ix < 29; ix++) for (let iz = 0; iz < 29; iz++) {
        const x = -.43 + ix * .86 / 28, z = -.4 + iz * .62 / 28;
        ray.set(new Vector3(x, 3, z), down);
        const hit = ray.intersectObject(rig.group, true)[0];
        if (!hit) continue;
        const seen = hit.object.material.color.getHexString();
        if (seen === team) primary++;
        if (seen === opposite) contrast++;
        if (hit.point.y > 1.60) {
          if (seen === team) helmetPrimary++;
          if (seen === opposite) helmetContrast++;
        }
      }
      assert.ok(primary + contrast > 350, 'The sample must cover real visible uniform surfaces.');
      assert.ok(primary / (primary + contrast) >= .90, `${colour}/${goalie ? 'goalie' : 'skater'}: team colour must occupy at least90% of overhead uniform colour (${primary}/${primary + contrast}).`);
      assert.ok(helmetPrimary > 100, 'The helmet crown must be visible in the sample.');
      assert.ok(helmetPrimary / (helmetPrimary + helmetContrast) >= .94, 'Only a restrained contrast stripe belongs on the team-colour helmet.');
      // These points hit the shoulders outside the helmet silhouette.
      for (const x of [-.25, .25]) {
        ray.set(new Vector3(x, 3, .045), down);
        assert.equal(ray.intersectObject(rig.group, true)[0]?.object.material.color.getHexString(), team, 'The broad shoulder yoke must use the jersey colour.');
      }
    } finally { rig.dispose(); }
  }
});
