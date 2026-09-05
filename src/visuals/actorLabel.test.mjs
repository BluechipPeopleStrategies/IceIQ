import test from 'node:test';
import assert from 'node:assert/strict';
import { compactActorLabel, actorDisplayName, actorJerseyNumber } from './actorLabel.js';

test('short visual labels preserve actor identities and distinguish named focus from possession', () => {
  const actors = [{ id: 'g-away', role: 'goalie', label: 'The goalie' }, { id: 'F3', label: 'Your teammate' }, { id: 'F1', label: 'YOU' }, { id: 'D4', label: 'D4', hasPuck: true }];
  const before = JSON.stringify(actors);
  assert.deepEqual(actors.map(compactActorLabel), ['G', 'F3', 'YOU', 'D4']);
  assert.equal(JSON.stringify(actors), before);
  assert.equal(compactActorLabel(null), '');
});

test('generic coach rosters use jersey numbers on ice and team names in controls without changing hockey roles', () => {
  const home = { id: 'home-skater-3', team: 'home', label: 'H3' };
  const away = { id: 'away-skater-3', team: 'away', label: 'A3' };
  const before = JSON.stringify([home, away]);
  assert.deepEqual([home, away].map(compactActorLabel), ['3', '3']);
  assert.deepEqual([home, away].map(actorDisplayName), ['Navy 3', 'Gold 3']);
  assert.equal(actorJerseyNumber(away, 9), '3');
  assert.equal(compactActorLabel({ id: 'D1', label: 'D1' }), 'D1');
  assert.equal(JSON.stringify([home, away]), before);
});

test('authored Navy and Gold names keep compact rink labels instead of exposing storage IDs',()=>{
 const players=[{id:'home-skater-2',team:'home',label:'Navy2'},{id:'away-skater-4',team:'away',label:'Gold 4'}];
 assert.deepEqual(players.map(compactActorLabel),['2','4']);
 assert.deepEqual(players.map(actorDisplayName),['Navy 2','Gold 4']);
 assert.equal(actorJerseyNumber(players[0],7),'2');
});

test('generic team labels do not depend on the storage ID convention',()=>{
 const players=[{id:'h3',team:'home',label:'H3'},{id:'a2',team:'away',label:'A1'}];
 assert.deepEqual(players.map(compactActorLabel),['3','1']);
 assert.deepEqual(players.map(actorDisplayName),['Navy 3','Gold 1']);
 assert.equal(compactActorLabel({id:'a1',team:'away',label:'D1'}),'D1');
});
