import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { selectDailyIntel } from './dailyHockeyIntelCore.js';
const cache=new URL('../../node_modules/.cache/daily-intel/',import.meta.url);mkdirSync(cache,{recursive:true});const output=new URL('ui.mjs',cache);
await build({entryPoints:[fileURLToPath(new URL('./DailyHockeyIntel.jsx',import.meta.url))],outfile:fileURLToPath(output),bundle:true,packages:'external',platform:'node',format:'esm',jsx:'automatic',loader:{'.css':'empty'},logLevel:'silent'});
const {default:DailyHockeyIntel,DailyIntelCards}=await import(output.href);
const facts=Array.from({length:4},(_,i)=>({id:`f${i}`,term:`Term ${i}`,learnerText:`Supported fact ${i}.`,topic:'rink',conceptId:`c${i}`,ageBands:['U11'],deliveryEligible:true,sourceRefs:[{url:'https://example.org'}],applicationPrompt:'INTERNAL REVIEW PROMPT',review:{curriculum:'not-admitted'}}));
const state=selectDailyIntel({facts,ageBand:'U11',playerId:'a',dayKey:'2026-09-05'});
test('daily cards render exactly the issued set, explicit read buttons and today progress without research metadata or a shuffle',()=>{
 const html=renderToStaticMarkup(React.createElement(DailyIntelCards,{facts,state,onRead(){},storageAvailable:true}));
 assert.equal((html.match(/<details/g)||[]).length,3);assert.equal((html.match(/Mark as read/g)||[]).length,3);assert.match(html,/0 of 3 read/);assert.doesNotMatch(html,/INTERNAL REVIEW PROMPT|not-admitted|Next insight|Shuffle/i);
 for(const fact of facts){assert.equal(html.includes(fact.learnerText),state.todayIds.includes(fact.id));}
});
test('daily completion and empty or unavailable states are honest and do not offer endless cards',()=>{
 const html=renderToStaticMarkup(React.createElement(DailyIntelCards,{facts,state:{...state,readIds:state.todayIds},onRead(){},storageAvailable:false}));assert.match(html,/3 of 3 read/);assert.match(html,/That’s today’s set/);assert.match(html,/this visit/);assert.doesNotMatch(html,/Mark as read/);
 const empty=renderToStaticMarkup(React.createElement(DailyIntelCards,{facts:[],state:{...state,todayIds:[],readIds:[]},onRead(){},storageAvailable:true}));assert.match(empty,/No daily cards are ready/);assert.doesNotMatch(empty,/That’s today’s set/);
 const loading=renderToStaticMarkup(React.createElement(DailyHockeyIntel,{ageBand:'U11',playerId:'a'}));assert.match(loading,/Loading today/);
 const chooser=renderToStaticMarkup(React.createElement(DailyHockeyIntel,{}));assert.match(chooser,/Choose an age group/);for(const age of ['U7','U9','U11','U13','U15','U18'])assert.match(chooser,new RegExp(age));
});
