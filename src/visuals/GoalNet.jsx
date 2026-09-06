import { useEffect, useMemo } from 'react';
import { CylinderGeometry, Quaternion, Vector3 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Woven rope on rear, sides and roof. The front goal mouth stays open. */
export function createGoalNetGeometry(goalX) {
  const z = -goalX, w = .9144, h = 1.2192;
  const pieces = [], up = new Vector3(0,1,0);
  const point = (corners,u,v) => {
    const a = new Vector3(...corners[0]).lerp(new Vector3(...corners[1]),u);
    const b = new Vector3(...corners[2]).lerp(new Vector3(...corners[3]),u);
    return a.lerp(b,v);
  };
  const strand = (a,b) => {
    const delta = b.clone().sub(a);
    const geometry = new CylinderGeometry(.0025,.0025,delta.length(),5,1);
    geometry.applyQuaternion(new Quaternion().setFromUnitVectors(up,delta.normalize()));
    geometry.translate(...a.clone().add(b).multiplyScalar(.5).toArray());
    pieces.push(geometry);
  };
  const panel = (corners,cols,rows) => {
    for(let i=0;i<=cols;i++) strand(point(corners,i/cols,0),point(corners,i/cols,1));
    for(let j=0;j<=rows;j++) strand(point(corners,0,j/rows),point(corners,1,j/rows));
  };
  panel([[-.74,.03,z-1.1],[.74,.03,z-1.1],[-.6,.91,z-.85],[.6,.91,z-.85]],30,20);
  for(const side of [-1,1]) panel([[side*w,.03,z],[side*.74,.03,z-1.1],[side*w,h,z],[side*.6,.91,z-.85]],24,25);
  panel([[-w,h,z],[w,h,z],[-.6,.91,z-.85],[.6,.91,z-.85]],36,20);
  const result = mergeGeometries(pieces,false);
  pieces.forEach(part=>part.dispose());
  result.computeBoundingBox();
  return result;
}

export default function GoalNet({goalX}) {
  const geometry=useMemo(()=>createGoalNetGeometry(goalX),[goalX]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh geometry={geometry} receiveShadow><meshStandardMaterial color="#e4e6dd" roughness={.95}/></mesh>;
}
