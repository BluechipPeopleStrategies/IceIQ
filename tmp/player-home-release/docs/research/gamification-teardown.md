# Gamification teardown — Duolingo & kids' learning games, mapped to RinkReads

What we can legitimately borrow from Duolingo and similar apps, and how each piece maps
to RinkReads (IceIQ: React + Vite, plain JS, localStorage-only, no backend).

**Ground rule up front:** we do NOT take anyone's proprietary code. Duolingo, Prodigy,
Candy Crush etc. are closed-source; their shipped JS is obfuscated and copying it would
be infringement for no benefit. What we borrow is (a) publicly-documented *mechanics*
and (b) genuinely *open-source* implementations of the learning-science pieces (MIT/BSD).
That's the whole strategy: steal the ideas, write our own code, and use open engines for
the hard math.

---

## Part 1 — The engagement loop (mechanics, adapt freely)

Duolingo's retention isn't the content, it's the loop around it. Ranked by
value-to-effort for a localStorage-only app:

### High value, low lift (do first)
1. **Streaks** — consecutive-day counter. The single strongest daily-return driver.
   - RinkReads: `streak = {count, lastActiveDate}` in localStorage; increment if last
     active was yesterday, reset if a day was missed, ignore same-day repeats.
   - Add **streak freeze** (one saved day) later — it measurably cuts rage-quits.
2. **Daily goal** — a small, user-chosen target ("answer 10 questions"). Completion is
   the dopamine hit that feeds the streak. Keep it small and always achievable.
3. **XP + progress bar** — points per correct answer; a visible bar toward the daily
   goal. Progress feedback matters more than the number's size.
4. **Immediate feedback** — right/wrong the instant they answer, with the *why*. For a
   hockey-IQ app this is also the teaching moment — pair the correction with the concept.

### Medium value, medium lift
5. **Leagues / leaderboards** — weekly bracket, promote/relegate. Huge for competitive
   users (hockey players skew competitive), but needs cross-user data — a real backend or
   at minimum a shared store. Flag as a "when there's a backend" feature; localStorage
   can't do it honestly.
6. **Hearts / lives** — limited wrong answers before a cooldown. Adds stakes. Controversial
   (can frustrate); Duolingo itself keeps tuning it. Optional.
7. **Path / unlock progression** — a visible track of concept "nodes" you unlock in order.
   Maps perfectly to a hockey curriculum (breakouts -> forecheck -> power play...).

### The loss-aversion notification
8. **"Your streak is at risk"** — the reminder that actually works, because losing a
   streak hurts more than gaining XP feels good. For a PWA this needs push/notification
   permission; for now an in-app "don't break your N-day streak" banner captures most of it.

---

## Part 2 — The learning science (use OPEN-SOURCE code)

This is the part worth pulling real code for, and it's the highest-leverage thing for a
learning app. Don't hand-roll the scheduler — use a proven open engine.

### Spaced repetition — the core
The idea: show a concept again right before the learner would forget it. Wrong answers
come back soon; mastered ones stretch out to days/weeks. This is what turns a quiz app
into a *learning* app.

- **SM-2** (SuperMemo 2) — the classic, dead simple, public-domain algorithm. Per card:
  an ease factor + interval; grade 0-5 adjusts both. ~30 lines of JS. Great starting point,
  fits localStorage trivially (store `{ease, interval, due}` per question).
- **FSRS** (Free Spaced Repetition Scheduler) — the modern successor, what Anki now uses.
  Models memory as difficulty/stability/retrievability; more accurate scheduling, fewer
  reviews for the same retention. Open-source, MIT.
  - JS/TS port: **`ts-fsrs`** (npm, MIT) — drop-in, works client-side, localStorage-friendly.
    This is the recommended engine. `open-spaced-repetition/fsrs4anki` is the reference.

**Recommendation:** start with SM-2 hand-written (no dependency, matches the "minimal deps"
rule) to prove the flow, then swap to `ts-fsrs` if we want better scheduling. Either way the
per-question state lives in localStorage keyed by question id.

### Other borrowable learning patterns
- **Bite-sized units** — short sets (5-10 Qs), not long quizzes. Lowers activation energy.
- **Interleaving** — mix concept types within a session (better retention than blocking).
- **Difficulty adaptation** — surface questions near the edge of ability; SM-2/FSRS gives
  this for free via the due-date sort.

---

## Part 3 — Open-source projects to actually read

Legit, license-clean code to learn from (verify license before lifting):
- `open-spaced-repetition/ts-fsrs` — TS FSRS, MIT. The engine.
- `open-spaced-repetition/fsrs4anki` — reference algorithm + docs.
- Anki's scheduler (AGPL — read for ideas, don't copy code into a non-AGPL app).
- Various MIT "Duolingo clone" repos on GitHub — useful for UI/loop structure, not content.

---

## Part 4 — Concrete RinkReads build order

A staged plan that respects the stack (localStorage-only, minimal deps):

1. **Streak + daily goal + XP** — pure localStorage, no deps, biggest retention win. ~1 day.
2. **SM-2 scheduler** — hand-rolled, per-question `{ease, interval, due}`; session pulls
   due questions first. Turns the quiz into spaced learning. ~1 day.
3. **Path/unlock view** — concept nodes gated by mastery, mapped to a hockey curriculum.
4. **Streak-freeze + at-risk banner** — retention polish.
5. **(Backend-gated) Leagues/leaderboards** — park until there's a shared store.

Where this pairs with the coaching-content research: Part 4 is the *how-to-retain*; the
Coaches Site / podcast synthesis is the *what-to-teach*. The curriculum that fills the
"path" nodes comes straight from the coaching-content theme map.

---

_Sources: Duolingo engineering blog + public product/GDC talks (mechanics, all public);
SM-2 (SuperMemo, public), FSRS / ts-fsrs (open-spaced-repetition, MIT). No proprietary
code used or copied. Drafted 2026-07-10 during the RinkReads content-research session._
