import fs from 'fs';

const qb = JSON.parse(fs.readFileSync('./src/data/questions.json', 'utf8'));

const newQuestions = [];

// U15 TF (7 questions)
const u15TF = [
  { id: "u15tf1", cat: "Systems Play", pos: ["F","D"], concept: "Pinching situational", sit: "When your team is in the defensive zone with the puck, the first forward should immediately pinch the boards on every play.", ok: false, why: "Pinching should be situational — only when you're sure you'll win the puck.", tip: "Pinch smart, not automatic." },
  { id: "u15tf2", cat: "Gap Control", pos: ["D"], concept: "Gap vs speed", sit: "Against a forward attacking at full speed, you should back up to maintain gap control rather than challenge early.", ok: true, why: "Backing up maintains gap and forces their decision. Challenging early gives them speed advantage.", tip: "Control the gap." },
  { id: "u15tf3", cat: "Special Teams", pos: ["F"], concept: "PK puck pressure", sit: "On the penalty kill, the two forwards should focus on preventing zone entry, not creating counter-attacks.", ok: true, why: "PK success depends on preventing entries and maintaining structure.", tip: "PK first: prevent zone entry." },
  { id: "u15tf4", cat: "Leadership", pos: ["F","D"], concept: "Leading by example", sit: "A player should only demand accountability from teammates if they're having a great game themselves.", ok: false, why: "Leadership is about effort and attitude, not perfection.", tip: "Lead by attitude and effort." },
  { id: "u15tf5", cat: "Transition", pos: ["F","D"], concept: "Transition speed", sit: "In transition, moving the puck quickly up ice is more important than finding the perfect pass.", ok: true, why: "Quick transitions create odd-man advantages. Speed matters more than perfection.", tip: "Transition speed beats perfection." },
  { id: "u15tf6", cat: "Physical Play", pos: ["D"], concept: "Body positioning", sit: "You should avoid using your body on a defenseman because you'll be called for a penalty.", ok: false, why: "Using your body properly is legal and encouraged. Penalties come from illegal contact.", tip: "Physical play is legal if positioned correctly." },
  { id: "u15tf7", cat: "Game Management", pos: ["F"], concept: "Protecting a lead", sit: "When up 3-1 late, you should play defensively and avoid risks with the puck.", ok: true, why: "Protecting a lead means controlled possession and smart puck management.", tip: "Protecting lead = smart puck management." }
];

// U15 Seq (8 questions)
const u15Seq = [
  { id: "u15seq1", cat: "Breakouts", pos: ["D"], concept: "Controlled breakout", sit: "Put the steps of a controlled breakout in order.", items: ["Defenseman secures puck behind net", "D creates space with lateral movement", "Forward support arrives at hash marks", "D makes crisp pass to forward in stride", "Forward exits cleanly up board or middle"], correct_order: [0,1,2,3,4], why: "Breakout requires D to secure, create space, pass when support ready, then exit cleanly.", tip: "Breakout: secure, move, support, pass, exit." },
  { id: "u15seq2", cat: "Special Teams", pos: ["F","D"], concept: "PK prevention", sit: "Order the steps of penalty kill entry prevention.", items: ["First forward pressures puck carrier", "Second forward angles to boards", "Together prevent the zone entry", "Transition to short-handed counter if available"], correct_order: [0,1,2,3], why: "PK requires engagement, angling, prevention, then counter opportunity.", tip: "PK: engage, angle, prevent, counter." },
  { id: "u15seq3", cat: "Systems Play", pos: ["F","D"], concept: "1-3-1 trap", sit: "Put the steps of setting up a 1-3-1 neutral zone trap in order.", items: ["F1 engages puck carrier", "D establish blue line structure", "F2/F3 move to passing lanes", "If turnover, transition to offense"], correct_order: [0,1,2,3], why: "Trap requires F1 engage first, then D set, then wings block lanes.", tip: "1-3-1: F1 engages, D set, wings cover lanes." },
  { id: "u15seq4", cat: "Gap Control", pos: ["D"], concept: "1-on-1 defense", sit: "Put the steps of defending a 1-on-1 situation in order.", items: ["Read the attacker approach and speed", "Maintain gap and body position", "Force them to outside if possible", "Stay on feet and make the play"], correct_order: [0,1,2,3], why: "1-on-1 requires reading, maintaining gap, forcing issue, then reacting.", tip: "1-on-1: read, gap, force outside, stay up." },
  { id: "u15seq5", cat: "Transition", pos: ["F","D"], concept: "Fast break", sit: "Order the steps of executing a fast break in transition.", items: ["First pass breaks first line of defense", "Second pass creates odd-man advantage", "Final pass sets up scoring opportunity", "Take the shot or create best play"], correct_order: [0,1,2,3], why: "Fast breaks build in rhythm: break line, create advantage, position, score.", tip: "Fast break: break line, advantage, position, finish." },
  { id: "u15seq6", cat: "Finishing", pos: ["F"], concept: "Slot attack", sit: "Order the steps of a proper slot attack sequence.", items: ["Recognize the open slot area", "Move into slot with purpose", "Receive pass in sweet spot", "Shoot immediately without hesitation"], correct_order: [0,1,2,3], why: "Slot play requires reading area, getting in, receiving clean, then shooting fast.", tip: "Slot: read, move, receive, shoot." },
  { id: "u15seq7", cat: "Leadership", pos: ["F","D"], concept: "Defense communication", sit: "Order the communication steps during defensive play.", items: ["Call out opponent assignments", "Confirm coverage with partner", "Make callouts as play develops", "Reset communication after play"], correct_order: [0,1,2,3], why: "Communication starts with clear assignments, confirms coverage, continues, then resets.", tip: "Defense talk: assign, confirm, continue, reset." },
  { id: "u15seq8", cat: "Puck Management", pos: ["F"], concept: "Zone cycle", sit: "Order the steps of executing a zone cycle.", items: ["Enter zone with support arriving", "Cycle puck around perimeter", "Create rebound opportunity in slot", "Maintain possession or create scoring chance"], correct_order: [0,1,2,3], why: "Cycling builds time and opportunity: enter, move, create, finish.", tip: "Cycle: enter, move, create, finish." }
];

