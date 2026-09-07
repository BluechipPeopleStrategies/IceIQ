// The draft's `why` remains the author's validation rationale. These separately
// authored player variants explain the same decision in age-appropriate words.
// Bindings detect source drift (not security signatures): a changed source needs
// a copy review instead of silently falling back to an internal explanation.
function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
export function curriculumCopyBinding(lesson, question) {
  const input = stable([lesson.id, lesson.ageBand, lesson.conceptId, lesson.curriculumStrand, lesson.title, lesson.teachingPoint, lesson.learnerAction, lesson.sourceRef, question]);
  let hash = 2166136261;
  for (let index = 0; index < input.length; index++) hash = Math.imul(hash ^ input.charCodeAt(index), 16777619) >>> 0;
  return `${input.length}:${hash.toString(16).padStart(8, '0')}`;
}

const LESSON_COPY = {
  'u7-look-first': {
    action: 'Look around before the puck comes.',
    mc: ['Your teammate is ready to pass to you. What should you do first?', ['Look around for the other player.', 'Keep watching only the puck.'], 'Look around before the puck comes. You can see the other player and get ready for the pass.', 'Look, then get ready.'],
    tf: ['Looking around before the pass helps you notice the other player.', 'A quick look helps you see the player near you before the puck comes.', 'Find one player near you.'],
  },
  'u9-find-clear-pass': {
    action: 'Find a teammate you can pass to without hitting another player.',
    mc: ['Which teammate has a clear path for your pass?', ['The teammate with another player in the way.', 'The teammate with nobody in the way.', 'Wait for the blocked pass to open.'], 'One teammate has nobody in the way of the pass. The other pass would go straight toward an opponent.', 'Check the path to your teammate.'],
    tf: ['A teammate is always a good pass choice if they have room, even when another player blocks the pass.', 'Your teammate has room, but another player is in the way of the pass. Look for a teammate you can reach with the puck.', 'Find space and a clear pass.'],
  },
  'u11-check-both-sides': {
    action: 'Look at both teammates and the paths to them.',
    mc: ['You want to make a clear pass. What do you notice when you check both teammates?', ['Pass to F2 because that teammate is closer.', 'D1 blocks the pass to both teammates.', 'The pass to F3 is clear.', 'Wait for the pass to F2 to open.'], 'D1 blocks the pass to F2, but the pass to F3 is clear. Looking at both teammates helps you spot that choice.', 'Look past the first teammate you see.'],
    tf: ['A defender between you and a teammate can block your pass.', 'D1 is in the path to F2. Look for opponents as well as teammates before you pass.', 'Check who is in the way.'],
  },
  'u13-refresh-picture': {
    action: 'Watch D1 move, then choose your pass.',
    mc: ['You planned to pass to F3 before D1 moved. Which pass is clear now?', ['Keep the original pass to F3.', 'Pass to F2 through the clear lane.', 'Put the puck into the middle between the teammates.', 'Hold the puck and wait for the pass to F3.'], 'D1 has moved into the pass to F3. The pass to F2 is clear now, so change your plan to match what you see.', 'Look again when a defender moves.'],
    tf: ['When D1 moves, you may need to change the pass you planned.', 'D1 is now in the way of the pass to F3. Look again before making the pass you first planned.', 'Use the picture in front of you now.'],
  },
  'u15-find-reset': {
    action: 'Find a clear pass that keeps the puck with your team.',
    mc: ['You want to keep the puck with your team. Which pass is clear?', ['Try F2 because F2 is closer to the attacking net.', 'Try F3 because the pass changes sides.', 'Push the puck through the middle past A1.', 'Pass to D2 farther from the attacking net and build the attack again.'], 'The passes toward the net are blocked. The pass to D2 is clear, giving your team a way to keep the puck and build the attack again.', 'A pass back can keep the play going.'],
    tf: ['When passes toward the net are blocked, a teammate farther from the net can be your best option.', 'The pass to D2 is clear while both passes toward the net are blocked. After that pass, look again for the next play.', 'Look for a way back as well as a way forward.'],
  },
  'u18-read-receiver': {
    action: 'Check the pass and the space around your teammate.',
    mc: ['Who can you pass to with a clear path and no opponent close by?', ['F2: the pass is clear, but an opponent is nearby.', 'F3: the pass is clear, with no opponent close by.', 'D2: pass back, away from the attacking net.', 'The middle: push the puck past A3 toward the net.'], 'The pass to F3 is clear, and no opponent is close to F3. F2 has a marker nearby, A2 blocks the pass to D2, and A3 blocks the pass through the middle.', 'Check the path and who will be near your teammate.'],
    tf: ['A clear pass to F2 means F2 will have time with the puck.', 'A1 is already close to F2. The pass can be clear even when your teammate will be under pressure. Compare that with the space around F3.', 'Check what your teammate will face after the pass.'],
  },
  'u7-help-space': {
    action: 'Find your own open space.',
    mc: ['Where can you go to help?', ['Into open ice away from the puck.', 'Right beside the teammate with the puck.'], 'Move into your own open space. Your teammate will have another place to pass.', 'Find your own bit of ice.'],
    tf: ['Standing right beside the puck is the only way to help.', 'You can help from open ice too. Give your teammate another place to find you.', 'Find space for yourself.'],
  },
  'u9-leave-shadow': {
    action: 'Move where your teammate can pass to you.',
    mc: ['The pass to you is blocked. How can you help your teammate?', ['Stay behind the other player and call louder.', 'Skate right beside the teammate with the puck.', 'Move out of the blocked path into open ice.'], 'Move to open ice so the pass does not have to go through the other player. Calling louder from the same spot will not clear the way.', 'Move to give the puck a clear path.'],
    tf: ['You can have room to stand while another player blocks the pass to you.', 'You have room around you, but another player is in the way of the pass. Move where your teammate can reach you with the puck.', 'Check the whole path.'],
  },
  'u11-change-angle': {
    action: 'Find a clear path for the pass from F1 to you.',
    mc: ['Where could you move to make the pass to you clearer?', ['Stay still because you have room to stand.', 'Move into open ice away from D1 to make a new passing lane.', 'Move directly toward D1.', 'Join F3 beside D2.'], 'Moving into open ice away from D1 gives the pass a new path. Staying still leaves D1 in the way, and F3 already has D2 nearby.', 'Move to give your teammate a new passing lane.'],
    tf: ['Calling from the same spot gets D1 out of the pass from F1 to you.', 'Calling helps F1 hear you, but D1 is still between F1 and you. Move to make the pass possible.', 'Use your feet as well as your voice.'],
  },
  'u13-pass-reoffer': {
    action: 'After your pass, find a new place to help.',
    mc: ['You passed to F1. Where can you move to get a return pass closer to the attacking net?', ['Stay at the old spot behind D1.', 'Follow the puck right onto F1.', 'Skate into open ice toward the attacking net, away from D1.', 'Stand beside F3 and the defender marking F3.'], 'D1 blocks the pass back to your old spot. Move toward the net through open ice to give F1 a new passing lane, without crowding F1 or F3.', 'Pass, look again, then find a new opening.'],
    tf: ['After passing, you can help again by moving to a new place for a return pass.', 'D1 covers the pass to your old spot. Finding open ice away from D1 gives F1 another way to pass to you.', 'Become an option again after your pass.'],
  },
  'u15-two-angles': {
    action: 'Keep a clear passing option separate from F2.',
    mc: ['F1 needs someone to pass to. Which position should you keep?', ['A clear pass from F1 to you, with room to receive.', 'A spot next to F2 on the same blocked route.', 'A spot behind D1 on the pass to F2.', 'A spot right beside F1 and the puck.'], 'Your position gives F1 a separate, clear pass. Moving beside F2 puts you on the same pressured route instead of giving F1 another choice.', 'Give the puck carrier a different way out.'],
    tf: ['Two teammates on the same blocked passing route always give the puck carrier two good choices.', 'One defender can affect both teammates on that route. A separate clear lane gives the puck carrier a different choice.', 'Look for clear passes, not just more teammates.'],
  },
  'u18-support-change': {
    action: 'Watch D1 move between F1 and you, then choose a new position.',
    mc: ['D1 has moved between F1 and you. Where could you move to give F1 a different option from F2?', ['Stay because this was your original plan.', 'Move beside F2, closer to the net.', 'Move into open ice away from D1 to create a new passing lane from F1 to you.', 'Move toward D1 and try to receive in front of the defender.'], 'D1 is blocking the pass from F1 to your old spot. Move into open ice away from D1 to give F1 a new path to you. F2 already has a defender nearby, so joining F2 does not create that new option.', 'Keep checking the path from F1 to you.'],
    tf: ['When a defender moves into the pass to you, check whether you need a new position.', 'D1 now blocks the pass to your old spot. Look for a position where F1 has a clear way to reach you.', 'Keep checking the pass from the puck to you.'],
  },
  'u7-guard-way': {
    action: 'Stay between the player and your net.',
    mc: ['How can you help protect your net?', ['Chase behind the player with the puck.', 'Stay between that player and your net.'], 'Stay between the player and your net. If you chase from behind, the player has more room to go toward your net.', 'Keep your net behind you.'],
    tf: ['Chasing behind the puck leaves more room on the way to your net.', 'If you chase from behind, the player can go toward your net. Stay between the player and your net to help protect it.', 'Protect the way to your net.'],
  },
  'u9-protect-middle': {
    action: 'Protect the middle on the way to your net.',
    mc: ['The other player has the puck near the side. Which space should you protect?', ['The middle between that player and your net.', 'Only the space behind the puck near the boards.', 'Only the space beside the goalpost.'], 'Protect the middle on the way to your net. Chasing to the side or waiting beside the post leaves that space open.', 'Keep the middle covered.'],
    tf: ['Even when the puck is near the boards, the middle on the way to your net still matters.', 'The puck can come back toward the middle. Your position helps protect that way to your net.', 'Look at the puck and the middle.'],
  },
  'u11-hold-inside': {
    action: 'Keep moving while you protect the middle.',
    mc: ['The attacker is coming toward the middle. How can you protect that space and still adjust?', ['Stop both skates and reach away from the middle.', 'Back up all the way to the goal line before reading the attacker.', 'Move to the outside of the attacker.', 'Keep moving with the attacker while protecting the middle.'], 'Keep your feet moving so you can adjust while protecting the middle. Reaching too soon or backing right off can give the attacker more room.', 'Moving feet help you adjust.'],
    tf: ['Whenever an attacker gets close, you should stop moving and reach for the puck.', 'Being close does not always mean it is time to reach. Keep moving so you can adjust and protect the middle.', 'Read the space before reaching for the puck.'],
  },
  'u13-share-threats': {
    action: 'Read the puck carrier and the teammate helping you.',
    mc: ['D2 is between F2 and your net. What do you need to do?', ['Leave F1 to join D2 beside F2.', 'Manage your distance from F1 while protecting the middle.', 'Chase behind F1 toward the boards.', 'Back up beside the goalie and leave F1 more room.'], 'D2 is covering F2, but F1 still has the puck. Stay ready to adjust your distance from F1 while protecting the middle.', 'Your teammate has a job, and so do you.'],
    tf: ['Because D2 is near F2, you can leave the puck carrier a clear route into the middle.', 'D2 is covering F2. F1 still has the puck, so keep protecting F1’s route toward the middle.', 'Keep reading the player with the puck.'],
  },
  'u15-verify-help': {
    action: 'Check that help is in place before leaving the middle.',
    mc: ['Before you move toward F1 at the boards, what do you need to check?', ['H2 is actually covering the middle space you would leave.', 'H2 is somewhere behind the puck.', 'F1 is near the boards, so the middle no longer matters.', 'H3 is near F2, so H3 must be covering F1 too.'], 'H2 is approaching but is not yet covering the middle you would leave. Check that the help is in place before moving out toward F1.', 'Help on the way is different from help in place.'],
    tf: ['A teammate coming to help is different from a teammate already covering the middle.', 'H2 is coming toward the play, but is not yet covering your middle space. Keep checking where the help actually is.', 'Read where your help is now.'],
  },
  'u18-two-threats': {
    action: 'Keep the puck carrier and the possible pass in view.',
    mc: ['You are defending a 2-on-1. How can you keep track of both attackers?', ['Rush at the outside of F1 and leave the cross-ice pass.', 'Turn fully toward F2 and stop watching F1.', 'Stay ready to adjust in the middle, with the puck carrier and the pass in view.', 'Move behind the goalie to wait for a shot.'], 'Stay ready to adjust in the middle so you can see F1 with the puck and the pass to F2. Chasing F1 outside leaves that pass open; watching only F2 loses track of the puck carrier.', 'Keep both threats in view.'],
    tf: ['Because the goalie is lined up with F1, you no longer need to defend the cross-ice pass.', 'A pass across to F2 would change where the danger comes from. The goalie’s position facing F1 does not take away that passing option.', 'Keep reading the second attacker too.'],
  },
  'u7-open-friend': {
    action: 'Find the teammate you can pass to.',
    mc: ['The other player is in your way to the net. What can you do?', ['Pass to your teammate in the open ice.', 'Keep taking the puck toward the net through the crowd.'], 'Your teammate is in open ice, with nobody in the way of the pass. Passing gives the puck a way around the other player.', 'Look for your open teammate.'],
    tf: ['Your teammate has a clear path for a pass.', 'Nobody is between you and your teammate. There is a clear way for the puck to get there.', 'Find the clear path.'],
  },
  'u9-blocked-pass': {
    action: 'Use the open space when the pass is blocked.',
    mc: ['The pass is blocked. What should you use?', ['Try the blocked pass to your teammate.', 'Use the clear space toward the net.', 'Hold the puck and wait for that same pass to open.'], 'The other player is in the way of the pass, but there is clear space toward the net. Use that space instead of forcing the puck through the player.', 'Look for the open space.'],
    tf: ['You must pass whenever you have a teammate, even if another player is in the way.', 'You do not have to force a blocked pass. Here, you have another clear way toward the net.', 'Choose the play that is open.'],
  },
  'u11-defender-shot': {
    action: 'Read D1 and find the clear pass.',
    mc: ['D1 is in the way of your shot. What can you do in this 2-on-1?', ['Shoot straight toward the net.', 'Keep carrying toward D1.', 'Wait for D1 to move out of the way.', 'Pass to F2 through the clear lane.'], 'D1 is blocking your way to the net, but the pass to F2 is clear. Passing uses that opening instead of taking the puck toward D1.', 'Look where the defender leaves space.'],
    tf: ['Here, D1 blocks the shot but the pass to F2 is clear.', 'D1 is between you and the net, away from the pass to F2. The pass gives you a clear option in this play.', 'Read the defender, then the open teammate.'],
  },
  'u13-receive-finish': {
    action: 'Read the goalie after you receive the pass.',
    mc: ['You have received the pass and have a clear shot. The goalie is not lined up with you. What can you do?', ['Wait until the goalie is lined up with you.', 'Take the shot now.', 'Carry back toward the pressure near F1.', 'Pass back just because F1 passed to you.'], 'The goalie is not lined up with your new shooting position yet. Shoot while that opening is there. Waiting gives the goalie time to get across, though a quick shot still does not guarantee a goal.', 'Receive, look at the net, then use the opening.'],
    tf: ['Waiting for the goalie to line up with you leaves the same shooting opening.', 'The opening comes from the goalie being out of line with your shot. It changes when the goalie gets across and faces you.', 'Read the goalie’s position now.'],
  },
  'u15-available-dangerous': {
    action: 'Choose how to use the clear chance at the net.',
    mc: ['You have a clear chance at the net. Which play uses it now?', ['Pass away from the net just because F2 is open.', 'Wait for D1 to get in the way of the shot.', 'Attack the net through your clear shooting lane.', 'Carry toward D1 and the crowded ice.'], 'You have a clear shooting lane now. F2 is open farther from the net, but that pass would give up this immediate chance. A pass back can help in other situations; here, look at the chance you already have.', 'Ask what a pass would add to the play.'],
    tf: ['An open teammate is always the best choice in a 2-on-1.', 'F2 is open farther from the net, while you have a clear shot now. Compare what the pass would create with the chance you already have.', 'An open pass is not always the best chance.'],
  },
  'u18-both-defenders': {
    action: 'Check both defenders before choosing your pass.',
    mc: ['After checking both defenders, which play is clear?', ['Pass to F2 through the clear lane.', 'Force the pass to F3 because F3 is close to the net.', 'Shoot directly through D1.', 'Carry into D1 while watching only D2.'], 'D1 blocks the shot and D2 blocks the pass to F3. The pass to F2 avoids both defenders and gives you a clear attacking option.', 'Read the second defender before you commit.'],
    tf: ['Once you have read D1, D2 cannot change which pass is best.', 'D2 is blocking the pass to F3. If you only watch D1, you could miss D2 and pass straight into that defender.', 'Check every defender who can affect your choice.'],
  },
};

