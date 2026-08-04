# Decisions — round 4, 2026-08-03

Four decided, all on the recommendation. Recorded with the reasoning so none needs
re-asking, and with what each one commits us to.

---

## 1. Scenario engine — **PLAYBACK MATCHES THE VALIDATED MODEL**

The foundation validates one motion and plays another. Route duration is derived from an
accelerate-from-rest model and `detectImpossibleAcceleration` certifies it with that same
model — it records `assumptions: ["starts from rest"]` and reads only the action's
endpoints. But `sampleAction`
([`simulator.js:74-88`](../../src/scenario-engine/physics/simulator.js#L74-L88))
interpolates linearly, so every emitted trace is constant-velocity. Measured on the live
scrub: an actor covered 2.93 m in each of the first two 0.6 s intervals — flat ~4.9 m/s
from a standing start, i.e. infinite acceleration at t=0, precisely what that detector
exists to catch and cannot see. Peak speed differs 2x between the two models.

**`sampleAction` samples the real acceleration curve.** What plays becomes what was
certified.

Chosen over validating-what-plays (derive duration from constant velocity, replace the
detector with a peak-speed check) because that option gives up the accel-from-rest
reasoning entirely — the finalize gate that was watched refusing an impossible skate with
a cited-capability reason would be rebuilt on speed alone. And chosen over deferring,
because Phase 10 is a throughput benchmark: measuring a pipeline whose validation
guarantee is known to be wrong produces numbers describing something we would then change.

**Commits us to:** a test asserting sampled peak speed matches the cited physics profile,
so the two models cannot silently drift apart again — that drift is the whole defect.
Existing traces shift slightly in timing; that is the correction, not a regression.

**Unblocks:** Phases 9 and 10 of NEXT #1, the current focus.

---

## 2. Shootout rendering — **PATCH THE 2D CANVAS**

One consistent target shape across all six cells (M8), the poke check actually pokes the
puck away (M9), and the end card headed "Session complete" like every other drill (M12).

No new dependency, no art build. Real 3D was on the table and was **not** taken — it needs
a new rendering dependency, which is a standing hard stop. Sprite art was not taken
either: better looking, but it needs art produced and a scene-manifest entry per sprite,
and the specific complaints are all fixable in the existing canvas.

Pulling it from the lineup (the call made on Pick Your Spot in July) was available and not
taken, so the drill stays live.

---

## 3. `u13_breakout_position_place_v1` — **MOVE THE FORECHECKER, KEEP THE ANSWERS**

`fc2` at (0.22, 0.55) sits 0.026 from the D-to-C lane — 0.75x the intercept radius, 1.41 m
of ice — so one of the three "outlets that beat this pressure" is itself covered by the
second forechecker. Pre-existing, and caught by no rule in the audit's lint (PC-4b only
fires on deep cross-crease targets).

**Move `fc2` so the keyed centre outlet is genuinely open.** The keyed placement for `c`
stays at (0.28, 0.50) and both answers are unchanged.

Re-keying instead — leaving `fc2` and keying a different outlet, so the board teaches "read
the covered lane and pick another one" — was the arguable better lesson and was not taken,
because it changes the answer on a board that is otherwise sound.

**Note this changes which outlets read as open**, which is the judgment part. Worth a look
at the rendered result rather than the coordinates.

---

## 4. Next block after the unblocked work — **READ THE PLAY**

Eleven findings (S2-9 through S2-19), of which only the forward action (S2-12) is fixed.
Ahead of SMART Goals because Read the Play is the core play-diagram/quiz experience named
as the current focus, and because two of its findings — **you cannot tell who you are**
(S2-10) and **the prompt contradicts the diagram, YOU is F2 not F1** (S2-11) — are hit on
the first question a player sees.

SMART Goals (S2-1/2/3/5) stays next after it.

---

## Not decisions — proceeding without asking

- **Two Things rail conversion.** Last drill without one; Reaction is a deliberate
  exception that keeps the `.gym-fab` alias.
- **Three preflight guards**, both review sheets asked for them and neither landed: no zone
  word at U7/U9, no colour-identified player without an image, every `mc`/`seq` stem
  contains an actual ask. All three sit at zero today — the guards hold them there.
- **The decided-but-unrun language sweeps**: ~27 real degendering strings, 90
  `defenseman` → `defenceman` spelling normalisations, 113 player-identification strings on
  the LD/RD convention.
- **The gym point scheme.** On the decisions list, but the original sentence was cut off
  mid-thought ("I want the point scheme to be—"), so a proposal to react to costs less
  attention than a blank question. Drafted, not asked.

## Still Thomas's, still outstanding

- **Apply `migration_0007`** — `training_sessions` has never existed in production, so every
  training-log dual-write has failed silently since it was written.
- **The Brain Gym live playtest** on ice-iq.vercel.app — never done since PR #3 merged.
- **D4, canvas aspect 0.62 vs the real 0.425** — deliberately not asked this round. Eleven
  difficulty parameters across six drills are fractions of `min(W, H)`, so flipping it
  globally silently re-tunes all of them. Run the Play now sets its own aspect for the zone
  view, which is the per-drill opt-in that decision needs anyway.
