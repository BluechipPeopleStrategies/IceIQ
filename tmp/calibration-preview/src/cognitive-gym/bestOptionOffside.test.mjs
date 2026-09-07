#!/usr/bin/env node
// Run: node src/cognitive-gym/bestOptionOffside.test.mjs
import { zoneLines, isOffsidePass, makeSituation } from "./bestOptionCore.js";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const W = 1000, H = 500;

// ---- the rink knows both blue lines -----------------------------------------
// The drill attacks LEFT (net at W*0.08), so lower x is closer to the target
// net. Real blue lines sit 75ft from each end of a 200ft sheet -> 0.375/0.625.
{
  const z = zoneLines(W);
  ok("attacking blue line is the one nearer the attacking net", z.attackingBlue < z.defendingBlue);
  ok("attacking blue line sits at 0.375 of the length", Math.abs(z.attackingBlue - W * 0.375) < 1);
  ok("defending blue line sits at 0.625 of the length", Math.abs(z.defendingBlue - W * 0.625) < 1);
  ok("both lines are exposed, not just the attacking one",
    Number.isFinite(z.attackingBlue) && Number.isFinite(z.defendingBlue));
  ok("the neutral zone lies between them", z.attackingBlue < W * 0.5 && z.defendingBlue > W * 0.5);
}

// ---- offside ----------------------------------------------------------------
// A teammate is offside if they are already inside the attacking zone (past the
// attacking blue line) while the puck carrier has not yet carried it in.
{
  const z = zoneLines(W);
  const inZone = { x: z.attackingBlue - 60, y: 250 };   // deep in the attacking zone
  const neutral = { x: W * 0.5, y: 250 };                // neutral zone
  const alsoInZone = { x: z.attackingBlue - 20, y: 300 };

  ok("carrier in neutral, mate in the zone -> OFFSIDE", isOffsidePass(neutral, inZone, W) === true);
  ok("carrier already in the zone -> legal", isOffsidePass(alsoInZone, inZone, W) === false);
  ok("both in neutral -> legal", isOffsidePass(neutral, { x: W * 0.55, y: 200 }, W) === false);
  ok("mate behind the carrier -> legal", isOffsidePass(neutral, { x: W * 0.7, y: 200 }, W) === false);
  ok("carrier in his own end, mate in the attacking zone -> still offside",
    isOffsidePass({ x: W * 0.85, y: 250 }, inZone, W) === true);
  ok("a mate exactly ON the blue line is onside (the line belongs to the zone edge)",
    isOffsidePass(neutral, { x: z.attackingBlue, y: 250 }, W) === false);
}

// ---- generated situations must be legal, or deliberately teach offside ------
// Every generated scene is checked: if the answer is PASS, the pass must be
// legal. If a mate is offside, the scene must not be telling the player to
// pass to them.
{
  let checked = 0, illegalPassAsBest = 0, offsideTeaching = 0;
  for (let seed = 0; seed < 400; seed += 1) {
    let n = seed + 1;
    const rng = () => { n = (n * 1103515245 + 12345) % 2147483648; return n / 2147483648; };
    const s = makeSituation(2, W, H, { rng });
    checked += 1;
    const openMates = (s.teammates || []).filter(m => m.open);
    const offsideOpen = openMates.filter(m => isOffsidePass(s.you, m, W));
    if (s.best === "pass" && offsideOpen.length) illegalPassAsBest += 1;
    if (s.offsideTeach) offsideTeaching += 1;
  }
  ok(`no generated scene makes an ILLEGAL pass the best read (checked ${checked})`, illegalPassAsBest === 0);
  ok("some scenes deliberately teach offside", offsideTeaching > 0);
}

// ---- the teaching case ------------------------------------------------------
// When offside is the lesson: a mate IS open but offside, and the right answer
// is CARRY *because* the pass is illegal — with a reason that says so.
{
  let found = null;
  for (let seed = 0; seed < 600 && !found; seed += 1) {
    let n = seed + 7;
    const rng = () => { n = (n * 1103515245 + 12345) % 2147483648; return n / 2147483648; };
    const s = makeSituation(3, W, H, { rng });
    if (s.offsideTeach) found = s;
  }
  ok("an offside-teaching scene is reachable", !!found);
  ok("its best read is carry", found?.best === "carry");
  ok("it really does have an offside teammate", !!found && (found.teammates || []).some(m => isOffsidePass(found.you, m, W)));
  ok("its reason explains the rule rather than just saying carry", /offside/i.test(found?.reason || ""));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
