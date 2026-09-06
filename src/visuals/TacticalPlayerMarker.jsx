import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

export const isTacticalPresentation = presentation => presentation === 'tactical';

/** Ice-plane geometry: its projection follows the real camera and rink. */
export function buildTacticalPlayerMarker(colour = '#0B1A33') {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color: colour });
  const geometries = [];
  const add = (geometry, rotation = 0) => {
    geometries.push(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.y = rotation;
    group.add(mesh);
    return mesh;
  };
  const gold = new THREE.Color(colour).equals(new THREE.Color('#C9A24B'));
  group.userData.symbol = gold ? 'O' : 'X';
  if (gold) {
    const ring = add(new THREE.RingGeometry(.38, .53, 40));
    ring.rotation.x = -Math.PI / 2;
  } else {
    add(new THREE.BoxGeometry(.15, .025, 1.08), Math.PI / 4);
    add(new THREE.BoxGeometry(.15, .025, 1.08), -Math.PI / 4);
  }
  // Heading stays attached to the actor, not the camera. Team shape is separate.
  const heading = add(new THREE.ConeGeometry(.105, .24, 3));
  heading.rotation.x = -Math.PI / 2;
  heading.position.z = -.73;
  group.position.y = .055;
  return { group, dispose() { geometries.forEach(geometry => geometry.dispose()); material.dispose(); } };
}

export default function TacticalPlayerMarker({ colour }) {
  const marker = useMemo(() => buildTacticalPlayerMarker(colour), [colour]);
  useEffect(() => () => marker.dispose(), [marker]);
  return <primitive object={marker.group} />;
}
