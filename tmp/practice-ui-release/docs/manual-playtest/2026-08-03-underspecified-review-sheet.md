# Under-specified questions — review sheet

> **STATUS 2026-08-03: all six APPLIED** on Thomas's standing default ("take the
> recommended option on reversible steps and keep going"). Class A and all five
> Class B clauses are in. Verified: only the `sit` field changed on each, no answer
> key moved, no option text changed, and the U7/U9 zone guard still passes because
> B1 uses net-relative language ("down in your own end") rather than a zone name.
> Reversible — say the word on any of the six and I will revert it.

The 25 from CONTENT-2, triaged. **Six need a decision. Nineteen do not.**

Triage test: **does the missing detail change the answer?** Only that class can mark a
correct reader wrong, so only that class earns your attention.

---

## Already fixed — 8 of the 25 were the colour problem

`gen_u9_reading-the-play_128d` · `gen_u9_decision-making_5fy7` ·
`gen_u13_scanning_bt2f` · `gen_u13_gap_control_def02` ·
`gen_u13_angling_steering_def02` · `gen_u15_reading-the-play_sokd` ·
`gen_u15_coverage_reads_def02` · `gen_u15_backcheck_recovery_cmp02`

These were listed as "under-specified" but the actual defect was a colour naming
something the player could not see. Fixed in `a31ec88` / `bbf5f1f`. **A third of this
batch dissolved once the real cause was named.**

---

## Class A — the answer can flip. **1 question.**

Only one of the 25 can mark a correct reader wrong. It is the one you flagged yourself.

### A1 · `rr-u11-agility-mobility-2` — [bank.json:2916](../../src/data/bank.json#L2916)

> "The puck squirts loose behind you while you're skating forward. What's the quickest
> way to get to it?" → keyed: **Tight turn back toward the puck the short way**

Your words: *"I got this question right, but it should have more information about where
you are. If you cross the blue line and then lost the puck behind you, you'd have to
wait till everyone tags up."*

You are right, and it is the only genuine one. Everywhere on the ice the tight turn is
the fastest route — except across your attacking blue line, where the fastest legal
route is out and back. A player who knows offside can pick a "wrong" answer for a
correct reason.

**Proposed:** add the zone so the turn is unambiguously the answer.

> "The puck squirts loose behind you **in the neutral zone** while you're skating
> forward. What's the quickest way to get to it?"

Options and key unchanged. **Accept / fix / reject.**

---

## Class B — right either way, but the player is guessing. **5 questions.**

The keyed answer holds without the detail; adding one clause turns a guess into a read.
Low risk, and none of these is urgent.

| # | Question | Add | Why |
|---|---|---|---|
| B1 | `gen_u7_time-and-space_tas01` | "…near the boards **down in your own end**" | Makes the "pass across the front of your own net" distractor clearly wrong instead of arguably fine. *(Also a Category 1 stem — it has no ask either; both fixes land together.)* |
| B2 | `rr-u11-puck-carrier-options-4` | "On a 2-on-1 **as you drive toward the net**" | "Take the shot they gave you" is right from the slot and questionable from the blue line. The image implies it; the words should too. |
| B3 | `gen_u13_scanning_scn01` | "…up the ice **through the neutral zone** on a rush" | The keyed answer is chip-and-retrieve, which is offside-constrained at the line. |
| B4 | `rr-u11-attacking-1v1-5` | "You're 1v1 **in the neutral zone** late in a close game" | The justification is "a turnover here is a breakaway against" — true in the neutral or offensive zone, not deep in your own end. |
| B5 | `rr-u11-backward-transitions-2` | "…defending **in the neutral zone**" | Pivoting to the puck is right there; deep in your own end the goalie may be playing it. |

**Accept all / accept some / reject all.**

---

## Class C — deliberately general. **11 questions. No action proposed.**

Listed so you can overrule, not so you have to read them. Each is a concept or
principle question where naming a zone would *narrow a rule that is meant to be broad*.
Your own instruction is the reason: *"when there's no picture, only information we
absolutely need."* For these, the zone is not needed — it is the decorative detail.

`rr-u11-decision-making-4` (when is a risky pass worth it — a judgment principle) ·
`rr-u11-odd-man-reads-2` (defender commits to you → teammate is open, true at any
distance) · `rr-u11-reading-the-play-3` (eyes and stick blade as a cue) ·
`rr-u11-backcheck-recovery-1` (backcheckers take the open player — standard everywhere) ·
`gen_u7_decision-making_dec04` ("only the goalie between them and the net" already
establishes the situation) · `rr-u11-attacking-1v1-4` (turned hips open the cut back) ·
`rr-u11-creativity-under-pressure-1` (plan A gone → find plan B) ·
`rr-u11-shooting-3` (low shot for tips and rebounds) · `rr-u11-passing-4` (pass before
the lane closes) · `rr-u11-puck-control-3` (carry the puck in a usable spot) ·
`rr-u11-deception-with-feet-3` (a fake needs a defender close enough to react)

Three of these carry *other* known defects — `rr-u11-decision-making-4` has the
CONTENT-4 distractor problem, `rr-u11-attacking-1v1-4` has the CONTENT-8 image
mismatch. Those are real and tracked separately; neither is a missing-detail problem.

---

## What this says about the batch

The audit called 25 a floor and expected a coach to reject some. In practice:

- **8** were a different defect wearing this label — already fixed
- **11** are correctly general and should not change
- **5** are worth a one-clause tightening
- **1** can actually mark a correct reader wrong — **and it is the one you found**

That last line is the useful finding. Your instinct on this class was better than the
detector's: the audit's best automated test missed your example, and the hand-picked 25
turned out to be mostly sound. So the remediation is small, and the guard matters more
than the backlog.

## Guard

A preflight rule cannot detect vagueness, but it can hold the two lines already at
zero, so they stay there:

- no question may name a **zone** at U7/U9
- no question may identify a player by **colour without an image**

Both are at zero today. Worth landing as regression guards now, before the next batch of
generated questions arrives.
