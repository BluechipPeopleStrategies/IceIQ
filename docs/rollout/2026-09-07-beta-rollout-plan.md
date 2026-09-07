# RinkReads beta rollout plan

**Written:** 2026-09-07. **Status:** agreed approach, Wave 0 not yet started.

> **The named list of alpha and beta participants does not belong in this file.**
> This repository is public. Keep real names, emails and team names in the Second Brain
> (`Command Center/Projects/RinkReads/`) or another private location, and refer to people
> here by role only.

## The governing principle

**Separate finding breakage from judging the product.** These are different jobs, they
need different people, different framing and different builds. Conflating them spends a
first impression on a version that is not the product yet.

First impressions are non-renewable, and this audience is referral-driven. Hockey parents
talk to each other. The families worth hand-picking are exactly the ones whose opinion can
only be formed once.

## Timing context

Today is early September. The pricing model is hockey-season-only, September to March, so
the season is starting now. That makes this the highest-value window of the year and the
least forgiving one: a family who has a bad first week in September does not come back in
November.

The constraint that shapes everything: **the worlds and pacing work is designed but not
built** (`docs/superpowers/specs/2026-09-07-world-container-progression-design.md`,
`docs/superpowers/plans/2026-09-07-world-container-progression.md`). Until it ships, an
engaged U9 player exhausts every unique question in roughly ten weeks, and the navigation
will change under anyone who starts before it lands.

---

## Wave 0: insider alpha (this week, current build)

**Purpose: find breakage. Not to judge the product.** Say this out loud to participants,
in these words or close to them: "This is unfinished and I know it. I need you to help me
find what is broken, not tell me whether you like it."

**Who:** two or three people who genuinely understand it is unfinished and whose goodwill
survives a rough edge. Thomas's own family plus one trusted coach is enough. Not a family
whose custom you are hoping to win.

**Build:** whatever is currently on `main`.

**What to actually ask them to do,** rather than "have a look":

1. Sign up from scratch on a phone, not a laptop. Most parents will do this on a phone.
2. Do it once in a rink lobby if possible: cold hands, bad wifi, gloves off, one bar.
3. Have the kid, unassisted and unprompted, get from opening the app to answering a
   question. Watch without helping. Where they hesitate is the finding.
4. Answer ten questions and stop. Note anything that read as confusing, wrong, or babyish.
5. Try to break it: back button mid-question, close the app mid-answer, rotate the phone,
   switch age group.

**Specific things to watch for, given what is known:**

- The rink diagrams are the teaching content. Can a nine year old actually read them on a
  phone at arm's length?
- Does the parent understand what they are looking at without narration?
- Sign-up and profile creation on a real phone.
- Any question whose wording or answer looks wrong. Twenty-eight hockey-content calls
  were resolved provisionally on 2026-09-07 and have not had a coach's sign-off
  (`docs/hockey-authority/merge-reconciliation-provisional-calls-2026-09-07.md`).

**Feedback capture:** `src/devtools/FeedbackWidget.jsx` already exists and writes through
`savePlaytestFeedback`, but it currently renders only when dev bypass is on or in dev
mode. **Make it available to alpha participants before Wave 0 starts**, or the feedback
arrives as text messages and gets lost.

**Success looks like:** a list of concrete defects, and at least one observation about the
kid's experience that was not predicted. If Wave 0 produces only "looks good," it failed:
either the wrong people, the wrong framing, or nobody actually used it.

**Stop and fix before Wave 1 if:** sign-up fails on a real phone, a kid cannot reach a
question unaided, or a hockey error is found in a question a coach would notice.

**Duration:** about a week. Do not extend it. Wave 0 is not where the product gets judged.

---

## Wave 1: select-user beta (after progression ships)

**Purpose: judge the product.** This is the first real impression, so it does not start
until the app is the thing you actually mean to sell.

### Gates that must be true before Wave 1 begins

- [ ] Worlds-as-container and pacing shipped and verified, including `npm run build` and a
      real walkthrough as a U9 player.
- [ ] The 28 provisional hockey-content calls have a coach's sign-off, or the affected
      questions are withheld. Beta families include coaches; a wrong hockey answer costs
      more credibility here than a broken button.
- [ ] `npm run report:progression-pacing` shows each band in the beta sustaining the
      configured target. If U9 or U18 is short, either the target comes down or those
      bands are not in Wave 1.
- [ ] Explicit parental consent language at signup, given accounts are parent-owned.
- [ ] Feedback widget available to beta users, not just in dev mode.
- [ ] A written answer to "what happens to Wave 0 participants' data and progress when the
      navigation changes." Do not let insiders be silently broken by the upgrade.

### Who

Five to eight families. Select for **range, not enthusiasm**:

- At least two different age bands, ideally one young (U7/U9) and one older (U13/U15),
  because the content depth and the reading level differ sharply between them.
- At least one family with no hockey coaching background, since a parent who already knows
  the game will not notice where the app assumes knowledge.
- At least one coach, who will catch hockey errors nobody else will.
- At least one kid who is not naturally keen, because the enthusiastic ones will forgive
  friction that the median customer will not.

### What to ask

Give them a job, not a survey: "Use it the way you would if you had paid for it, for three
weeks, and tell me when you stopped wanting to."

Then ask three questions at the end, not before:

1. What did your kid say about it, unprompted?
2. When did you stop opening it, and what were you doing instead?
3. Would you tell another hockey parent about this? Say no if the answer is no.

Question 3 is the one that matters. It is the referral test, and this business grows by
referral.

### Success criteria

- Most families still opening it in week three without being reminded.
- At least one unprompted "my kid asked to do it."
- Question 3 answered yes by more than half, with a reason that is about the kid's
  understanding rather than about the app being nice.

### Stop conditions

- Families stop in week one and cannot say why. That is a product problem, not a bug list.
- A coach finds hockey errors that a coach would notice. Halt and fix content first;
  credibility with coaches is the hardest thing to rebuild.
- Anyone exhausts their band's content inside the beta window. That means pacing did not
  work and Wave 2 must wait.

**Duration:** three weeks minimum. Anything shorter measures novelty, not retention.

---

## Wave 2: a team (in-season, after Wave 1 passes)

One full team through a coach who is already a believer, so the app is experienced the way
it is meant to be, as something a group does together. This is the first test of whether it
survives contact with a real hockey schedule: games, travel, tired kids, a busy week.

Gate: Wave 1 success criteria met, and whatever Wave 1 surfaced actually fixed rather than
noted.

## Wave 3: paid open beta

Not scoped here. Do not plan it until Wave 2 has run, because Wave 2 is the first honest
read on whether this holds a real family's attention across a real season.

---

## Cross-cutting

**Accounts.** Under-13 players sit under a parent-owned account, in the TeamLinkt model.
The parent is the account holder and the consenting party. Two practical requirements:
consent is explicit at signup rather than implied, and the child profile holds only what
the app needs to function.

**What would make you roll back entirely.** Decide this now, while it is cheap to think
about: a hockey error that a coach publicly corrects, a data or privacy incident involving
a child's information, or two consecutive waves where families stop inside a week. Writing
these down in advance is what makes it possible to act on them later, when there is
momentum and it feels expensive to stop.

**Where the real list lives.** Names, contact details and team affiliations go in the
Second Brain, not this repository. This file stays about structure and gates.
