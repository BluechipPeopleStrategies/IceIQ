import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse } from 'acorn';
import definitions from './sourceScene3DDefinitions.json' with { type: 'json' };
import { sourceScene3D, sourceSceneImagePoint } from './sourceScene3D.js';
import { CARRY_OFFSET } from '../one-on-one/simulation.js';
import { insideCurriculumRink } from '../one-on-one/curriculumCore.js';
const bank = JSON.parse(readFileSync(new URL('../data/bank.json', import.meta.url)));
const mediaQuestions = Object.values(bank).flat().filter(q => q.media?.url);
const approx = (a,b) => assert.ok(Math.abs(a-b)<1e-8, `${a} should equal ${b}`);

test('all133 authored image questions map to finite3D scenes without changing answers or source question data', () => {
  assert.equal(mediaQuestions.length, 133);
  for(const question of mediaQuestions){
    const before=JSON.stringify(question), scene=sourceScene3D({media:question.media,overlays:question.overlays});
    assert.ok(scene,question.id); assert.ok(scene.state.actors.length>=3);
    assert.equal(new Set(scene.state.actors.map(actor=>actor.id)).size,scene.state.actors.length);
    assert.ok(scene.state.actors.every(actor=>[actor.x,actor.y,actor.facing].every(Number.isFinite)));
    assert.ok([scene.state.puck.x,scene.state.puck.y].every(Number.isFinite));
    assert.ok([...scene.state.actors,scene.state.puck].every(point=>insideCurriculumRink(point.x,point.y)), 'all authored objects fit inside the actual curved rink');
    assert.equal(scene.playing,false); assert.equal(JSON.stringify(question),before);
  }
  assert.equal(sourceScene3D({media:{url:'/unregistered.png'}}),null);
  assert.equal(sourceScene3D({media:{url:mediaQuestions[0].media.url,type:'video'}}),null);
});

test('SVG actor centres, team, stick vectors and explicit puck parentage match the authored files without reading embedded pixels', () => {
  for(const source of definitions.svgScenes){
    const svg=readFileSync(new URL('../../public'+source.file,import.meta.url),'utf8').replace(/<defs>[\s\S]*?<\/defs>/g,'');
    const groups=[...svg.matchAll(/<g transform="translate\(([-\d.]+) ([-\d.]+)\)">([\s\S]*?)<\/g>/g)];
    assert.equal(groups.length,source.actors.length);
    groups.forEach((group,index)=>{
      const actor=source.actors[index],body=group[3];
      assert.deepEqual([actor.x,actor.y],[Number(group[1]),Number(group[2])]);
      assert.equal(actor.team,body.includes('class="gold"')?'y':'b');
      assert.equal(actor.goalie,body.includes('#art-goalie'));
      const attrs=tag=>Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(match=>[match[1],match[2]]));
      const stick=attrs(body.match(/<line class="stick"[^>]+>/)[0]);
      assert.deepEqual(actor.stick,{x1:+stick.x1,y1:+stick.y1,x2:+stick.x2,y2:+stick.y2});
      const puckTag=body.match(/<circle class="puck"[^>]+>/);
      assert.equal(!!actor.puckOffset,!!puckTag);
      if(puckTag){const puck=attrs(puckTag[0]);assert.deepEqual(actor.puckOffset,{x:+puck.cx,y:+puck.cy});}
    });
  }
});

test('registered scene data is an exact static extraction of literals, with no generator execution', () => {
  const ast=parse(readFileSync(new URL('../../tools/scene-forge.mjs',import.meta.url),'utf8'),{ecmaVersion:'latest',sourceType:'module'});
  function literal(n){if(n.type==='Literal')return n.value;if(n.type==='ArrayExpression')return n.elements.map(literal);if(n.type==='ObjectExpression')return Object.fromEntries(n.properties.map(p=>[p.key.name??p.key.value,literal(p.value)]));if(n.type==='UnaryExpression'&&n.operator==='-')return-literal(n.argument);throw Error(n.type);}
  const read=name=>literal(ast.body.find(n=>n.type==='VariableDeclaration'&&n.declarations[0].id.name===name).declarations[0].init);
  assert.deepEqual(definitions.scenes,read('SCENES')); assert.deepEqual(definitions.views,read('VIEWS'));
});

