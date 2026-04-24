# Ice-IQ quiz engagement — pattern map

A design doc, not a spec. Catalogs patterns from best-in-class learning /
gamified apps and maps each to something we could ship for the Ice-IQ quiz
experience. Ordered by estimated impact × shippability. Keep in mind the
audience: U7 through U18 hockey players (and their parents over the shoulder).

## Current state (as of 2026-04-24)

Quiz today:
- 10-question adaptive session, difficulty buckets (easy/medium/hard)
- Seven question types (MC, T/F, Sequence, Next, Mistake, Rink MC, Zone-click)
  plus the 8-type rink dispatcher (drag-target, drag-place, multi-tap,
  sequence-rink, path-draw, lane-select, hot-spots, pov-pick, pov-mc)
- Progress bar + "Question X of Y" ribbon
- Per-question result card: verdict → explanation → coach quip (4 personas,
  age-tiered flavor pools)
- Post-quiz: weighted IQ score + badges + streak bump
- Journey: 64 levels × 8 themed worlds, celebratory toast on world unlock
- Weekly Challenge (PRO+): curated 10 questions resetting weekly
- Team Challenges (TEAM): coach posts fixed 10-question quiz, leaderboard

What keeps working: the coach quips land; the journey's world theming is
a differentiator; the weekly + team layers add rhythm.

What goes stale fast: within a single session, 10 questions of the same
shape (read → pick → explanation → Next) is a pure drill. No breaks, no
mini-games, no reflection, no surprises.

---

## Patterns worth stealing

### Tier 1 — quick wins, high-value (ship next)

