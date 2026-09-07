# Missing asks — review sheet

**28 questions still show a scenario and four options and never ask anything.**

| | |
|---|---|
| Category 1 in the audit | 45 |
| Fixed by the `next` badge — no content change, already live | **17** |
| **Still open** | **28** |
| Mechanical (one stock sentence, zero judgment) | **26** |
| Needs one clause written, both read off the stem | **2** |
| Needs a coach | **0** |

**Time: about 15 minutes** if you read all 28 stems. **About 3** if you take the two
big blocks wholesale and only stop on the three singletons at the bottom.

The sheet is built to be worked in that second mode. Blocks A and B are 25 of the 28
and take one decision each.

---

## What this is, and what it deliberately is not

Every one of these already has exactly one keyed correct answer and an `explain` that
justifies it. The only thing missing is the sentence that tells the player they are
being asked something. So this sheet **adds an ask and nothing else**:

- `ok` is never touched. `opts` is never touched. No option's wording moves.
- No scenario is rewritten. The added sentence goes on the end, after the existing text.
- No hockey detail is added that the stem does not already state.

If adding the ask would have meant deciding what a question is about, it would be in
the "needs a coach" list at the bottom instead of getting a guess. That list is empty,
and the reason is in that section.

**Nothing here is applied.** `bank.json` is untouched.

### Verified against the bank, not against the audit

The audit is from this morning and the bank has been edited several times since. I
re-ran the detector against the current file rather than trusting the 45:

- All 45 originally-flagged stems still have no ask **in the `sit` text**. None was
  edited away.
