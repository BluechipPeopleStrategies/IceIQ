import { useMemo, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CARRY_OFFSET } from './simulation.js';

function jerseyTexture(number) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.font = '900 100px Arial'; ctx.textAlign = 'center'; ctx.fillText(number, 64, 102);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function buildRig(goalie, colour, number) {
  const group = new THREE.Group();
  const materials = {
    jersey: new THREE.MeshStandardMaterial({ color: colour, roughness: .72 }),
    dark: new THREE.MeshStandardMaterial({ color: '#101114', roughness: .66 }),
    trim: new THREE.MeshStandardMaterial({ color: colour === '#C9A24B' ? '#0B1A33' : '#C9A24B', roughness: .65 }),
    white: new THREE.MeshStandardMaterial({ color: '#f5f5ee', roughness: .6 }),
    skin: new THREE.MeshStandardMaterial({ color: '#e7b996', roughness: .82 }),
    metal: new THREE.MeshStandardMaterial({ color: '#b4c2c9', roughness: .25, metalness: .7 }),
    stick: new THREE.MeshStandardMaterial({ color: '#303c47', roughness: .42 }),
  };
  const geometries = [];
  const mesh = (geometry, material, p, parent = group) => {
    geometries.push(geometry); const m = new THREE.Mesh(geometry, material); m.position.set(...p); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  };
  const ellipsoid = (r, scale, mat, p, parent) => { const m = mesh(new THREE.SphereGeometry(r, 16, 12), mat, p, parent); m.scale.set(...scale); return m; };
  const box = (size, mat, p, parent) => mesh(new THREE.BoxGeometry(...size), mat, p, parent);
  const limb = (radius, mat) => mesh(new THREE.CylinderGeometry(radius * .87, radius, 1, 12), mat, [0, 0, 0]);
  const align = (m, a, b) => {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b); m.position.copy(va).add(vb).multiplyScalar(.5);
    m.scale.y = va.distanceTo(vb); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.sub(va).normalize());
  };
  const torso = new THREE.Group(); torso.position.set(0, .95, -.07); torso.rotation.x = .21; group.add(torso);
  ellipsoid(.29, [1.2, 1.22, .70], materials.jersey, [0, .12, 0], torso);
  box([.51, .10, .34], materials.trim, [0, -.12, 0], torso);
  box([.51, .02, .345], materials.white, [0, -.18, 0], torso);
  [-1,1].forEach(side=>ellipsoid(.14,[1.2,.4,1.4],materials.trim,[side*.26,.3,0],torso));
  ellipsoid(.29, [1.14, .63, .68], materials.dark, [0, .64, .04]);
  const neck = ellipsoid(.09, [1, 1, 1], materials.skin, [0, 1.33, -.14]);
  const head = ellipsoid(.16, [1, 1.1, 1], materials.skin, [0, 1.49, -.2]);
  ellipsoid(.181, [1.04, .88, 1.12], materials.dark, [0, 1.57, -.18]);
  box([.34, .035, .12], materials.dark, [0, 1.52, -.345]);
  // Youth full face cage; explicit bars remain readable from the game camera.
  for (let i = 0; i < 4; i++) box([.29 - i * .02, .014, .018], materials.metal, [0, 1.48 - i * .055, -.363 + i * .014]);
  for (let i = -1; i <= 1; i++) box([.012, .19, .018], materials.metal, [i * .085, 1.40, -.348]);
  const tex = jerseyTexture(number); const numMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
  mesh(new THREE.PlaneGeometry(.32, .32), numMat, [0, .14, .209], torso);
  const parts = [-1, 1].map(side => ({ side,
    thigh: limb(.145, materials.dark), shin: limb(goalie ? .15 : .098, goalie ? materials.white : materials.jersey),
    knee: ellipsoid(.115, [1, 1, 1], materials.dark, [0, 0, 0]),
    boot: box([.15, .13, .32], materials.dark, [0, 0, 0]),
    blade: box([.018, .045, .35], materials.metal, [0, 0, 0]),
    pad: goalie ? box([.27, .43, .16], materials.white, [0, 0, 0]) : null,
    upper: limb(.125, materials.jersey), lower: limb(.09, materials.jersey),
    glove: ellipsoid(.105, [1, .86, 1.18], materials.dark, [0, 0, 0]),
  }));
  const shaft = limb(.021, materials.stick); const blade = limb(.043, materials.dark);
  const stickTape = limb(.026, materials.white);
  const rig = { group, update(actor, time, actionTime = -100) {
    const speed = Math.hypot(actor.vx || 0, actor.vy || 0), stride = Math.min(speed / 5.5, 1);
    const cycle = time * (6 + speed * 1.3), shot = Math.max(0, 1 - (time - actionTime) * 3);
    torso.position.y = .96 + Math.cos(cycle * 2) * .015 * stride;
    parts.forEach(p => {
      const phase = cycle + (p.side === 1 ? Math.PI : 0);
      const spread = goalie ? .32 : .19 + Math.max(0, Math.sin(phase)) * .22 * stride;
      const foot = [p.side * spread, .10, Math.cos(phase) * .24 * stride];
      const knee = [p.side * (goalie ? .26 : .21), .39, -.13 + foot[2] * .45];
      align(p.thigh, [p.side * .16, .70, .03], knee); align(p.shin, knee, foot);
      p.knee.position.set(...knee); p.boot.position.set(...foot); p.blade.position.set(foot[0], .023, foot[2]);
      p.boot.rotation.y = goalie ? p.side * -.13 : -p.side * Math.max(0, Math.sin(phase)) * .28 * stride;
      p.blade.rotation.y = p.boot.rotation.y;
      if (p.pad) { p.pad.position.set(foot[0], .30, foot[2] - .10); p.pad.rotation.x = -.15; }
      const hand = p.side === -1 ? [-.21, 1.02, -.43 + shot * .28] : [.35, .76, -.60 + shot * .28];
      const elbow = [p.side * .43, .92, -.20 + shot * .1];
      align(p.upper, [p.side * .27, 1.16, -.09], elbow); align(p.lower, elbow, hand); p.glove.position.set(...hand);
    });
    const high = [-.26, 1.10, -.41 + shot * .28], low = [.63, .07, -.78 - shot * .25];
    align(shaft, high, low); align(blade, low, [CARRY_OFFSET.lateral, .052, -CARRY_OFFSET.forward - shot * .25]);
    align(stickTape, high, [-.16, .99, -.46 + shot * .28]);
    head.position.y = 1.49; neck.position.y = 1.33;
  }, dispose() { geometries.forEach(g => g.dispose()); Object.values(materials).forEach(m => m.dispose()); numMat.dispose(); tex.dispose(); } };
  return rig;
}

export default function Skater({ frameRef, actorKey, colour, number, goalie = false, selected = false }) {
  const holder = useRef();
  const rig = useMemo(() => buildRig(goalie, colour, number), [goalie, colour, number]);
  useEffect(() => () => rig.dispose(), [rig]);
  useFrame(() => {
    const frame = frameRef.current, actor = frame?.actors?.find(a => a.id === actorKey) || frame?.[actorKey]; if (!actor || !holder.current) return;
    holder.current.position.set(actor.y, 0, -actor.x);
    rig.group.rotation.y = -(actor.facing || 0);
    const actionTime = actorKey === 'attacker' ? frame.shotAt : actorKey === 'defender' ? frame.actionAt : null;
    rig.update(actor, frame.time, actionTime ?? -100);
    rig.group.scale.y = goalie && frame.outcome === 'save' ? .76 : 1;
  });
  return <group ref={holder}>
    {selected && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .018, 0]}><ringGeometry args={[.67, .74, 48]} /><meshBasicMaterial color="#d3943b" transparent opacity={.9} /></mesh>}
    <primitive object={rig.group} />
  </group>;
}
