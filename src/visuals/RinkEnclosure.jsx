import { RINK } from '../one-on-one/rinkMaterials.js';

/** Neutral arena geometry for low player-eye views. No gameplay coordinates. */
export default function RinkEnclosure() {
  const width = RINK.widthM + 18;
  const length = RINK.lengthM + 16;
  return <group>
    {[-1, 1].map(side => <group key={side}>
      <mesh position={[side * width / 2, 6, 0]}><boxGeometry args={[.4, 12, length]} /><meshStandardMaterial color="#718291" roughness={.9} /></mesh>
      <mesh position={[0, 6, side * length / 2]}><boxGeometry args={[width, 12, .4]} /><meshStandardMaterial color="#718291" roughness={.9} /></mesh>
      {[0, 1, 2, 3, 4].map(row => <group key={row}>
        <mesh position={[side * (RINK.widthM / 2 + 2 + row), .4 + row * .4, 0]} receiveShadow><boxGeometry args={[1, .8 + row * .8, RINK.lengthM + 2]} /><meshStandardMaterial color={row % 2 ? '#4b6175' : '#394f65'} roughness={.85} /></mesh>
        <mesh position={[0, .4 + row * .4, side * (RINK.lengthM / 2 + 2 + row)]} receiveShadow><boxGeometry args={[RINK.widthM + 12, .8 + row * .8, 1]} /><meshStandardMaterial color={row % 2 ? '#4b6175' : '#394f65'} roughness={.85} /></mesh>
      </group>)}
      <mesh position={[side * (width / 2 - .3), 8, 0]}><boxGeometry args={[.1, .15, length]} /><meshBasicMaterial color="#dcebf5" /></mesh>
      <mesh position={[0, 8, side * (length / 2 - .3)]}><boxGeometry args={[width, .15, .1]} /><meshBasicMaterial color="#dcebf5" /></mesh>
    </group>)}
    <mesh position={[0, 12, 0]}><boxGeometry args={[width, .3, length]} /><meshStandardMaterial color="#85929d" roughness={.9} /></mesh>
    {[-30, -20, -10, 0, 10, 20, 30].map(z => <group key={z}>
      <mesh position={[0, 10.8, z]}><boxGeometry args={[width, .3, .22]} /><meshStandardMaterial color="#c3ccd2" roughness={.7} /></mesh>
      {[-9, 9].map(x => <mesh key={x} position={[x, 10.5, z]}><boxGeometry args={[2.8, .12, .6]} /><meshBasicMaterial color="#f3f7ff" /></mesh>)}
    </group>)}
  </group>;
}
