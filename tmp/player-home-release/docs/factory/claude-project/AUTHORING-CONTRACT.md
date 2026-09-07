# Make the next RinkReads question batch with Claude

Open `catalog.html` to search the current experimental bank. It works offline. Select up to five scenarios and choose **Copy assignment for Claude** to carry their complete scene, existing questions and references into a new Claude conversation. Use **Download selected examples** if clipboard permission is unavailable. For the full repair-and-audit assignment, use `../claude-project/RINKREADS-CLAUDE-PROJECT.md` and its versioned snapshot instead.

For a larger assignment, upload this folder's JSON catalog, source catalog, example batch and this file. Ask for small batches of 5 new scenarios (30 questions) so feedback can improve the next batch. The whole bank is context for avoiding duplicates, not a request to rewrite it.

## Copy this instruction into Claude

You are authoring original youth hockey learning questions for RinkReads. Act as a critical North American development coach. Prioritize puck management, fundamentals, time and space, scanning, communication and flexible responsibilities. Different systems can produce defensible choices; explain when an alternative works.

Create FIVE NEW SCENARIOS, SIX QUESTIONS EACH, for the age band and topic I specify. Inspect the supplied catalog first and state how each situation adds a different decision or cue. Do not reskin an existing question by changing names or coordinates. Use the JSON envelope in `example-batch.json`; replace its illustrative scenario with your original scenarios. Use a unique batch ID and IDs such as `claude-20260905-b01-u11-001`, followed by question IDs `claude-20260905-b01-u11-001-q1` through `-q6`. Set `schemaVersion` to 1 and `status` to `draft-not-reviewed`.

Keep prompts brief and age appropriate. U7/U9 can use adult co-reading; avoid systems jargon. Show the problem in the scene before asking a player to solve it. Every scenario needs at least four of these formats: choice, multi, sequence, position, explain. Choose a sequence only for a useful order or routine; scanning and decision-making often overlap. Do not force the same question order on every scenario.

Thomas approved short, location-based wording with natural direct address. Write “Where are YOU compared with the net-front centre?” rather than “Where is YOU”. Use “YOU have”, “YOU are” and “your”, while keeping named players such as F1 in the third person. Keep answer choices parallel and concrete, such as “Beside the net, toward the side boards”. Correct grammar without silently changing the hockey claim. Do not put internal coordinate notation into player-facing text.

Reflection is optional. In normal practice, show at most one explain question per scenario: the current composed bank presents 200 optional reflections within 1,500 practice questions (13.3%), with 100 extra reflections retained for authoring. Do not require writing, award mastery for it, or force a reflection into every new short set merely to fill a format quota. For a six-question new set, use zero or one explain question and preserve four supported formats where pedagogically useful; flag a format-contract conflict instead of fabricating a poor question.

Every question needs a distinct teaching purpose. Its feedback must name the relevant scene cue, explain why the proposed response helps, and identify a reasonable alternative or the condition that changes the choice. Distractors should be believable hockey decisions that do not fit this stated situation as well. Avoid joke answers and repeatedly using “always”, “never” or “guaranteed” as the obvious wrong choice. Vary the correct answer location. Never invent a puck arrival time, outcome or player capability from a still picture.

Use `basis: scene` only for directly visible or explicitly stated facts. All tactical advice, positioning, hypothetical changes and reflection use `basis: coaching`; those are discussion suggestions, not objective grades. Do not mark a tactically defensible alternative wrong. An explain question has no answer IDs. Position questions name the actual actor ID and one example reference point, not an exclusive correct target.

The diagram supports players, facing directions, a puck and rink markings. It does not support cones, gates, stick poses, speed arrows or animated outcomes. Adapt the situation to those visual capabilities. A facing direction does not prove where a player looked. Any extra condition must be explicitly stated in the briefing or as a hypothetical in the question.

Check every named player against the actual roster. If the prompt says “Move YOU”, use the actor whose label is YOU, not whichever actor appears first in the file. A goalie or a third teammate must not appear in the feedback unless present or explicitly introduced as a hypothetical. Refer to named nets and rink areas in player-facing wording; keep coordinate notation in the setup. Check net-side, behind-the-goal-line, point and half-wall claims against the coordinates. Make each extension fit that exact original scene and compare it with all questions already there before writing it.

