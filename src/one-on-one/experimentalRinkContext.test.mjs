import test from 'node:test';import assert from 'node:assert/strict';import {experimentalRinkContext} from './experimentalRinkContext.js';
test('unknown puck coordinates do not invent a neutral-zone location',()=>{for(const x of [null,undefined,'12',NaN])assert.equal(experimentalRinkContext({puck:{x}},-1),'Navy attacks Gold’s net');});
test('reversed attack direction reports the correct defended end',()=>{
 assert.match(experimentalRinkContext({puck:{x:18}},-1),/Navy defensive zone/);
 assert.match(experimentalRinkContext({puck:{x:-18}},-1),/Gold defends/);
 assert.match(experimentalRinkContext({puck:{x:0}},-1),/Neutral zone/);
});
test('puck zone and defending team remain independent of camera rotation',()=>{for(const camera of ['overhead','behind-net','broadcast']){assert.match(experimentalRinkContext({puck:{x:-18},camera}),/Navy defensive zone/);assert.match(experimentalRinkContext({puck:{x:18},camera}),/Gold defends/);assert.match(experimentalRinkContext({puck:{x:0},camera}),/Neutral zone/);}});