// Describe observable positions before answering, without naming a best play.
// These captions are shared by the visible rink, its title and accessible text.
const SCENE_COPY = {
  'u7-look-first': 'Your teammate has the puck. Another player is near you.',
  'u9-find-clear-pass': 'You have the puck. Your teammates are closer to the net on opposite sides. An opponent stands between you and one teammate.',
  'u11-check-both-sides': 'You have the puck. D1 stands between you and F2. F3 is on the other side of the ice.',
  'u13-refresh-picture': 'You have the puck. F2 and F3 are on opposite sides. Watch D1 change position before choosing your pass.',
  'u15-find-reset': 'You have the puck. F2 and F3 are closer to the attacking net; D2 is farther from it. A1 stands between you and F2; A2 stands between you and F3.',
  'u18-read-receiver': 'You have the puck. F2 and F3 are closer to the attacking net on opposite sides. D2 is farther from the net. A1 is close to F2, A2 is between you and D2, and A3 is in the middle.',
  'u7-help-space': 'Your teammate has the puck. An opponent is near that teammate. You are away from both players.',
  'u9-leave-shadow': 'Your teammate has the puck. An opponent stands between you and your teammate.',
  'u11-change-angle': 'F1 has the puck. D1 stands between you and F1. F3 is closer to the net with D2 nearby.',
  'u13-pass-reoffer': 'Your pass has reached F1. D1 is between you and F1. F3 is closer to the net with D2 nearby.',
  'u15-two-angles': 'F1 has the puck. You and F2 are on opposite sides. D1 is between F1 and F2; D2 is near F2.',
  'u18-support-change': 'F1 has the puck. You and F2 are on opposite sides, with D2 close to F2. Watch D1 change position before choosing where to move.',
  'u7-guard-way': 'The other player has the puck. You are between that player and your goalie.',
  'u9-protect-middle': 'The puck carrier is near the side. You are closer to the middle. Your goalie is in your net.',
  'u11-hold-inside': 'F1 has the puck and has approached toward the middle. You are closer to your net than F1. Your goalie is behind you.',
  'u13-share-threats': 'F1 has the puck and is approaching you. D2 is between F2 and your net.',
  'u15-verify-help': 'F1 has the puck near the side. H2 is approaching from farther away from your net. H3 is near F2. You are closer to the middle.',
  'u18-two-threats': 'F1 has the puck. F2 is across the ice, closer to your net. You are between their positions. Your goalie is facing F1.',
  'u7-open-friend': 'You have the puck. An opponent is between you and the net. Your teammate is across the ice.',
  'u9-blocked-pass': 'You have the puck. Your teammate is across the ice. An opponent stands between you and your teammate.',
  'u11-defender-shot': 'You have the puck. D1 is between you and the net. F2 is across the ice.',
  'u13-receive-finish': 'You have received F1’s pass. F1 and D1 are on the other side of the ice. The goalie is still toward that side.',
  'u15-available-dangerous': 'You have the puck. F2 is farther from the attacking net. D1 is on the other side of the ice from you.',
  'u18-both-defenders': 'You have the puck in a 3-on-2. F2 is across the ice and F3 is closer to the net on your side. D1 is between you and the net; D2 is between you and F3.',
};