// U15 Mistake (8 questions)
const u15Mistake = [
  { id: "u15mis1", cat: "Gap Control", pos: ["D"], concept: "Overcommitting", sit: "You skate forward to challenge early instead of backing up. What's the mistake?", opts: ["You should have stayed deeper.", "You overcommitted — closing gap early gives speed advantage and scoring chance.", "You didn't use your stick effectively.", "You angled them wrong."], ok: 1, why: "Overcommitting closes gap and removes ability to react.", tip: "Maintain gap first. Challenge when sure." },
  { id: "u15mis2", cat: "Transition", pos: ["F"], concept: "Forcing transition", sit: "In transition at hash marks with no support, you try to deke through two defenders. What's the mistake?", opts: ["Deking is never right.", "You forced play instead of letting transition develop — support arrives if you buy time.", "You should have shot.", "You didn't protect puck."], ok: 1, why: "Forcing plays in transition kills momentum. Support arrives if you buy time.", tip: "Transition: buy time, let support arrive." },
  { id: "u15mis3", cat: "Special Teams", pos: ["F","D"], concept: "PK coverage", sit: "On PK, you chase the puck instead of maintaining coverage, leaving your player open. What's the mistake?", opts: ["You should have predicted the pass.", "You left your man open — coverage matters more than chasing puck.", "You moved too slowly.", "You should have blocked the pass."], ok: 1, why: "PK is about structure and coverage. Chasing pucks breaks assignments.", tip: "PK: maintain coverage assignment." },
  { id: "u15mis4", cat: "Finishing", pos: ["F"], concept: "Slot hesitation", sit: "You receive pass in slot and hesitate to adjust puck. Goalie sets and saves. What's the mistake?", opts: ["You should have passed.", "You hesitated — in slot with open lane, shoot immediately.", "The pass was late.", "The goalie got lucky."], ok: 1, why: "Slot opportunities are high-percentage only if you shoot fast.", tip: "Slot: receive and shoot immediately." },
  { id: "u15mis5", cat: "Systems Play", pos: ["F"], concept: "Trap commitment", sit: "In a 1-3-1 trap, F1 leaves the puck carrier to help F2 block a passing lane. What's the mistake?", opts: ["F1 should support behind the play.", "F1 abandoned their primary responsibility — engaging the puck carrier is the foundation of the trap.", "F2 should handle the puck carrier.", "The trap setup was wrong."], ok: 1, why: "Trap fails if F1 doesn't maintain pressure on puck carrier.", tip: "Trap: F1 engagement is foundation." },
  { id: "u15mis6", cat: "Leadership", pos: ["D"], concept: "Communication breakdown", sit: "You see a gap opening but don't call it out to your partner, who gets caught out of position. What's the mistake?", opts: ["Your partner should have seen it.", "You didn't communicate — calling gaps keeps partner informed and alert.", "Your partner should have moved.", "The play was too fast."], ok: 1, why: "Defense communication prevents coverage breakdowns.", tip: "Talk constantly on defense." },
  { id: "u15mis7", cat: "Physical Play", pos: ["D"], concept: "Gap overcommit", sit: "Against a rushing attacker, you use your body too aggressively and get called for a check from behind. What's the mistake?", opts: ["You should have let them score.", "You overcommitted with your body — positioning and angling work better than aggressive contact.", "The ref was wrong.", "You should have pushed harder."], ok: 1, why: "Effective physical play uses positioning and angle, not aggression.", tip: "Positioning beats aggression." },
  { id: "u15mis8", cat: "Game Management", pos: ["F"], concept: "Reckless desperation", sit: "Down 2-1 with 30 seconds left, you throw the puck away trying a risky pass instead of shooting. What's the mistake?", opts: ["You should have passed.", "You were reckless — in desperation, shot > risky pass. You need a goal.", "The goalie made a save.", "You needed more skill."], ok: 1, why: "Late-game deficit requires goal-scoring focus, not playmaking.", tip: "Down late: create shots, not chances for others." }
];

