import test from 'node:test';
import assert from 'node:assert/strict';
import content from './foundationContent.json' with {type:'json'};
import {newFlow,canContinue,saveFlow,loadFlow} from './foundationFlowCore.js';
import {GEAR_ART_IDS,PLAY_ITEMS,gearChoices,packingChoice} from './gearPacking.js';

test('playful extras never count toward gear completion or survive as packed gear',()=>{
  const flow={...newFlow(),stage:2,packed:content.gear.slice(0,-1).map(g=>g[0])};
  for(const [id] of PLAY_ITEMS){
    const result=packingChoice(content.gear,flow.packed,id);
    assert.equal(result.kind,'play');assert.deepEqual(result.packed,flow.packed);
    assert.equal(canContinue({...flow,packed:result.packed}),false);
  }
  const storage={value:null,setItem(k,v){this.value=v;},getItem(){return this.value;}};
  const scope={playerId:'gear-test',ageBand:'U7'};
  saveFlow(storage,scope,{...flow,packed:[...flow.packed,'yoyo','duck','teddy']});
  assert.deepEqual(loadFlow(storage,scope).flow.packed,flow.packed);
  const final=packingChoice(content.gear,flow.packed,content.gear.at(-1)[0]);
  assert.equal(canContinue({...flow,packed:final.packed}),true);
});
test('unknown drops are ignored, repeated packing is idempotent, every choice has art',()=>{
  assert.equal(packingChoice(content.gear,[],'bad-input').kind,'unknown');
  assert.deepEqual(packingChoice(content.gear,['helmet'],'helmet').packed,['helmet']);
  const choices=gearChoices(content.gear);
  assert.equal(choices.length,16);assert.equal(new Set(choices.map(g=>g[0])).size,16);
  assert.deepEqual([...choices.map(g=>g[0])].sort(),[...GEAR_ART_IDS].sort());
});