const HABIT_COPY = {
  'u7-look-first': 'Look around before the puck comes to you.',
  'u9-find-clear-pass': 'Check the path from the puck to your teammate.',
  'u11-check-both-sides': 'Look at both teammates before choosing your pass.',
  'u13-refresh-picture': 'Look again when a defender moves between you and a teammate.',
  'u15-find-reset': 'When passes toward the net are blocked, look for a teammate who can help you keep the puck.',
  'u18-read-receiver': 'Check whether the pass can reach your teammate and who is close to them.',
  'u7-help-space': 'Help a teammate by finding your own open space.',
  'u9-leave-shadow': 'Move where your teammate can pass to you without hitting another player.',
  'u11-change-angle': 'If a defender blocks the pass to you, move to give your teammate a new passing path.',
  'u13-pass-reoffer': 'After passing, look for a new place to receive the puck again.',
  'u15-two-angles': 'Give the puck carrier a separate clear pass instead of joining a teammate on a blocked route.',
  'u18-support-change': 'If D1 gets between F1 and you, find a new position where F1 can pass to you.',
  'u7-guard-way': 'Stay between the other player and your net.',
  'u9-protect-middle': 'Protect the middle on the way to your net.',
  'u11-hold-inside': 'Keep moving while you stay between the attacker and your net.',
  'u13-share-threats': 'Keep protecting the middle when your teammate is covering another attacker.',
  'u15-verify-help': 'Check that your teammate is covering the middle before you leave that space.',
  'u18-two-threats': 'When you defend a 2-on-1, keep the puck carrier and the other attacker in view.',
  'u7-open-friend': 'Look for your teammate when another player is in your way.',
  'u9-blocked-pass': 'Having a teammate does not mean the pass is open.',
  'u11-defender-shot': 'When a defender blocks your shot, check the pass to your teammate.',
  'u13-receive-finish': 'After a pass across the ice, look at the goalie before deciding to shoot.',
  'u15-available-dangerous': 'Compare the chance you have now with what a pass would create.',
  'u18-both-defenders': 'Check both defenders before choosing your play in a 3-on-2.',
};