// U15 Next (7 questions)
const u15Next = [
  { id: "u15next1", cat: "Transition", pos: ["F"], concept: "Transition read", sit: "Breaking out at hash marks, opposing forward approaches. What next?", opts: ["Dump it in deep before defender closes.", "Cut toward middle and look for support threading through.", "Protect puck and continue up board.", "Pass back to trailing defenseman."], ok: 1, why: "Support arriving through middle creates odd-man advantage.", tip: "Transition: use support in middle." },
  { id: "u15next2", cat: "Gap Control", pos: ["D"], concept: "Gap decision", sit: "Backing up maintaining gap, attacker cuts toward middle. What next?", opts: ["Stay in middle to cut pass.", "Follow them — stay tight.", "Shuffle across staying between them and net.", "Keep backing straight — let partner help."], ok: 2, why: "Shuffle across (not turn back). Stay gap-conscious.", tip: "Shuffle with them. Stay gap-conscious." },
  { id: "u15next3", cat: "Finishing", pos: ["F"], concept: "Rebound opportunity", sit: "You shoot from the point. Goalie makes the save and rebound bounces loose. What next?", opts: ["Back off — give the goalie space.", "Push hard to first rebound and follow up with another shot.", "Pass to open teammate.", "Let the play develop."], ok: 1, why: "Loose rebounds are second chances. Push hard and be ready to shoot again.", tip: "Rebound: push hard and be ready." },
  { id: "u15next4", cat: "Special Teams", pos: ["F"], concept: "PK short-handed", sit: "You're on PK and gain possession. You have a 3-on-2 short-handed break. What next?", opts: ["Conservative pass and reset.", "Attack with speed — convert to scoring chance.", "Dump it in and retreat.", "Wait for teammates to get back."], ok: 1, why: "Short-handed breaks are premium opportunities. Attack with speed.", tip: "Short-handed break: attack with speed." },
  { id: "u15next5", cat: "Systems Play", pos: ["F","D"], concept: "Forecheck pressure", sit: "Applying a hard forecheck, the D passes it to a forechecker's wing. What next?", opts: ["Back off the pressure.", "Immediately transition to defense — they may break through.", "Keep pressing.", "Let the wing figure it out."], ok: 1, why: "When forecheck backfires, transition quickly to defense.", tip: "Forecheck failure = quick transition." },
  { id: "u15next6", cat: "Game Management", pos: ["F"], concept: "Lead management", sit: "Your team is up 2-1 with 5 minutes left. Opponent scores to tie 2-2. What next?", opts: ["Play more aggressive to retake lead.", "Play controlled and create even-strength chances.", "Go into full defensive mode.", "Push for overtime win."], ok: 1, why: "Tied late, controlled play creates chances without risk of odd-man rush.", tip: "Tied late: controlled possession." },
  { id: "u15next7", cat: "Leadership", pos: ["D"], concept: "Partner support", sit: "Your defensive partner is beat on their side and the forward is heading to the net. What next?", opts: ["Go back to check on them.", "Be ready to support and cover the assignment.", "Let them handle it.", "Change immediately."], ok: 1, why: "Supporting your partner's mistake prevents the goal. Communication and position matter.", tip: "Back up your partner on D." }
];

