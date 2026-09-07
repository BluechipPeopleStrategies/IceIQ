import { Html, Line } from '@react-three/drei';
import { useCallback, useMemo } from 'react';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import { RINK_AREA_REGIONS, rinkAreaRegionIntersectsBounds } from './rinkAreaGeometry.js';

const world = ([x, y], height = 0) => [y, height, -x];

function AreaRegion({ area }) {
  const {invalidate}=useThree();
  const ready=useCallback(node=>{if(node)invalidate();},[invalidate]);
  const shape = useMemo(() => {
    const next = new THREE.Shape(area.polygon.map(([x, y]) => new THREE.Vector2(y, -x)));
    next.closePath();
    return next;
  }, [area]);
  const outline = [...area.polygon, area.polygon[0]].map(point => world(point, .035));
  const labelPoint = area.polygon.reduce((sum, point) => [sum[0] + point[0], sum[1] + point[1]], [0, 0]).map(value => value / area.polygon.length);
  return <group>
    <mesh raycast={() => null} position={[0, .025, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <shapeGeometry args={[shape]} />
      <meshBasicMaterial color={area.color} transparent opacity={.075} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
    <Line raycast={() => null} points={outline} color={area.color} lineWidth={1} transparent opacity={.22} />
    <Html center position={world(labelPoint, .07)} zIndexRange={[8,5]} style={{ pointerEvents: 'none' }}>
      <span ref={ready} className="srv-area-name">{area.name}</span>
    </Html>
  </group>;
}

export default function RinkAreaLabels({ bounds }) {
  const visible = RINK_AREA_REGIONS.filter(area => rinkAreaRegionIntersectsBounds(area, bounds));
  return <group>{visible.map(area => <AreaRegion key={area.id} area={area} />)}</group>;
}