// Authored bindings are intentionally fixed, never calculated from the imported
// pack at module initialization. Updating a source requires reviewing its copy.
const SOURCE_BINDINGS = {
  "practice-draft-u7-look-first-mc": "1668:8f718dd4",
  "practice-draft-u7-look-first-tf": "1565:4c0db017",
  "practice-draft-u9-find-clear-pass-mc": "1966:1bf5ab1c",
  "practice-draft-u9-find-clear-pass-tf": "1847:be0fdc2b",
  "practice-draft-u11-check-both-sides-mc": "2010:6d18eb8e",
  "practice-draft-u11-check-both-sides-tf": "1820:8f45a6e4",
  "practice-draft-u13-refresh-picture-mc": "2080:f5990192",
  "practice-draft-u13-refresh-picture-tf": "1866:cab1e828",
  "practice-draft-u15-find-reset-mc": "2370:3f2f3059",
  "practice-draft-u15-find-reset-tf": "2200:59bd79eb",
  "practice-draft-u18-read-receiver-mc": "2495:f346897f",
  "practice-draft-u18-read-receiver-tf": "2251:092c0fe4",
  "practice-draft-u7-help-space-mc": "1766:fbc78150",
  "practice-draft-u7-help-space-tf": "1687:5cbd8f5c",
  "practice-draft-u9-leave-shadow-mc": "1863:d4f8921b",
  "practice-draft-u9-leave-shadow-tf": "1683:4082b7a3",
  "practice-draft-u11-change-angle-mc": "2204:632f5697",
  "practice-draft-u11-change-angle-tf": "2025:cb5fa21f",
  "practice-draft-u13-pass-reoffer-mc": "2355:857b72e7",
  "practice-draft-u13-pass-reoffer-tf": "2125:e1c20c3f",
  "practice-draft-u15-two-angles-mc": "2210:db2c06ab",
  "practice-draft-u15-two-angles-tf": "2039:08ffc9ed",
  "practice-draft-u18-support-change-mc": "2430:8ac5e8e5",
  "practice-draft-u18-support-change-tf": "2152:777c5c5a",
  "practice-draft-u7-guard-way-mc": "1859:2dc794d0",
  "practice-draft-u7-guard-way-tf": "1809:ebab41f9",
  "practice-draft-u9-protect-middle-mc": "2004:b5252a4d",
  "practice-draft-u9-protect-middle-tf": "1849:c3a51e83",
  "practice-draft-u11-hold-inside-mc": "2123:7037dff7",
  "practice-draft-u11-hold-inside-tf": "1847:b0fdbae0",
  "practice-draft-u13-share-threats-mc": "2150:2b4e4596",
  "practice-draft-u13-share-threats-tf": "1941:45d9292a",
  "practice-draft-u15-verify-help-mc": "2453:db5ccb87",
  "practice-draft-u15-verify-help-tf": "2171:abae5007",
  "practice-draft-u18-two-threats-mc": "2199:a3f131a3",
  "practice-draft-u18-two-threats-tf": "1948:4bf98e07",
  "practice-draft-u7-open-friend-mc": "2033:82139cd4",
  "practice-draft-u7-open-friend-tf": "1866:e4153d03",
  "practice-draft-u9-blocked-pass-mc": "2072:473e87bb",
  "practice-draft-u9-blocked-pass-tf": "1956:19139bfd",
  "practice-draft-u11-defender-shot-mc": "2065:45cb235c",
  "practice-draft-u11-defender-shot-tf": "1830:3837159c",
  "practice-draft-u13-receive-finish-mc": "2267:65eb32cd",
  "practice-draft-u13-receive-finish-tf": "1993:3753a4f9",
  "practice-draft-u15-available-dangerous-mc": "2185:03f010a3",
  "practice-draft-u15-available-dangerous-tf": "1932:82b864dd",
  "practice-draft-u18-both-defenders-mc": "2271:eca36c6e",
  "practice-draft-u18-both-defenders-tf": "2076:2ba9bdcd",
};