// U18 - Sample (will expand if needed)
const u18TF = [
  { id: "u18tf1", cat: "Game Management", pos: ["F","D"], concept: "Aggressive late game", sit: "When down by one goal with two minutes left, you should take more risks with the puck and try more aggressive plays.", ok: true, why: "Risk-reward changes when chasing a goal. Aggressive play creates chances.", tip: "Down late = controlled aggression." },
  { id: "u18tf2", cat: "Advanced Tactics", pos: ["D"], concept: "Joining rush", sit: "A defenseman should never join a rush because it leaves the zone vulnerable.", ok: false, why: "Defensemen can join rushes when there's clear advantage and partner has back coverage.", tip: "Join rush when you have advantage." }
];

const u18Seq = [
  { id: "u18seq1", cat: "Breakout Execution", pos: ["D"], concept: "Attack breakout", sit: "Order the steps of an attack-mode breakout against aggressive forecheck.", items: ["Read forecheck pressure and identify weak side", "Quick lateral pass to weak side winger", "Winger accelerates up board with space", "Forward support fills middle for transition"], correct_order: [0,1,2,3], why: "Attack breakout exploits forecheck by reading pressure and hitting weak side early.", tip: "Attack breakout: read, weak-side pass, accelerate, middle support." }
];

const u18Mistake = [
  { id: "u18mis1", cat: "Game Management", pos: ["F","D"], concept: "Score awareness", sit: "Up 2-0 in first period, you get a 2-on-1 but pass instead of shooting. Pass is intercepted. What's the mistake?", opts: ["You should have shot immediately.", "You didn't account for score — up 2-0, you take percentage plays.", "The pass was bad.", "You should have dumped it."], ok: 1, why: "Score awareness changes decision-making. Up 2-0, take percentage plays.", tip: "Score changes strategy." }
];

const u18Next = [
  { id: "u18next1", cat: "Neutral Zone Play", pos: ["F","D"], concept: "Trap transition", sit: "In neutral zone trap, opponent breaks through first line. What next?", opts: ["Full retreat to defensive zone.", "Transition to aggressive forecheck.", "Regroup at blue line and reset trap.", "Let them in cleanly."], ok: 2, why: "If trap breaks, reset at blue line and prepare to defend or trap again.", tip: "Trap breaks = reset and defend." }
];

for (const q of u15TF) newQuestions.push({...q, d: 2, type: "tf", source: "Hockey Canada — Bantam Program / NCCP Certification Materials"});
for (const q of u15Seq) newQuestions.push({...q, d: 2, type: "seq", source: "Hockey Canada — Bantam Program / NCCP Certification Materials"});
for (const q of u15Mistake) newQuestions.push({...q, d: 2, type: "mistake", source: "Hockey Canada — Bantam Program / NCCP Certification Materials"});
for (const q of u15Next) newQuestions.push({...q, d: 2, type: "next", source: "Hockey Canada — Bantam Program / NCCP Certification Materials"});
for (const q of u18TF) newQuestions.push({...q, d: 3, type: "tf", source: "Hockey Canada — Midget Program / NCCP Advanced Coaching"});
for (const q of u18Seq) newQuestions.push({...q, d: 3, type: "seq", source: "Hockey Canada — Midget Program / NCCP Advanced Coaching"});
for (const q of u18Mistake) newQuestions.push({...q, d: 3, type: "mistake", source: "Hockey Canada — Midget Program / NCCP Advanced Coaching"});
for (const q of u18Next) newQuestions.push({...q, d: 3, type: "next", source: "Hockey Canada — Midget Program / NCCP Advanced Coaching"});

qb["U15 / Bantam"] = qb["U15 / Bantam"] || [];
qb["U18 / Midget"] = qb["U18 / Midget"] || [];
qb["U15 / Bantam"].push(...newQuestions.filter(q => q.id.startsWith("u15")));
qb["U18 / Midget"].push(...newQuestions.filter(q => q.id.startsWith("u18")));

fs.writeFileSync('./src/data/questions.json', JSON.stringify(qb));
console.log(`✓ Phase 5: Added ${newQuestions.length} new questions`);
console.log(`  U15: ${newQuestions.filter(q => q.id.startsWith("u15")).length}`);
console.log(`  U18: ${newQuestions.filter(q => q.id.startsWith("u18")).length}`);
