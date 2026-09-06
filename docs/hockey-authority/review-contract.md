# Hockey review contract

## Inputs and evidence

Record the assignment, reviewer/execution mode, date, scenario version and
SHA-256 hashes of the actual input files. Request or recover: age and skill
level, jurisdiction/season/league rules when relevant, ice dimensions/game
format, attacking and defended ends, roster/team/role/handedness, puck owner,
phase of play, intended skill, decision time, options/feedback, canonical
trace, applicable claim/kernel IDs and existing validator results.

For visual review also record model/animation versions, rendered artifact
hashes, observer actor, camera position/orientation/FOV, viewport, camera
permissions, cue history and question-entry behavior. A screenshot can support
framing findings; it cannot establish a skating cycle or contact sequence.

Every finding identifies actor, time/frame, measured or visible evidence,
source/claim where applicable, consequence for the lesson and a specific repair.
Label evidence as measured scene fact, source-supported guidance, reviewer
inference, human coaching judgment or unknown. Unknown is never a silent pass.

## Review domains

| Domain | Required checks |
|---|---|
| Roles and game state | Actual teams and roles, possession events, defended end, score/time when material, whistle and restart state; never infer team from F/D/G IDs. |
| Tactics | Independently derive plausible actions, examine every alternative and explanation, calculate claimed distances/lanes, state conditions and exceptions; do not turn a coaching preference into an unconditional answer. |
| Skating and body mechanics | Match action intent to velocity and facing; inspect pushes, glide, backward movement, turns, pivots, crossovers, braking and transitions. Check support/contact, body lean, skate sliding and temporal continuity against trace and reference. Do not assume every defender must skate backward. |
| Stick and puck | Handedness/grip, blade orientation and reach, approach/contact/control/release timing, two-way interaction with boards and other players; arriving first is not possession. |
| Goaltending | Goalie-specific stance, movement, set/recovery, puck tracking and net relationship. Require relevant goalie evidence; skater approval does not cover goalie mechanics. |
| Age and learning | Skill progression, language, cognitive demand, applicable game format and rules; younger character proportions cannot justify impossible mechanics or automatically validate the same adult tactical lesson. |
| Viewpoint and questions | Required cue visible or legitimately observed earlier, screen size/occlusion, stick and gloves, observer orientation, readable teams/roles, external/first-person agreement; question wording must match information available to that observer. |

The physics validator owns numeric feasibility. Use its actual supported checks
and sourced age/skill profiles. Report unimplemented dynamics as unverified;
never invent acceptable speed, reaction-time, friction or turn-radius numbers.
Hard physics failures cannot be overruled by a persuasive tactical explanation.

## Camera and animation requirements for this project

- An optional saved question angle sets the starting view when that question
  opens. It must not silently advance simulation time or reveal a future event.
- Camera changes can reveal new information. Reassess the question/answer when
  visibility changes; preserve the difference between guided learning and an
  assessment with constrained scanning. Do not infer gaze from torso facing.
- Inspect first-person and external views at the same source time. Own stick
  and gloves must agree with handedness, contact and world position. Decorative
  head movement must not falsely imply a scan or cause unintended camera motion.
- Check near, far and obstructed players on phone and desktop. No 3D player
  selection halo. Gold jerseys/helmets and navy jerseys/helmets are owner art
  choices; use explicit identity as well as color. G is reserved for goalie.
- Preserve readable physical puck information. Owner wording "transparent puck"
  is unresolved between a transparent locator background and translucent puck
  material; current background-removal interpretation is not a confirmed
  material decision. Do not hide or alter a decision cue to satisfy that wording.
- Rim pickup review must cover approach, preparation, receiving/control and
  exit, not merely a turning pose. Exact technique depends on pressure,
  handedness, puck travel and available exit; do not prescribe one universal turn.

## Review output

For standalone work return:

1. Scope, input hashes and what was actually inspected.
2. Domain table: PASS / REVISE / HOLD / NOT REVIEWED, with evidence per row.
3. Findings: ID, severity, actor/time/view, evidence, teaching consequence,
   correction and required recheck. Missing indispensable evidence is HOLD;
   a demonstrated defect is REVISE.
4. Sources and applicable approved claims, including limits and disagreements.
5. Moshey handoff: phase-by-phase requirements and reference frames; Reel
   handoff: information the viewer must understand and cues that must remain visible.
6. Separate statuses for AI review, deterministic physics, rendered-view review,
   human coach approval, curriculum admission and deployment. Default unknown
   statuses to pending/not reviewed, never infer them from another status.

Existing packet outputs must retain their existing schema. Apply the same
reasoning within existing fields rather than creating an incompatible return.

## Calibration and escalation

Before question-packet work, perform the eight blind historical cases required
by `docs/factory/CLAUDE-REVIEW-UPDATE.md`; record verdicts before opening the key
and reconcile misses. Do not reopen already completed packets.

For new animation and viewpoint families, collect coach-reviewed reference and
boundary cases: genuine glide versus fake strides, a defender transitioning
forward legitimately, rim preparation without a completed pickup, a hidden cue
with and without prior observation, goalie versus skater movement, and multiple
defensible answers. These are proposed calibration cases, not completed tests.

The existing new-family policy requires clean batches, adversarial fixtures and
a held-out Thomas-reviewed set with no wrong-answer false approvals. Maintain
false passes and misses, not just aggregate accuracy. Known-case recall alone
does not demonstrate expertise. Escalate uncertain/new claims and conflicts;
do not route every already-calibrated routine scenario back to Thomas forever.

Only Thomas or a named human coach can occupy the tactical-claim approving
role. Proposals remain staged. This reviewer neither activates unattended
generation nor changes existing approval/promotion code.
