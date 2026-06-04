# Content Factory — Proof Unit: 2-on-1 Cross-Ice Read

**What this file is:** one scene taken end-to-end through the proposed content factory, so we can confirm the approach before building the full pipeline. It contains (1) the validated scene "ground truth," (2) the exact art brief to generate a *better* illustration than the sample, (3) the question bank derived from that one scene, and (4) the coach-gate log showing what was caught and fixed.

**The model it proves:** *one generated illustration → a bank of mixed-format, age-laddered questions, all consistent with that single image* — the same architecture as the existing `povQuestions.json` (24 images, 280 questions), with the photo upgraded to a generated illustration.

---

## 1. The scene (validated ground truth)

| Field | Value |
|---|---|
| Archetype | 2-on-1 Rush, offensive-zone entry |
| POV | From behind the puck carrier (#7 = YOU) |
| Cognitive skill | Decision-making (pass vs. shoot read) |
| Age groups served | U7, U9, U11, U13, U15 |
| The one correct read | **Cross-ice pass to the back-door teammate (#23)** |

**Actors & staging (the truth every question and the image must obey):**
- **#7 (YOU)** — puck carrier, strong side, entering the zone with the puck.
- **#23** — far teammate, streaking the weak side toward the back door. The open option.
- **#6 (lone defender)** — has **committed to the puck/shot side**: stick and lead skate extended into your shooting lane, weight leaning to the puck. This seals the shot **and vacates the cross-ice seam**.
- **#30 (goalie)** — squared and slightly deep to you; would have to slide all the way across to cover a back-door pass.

**readTrigger (the visual cue that makes "pass" correct):** the defender's stick and lead skate are committed to the puck-side shooting lane; the weak-side seam to #23 is unobstructed; the goalie is square to the puck and hasn't started sliding.

**distractors (deliberate temptations toward wrong answers):** goalie squared to you (tempts a shot); open ice to the wide side (tempts a drive); the defender still "in the play" visually (tempts a deke).

> **The fix vs. the sample image:** in the sample, the defender (#6) was square and neutral — stick centered, weight even — so *pass, shoot, and drive were all defensible*. That ambiguity is the #1 thing that makes a scenario un-teachable. The art brief below **commits the defender** so exactly one answer is right.

---

## 2. Art brief (drop into your image tool to regenerate a better image)

**Reusable structure:** keep the `STYLE`, `RINK`, and `JERSEYS` blocks **fixed** across the whole library for consistency; only change the `SITUATION` block per scene.

```
STYLE: Cinematic anime/illustrated sports art, clean linework, soft rim lighting,
       vibrant but realistic ice. High detail on players, readable faces under cages.
       (Match the look of the RRH sample render.)

RINK:  Top-tier indoor arena, offensive zone. Faceoff circles, blue/red lines and
       goal crease visible. Net on the right with goalie. Clean white ice, subtle
       reflections. Boards with blue/red trim.

JERSEYS: Attacking team in BLACK with white numbers + small "RRH" crest.
         Defending team in GOLD/BLACK with "RRH" crest. Goalie in matching gold.

CAMERA: Three-quarter angle from BEHIND and slightly ABOVE the puck carrier, so BOTH
        lanes are legible — the lane to the net AND the cross-ice seam to the far
        teammate. (Slightly higher than the sample so the read is clear, still immersive.)

SITUATION (the part that varies per scene):
  - Foreground, from behind: BLACK #7 carrying the puck on the strong side, head up.
  - Far/weak side: BLACK #23 skating hard toward the back door, stick down, ready to receive — clearly OPEN.
  - Center: GOLD defender #6 COMMITTED TO #7 — body and weight leaning toward the puck
    carrier, lead skate pointed at #7, STICK EXTENDED INTO #7's SHOOTING LANE, head
    turned to the puck. (He is visibly playing the shot, NOT the pass.)
  - Net: GOLD goalie #30 SQUARED to #7, centered/slightly deep, has NOT started sliding across.

MUST BE LEGIBLE: defender's committed stick + lead skate in the shooting lane;
                 the unguarded seam between defender and #23; goalie square to the puck.
NEGATIVE: do not draw the defender square/neutral; do not block the cross-ice lane to #23;
          do not show the goalie already sliding; no extra players.
```

---

## 3. Question bank (8 questions from this one scene — corrected)

All answers are coach-gate verified (see §4). Formats span MC / tap / true-false / what-happens-next; ages span U7→U15.

**Q1 — U11 · Multiple Choice**
"You have the puck on a 2-on-1. Read the defender, then make your play."
A) Shoot far side · **B) Pass cross-ice to #23 ✓** · C) Deke the defender · D) Hold the puck and wait
*Why:* The defender's stick and lead skate are in your shooting lane, sealing the shot. The seam to #23 is unguarded and the goalie hasn't moved — pass it.

**Q2 — U11 · Tap the target**
"Tap the player you should move the puck to." → **Tap #23 ✓**
*Build note:* #6, #23, #30 and the net must all be tappable, or this degrades to a coin-flip.

**Q3 — U11 · True / False**
"The defender is in your shooting lane. Shooting is still the best choice here." → **FALSE ✓**
*Why:* A committed defender plus a square goalie make the shot low-percentage. The open man is the play.

**Q4 — U9 · Multiple Choice**
"Your teammate is wide open on the far side. The defender is moving to block your shot. What should you do?"
**A) Pass to my teammate ✓** · B) Shoot · C) Try to go around the defender

