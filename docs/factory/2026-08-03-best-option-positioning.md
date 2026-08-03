# Best Option drill — positions are random, not hockey-aware

Found by Thomas playtesting on 2026-08-03. Three separate reps, one root cause.

## What he saw

1. "This one needs to be mindful of offside because if it passed backwards, it
   would then be offside."
2. "This one's offside if this guy actually passes." — YOU in the neutral zone,
   a teammate already across the attacking blue line, ahead of the puck.
3. "The defense should be in more logical spots." — a defender parked in the
   far corner of its own end while the play sat at centre ice.

## Root cause

`makeSituation()` in `src/cognitive-gym/bestOptionCore.js` scatters bodies
uniformly across the full rink:

```js
x: cx(pad + rng() * (W - 2 * pad)),
y: cy(pad + rng() * (H - 2 * pad)),
```

Grepping that file for `blue`, `offside` or `zone` returns nothing. The
generator has no model of the blue lines, the zones, or which way the play is
going beyond the net's position. Constraints that do exist are geometric only —
keep clutter off the shooting lane, do not stack bodies on YOU or the net.

## Why it is a correctness bug, not a polish item

The drill grades a choice between SHOOT / PASS / CARRY. If it places a teammate
offside and then decides PASS is the best read, it marks a player **wrong for
not choosing an illegal play** — or right for choosing one. Either way the
feedback teaches the opposite of the rule.

That is the same gap logged on 2026-08-01 from external feedback: nothing we own
validates rule-legality. This is the first confirmed instance of it changing a
player's score rather than just looking odd.

## Not fixed here

Two reasons. "Logical defender position" is a coaching judgment, not something
to infer from a diagram — where a defender *should* be depends on the read being
taught. And there is a genuine product fork underneath it, which is Thomas's
call:

- **Keep every generated option legal.** The generator learns the blue line and
  never places a pass target offside. Simplest, and the drill stays about
  shoot/pass/carry.
- **Generate offside deliberately, and teach it.** An available-but-illegal pass
  becomes a real read: the right answer is CARRY *because* the pass is offside.
  That turns a bug into content, and it is the only version that teaches the
  rule. Costs a fourth feedback line and a way to say why.

Either way the defenders want a positional model — pressuring the carrier,
between puck and net, or supporting — rather than uniform noise.

## Scope note

This is the Brain Gym drill generator, entirely separate from the scenario-engine
work. It shares no code with `bestOptionCore.js`. Fixing one does not fix the
other, and the scenario seeds have their own authored positions.