**1. Variable reward on correct answers.** (Duolingo's gem burst, Tinder's
haptic feedback, Candy Crush's rainbow explosion.)
- *What it is:* not every correct answer is "✓ Correct" in the same
  sentence font. Occasionally, unexpectedly, it's "✓ Streak!" with a
  different color + a small confetti or haptic buzz.
- *Ice-IQ map:* vary the correct-answer reveal 1 in 8 times — "🔥 Three
  in a row!", "🧠 Locked in.", "🎯 That's a read." — each with a small
  animation. Tie to in-quiz micro-streaks we already track.
- *Effort:* 2-3 hrs. No new data. Extend existing flavor pool + add a
  confetti SVG burst. Reuses `toast.celebrate` for the streak callouts.
- *Risk:* low. Fully reversible by swapping one rendering branch.

**2. Reflection prompt after a hard question.** (Khan Academy's "Why did
you pick that?" nudge, Brilliant's post-question reasoning.)
- *What it is:* on questions marked d=3 OR where the player got it wrong,
  add an optional one-tap question: "What made you choose that?" with 3-4
  preset reasons (I guessed / Read the defender / Read the tip / Pattern
  match). No text required. Two taps total.
- *Ice-IQ map:* surface the meta-prompt after hard/wrong answers.
  Aggregated into the Report as "your decision patterns" — tells a coach
  if the player is guessing vs. reading.
- *Effort:* 4-6 hrs. New LS bucket, new Report card, optional coach view.
- *Risk:* low. Skippable per-question.

**3. Speed rounds / rapid-fire.** (Kahoot's timer, Elevate's 60-second
drills, Duolingo's time-attack.)
- *What it is:* every ~10th quiz is a "Rapid Fire" variant — 15 quick T/F
  questions, 10 seconds each, no between-question coach blurbs. Score
  posted independently; doesn't affect the main IQ calc.
- *Ice-IQ map:* add a new quiz mode accessible from Home and Weekly. T/F
  bank already big enough (80+ TFs). Use a countdown ring UI similar to
  Jeopardy/Kahoot. Leaderboard tie-in for coach challenges.
- *Effort:* 1-2 days. New quiz flow, reuses question data. LS leaderboard
  per player, optional Supabase extension.
- *Risk:* medium — need to make sure T/F pool doesn't repeat within the
  round.

**4. Question of the Day.** (Wordle, NYT Connections, Trivia Crack.)
- *What it is:* one shared question for the whole player base every day.
  Same question for every U11 in North America. Ends at midnight local.
  Community stats show after: "58% of U11 forwards got this right."
- *Ice-IQ map:* Home-screen card showing today's QotD, same for everyone
  at their age. Tap → one-question mini-quiz. Optional: share-sheet output
  ("I got the Ice-IQ QotD in 1 try 🎯" Wordle-style).
- *Effort:* 1 day. Daily pick is deterministic from bank + date. Share
  generation is stringify + clipboard. Community stats reuse
  `recordQuestionAnswer` telemetry.
- *Risk:* low. Adds a daily habit hook without affecting existing quiz.

### Tier 2 — bigger UX shifts (needs 1-2 focused builds)

**5. Mini-games between questions.** (Duolingo's "shake my hand" pet
mini-interaction, Elevate's 20-second warmup puzzles.)
- *What it is:* every 3-4 questions, a 10-second non-quiz break: tap the
  puck into the net, trace the path, identify the deke. Pure pattern
  break.
- *Ice-IQ map:* the rink SVG infrastructure already exists. 3 mini-games
  at launch (target-tap, path-trace, quick-shot-pick). Rotates between
  them. Doesn't count toward score.
- *Effort:* 3-4 days for 3 mini-games. Each is its own micro-scene in the
  existing rink renderer.
- *Risk:* medium. Adds complexity. Mitigation: mini-games only in
  returning-player sessions (6+ quizzes logged).

**6. "Explain to me" voice reflection.** (Brilliant, Replika, language
apps with voice.)
- *What it is:* after a wrong answer, an optional "Record what you were
  thinking" button. 10-second voice note stored locally. Player reviews
  their own reasoning next practice. Parent/coach can listen if shared.
- *Ice-IQ map:* use MediaRecorder API. LS store or Supabase per-player
  bucket. Surface in Report as "your thinking on this one:"
- *Effort:* 3-4 days. Privacy considerations (COPPA for U7-U12). Probably
  needs parental consent gate.
- *Risk:* high (privacy, storage, age gating). Defer until parent-consent
  flow exists.

**7. Adaptive difficulty visible to the player.** (Chess.com rating,
Brilliant's skill meter, Anki's SM-2.)
- *What it is:* a per-category live difficulty meter the player sees.
  Getting Rush Reads right 3× raises your Rush Reads level; the next
  quiz pulls harder Rush Reads questions. Miss 3× → drops.
- *Ice-IQ map:* the adaptive engine is PRO-gated in the pricing matrix
  but I don't think it's actually user-visible. Surface it. Per-category
  "E / M / H" chip in the Report that ticks up / down with the last N
  attempts.
- *Effort:* 2-3 days. Need per-category rating model (simple ELO-ish) +
  UI surfacing. Bank categorization already in place.
- *Risk:* medium. Changes the quiz feel; players who liked the old
  consistency might push back.

**8. Mastery-based unlocks within a category.** (Khan Academy "mastery
check", Brilliant chapters.)
- *What it is:* each competency category (Decision-Making, Rush Reads,
  etc.) has a "mastery" arc — 3 stars. Hit 80% on 10 questions = 1 star.
  3 stars = category badge. Chained to the Journey? Or parallel.
- *Ice-IQ map:* per-category mastery meter in Report + Home side nav. Ties
  into coach analytics ("your team's stuck on 1-star Breakouts").
- *Effort:* 3-5 days. Big UI + new scoring layer. High value but real work.
- *Risk:* medium. Conflates with Journey; need clear separation of
  purpose.

### Tier 3 — social / community (differentiates, but long runway)

**9. Teammate side-by-side.** (Strava "I beat my friend", Peloton
leaderboard.)
- *What it is:* after a quiz, see if any teammate took the same question
  and what they scored. Not a live leaderboard — a subtle "3 of your
  teammates also answered this" post-reveal.
- *Ice-IQ map:* uses team_members + quiz_sessions. Aggregate on read.
  Surface in the per-question explanation card.
- *Effort:* 2 days (backend query + small UI).
- *Risk:* low. Opt-in for teams only.

**10. Player-crafted questions.** (Roblox-style creator loop, Quizlet
user decks.)
- *What it is:* older players (U15+) can propose their own questions.
  Coach approves → goes into the team's private quiz pool. Enters the
  global bank only after admin review.
- *Ice-IQ map:* huge lift but eventually doubles the bank. QuestionReview
  flow already exists for admin. Add team-scoped private questions.
- *Effort:* 2 weeks.
- *Risk:* moderation burden, content quality. Far off.

**11. Streaks beyond daily.** (Duolingo weekly league, Beeminder.)
- *What it is:* we have a daily streak but nothing else. Add weekly
  streak (1 quiz per week × N weeks), category streak (3 Rush Reads
  correct in a row across any quiz), coach-interaction streak.
- *Ice-IQ map:* expand streak model. Show multi-streak on Home header
  instead of just the 🔥N.
- *Effort:* 1-2 days. LS-only, no server.
- *Risk:* very low.

---

## Recommended next build order

Given where Ice-IQ is (solid content, thin on in-session variety), ship in
this sequence:

1. **Variable reward reveals** (Tier 1 #1) — immediate feel improvement,
   barely any code.
2. **Question of the Day** (Tier 1 #4) — creates a daily-return hook,
   works for every tier.
3. **Speed rounds** (Tier 1 #3) — first real mode shift; makes the
   product feel bigger.
4. **Streaks beyond daily** (Tier 3 #11) — cheap layer on top.
5. **Reflection prompt** (Tier 1 #2) — tested after the mode-shift is in.

Pause after the first 3-4 and look at session data before committing to
the bigger mastery / mini-game builds.

## Not recommended (yet)

- **Voice reflection** — privacy blockers for U7-U12 without parent
  consent. Add after the parent-invite flow ships.
- **Player-crafted questions** — scope too big for current stage. Revisit
  at 500+ active weekly players.

---

*This doc is a map, not a roadmap. Pick, pilot, measure, revise.*