- 17 of them are `next`-type and are now answered by the `🔮 What's Your Next Move?`
  badge, rendered in both the main quiz ([`App.jsx:2532`](../../src/App.jsx#L2532))
  and WeeklyQuiz ([`App.jsx:3890`](../../src/App.jsx#L3890)). Confirmed live in both
  paths. Those need nothing.
- `seq` and `mc` both still fall through to `📋 Game Situation`
  ([`App.jsx:2511-2534`](../../src/App.jsx#L2511)), which supplies no ask. Those are
  the 28.
- 26 `mc` + 2 `seq` = 28. The "roughly 27" estimate was one light: one U7 stem
  (`gen_u7_time-and-space_tas05`) starts *"You **pick** up a loose puck…"* and slips
  past any detector that treats `pick` as a directive verb.

Line numbers below count `\n` only, matching `grep` and GitHub. See the file-hygiene
note at the bottom — some editors will show you a different number. The question `id`
is the reliable locator.

---

## Block A — U7 / Initiation, 17 questions. One sentence, seventeen times.

**Append to each:** ` What is the best play?`

That is the U7 bank's own phrasing, used verbatim by the one U7 `mc` stem that does ask
(`rev_u7_passing_seam`) and by five of the eight at U9. Every keyed answer below is an
action the player takes, which is the question that sentence asks.

**Accept all 17 / walk the rows / reject.**

| # | id · line | `sit` (verbatim, unchanged) | ✅ keyed | the other three |
|---|---|---|---|---|
| A1 | `gen_u7_offense_sup01` · [4634](../../src/data/bank.json#L4634) | Your teammate just picked up the puck along the boards. Three players from the other team are skating right toward them to try to steal it. | Skate away from the crowd into open ice and show your stick | Skate right beside your teammate on the boards so you are close for a pass · Stand near the puck and wait to see if it pops loose · Turn back toward your own end in case the other team gets the puck |
| A2 | `gen_u7_transition_def01` · [4673](../../src/data/bank.json#L4673) | You are in the end you are attacking trying to score, but a player on the other team steals the puck and starts skating fast toward your goalie. | Stop, turn around, and skate hard back toward your own net to help your goalie | Chase the puck carrier from behind and reach with your stick · Stay near the other team's net in case your team steals it back · Glide slowly toward your own end and watch where the puck goes |
| A3 | `gen_u7_offense_net01` · [4692](../../src/data/bank.json#L4692) | Your teammate is skating down the wing with the puck and is about to shoot on the goalie. You are skating down the middle of the ice. | Stop near the front or side of the net with your stick on the ice, ready for a rebound | Skate into the corner in case the shot misses the net · Skate up beside your teammate and call for the puck right away · Stop high in the zone and watch the shot |
| A4 | `gen_u7_offense_sup02` · [4765](../../src/data/bank.json#L4765) | Your teammate intercepts a pass and has a clear breakaway. They are skating as fast as they can toward the other team's net. | Skate hard behind them to follow up on the play | Coast near center ice and watch the shot · Turn toward the bench because the play is far away · Stop at the blue line so you do not get too close |
| A5 | `gen_u7_defense_pos01` · [4784](../../src/data/bank.json#L4784) | A player on the other team has the puck directly behind your net. You are the only defender back. | Stay in front of your goalie with your stick on the ice to protect the scoring area | Chase the player all the way behind the net to try to steal the puck · Stand beside one post and only watch the puck carrier · Skate toward the corner boards before the puck carrier comes out |
| A6 | `gen_u7_puck_skills_pas01` · [4803](../../src/data/bank.json#L4803) | You are standing in open ice. Your teammate has the puck and looks right at you. You want them to pass it. | Tap your stick blade flat on the ice where you want the puck | Yell loudly while your stick blade is off the ice · Hold your stick near your skates without showing a clear target · Turn away and skate into space where they cannot see your stick |
| A7 | `gen_u7_transition_off01` · [4861](../../src/data/bank.json#L4861) | The other team is attacking, but your goalie makes a save and the puck goes out to your defenseman. | Turn up the ice, start skating forward, and look back for a pass | Stay in front of your goalie in case the puck comes back · Skate slowly sideways and wait for your defenseman to carry it · Skate into the same corner as your defenseman |
| A8 | `gen_u7_defense_gap01` · [4880](../../src/data/bank.json#L4880) | An attacker is skating fast right at you with the puck. You are the last defender back. | Keep your body between the attacker and your net, steering them toward the boards | Reach only for the puck and let your body drift to one side · Back straight into your goalie so you do not get beaten · Skate straight at the attacker and guess which way they will go |
| A9 | `gen_u7_offense_atk01` · [4913](../../src/data/bank.json#L4913) | You get a great pass in the middle of the ice. The only person between you and the goal is the goalie. | Keep your feet moving, skate toward the net, and shoot | Stop skating right away so you can take a big shot from far away · Pass the puck backward even though you have open ice · Skate wide into the corner to stay away from pressure |
| A10 | `gen_u7_reading-the-play_rdp01` · [4932](../../src/data/bank.json#L4932) | Your goalie saves the puck to the corner. Two players from the other team skate toward it. You are the closest defender to your net. | Skate to the front of your net and keep your stick on the ice | Chase both attackers deep into the corner · Stand behind your own net and wait · Skate up to the blue line for a pass |
| A11 | `gen_u7_reading-the-play_rdp05` · [5005](../../src/data/bank.json#L5005) | You are standing in front of the other team's net. Your teammate has the puck in the corner and looks at you. | Keep your stick blade flat on the ice as a target | Wave your hands while your stick is off the ice · Skate right up to your teammate and bring traffic with you · Turn your back and skate away from the net |
| A12 | `gen_u7_decision-making_dec01` · [5024](../../src/data/bank.json#L5024) | You are skating down the ice with the puck. A defender is standing still in front of you. The side of the ice is empty. | Steer to the empty side and skate past them | Put your head down and skate straight at the defender · Stop moving and wait for them to move away · Shoot the puck from far away before you get closer |
| A13 | `gen_u7_decision-making_dec05` · [5097](../../src/data/bank.json#L5097) | You are on a breakaway with only the goalie in front of you. A player from the other team is skating hard behind you. | Keep skating fast toward the net and shoot | Stop skating and let them catch up · Turn around and skate back toward the player chasing you · Shoot the puck into the corner and chase it |
| A14 | `gen_u7_time-and-space_tas01` · [5116](../../src/data/bank.json#L5116) | You get the puck near the boards down in your own end. A player from the other team skates at you. The ice along the wall is open. | Keep your feet moving and skate up the boards into open ice | Stop skating and hide the puck between your skates · Pass across the front of your own net · Stand still and wait for help |
| A15 | `gen_u7_time-and-space_tas05` · [5189](../../src/data/bank.json#L5189) | You pick up a loose puck in the middle of the ice. Nobody is between you and the other team's goalie. | Carry the puck toward the net as fast as you can | Pass to a teammate who is covered · Skate backward with the puck · Shoot from center ice right away |
| A16 | `gen_u7_creativity-under-pressure_cup01` · [5208](../../src/data/bank.json#L5208) | You are in the corner with the puck. A defender's stick blocks the direct pass, and your teammate is open nearby. | Bank the puck softly off the boards to your teammate | Try to chop the puck through the defender's stick · Cover the puck with your hand · Shoot the puck high at the glass |
| A17 | `gen_u7_creativity-under-pressure_cup05` · [5281](../../src/data/bank.json#L5281) | A defender slides on the ice in front of you to block your shot. | Pull the puck around them and shoot through the open lane | Shoot right into the defender's pads · Pass backward right away even though you can shoot · Leave the puck and skate away |

**A14 already carries the zone clause** ("down in your own end") applied from the
under-specified sheet as B1. That fix and this one land on the same field, so they need
to go in together, not on top of each other.

---

## Block B — U9 / Novice, 8 questions. Same sentence.

**Append to each:** ` What is the best play?`

Same justification, stronger precedent: five of the eight U9 `mc` stems that ask use
this exact sentence. Every keyed answer below is an action the player takes.

**Accept all 8 / walk the rows / reject.**

| # | id · line | `sit` (verbatim, unchanged) | ✅ keyed | the other three |
|---|---|---|---|---|
| B1 | `gen_u9_reading-the-play_rdp01` · [4217](../../src/data/bank.json#L4217) | Your teammate shoots, and the puck bounces off the goalie's pads into the front of the net. The goalie is down, and a defender is starting toward the loose puck. | Stop near the net and tap the loose puck quickly before the defender gets there | Take an extra stickhandle to settle the puck before shooting · Peel away toward the boards to look for a pass · Wait for your teammate to skate in for their own rebound |
| B2 | `gen_u9_reading-the-play_rdp05` · [4290](../../src/data/bank.json#L4290) | Your defenseman has the puck behind your net, looking to pass it up the ice to you. The other team's winger is standing right between you and your defenseman. | Skate to an open pocket of ice where the winger is not blocking the pass | Stay exactly where you are and tap your stick on the ice · Skate closer to the boards where the winger is already blocking the lane · Turn up ice without looking back for the puck |
| B3 | `gen_u9_decision-making_dec01` · [4309](../../src/data/bank.json#L4309) | You are leading a 2-on-1 rush toward the net. The only defender slides over to block your pass, leaving you a clear path to the goalie. | Skate toward the net and take a quick shot yourself | Try to force a pass through the defender's skates to your teammate anyway · Slow down and wait for the defender to choose again · Dump the puck into the corner even though you have a shooting lane |
| B4 | `gen_u9_decision-making_dec05` · [4382](../../src/data/bank.json#L4382) | Your teammate is battling for the puck on the boards. You are open in the front of the net. The puck pops right to you. | Shoot the puck right away before the defenders can react | Pass the puck back into the pile of players on the boards · Stickhandle toward the boards to make a safer play · Stop and wait for the goalie to get set |
| B5 | `gen_u9_time-and-space_tas01` · [4401](../../src/data/bank.json#L4401) | You are carrying the puck up the ice and see three defenders waiting at their blue line. Your teammate is skating fast into open ice on the outside wing. | Pass the puck to your teammate in the open space before you reach the defenders | Try to stickhandle straight through all three defenders by yourself · Slow down at the blue line until a defender comes closer · Turn around and skate all the way back to your own net |
| B6 | `gen_u9_time-and-space_tas05` · [4474](../../src/data/bank.json#L4474) | Your teammate wins a faceoff in the end you are attacking. The puck slides to you at the blue line, and you have a clear lane to the net. | Take a quick step into the open lane and shoot before the space closes | Hold the puck until a defender gets close · Pass to a covered teammate along the boards · Skate all the way into the corner with the puck |
| B7 | `gen_u9_creativity-under-pressure_cup01` · [4493](../../src/data/bank.json#L4493) | You get the puck behind the other team's net. A defender chases you around the right side and cuts off your path. | Stop quickly, protect the puck, and go back out the left side where the ice is open | Keep skating the same way and hope you can outrun the defender along the boards · Throw the puck to the front of the net without looking · Freeze behind the net and wait for the defender to take the puck |
| B8 | `gen_u9_creativity-under-pressure_cup05` · [4566](../../src/data/bank.json#L4566) | You have the puck in the front of the net, ready to shoot, but a defender drops down in front of you to block the lane. | Fake the shot, pull the puck to the side, and take a quick shot around the blocker | Shoot it hard right into the defender's pads · Skate backward out of the front of the net right away · Pass to a covered teammate behind you |

B4 is the one you hit in the playtest — *"It doesn't ask you what you should do next.
It doesn't say anything, but it gives you options."*

---

## C1 — U7, the one where the stock sentence misfires. **1 question.**

### `gen_u7_hockey_sense_rul01` — [bank.json:4822](../../src/data/bank.json#L4822)

> You shoot the puck, and the goalie catches it in their glove. The referee blows the
> whistle.

| | |
|---|---|
| ✅ | Stop right away, turn away from the goalie, and get ready for the next play |
| | Keep skating in and try to poke the puck loose before the goalie covers it |
| | Skate through the crease to see if the puck falls out |
| | Stand beside the goalie and wait for the referee to drop the puck there |

This is the only one of the 26 where *"What is the best play?"* reads wrong. The
whistle has gone; there is no play. A seven-year-old reading carefully could stall on
that.

**Proposed:** ` What should you do?`

Same job, no judgment, and it is already in the bank's voice — U13 uses *"What should
you do?"* verbatim and U9 uses *"What should you do in that moment?"*. Deliberately not
*"What should you do next?"*, which is the `next`-badge wording and would read as a
type label.

**Accept / use "What is the best play?" anyway / reject.**

---

## D — the two `seq` questions. **One clause each, both copied off the stem.**

`seq` renders under the same `📋 Game Situation` header as `mc` and supplies no ask,
so a player sees four sentences and a set of up/down arrows with nothing telling them
what order means.

The bank has exactly one `seq` stem that does ask — `gen_u13_scanning_scn05`,
*"…Order the steps for a successful entry."* — and it states a **purpose**, not a bare
instruction. So matching it means writing a purpose clause. That is more than a stock
sentence, which is why these two are broken out.

**In both cases the purpose is already stated in the stem**, so the clause restates
rather than decides. I have given the safe zero-content fallback beside each in case
you would rather not have me writing any clause at all.

### D1 · `gen_u13_transition_reads_cmp02` — U13 / Peewee — [bank.json:5848](../../src/data/bank.json#L5848)

> The other team misses the net, and the puck rims hard around the boards to you. You
> are starting a quick transition out of your zone.

Correct order (unchanged, `correct_order` is `[1,3,2,0]`):

| ✅ | |
|---|---|
| 1 | Shoulder check before the puck arrives to read wall pressure. |
| 2 | Locate your center curling low as the first support option. |
| 3 | Cushion the puck off the boards so you have control. |
| 4 | Move your feet and snap a firm pass to the center's tape. |

**Proposed:** ` Order the steps for getting the puck out of your zone.`
The stem already says *"a quick transition out of your zone"*, so the clause adds no
new hockey.

**Fallback if you want zero authored content:** ` Put these steps in the right order.`
Matches the `🔢 Put in Order` type label the player already sees elsewhere.

### D2 · `gen_u15_attacking_1v1_off02` — U15 / Bantam — [bank.json:5981](../../src/data/bank.json#L5981)

> You are a forward receiving an outlet pass and preparing to attack a lone defender on
> a 1-on-1 rush.

Correct order (unchanged, `correct_order` is `[1,3,0,2]`):

| ✅ | |
|---|---|
| 1 | Build speed as you receive and move through the neutral zone. |
| 2 | Scan the defender's gap, stick, and feet before choosing your lane. |
| 3 | Push the puck slightly wide to make the defender turn their hips. |
| 4 | Cut back hard to the middle once the defender leans outside. |

**Proposed:** ` Order the steps for beating the defender 1-on-1.`
The stem already says *"attack a lone defender on a 1-on-1 rush"*.

**Fallback:** ` Put these steps in the right order.`

**Accept both / take the fallback on both / reject.**

---

## Needs a coach — **none.**

I expected to hand you a few and I could not honestly find one. Every stem here sets up
a situation, and every keyed answer is an action the player takes in it. There is no
question in this batch where I had to guess what was being asked in order to write the
ask.

That is a real result rather than a shortcut, and it has a cause worth noting: these are
all generated questions where the generator emitted a scenario, four options and an
`explain` but never emitted an interrogative. The intent survives intact in the
`explain` field on all 28. Nothing was lost, only unsaid.

The one place where genuine intent is unclear is upstream of this sheet and already
handled: the 17 `next` questions. The audit could not tell whether `next` meant *"what
should you do"* or *"what happens next"*. The badge fix resolved it by reading all 17
keyed answers and finding every one to be an action, not a prediction. If that call was
wrong, it is wrong for all 17 at once and it is a code change, not a content change.

---

## Noticed while reading. Not in scope, not proposed, worth a minute.

These are separate from the ask problem and I have changed nothing.

**1. Today's zone-name substitution left four of these stems reading oddly.** The
`slot` → `front of the net` and `offensive zone` → `the end you are attacking` swaps
(which correctly satisfy the "no zone names at U7/U9" guard) produced some awkward
sentences. In this batch:

- A2 — *"You are in the end you are attacking trying to score…"*
- B1 — *"…bounces off the goalie's pads into the front of the net"* (a rebound goes
  *to* the front of the net, or *into the slot*)
- B4 — *"You are open in the front of the net"*
- B8 — *"You have the puck in the front of the net"*, and its own distractor
  *"Skate backward out of the front of the net right away"*

Bank-wide the phrase `the front of the net` now appears 16 times and `the end you are
attacking` 5 times, so there are a few more outside this batch. Reads like a
find-and-replace that wanted a second pass. Since you are going to be editing these
same `sit` fields anyway, it may be cheapest to fix both in one edit.

**2. A7 (`gen_u7_transition_off01`) never says who you are.** *"…the puck goes out to
your defenseman."* The keyed answer is *"Turn up the ice…and look back for a pass"*,
which is right if you are a forward; *"Stay in front of your goalie"* is defensible if
you are the other defenceman. That is a CONTENT-2 under-specification issue, not a
missing-ask issue, and adding the ask does not depend on resolving it. Logging it so it
is not lost.

**3. `bank.json` has 156 `\r\r\n` line endings.** A double carriage return, probably
from a Windows write that added `\r\n` to lines that already ended in `\r`. Harmless to
the parser, but it makes line numbers disagree between tools: `grep` and GitHub count
one line where a strict-newline reader counts two, so the same `sit` field is at 4217 or
4373 depending on what is looking. Every line number in this sheet uses the `grep`
convention. Worth normalizing before the next batch of edits, or the diff will be
noisier than the change.

---

## Guard

The detector for this class is genuinely reliable, unlike the under-specified one — a
stem either contains an interrogative or it does not, and the type-aware version had a
0% false-positive rate over 45 hand-checked candidates. It is worth landing as a
preflight rule while the number is about to be zero:

- every `mc` and `seq` stem must contain a `?`, a trailing `:`, or a clause-initial
  directive verb
- `tf`, `mistake`, `zone-click`, `multi` and `next` are exempt, because the UI chrome
  supplies their ask — and each exemption should name the render site, so that removing
  a badge trips the guard instead of silently recreating this bug

That second clause is the one that matters. This defect existed for 17 `next` questions
purely because a badge was defined and never rendered.
