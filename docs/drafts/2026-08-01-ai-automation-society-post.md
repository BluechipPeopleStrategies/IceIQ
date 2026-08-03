# Draft — AI Automation Society post: holding generated animated scenarios to a standard at scale

**Status:** DRAFT, not posted. Thomas's review and post.
**Ask:** how to replicate correct, hard, good-looking animated scenarios at volume when each one
has to stay anchored to the sport governing body's published age standards.
**Paste-ready body:** `2026-08-01-ai-automation-society-post.txt` (identical to Version A below,
no markdown).

Decisions made while drafting (Thomas, 2026-08-01):

- The sport is deliberately **never named**. Nothing rink-specific, no skating or puck language.
- The framing hook is **"the thing I'm generating moves"**, positioning the post against the
  text-and-image generation the room usually discusses.
- Kept **high level and simple**. An earlier draft's pipeline bullets, the 48-in/4-out throughput
  number, and separate LLM-as-judge and n8n-vs-code questions were all cut.
- Thomas is **not a domain expert in the sport**, and the post says so plainly. What it also says
  is that a real reference exists: the governing body publishes what a player should understand
  at each age. That published standard is the accuracy anchor, not Thomas's own judgment.
- **The bottleneck is not generation or rendering.** Both work. The unsolved problem is
  replicating a good piece at scale without it drifting off the standard, going soft, or breaking
  in motion. The post states this explicitly so replies don't arrive aimed at the wrong problem.

---

## Version A — the post

**Title:** How do you hold generated content to a published standard when the output moves?

Hey everyone. Most of what I see in here is generating text or images at volume. My problem is
the same shape, except the thing I'm generating moves, and I'm not sure the usual advice
survives that.

I'm building a training app for youth sports. The main content is short animated plays: a
situation develops on screen, freezes at the moment of decision, and the player picks what
they'd do and finds out why. I need hundreds of them, and creating them is the only thing
standing between me and a finished product.

Every one has to clear three bars at the same time:

1. It has to look good in motion. A static diagram you can judge in a second. An animation you
   have to sit and watch, and movement that looks wrong is obvious to a kid even when the answer
   underneath it is right.

2. It has to be accurate. There is a real reference for this, since the sport's governing body
   publishes what a player should understand at each age. But I'm not a technical expert myself,
   so I can't personally tell when a generated piece has drifted off that standard into something
   that merely sounds like coaching.

3. It has to genuinely require judgment. If the right choice is obvious, there's nothing to
   learn. The valuable ones are close calls.

And two and three fight each other. The more a scenario is a real close call, the more debatable
the correct answer becomes, so it gets harder to verify at exactly the moment it matters most.

Then there's the version I actually want, which is harder again: chained sequences. Instead of
one decision and done, the play keeps developing based on what they chose, and asks again. That's
how the real thing works and it's where the learning is. But every added step multiplies what has
to hold up, because each branch has to stay accurate, stay hard, and keep looking right in motion.

To be clear about where I'm stuck: producing them isn't it, and neither is rendering them. I can
build a good one, anchored to the published age standards. What I haven't figured out is how to
replicate that at scale, with every piece still tied to the standard rather than drifting off it,
still hard enough to be worth answering, and still right once it's moving.

So how do you hold generated content to a published standard when there are hundreds of pieces,
you can't personally check each one, and the output moves and branches? Has anyone here built a
pipeline like that?

Sample clip attached so you can see what one of these actually looks like.

Thanks in advance. Happy to report back on what works.

Thomas

---

## Notes before posting

- **Attach a clip.** Fifteen seconds of one real scenario will outperform any paragraph in that
  room, shows the visual bar without describing it, and makes the problem concrete. If no clip
  gets attached, delete the line that promises one.
- **The tension line (two versus three) is the strongest sentence in the post.** It proves the
  obvious approaches have already been tried, and it's what will pull replies from people who
  have actually done this rather than people guessing.
- **The "where I'm stuck" paragraph is load-bearing.** It rules out the two answers the room
  would otherwise reach for first (better generation, better rendering) and points every reply at
  the real problem: fidelity to a standard, held across volume.
- **Chained sequences are the multi-step play work** (`MultiStepPlayer`, and the "Multi-step
  Phase 2: gauntlet generation" item in `docs/roadmap/TASKS.md` with its per-step
  decision-richness gate). The post frames it as the version Thomas wants rather than something
  already built, which is accurate: single-step generation is shipped, branching generation is not.
- The sport stays unnamed and nothing in the post gives it away.
- No em dashes, per house style.

## The correctness question, answered separately

Thomas asked whether he needs to source domain judgment given he isn't the technical expert.
Short answer: yes, and it can't be him or the model alone. The published governing-body standards
are the strongest available anchor, and RinkReads is already designed to hold content against
sourced material, so the mechanism exists and what's missing is a real coach on the other end:

- **Grounding:** the machine-readable tactical claims store plus validator
  (`docs/superpowers/specs/2026-07-29-scenario-engine-design.md`, Phase 4) already ties reads to
  cited source material rather than model confidence.
- **Human review:** the curriculum admission rule already requires documentary support plus coach
  review before anything is taught (`docs/roadmap/TASKS.md`, evidence-led curriculum entry).
