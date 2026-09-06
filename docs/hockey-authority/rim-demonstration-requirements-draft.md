# Rim pickup demonstration: requirements candidate

September 6, 2026. Prepared for Hockey Authority review, not a reviewed lesson
or accepted movement sequence. No live-bank or all-scenario approval follows
from this document. The first target is one U11 right-shot skater, with a gold
jersey and gold helmet, against a navy pressure player. These are bounded demo
choices, not new defaults for every age or scenario.

## What the demonstration must establish

The learner can see preparation before a pickup, actual stick/puck interaction,
and a controlled exit. A nearby opponent creates information to notice. We do
not assume that one exit is universally correct or assign a scored answer
until the authored state, sources and viewpoint support it.

Use the same actor, puck, clock and rink coordinates for every view. The
external view makes the sequence inspectable; the first-person view presents
only information available from the player's current view and prior scanning.

## Source support and its boundary

[Hockey Canada's Developing Skilled Defencemen, 2018–19, PDF page 12](https://cdn.hockeycanada.ca/hockey-canada/Hockey-Programs/Players/Downloads/2018/2018-19-developing-hockey-defencemen-e.pdf)
describes retrieval preparation through shoulder checking, approach angle and
deception; it conditions a toes-up-ice pickup on available time and space and
directs players to assess pressure and support. This supports the need to show
preparation and contextual choices. It does not prove a specific turn radius,
animation cadence, contact trajectory, U11 assessment answer or exact exit.
The document uses historical age terminology; current rule/age applicability
must be established separately. Text inspected September 6, 2026.

## Required authored phases

| Phase | Evidence required before it can pass |
|---|---|
| Approach and observation | Defined puck route, opponent position/velocity and retriever trajectory; actual observation history if a later question depends on a prior scan. Decorative head motion is not proof that a learner saw something. |
| Preparation | Body heading, skating direction and intended pickup orientation start changing before contact when required by the authored approach; transition remains continuous. Exact technique awaits review. |
| First contact | A named time/event where the actual transformed blade surface and physical puck meet with vertical overlap; no teleport to a carry marker or through a board. |
| Receiving/control | Show the change from loose puck to controlled possession, with an explicit event and credible relative motion. First arrival alone does not grant control. |
| Exit | Puck, hands, stick and body remain geometrically consistent as the skater leaves; pressure changes remain visible and physically feasible. Ending the turn is not enough to prove a completed pickup. |

The trace owns root positions, puck movement and event times. The rig may
express source-authored body/hand/stick poses, but cannot invent possession,
retime contact or relocate actors to hide an animation defect. The camera may
change visibility but cannot change the trace.

## Required views and question entry

- Front/profile/three-quarter character inspection, then external rink view.
- Retriever first-person with actual stick and gloves; pressure-player view
  is a comparison, not an automatically equivalent question.
- Optional saved question angle applied on entry without advancing time.
- Phone and desktop at the same decision moment, plus a deliberately obscured
  cue case. If a required cue is unseen and was not observed earlier, the
  question must be held or changed; do not grade hidden information.
- A candidate observation question can identify visible pressure. A later
  tactical-choice question requires separate evidence for its alternatives
  and conditions. No scored answer is approved by this requirements draft.

## Technical gaps identified before production

The current lab fixture keeps its rim puck at `(18,-10)` while the retriever
stays at `y=-2`. It demonstrates preparation poses, not retrieval. The shared
rig's static `carryContact` marker is not a measured blade contact socket.
Its existing near-blade tolerance is broader than the physical puck radius.
The September 6 diagnostic measured the blade's lowest point at 30mm above ice
while the physical puck ends at 25.4mm: a 4.6mm positive separation in all six
tested pose/view combinations. The marker itself is at 52mm, so closeness to
that marker is misleading. Evidence and source hashes are in
[the saved contact report](reviews/2026-09-06-contact/blade-contact-report.json); this is a scoped
geometric failure, not a verdict on every possible stick/puck pose.
The Level-1 simulator does not provide a
completed rim/receiving solver. These are engineering findings, not a claim
that the whole scenario-engine physics system is validated for this action.

Use a separate versioned diagnostic trace if a full dynamic solver is not yet
available, and identify its unverified dynamics. Keep any failed sequence
visibly diagnostic. Do not export it as an accepted coaching example.

## Handoff and acceptance

Hockey Authority returns source-linked requirements, exceptions and domain
verdicts. Moshey produces an editable Blender master and animation candidate
against that brief. Reel reviews whether the actual viewed sequence conveys
the intended information. Engineering verifies trace, contact, view entry and
artifact identity. Thomas reviews the resulting visual standard and any new
tactical claims requiring human approval under the existing policy.

Hashes of the reviewed trace, rig, exported model, camera definitions and
rendered evidence bind the verdict. A later material change requires a scoped
recheck. Extend the standard to younger/older variants and other scenarios only
after the representative sequence passes its applicable gates.
