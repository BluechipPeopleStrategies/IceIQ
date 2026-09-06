import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';

const cache = new URL('../../node_modules/.cache/tactical-marker/',import.meta.url);
mkdirSync(cache,{recursive:true});
const output = new URL('marker.mjs',cache);
await build({entryPoints:[fileURLToPath(new URL('./TacticalPlayerMarker.jsx',import.meta.url))],outfile:fileURLToPath(output),bundle:true,packages:'external',platform:'node',format:'esm',jsx:'automatic',logLevel:'silent'});
const {buildTacticalPlayerMarker,isTacticalPresentation} = await import(output.href);
const skaterSource = new URL('../one-on-one/ScenarioSkater.jsx',import.meta.url);
const skaterOutput = new URL('skater.mjs',cache);
await build({stdin:{contents:readFileSync(skaterSource,'utf8').replace("from 'react';","from 'test:hooks';").replace("from '@react-three/fiber';","from 'test:frame';"),resolveDir:fileURLToPath(new URL('.',skaterSource)),loader:'jsx'},outfile:fileURLToPath(skaterOutput),bundle:true,packages:'external',platform:'node',format:'esm',jsx:'automatic',logLevel:'silent',plugins:[{name:'hooks',setup(api){
  api.onResolve({filter:/^test:/},args=>({path:args.path,namespace:'test'}));
  api.onLoad({filter:/.*/,namespace:'test'},args=>({contents:args.path==='test:frame'?'export const useFrame=callback=>globalThis.__tacticalFrame=callback;':['useMemo','useEffect','useRef'].map(name=>`export const ${name}=(...args)=>globalThis.__tacticalHooks.${name}(...args);`).join('\n')}));
}}]});
const {default:Skater} = await import(skaterOutput.href);

test('tactical option is explicit, with distinct physical X/O team geometry', () => {
  assert.equal(isTacticalPresentation(undefined),false);
  assert.equal(isTacticalPresentation('characters'),false);
  assert.equal(isTacticalPresentation('tactical'),true);
  for (const [colour,symbol,shape] of [['#0B1A33','X','BoxGeometry'],['#C9A24B','O','RingGeometry']]) {
    const marker = buildTacticalPlayerMarker(colour);
    assert.equal(marker.group.userData.symbol,symbol);
    assert.equal(marker.group.children[0].geometry.type,shape);
    marker.group.traverse(object=> {if(object.material) assert.equal(object.material.color.getHexString(),colour.slice(1).toLowerCase());});
    const bounds = new THREE.Box3().setFromObject(marker.group);
    assert.ok(bounds.max.y < .2 && bounds.min.y >= 0);
    assert.ok(bounds.max.x > .3 && bounds.min.x < -.3);
    marker.group.rotation.y = Math.PI / 2;
    const rotated = new THREE.Box3().setFromObject(marker.group);
    assert.ok(rotated.min.x < -.7,'Heading follows actor rotation on the ice');
    marker.dispose();
  }
});

test('shared adapter switches mesh and marker using the explicit presentation prop', () => {
  for (const presentation of [undefined,'characters','tactical']) {
    const cleanup=[];
    globalThis.__tacticalHooks={useMemo:fn=>fn(),useRef:()=>({current:null}),useEffect:fn=>cleanup.push(fn())};
    try {
      const actor={id:'F1',x:7,y:2,facing:1.1};
      const tree=Skater({frameRef:{current:{actors:[actor],time:1}},actorKey:'F1',colour:'#0B1A33',presentation});
      tree.ref.current=new THREE.Group();
      const children=tree.props.children.filter(Boolean),rig=children.find(node=>node.type==='primitive').props.object;
      const marker=children.find(node=>node.type==='group');
      if(marker)marker.ref.current=new THREE.Group();
      globalThis.__tacticalFrame();
      assert.equal(rig.visible,presentation!=='tactical');
      assert.equal(Boolean(marker),presentation==='tactical');
      assert.deepEqual(tree.ref.current.position.toArray(),[2,0,-7]);
      if(marker)assert.equal(marker.ref.current.rotation.y,-1.1);
    } finally {cleanup.forEach(fn=>fn?.());delete globalThis.__tacticalHooks;delete globalThis.__tacticalFrame;}
  }
});