export const CURRICULUM_PLAYER_COPY = Object.freeze(Object.fromEntries(Object.entries(LESSON_COPY).flatMap(([slug, lesson]) => ['mc', 'tf'].map(type => {
  const [prompt, ...rest] = lesson[type];
  const [options, explanation, tip] = type === 'mc' ? rest : [undefined, ...rest];
  const id = `practice-draft-${slug}-${type}`;
  return [id, Object.freeze({ binding: SOURCE_BINDINGS[id], prompt, options: options && Object.freeze(options), explanation, tip, learnerAction: lesson.action, teachingPoint: HABIT_COPY[slug], visualCaption: SCENE_COPY[slug] })];
}))));

export function curriculumPlayerCopy(lesson, question) {
  const entry = CURRICULUM_PLAYER_COPY[question.id];
  if (!entry || entry.binding !== curriculumCopyBinding(lesson, question)) throw new Error(`Player wording needs review: ${question.id}`);
  const { prompt, options, explanation, tip, learnerAction, teachingPoint, visualCaption } = entry;
  return { prompt, options, explanation, tip, learnerAction, teachingPoint, visualCaption };
}

// Deliberately separate from the player accessor. Author/reviewer tooling can
// retrieve the original rationale and its source without making it UI copy.
export function curriculumValidationRationale(lesson, question) {
  return { questionId: question.id, sourceRef: lesson.sourceRef, rationale: question.why };
}

export function validateCurriculumAudienceCopy(pack) {
  const errors = [], ids = new Set();
  for (const lesson of pack.lessons || []) for (const question of lesson.questions || []) {
    ids.add(question.id);
    try {
      const copy = curriculumPlayerCopy(lesson, question);
      if (![copy.prompt, copy.explanation, copy.tip, copy.learnerAction, copy.teachingPoint, copy.visualCaption].every(value => typeof value === 'string' && value.trim())) errors.push(`Incomplete player wording: ${question.id}`);
      if (question.type === 'mc' && (!Array.isArray(copy.options) || copy.options.length !== question.opts?.length || copy.options.some(value => typeof value !== 'string' || !value.trim()))) errors.push(`Player choices need review: ${question.id}`);
      if (question.type === 'tf' && copy.options !== undefined) errors.push(`True/false choices need review: ${question.id}`);
    } catch (error) { errors.push(error.message); }
  }
  for (const id of Object.keys(CURRICULUM_PLAYER_COPY)) if (!ids.has(id)) errors.push(`Player wording has no source: ${id}`);
  return errors;
}