Use the supplied primary source catalog for age-appropriate principles. Read the actual source before asserting a precise rule; record jurisdiction, version and the applicable format. Do not treat a Canadian rule as universal in the United States or a team system as mandatory. If a source is inaccessible, say so and remove the unsupported claim. Public book descriptions may inspire topics; do not reconstruct unseen pages, copy diagrams, reproduce proprietary question wording, bypass a paywall or claim permission to reuse an author's templates.

Return ONE valid JSON object with no markdown fence: `{schemaVersion,batchId,status,scenarios,additions}`. Return new scenes in `scenarios` and an empty `additions` array by default. Do not alter current bank IDs, versions or source content. Do not claim the batch is reviewed, human-coach approved, tested in the app or ready for mastery credit.

## Data contract

Full working examples are in `example-batch.json` and `catalog.json`. Field names are case-sensitive.

| Object | Required fields |
|---|---|
| Batch | `schemaVersion:1`, `batchId`, `status:"draft-not-reviewed"`, `scenarios:[]`, `additions:[]` |
| Scenario | `id`, `version:1`, `ageBand`, `title`, `family`, `topic`, `objective`, `briefing`, `setup`, `focusActorId`, `cues:[]`, `tags:[]`, `sources:[]`, `limits`, `questions:[]` |
| Actor | `id`, `label`, `team:"home"|"away"`, `role:"skater"|"goalie"`, `x`, `y`, `facing` |
| Puck | Owned: `{owner:"actor-id"}`; loose: `{owner:null,x,y}`. Only a skater can own the puck in this renderer. |
| Source | `id`, `title`, `url`, `section`, `use`. Explain the source's limited support for the original scene. |
| All questions | `id`, `type`, `prompt`, `basis:"scene"|"coaching"`, `explanation` |
| choice / multi / sequence | Add `options:[{id,text},…]`, `answer:[optionId,…]`. Choice has exactly one answer; sequence includes every option once. |
| position | Add `actorId`, `reference:{x,y}` and use coaching basis. |
| explain | Use coaching basis. No options, answer or reference. |
| Existing-scene addition | `{scenarioId,scenarioVersion,questions:[…]}`. Existing six-question scenes can receive up to four questions; ten-question scenes are full. Never rewrite existing questions. |

Coordinates are **metres around rink centre**, not normalized 0–1 coordinates: x is length, bounded by ±30.48; y is width, bounded by ±12.954. Corners are rounded with radius 8.5344. Keep players and example points comfortably inside the ice. Navy/home attacks +x; gold/away attacks −x. Facing is radians, 0 toward +x, π toward −x. A carried puck is placed 1 metre forward and 0.7 metres to the player's left; keep that point on the ice too. Right blue line is x≈7.62, left blue line x≈−7.62. For small-area youth teaching, declare the practice area; do not imply a full-ice competition rule set merely because the drawing includes full rink markings.

## Check and hand the draft back

Save Claude's response as `claude-batch-001.json`. In this repository run:

```powershell
node tools/validate-question-batch.mjs "C:\path\to\claude-batch-001.json"
```

The validator is read-only. It checks IDs, versions, required fields, answer membership, question variety, rink coordinates, carried-puck positions, YOU/actor mismatches and obvious duplicate prompts. It also warns about named players absent from the displayed roster; inspect whether the question explicitly introduces a hypothetical. It does **not** establish tactical correctness, originality, copyright permission, learning value, rule applicability or visual clarity. A structure-valid result is a candidate for review, not an import or publication.

Give Codex the JSON file and say: “Validate this Claude batch against the current catalog, independently review every question using Luna, get a second review of every flag and high-risk question, repair and recheck issues, then add the accepted questions to experimental practice.”

Keep the returned file unchanged while it is being reviewed. Review receipts are bound to scene/question hashes. Revision drafts and generated batches do not belong in `src/data/bank.json`, `src/scenario/seeds/` or the mastery bank. The experimental loader is the only current destination after review. A qualified human coach's approval remains a separate event from AI review.

## Rebuild this pack

```powershell
node tools/build-question-catalog.mjs
```

That regenerates the browser catalog, JSON/CSV exports, source list and example from the current experimental files. Do not manually edit generated exports. The source bank and hash-bound review receipts remain the authority.
