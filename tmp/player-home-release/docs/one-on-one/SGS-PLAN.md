# SGS — Scenario Generation System

Working plan with Thomas · September 5, 2026

## What we are building

A system that turns the RinkReads teaching documents into situations children can see, act on and explain. The scene, question and feedback must agree. A child never gets a shooting question while nobody has the puck.

The default view is a 3D rink. Changing the camera changes only the view. Players keep their positions, facing, sticks and puck ownership. The tactical board remains another view of that same situation.

## The generation flow

**Teaching document → concept → scenario family → situation → connected reads → checks → coach review → learner library.**

1. **Choose the learning goal.** For example: recognise a blue line, protect the middle, or create a passing option. Each family links to the actual source document and age guidance.
2. **Choose the setup.** Age, 1v1 through 5v5, part of the rink, attacking direction and the player whose decision we are testing. Other players stay visible.
3. **Build the first freeze.** Place players, set body and stick directions, assign the puck and identify the cue the child should notice. The text describes this exact state.
4. **Ask for a response.** Tap a feature; drag a player; choose Stay / Back / Forward; draw a route; select a play; predict a change; explain why. Choose the format that tests the concept.
5. **Continue from the answer.** Preserve the position the child chose. Run the next supported movement or puck event, then freeze and ask the next read. Do not reset to a canned correct layout.
6. **Evaluate the response.** Basic identification uses the feature's actual geometry. Positioning considers useful space, lanes, pressure, timing and the explanation. Multiple positions can be defensible; distance from one coach dot is not enough.
7. **Review and release.** Check the hockey, sequence, age level and visuals before admitting a family or variation to the learner library. Keep draft, checked and approved counts separate.

## Progression

| Starting point | What the child does | What changes later |
| --- | --- | --- |
| U7 · Explore the rink | Tap a faceoff circle, blue line, net or puck. Hear the prompt; earn a discovery star. | Recognise the same feature from another angle. No timer or written explanation. |
| 1v1 · One opponent | Move the highlighted defender. Stay here, move back or move forward; explain why. | The puck carrier changes position. Read the gap and middle again. |
| 2v2 · Help one teammate | Place the highlighted player where they can help the carrier. | Pressure changes; find the next useful position. |
| 3v3 · Read more options | See all six skaters but move only one. Explain which space or lane matters. | The puck changes sides; reposition relative to the new carrier. |
| 4v4 and 5v5 · Read the group | Keep one clear decision while additional players affect coverage and support. | Link several reads without adding irrelevant visual clutter. |

The U7 blue-line task is an explicit rink tour. It does not turn regular U7 half-ice games into offside lessons. Age and player count are separate settings: more players do not automatically make a scenario suitable for an older age.

## A worked positioning sequence

**Read 1 — Look.** You control the highlighted defender in a 1v1. The opponent has the puck. “Where should this player be?” Drag them, or choose **Stay here / Move farther back / Move forward**. “Why did you choose that?”

**Read 2 — Read again.** The opponent carries into a new position. Your defender stays at the place you chose. “What changed? Would you stay, back up or move forward now?” Show the new position and explain.

**Read 3 — Adapt.** Another visible cue changes the available space. “Where should you be now, and what are you trying to protect?” Compare the three decisions afterward.

Back and forward are relative to the controlled player's job and own net, never to the current camera angle. The exact movement and tactical feedback for each family still need coach review.

## What makes hundreds of useful scenarios

We vary meaningful hockey relationships: the gap, defender commitment, support depth, available lane, puck location, teammate spacing and the time available. We do not count new jersey colours, mirrored pictures or reworded questions as new hockey situations.

A family defines which variations it supports and the conditions that make its questions valid. Each generated candidate records its parameters and sources so we can reproduce it, review it and withdraw it if a problem is found.

The current engineering prototype explores 1v1–5v5 positioning configurations. A large draft count is a capacity demonstration, not a claim that hundreds of lessons have passed hockey or child-comprehension review.

## How answers should be judged

- **Identification:** Did the child select a valid instance of the requested feature? Accept either blue line or any faceoff circle when the wording allows it.
- **Positioning:** What does the chosen position protect or make available? What pressure or passing lane did the child notice? Is staying put reasonable here?
- **Sequence:** Does the next question follow the actual position and possession from the previous action?
- **Explanation:** Does the reason connect to something visible? Ask a short follow-up when it is unclear. Do not grade by keywords alone.
- **AI coach:** Use the shown state and approved source-backed rubric. An AI opinion must remain identifiable and auditable; missing judgment must not be replaced by a fake score.

## Decisions we will plan together

1. Finish one family end to end first: **1v1 defending the middle**, with the U7 rink tour as the simpler companion example.
2. Agree on what makes a strong, acceptable or weak response, including when staying put is appropriate.
3. Agree on the cues and consequences the family may generate, and where a coach needs to review a judgment call.
4. Review the 3v3 support example before extending the same structure to 4v4 and 5v5.
5. Calibrate the generator and review process on a small varied set before admitting larger batches.

Technical contract: [connected scenario template engine](../superpowers/specs/2026-09-05-connected-scenario-template-engine.md). Existing source, physics, judgment and promotion authority: [scenario engine decisions](../factory/SCENARIO-ENGINE-DECISIONS.md).