**Q5 — U7 · Emoji Multiple Choice**
"You have the puck. Your friend is open. What do you do?"
🥅 Shoot it · **🤝 Pass to my friend ✓** · 💨 Try to skate past everyone

**Q6 — U13 · What happens next**
"You decide to shoot instead of pass. Given the defender's position, what is the MOST likely result?"
A) Goal far side · **B) The defender blocks or deflects the shot ✓** · C) You draw a penalty · D) The goalie freezes it

**Q7 — U13 · Multiple Choice (signature deep read)**
"Before you pass, what tells you the back door is truly open?"
**A) The defender's stick and skate are in your shooting lane, leaving the cross-ice seam unguarded ✓** · B) The goalie is cheating to your side · C) The defender is yelling · D) You hear the bench
*Why:* The seam is open because the **defender vacated it** — that's the primary cue. (Goalie position only tells you the shot is contested.)

**Q8 — U15 · True / False**
"Given that the defender has committed to your shooting lane, a cross-ice pass to #23 is too risky and should be avoided." → **FALSE ✓**
*Why:* Because the defender committed to the puck, the seam is open — the pass is the correct read, not a reckless one.

---

## 4. Coach-gate log (what the review caught)

A hyper-critical tactical+pedagogy agent reviewed the draft bank. Blocking issues it caught — all now fixed:

| Q | Caught | Fix applied |
|---|---|---|
| Q1 | Throwaway distractor "wraparound"; explanation taught instead of testing | Swapped D → "Hold the puck and wait"; explanation now names the visual cue |
| Q3 | "Highest-percentage" jargon too advanced for U11; prompt let you answer without looking | Reworded to plain language |
| **Q4** | **Prompt misdescribed the scene ("watching you") AND "skate in alone" is impossible on a 2-on-1** | Prompt → "moving to block your shot"; option C → "Try to go around the defender" |
| Q6 | "Rebound to #23" is a *partially correct* answer → invalid distractor | Swapped → "You draw a penalty" |
| **Q7** | **Keyed answer was WRONG — pointed at the goalie when the real cue is the defender; contradicted the whole bank** | Re-keyed to the defender-commitment option |
| Q8 | Statement was answerable by general rule, not by reading the scene | Added scene context so it tests the read |

**Verdict:** the draft was *not* shippable (two mis-keyed/invalid answers). After fixes, the bank tells one consistent tactical story across all ages. **This is the entire point of the factory: it catches the errors the founder can't see, before they reach a paying customer.**

---

## 5. What this proves about the factory

1. **One image → a real question bank** works, and maps onto your existing `povQuestions.json` structure.
2. The **ambiguity problem** (your sample's neutral defender) is fixable and is now an explicit art-brief rule + a gate check.
3. The **coach gate is non-negotiable** — it caught a wrong answer key on the very first bank.
4. Cost stays low: ~8–12 questions amortize one generated image.

**Next step:** write the full factory spec (curriculum spine → generate layout → auto-gates → coach panel → illustration → vision-check → question bank → question gate → ship, with failures queued), then build it.