test('cropped PNG image coordinates are decoded through their view before entering the physical rink', () => {
  for(const id of ['nz-carry-open','oz-pass-lanes','dz-netside-coverage']){
    const source=definitions.scenes.find(scene=>scene.id===id), media={url:`/assets/scenes-u11/${id}.png`};
    const view=definitions.views[source.view], raw=source.actors[0];
    const point=sourceSceneImagePoint(media,{x:(raw.x-view.x)/view.w,y:(raw.y-view.y)/view.h});
    approx(point.x,(raw.x-300)*60.96/600); approx(point.y,(raw.y-150)*25.908/300);
    const scene=sourceScene3D({media}); approx(scene.state.actors[0].x,point.x); approx(scene.state.actors[0].y,point.y);
    approx(scene.state.actors[0].facing,Math.atan2(Math.sin(raw.facing*Math.PI/180)*25.908/300,Math.cos(raw.facing*Math.PI/180)*60.96/600));
  }
});

test('explicit SVG carrier pucks use the shared blade contact while preserving the original image point in provenance', () => {
  for(const source of definitions.svgScenes){
    const scene=sourceScene3D({media:{url:source.file}}), carrier=scene.state.actors.find(actor=>actor.id===scene.state.puck.owner);
    assert.ok(carrier,source.id); assert.equal(scene.focusActorId,carrier.id);
    assert.equal(carrier.team,'away','authored gold stays gold');
    approx(scene.state.puck.x,carrier.x+Math.cos(carrier.facing)*CARRY_OFFSET.forward-Math.sin(carrier.facing)*CARRY_OFFSET.lateral);
    approx(scene.state.puck.y,carrier.y+Math.sin(carrier.facing)*CARRY_OFFSET.forward+Math.cos(carrier.facing)*CARRY_OFFSET.lateral);
    const raw=source.actors.find(actor=>actor.puckOffset);
    const original=sourceSceneImagePoint({url:source.file},{x:(raw.x+raw.puckOffset.x)/1200,y:(raw.y+raw.puckOffset.y)/800});
    assert.deepEqual(scene.provenance.originalPuck,original); assert.match(scene.provenance.puckPresentation,/shared stick/i);
  }
});

test('loose or unspecified pucks retain exact authored locations without nearest-player ownership', () => {
  for(const id of ['oz-corner-turn-loose','oz-crease-scramble','nz-loose-puck-race','dz-coverage-switch']){
    const source=definitions.scenes.find(scene=>scene.id===id),scene=sourceScene3D({media:{url:`/assets/scenes-u11/${id}.png`}});
    assert.equal(scene.state.puck.owner,null,id);
    approx(scene.state.puck.x,(source.puck.x-300)*60.96/600); approx(scene.state.puck.y,(source.puck.y-150)*25.908/300);
  }
});

test('only authored context and requested overlays appear, never hidden answer lane/open-target metadata', () => {
  const media={url:'/assets/scenes-u11/oz-pass-lanes.png'};
  const plain=sourceScene3D({media}); assert.deepEqual(plain.overlays.polylines,[]);
  const overlay={kind:'ring',x:.5,y:.6,r:.05,color:'#36d17a'}, marked=sourceScene3D({media,overlays:[overlay]});
  assert.equal(marked.overlays.polylines.length,1); assert.equal(marked.overlays.polylines[0].color,overlay.color);
  assert.deepEqual(marked.state,plain.state,'decorative answer marks cannot move actors or assign possession');
  const moving=sourceScene3D({media:{url:'/assets/scenes-u11/nz-carry-open.png'}});
  assert.equal(moving.playing,false); assert.ok(moving.overlays.polylines.length>0);
  assert.match(moving.provenance.motion,/no timing|untimed/i);
});
