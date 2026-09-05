// Learner-facing missions project the locked concepts; source IDs never change.
export const JOURNEY_WORLDS = {
  'skating-movement': { name: 'Frozen Trails', subtitle: 'Read the movement', icon: 'ice', art: 0, color: '#79cce2', description: 'Notice balance, direction and the space a player can reach.' },
  'puck-skills': { name: 'Passing Springs', subtitle: 'Make the puck work', icon: 'target', art: 1, color: '#dfc382', description: 'Choose when to protect, pass, receive or shoot.' },
  'hockey-sense': { name: 'Lookout Ridge', subtitle: 'See the whole play', icon: 'scan', art: 2, color: '#9fb9ef', description: 'Scan for pressure and notice what changes before choosing.' },
  'offensive-play': { name: 'Rush Arena', subtitle: 'Create a chance', icon: 'play', art: 3, color: '#e2b187', description: 'Help a teammate, find space and build an attacking chance.' },
  'defensive-play': { name: 'Blue Line Fortress', subtitle: 'Protect the middle', icon: 'shield', art: 4, color: '#7dcdbb', description: 'Read the rush, close space and protect your net.' },
  'transition-compete': { name: 'Summit Switch', subtitle: 'Change with the game', icon: 'team', art: 5, color: '#b9ade4', description: 'Recognize possession changes and find the next job.' },
};

const MISSIONS = {
  'edges-balance': ['Spot who can react', 'Look at a player’s balance and decide who can change direction.'],
  'agility-mobility': ['Find the next opening', 'Notice which route leaves room to turn or recover.'],
  'backward-transitions': ['Read the turn', 'Decide when a defender needs to turn and follow the play.'],
  'deception-with-feet': ['Read the fake', 'Look for a change of direction before committing.'],
  'puck-control': ['Keep the puck available', 'Choose where the puck needs to be for the next play.'],
  'puck-protection': ['Keep pressure outside', 'Notice how a player can keep a defender away from the puck.'],
  passing: ['Find the passing window', 'Read the path to a teammate and the space where the pass will arrive.'],
  receiving: ['Be ready for the pass', 'Choose a place to receive and look for the next play.'],
  shooting: ['Find a shooting chance', 'Read the net, pressure and teammates before choosing a shot.'],
  scanning: ['Look before the puck arrives', 'Check teammates, opponents and open ice.'],
  'reading-the-play': ['Notice what changed', 'Follow the puck and players, then read the new situation.'],
  'decision-making': ['Choose the useful play', 'Compare the available options before committing.'],
  'time-and-space': ['Find time to play', 'Notice pressure and the space a player can use.'],
  'creativity-under-pressure': ['Find another way', 'Look for a useful alternative when the first option closes.'],
  'puck-carrier-options': ['Pass, shoot or carry?', 'Choose what the puck carrier can do with the space available.'],
  'off-puck-support-offense': ['Help without the puck', 'Find a position where a teammate can use your support.'],
  'attacking-1v1': ['Read the defender', 'Notice the defender’s position before choosing an attacking route.'],
  'cycle-and-possession': ['Keep the play connected', 'Find the next support option as teammates move.'],
  'zone-entry': ['Find a way into the zone', 'Read the blue line, teammates and pressure.'],
  'odd-man-reads': ['Use the extra player', 'Read the defender and compare a pass, shot or carry.'],
  'net-front-play': ['Find space near the net', 'Notice where support or a loose puck may be available.'],
  'gap-control': ['Manage the space in front', 'Read the distance and speed between a defender and puck carrier.'],
  'angling-steering': ['Guide the attack outside', 'Choose a route that protects the middle.'],
  'defensive-side-positioning': ['Get between player and net', 'Find a position that protects a dangerous route.'],
  'coverage-reads': ['Find the uncovered threat', 'Notice who or what space still needs coverage.'],
  'stick-and-body-detail': ['Close a passing path', 'Read how a defender’s position changes the available pass.'],
  'transition-reads': ['Switch to the next job', 'Notice a possession change and decide what to do next.'],
  'breakout-and-regroup': ['Find the way out', 'Read pressure and support before moving the puck out.'],
  'forecheck-pressure': ['Pressure with a purpose', 'Choose what to take away as a team challenges for the puck.'],
  'backcheck-recovery': ['Recover to useful ice', 'Choose who or what space to cover on the way back.'],
  'battles-and-compete': ['Stay in the play', 'Look for the next useful action around a contested puck.'],
};
export function missionFor(node) {
  const [title, objective] = MISSIONS[node.conceptId] || [`Read ${node.name.toLowerCase()}`, 'Notice the picture, compare your options and choose.'];
  return { title, objective };
}
export function questionMatchesMission(question, node) {
  return question?.conceptId === node.conceptId || question?.ledger?.conceptId === node.conceptId || question?.concepts?.includes(node.conceptId) || question?.nodeId === node.id;
}
export function worldFor(unit) { return JOURNEY_WORLDS[unit.id] || { name: unit.name, subtitle: 'Read the game', description: unit.definition, color: '#c9a24b', art: 0, icon: 'ice' }; }
