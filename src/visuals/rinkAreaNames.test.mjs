import test from 'node:test';
import assert from 'node:assert/strict';
import {RINK_AREAS,rinkAreaAt,scenarioFocusBounds} from './rinkAreaNames.js';
test('rink names retain rink-coordinate meaning when the camera turns',()=>{
 assert.equal(rinkAreaAt({x:0,y:8}),'neutral zone');assert.equal(rinkAreaAt({x:22,y:1}),'slot');assert.equal(rinkAreaAt({x:-22,y:1}),'slot');assert.equal(rinkAreaAt({x:18,y:11}),'half wall');
 assert.equal(new Set(RINK_AREAS.map(a=>a.id)).size,RINK_AREAS.length);
});
test('focus framing keeps a small neutral-zone play close',()=>{
 const state={actors:[{x:1.5,y:2,role:'skater'},{x:6,y:-3,role:'skater'}],puck:{x:3,y:1}};
 const bounds=scenarioFocusBounds(state);
 assert.ok(bounds.maxX-bounds.minX<22);
 assert.ok(bounds.maxY-bounds.minY<18);
 assert.ok(bounds.minX<1.5&&bounds.maxX>6);
});
test('focus framing keeps the attacking net and relevant goalie',()=>{
 const state={actors:[{x:10,y:4,role:'skater'},{x:20,y:-6,role:'skater'},{x:26,y:0,role:'goalie'},{x:-26,y:0,role:'goalie'}],puck:{x:11,y:4}};
 const bounds=scenarioFocusBounds(state);assert.ok(bounds.minX<7.62);assert.equal(bounds.maxX,30.48);assert.ok(bounds.maxX-bounds.minX<26);
});
test('focus framing retains context for a full transition',()=>{
 const state={actors:[{x:-22,y:4,role:'skater'},{x:-7,y:-3,role:'skater'},{x:8,y:3,role:'skater'},{x:22,y:-4,role:'skater'},{x:-26,y:0,role:'goalie'},{x:26,y:0,role:'goalie'}],puck:{x:8,y:3}};
 const bounds=scenarioFocusBounds(state);assert.ok(bounds.minX<=-25);assert.ok(bounds.maxX>=25);
});
test('focus framing never drops a defender from a compact attack',()=>{
 const state={actors:[{x:12,y:1,role:'skater'},{x:19,y:-2,role:'skater'},{x:4,y:5,role:'skater'}],puck:{x:12,y:1}};
 const bounds=scenarioFocusBounds(state);
 assert.ok(bounds.minX<4&&bounds.maxX>19);
 assert.ok(bounds.minY<5&&bounds.maxY>-2);
});
test('focus framing includes a placement reference without drawing it',()=>{
 const state={actors:[{x:15,y:1,role:'skater'},{x:19,y:-2,role:'skater'}],puck:{x:16,y:1}};
 const bounds=scenarioFocusBounds(state,{focusPoints:[{x:8,y:8}]});
 assert.ok(bounds.minX<=8);assert.ok(bounds.maxY>=8);assert.ok(bounds.maxY-bounds.minY<20);
});
