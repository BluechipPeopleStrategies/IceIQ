# Experimental scenario bank — 100 original situations

Owner direction, September 5: create 100 scenarios, U7 10 / U9 15 / U11 25 / U13 25 / U15 15 / U18 10, with 6–8 questions each, all available in a clearly labelled experimental practice area. Use public previews of Jack Han's Hockey Tactics 2026 and other accessible coaching resources; no purchased PDF is available. This authorizes experimental access, not admission to the approved bank or automatic tactical certification.

## Implementation contract

Use a separate catalog in `src/one-on-one/experimental-bank/`; never `src/scenario/seeds/` or `src/data/bank.json`. The first authored pass uses six questions per scenario (600 total). Every scene has a materially different learning situation; rotating, mirroring or relabelling an otherwise identical situation does not create another scenario.

Each age file is a JSON array. Scenario shape:

```json
{
  "id":"exp26-u11-001", "version":1, "ageBand":"U11",
  "title":"Original descriptive title", "family":"puck-support",
  "topic":"Passing", "objective":"What this situation teaches",
  "briefing":"Concrete scene context. Navy attacks the right net (+x). Mention any drill constraints, assumed roles or movement not represented by the static scene.",
  "setup":{"actors":[{"id":"home-skater-1","label":"YOU","team":"home","role":"skater","x":5,"y":2,"facing":0}],"puck":{"owner":"home-skater-1"}},
  "focusActorId":"home-skater-1",
  "cues":["Visible or explicitly stated evidence"],
  "tags":["passing","support"],
  "sources":[{"id":"unique-source-id","title":"Verified title","url":"https://actual-source-page","section":"Specific section or PDF page","use":"What this source supports; distinguish topic/age support from the original answer synthesis"}],
  "limits":"Age, system or evidence limitations, including static illustration",
  "questions":[
    {"id":"exp26-u11-001-q1","type":"choice","prompt":"A concrete observation question", "options":[{"id":"a","text":"A"},{"id":"b","text":"B"},{"id":"c","text":"C"}],"answer":["b"],"basis":"scene","explanation":"Why this follows from this scene"},
    {"id":"exp26-u11-001-q2","type":"multi","prompt":"Select all cues relevant here", "options":[{"id":"a","text":"A"},{"id":"b","text":"B"},{"id":"c","text":"C"}],"answer":["a","c"],"basis":"coaching","explanation":"Conditional rationale and alternatives"},
    {"id":"exp26-u11-001-q3","type":"sequence","prompt":"Arrange this suggested routine", "options":[{"id":"a","text":"First"},{"id":"b","text":"Second"},{"id":"c","text":"Third"}],"answer":["a","b","c"],"basis":"coaching","explanation":"Suggested progression, not an exclusive mandatory order"},
    {"id":"exp26-u11-001-q4","type":"position","prompt":"Move YOU into useful space. Multiple spots may work.","actorId":"home-skater-1","reference":{"x":7,"y":4},"basis":"coaching","explanation":"Describe spatial relationships and alternatives, not an arbitrary numerical correctness radius"},
    {"id":"exp26-u11-001-q5","type":"choice","prompt":"Explicit hypothetical changed cue; what might you do now?", "options":[{"id":"a","text":"A"},{"id":"b","text":"B"},{"id":"c","text":"C"}],"answer":["c"],"basis":"coaching","explanation":"Conditional response, acknowledge other viable choices"},
    {"id":"exp26-u11-001-q6","type":"explain","prompt":"A situation-specific reflection", "basis":"coaching","explanation":"Suggested reasoning with acceptable alternatives"}
  ]
}
```

Coordinates are canonical metres, x -30.48..30.48, y -12.954..12.954. Prefer x -26..26 and y -10..10 away from rounded corners. Facing is radians, 0 toward +x, pi toward -x; face defenders toward the actual threat. Every setup has at least one skater; use 2–10 skaters as appropriate, with optional goalies. Do not add tactical complexity just to fill rosters. Goalies near (+/-26,0). Navy always attacks +x; gold attacks -x. Player labels are YOU or short meaningful roles (D1/F2/C), otherwise H1/A1 render as jersey numbers. Keep player spacing legible. Puck is `{owner: existingSkaterId}` or `{owner:null,x:number,y:number}`. Root adapter computes carried puck from the rig convention.

`basis:scene` means answer can be read from visible actors or explicitly given facts. `basis:coaching` means a suggested original teaching answer awaiting coaching review. No tactical score, mastery or certification is awarded. Explanations and positional comparisons are descriptive. Question options should be plausible and age-appropriate; avoid repeating the same prompts/answers across all scenes. Position references must stay on ice, move the named actor meaningfully, and retain scene context. Sequence options are shuffled for practice; the source order is retained for comparison.

Sources are brief original notes and exact accessible URLs/sections. A source about age progression supports age placement, not every tactical conclusion. Public book marketing is topic inspiration only. Do not trace source diagrams or reproduce book templates/prose. Do not claim frequency from a curriculum list. No paywall bypass, paid API, or full restricted corpus retention.

## User experience and verification

Practice gains Experimental scenarios. Search and filters cover age, topic, family, question type; each scenario opens an original 3D rink, six questions, answer feedback, source notes and review limits. All 100 are accessible regardless of mastery. Attempts remain in a separate per-player local storage namespace; reload restores work. JSON and CSV exports expose the catalog. Coordinates and a simple independent board remain usable if WebGL is unavailable. An experimental banner and suggested-answer language stay visible.

Validate exact age counts, stable IDs, source metadata, six to eight questions, format contracts, answer membership, finite/inside-rink positions, actor identities, reference movement, carried puck, duplicate prompts/setups and no approved-bank imports. Test actual answer/save/reload/filter/export and mobile/desktop layout. Structural checks cannot certify tactics or skating physics.
