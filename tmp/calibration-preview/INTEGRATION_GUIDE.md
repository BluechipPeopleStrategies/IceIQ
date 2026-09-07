# RinkReads Rink System — Integration Guide (self-healing v2.1)

Drop into your RinkReads repo in 5 sequential Claude Code prompts.
Each prompt is copy-paste ready.

## What's new in v2.1 — self-healing features

Both `RinkReadsRink.jsx` and `RinkReadsRinkQuestion.jsx` now **validate, sanitize,
and recover** instead of crashing when data is imperfect:

### Auto-fixes silently
- Missing coordinates → sensible defaults (center ice)
- Coordinates out of range → clamped to rink bounds
- Unknown marker types → logs warning, uses `"player"` as fallback
- Unknown line types → logs warning, uses `"skate"` as fallback
- Unknown zone keys → logs warning, skips that zone, rest of rink still renders
- Non-array fields that should be arrays → treated as empty array
- Non-finite numbers (NaN, undefined, strings) → fallback values
- Zero-length lines → silently dropped
- Missing marker labels → default to type initial (X, D, T, O, G)

### Shows a friendly fallback when data can't be recovered
- Question missing required fields (e.g. drag-target with no `targets` array) →
  renders an amber card listing what's missing with a "Skip this question" button
- React render error inside a question → error boundary catches it, shows a
  "This question had an issue — skip?" card instead of crashing the whole app
- Unsupported question type → graceful fallback to MC if `choices` exists,
  otherwise shows skip card

### Logs to console for debugging
Everything the system auto-fixes gets logged as a `console.warn` with the
prefix `[RinkReadsRink]` or `[RinkReadsRinkQuestion]` so you can find issues when
testing — without the user ever seeing a broken question.

**Net effect:** a question bank contributor can submit imperfect JSON and
the app will either fix it, show a useful error, or skip gracefully. Kids
never see a white screen of death.

---

## Files to add to rinkreads/src/

Before starting, copy these three files into `rinkreads/src/`:
1. `RinkReadsRink.jsx` — Olympic-scale rink with validation + error boundary
2. `RinkReadsRinkQuestion.jsx` — question renderer with validation + error boundary
3. Keep your existing `App.jsx` unchanged for now

---

## PROMPT 1 — Install the rink component files

```
I'm adding two new React components to the RinkReads app.

1. Confirm RinkReadsRink.jsx and RinkReadsRinkQuestion.jsx are in src/ (I just
   placed them there). If they're somewhere else, move them to src/.

2. Verify the imports resolve cleanly. RinkReadsRinkQuestion.jsx imports from
   "./RinkReadsRink" — make sure that path works.

3. Both files use React's class-based error boundaries (class Component),
   which is normal React and requires no extra dependencies. Confirm no
   new npm packages are needed.

4. Don't touch App.jsx yet. Just run `npm run dev` and confirm it compiles
   without errors.

After the dev server compiles cleanly, stop and report back.
```

---

## PROMPT 2 — Wire the rink renderer into the question flow

```
Read src/App.jsx and find the section that renders a single question (the
part that handles mc / diagram / rank / two-step / sequence / fill / multi /
true-false types).

I need to add a branch at the top of that render block. If the current
question has a `rink` field OR the type is one of these new interactive types:
  drag-target, drag-place, zone-click, multi-tap, sequence-rink, path-draw,
  lane-select, hot-spots

...then render <RinkReadsRinkQuestion question={q} onAnswer={handleAnswer}
onSkip={handleSkipQuestion} /> instead of the existing renderer.

Important details:
- The existing `sequence` type in the bank should stay as-is. The new
  rink-native version is `sequence-rink`. Don't break existing questions.
- The new renderer has built-in error handling — if a question has bad data
  it shows a skip card. You need to wire `onSkip` to whatever advances to
  the next question (likely the same function that handles "next" click).
- The renderer calls `onAnswer(true)` or `onAnswer(false)` for correct/wrong.
  Multi-tap and drag-place also pass a second argument with partial credit
  info, but the primary boolean is all the existing flow needs.

Add the import at the top of App.jsx:
  import RinkReadsRinkQuestion from "./RinkReadsRinkQuestion";

Show me the diff before applying.
```

---

## PROMPT 3 — Add 5 example rink questions to the bank

```
I have 5 example rink questions ready to add to the question bank. Find
the question array in src/App.jsx (grep for `{id:"u7q001"` or similar to
locate it).

Add these 5 questions at the end of the array, before the closing bracket:

{id:"u9q_rink01",cat:"Zone Awareness",diff:"E",type:"mc",
 q:"The coach says 'protect the slot.' Which area is the slot?",
 choices:["The highlighted area in front of the net","The corner behind the goal","The center ice faceoff circle","The area near the blue line"],
 correct:0,
 tip:"The slot is prime scoring real estate — from the faceoff dots to the top of the crease. Most goals come from here.",
 rink:{view:"right",zone:"slot"}},

{id:"u11q_rink02",cat:"2-on-1",diff:"M",type:"drag-target",pos:["F"],
 q:"You're on a 2-on-1. Drag the puck where it should go.",
 tip:"Pass when the D commits — your teammate has open ice.",
 rink:{view:"right",
  markers:[
    {type:"attacker",x:420,y:130,label:"YOU"},
    {type:"teammate",x:440,y:200},
    {type:"defender",x:500,y:165},
    {type:"goalie",x:555,y:150}]},
 puckStart:{x:420,y:142},
 targets:[
   {x:440,y:200,radius:30,verdict:"best",feedback:"Perfect read. The D committed to you — the pass lane is wide open."},
   {x:555,y:150,radius:22,verdict:"poor",feedback:"Shot into the goalie. The goalie is cheating to you — the open ice is the pass."}]},

{id:"u11q_rink03",cat:"Gap Control",diff:"M",type:"zone-click",pos:["D"],
 q:"A forechecker is pressuring your D. Which area should the D move the puck to for a clean breakout?",
 tip:"Strong-side board support — get the puck to the winger on the wall.",
 rink:{view:"left",
  markers:[
    {type:"defender",x:80,y:200,label:"D1"},
    {type:"attacker",x:130,y:210,label:"F"},
    {type:"teammate",x:160,y:50,label:"W"},
    {type:"goalie",x:45,y:150}]},
 zones:[
   {shape:"poly",points:[{x:140,y:20},{x:200,y:20},{x:200,y:80},{x:140,y:80}],correct:true,msg:"Yes — up the strong-side wall to the winger. Fast, simple, moves the puck up."},
   {shape:"poly",points:[{x:20,y:20},{x:80,y:20},{x:80,y:80},{x:20,y:80}],correct:false,msg:"Behind your own net under pressure. Goes nowhere."},
   {shape:"circle",x:150,y:150,radius:25,correct:false,msg:"Into the middle with a forechecker right there. Turnover."}]},

{id:"u13q_rink04",cat:"Vision",diff:"M",type:"multi-tap",pos:["F"],
 q:"You have the puck. Tap every teammate who's open for a pass.",
 tip:"Open means no defender in the passing lane.",
 rink:{view:"right",
  markers:[
    {type:"attacker",x:410,y:150,label:"YOU"},
    {type:"defender",x:470,y:130},
    {type:"defender",x:470,y:110},
    {type:"goalie",x:555,y:150}]},
 markers:[
   {type:"teammate",x:500,y:80,label:"T1",correct:true},
   {type:"teammate",x:470,y:170,label:"T2",correct:false},
   {type:"teammate",x:520,y:230,label:"T3",correct:true},
   {type:"teammate",x:440,y:110,label:"T4",correct:false}]},

{id:"u13q_rink05",cat:"Breakout",diff:"H",type:"sequence-rink",pos:["F","D"],
 q:"Tap the breakout players in order 1 → 4.",
 tip:"Retriever → support → center → winger. Build up the ice.",
 rink:{view:"left"},
 markers:[
   {type:"defender",x:80,y:200,label:"D1",order:1},
   {type:"defender",x:60,y:100,label:"D2",order:2},
   {type:"teammate",x:200,y:150,label:"C",order:3},
   {type:"teammate",x:220,y:50,label:"W",order:4}]}

Don't modify any existing questions. Just append these five.

After adding, run npm run dev, navigate to each question in the app, and
verify they render and respond correctly. Open the browser console and
confirm no [RinkReadsRink] or [RinkReadsRinkQuestion] warnings appear — those
indicate data issues the system auto-fixed but should ideally be clean.
```

---

## PROMPT 4 — Update CLAUDE.md with the new schema

```
Read CLAUDE.md in the repo root.

Append a new section called "## Rink Visualization Schema (v2)" that
documents:

1. The coordinate system (1 SVG unit = 0.1 meter, rink is 600 × 300 units,
   origin top-left).
2. Key landmarks (left goal line x=40, left blue line x=213, center x=300,
   right blue line x=387, right goal line x=560, faceoff dots at specific
   coordinates, etc.).
3. The 8 new question types:
   - mc / diagram (with optional rink field)
   - drag-target (targets array with x, y, radius, verdict, feedback)
   - drag-place (slots + chips arrays)
   - zone-click (zones array with shape poly or circle, correct, msg)
   - multi-tap (markers array at question level with correct flag)
   - sequence-rink (markers array with order number)
   - path-draw (start, target, avoid arrays)
   - lane-select (lanes array with clear flag)
   - hot-spots (spots array with correct flag)
4. A reference to the component files: RinkReadsRink.jsx renders the rink,
   RinkReadsRinkQuestion.jsx dispatches to the right interactive component per
   question type.
5. Self-healing: both components validate and auto-fix bad data (coord
   clamping, unknown type fallbacks, null checks). Errors are logged to
   console with [RinkReadsRink] or [RinkReadsRinkQuestion] prefixes for debugging.
   Unrecoverable questions show a skip card instead of crashing.
6. Authoring workflow: use the standalone editor tool (Claude artifact) to
   build questions visually and paste JSON into the question bank array.

Keep it concise — under 100 lines for this section.
```

---

## PROMPT 5 — Commit and deploy

```
Run these checks in order, stop if any fail:

1. npm run build — ensure production build compiles cleanly
2. Check for any remaining console.log statements in the new files (warn
   and error are fine and intentional)
3. Verify the 5 new questions appear when filtering by their IDs
4. Test the error handling: temporarily add a broken question like
   `{id:"test",type:"drag-target",q:"Test"}` (missing targets array),
   navigate to it, confirm the amber skip card appears, then remove it.
5. Check that existing questions (pick 3 at random across U7/U9/U11) still
   render normally — no regressions

Then commit the changes in one commit with message:
"Add self-healing Olympic-scale rink component with 8 interactive question types (v2.1 schema)"

Push to main. Vercel will auto-deploy to rinkreads.com.

Verify the deployment by loading the live URL and navigating to the new
questions.
```

---

## After Prompt 5 — you have

- Working Olympic-scale rink component in production
- 8 new question types (MC + 7 interactive)
- 5 example questions demonstrating each major type
- Self-healing validation — bad data gets fixed or skipped, never crashes the app
- Error boundaries — one broken question can't take down the session
- Updated CLAUDE.md documenting the schema
- Backwards compatible — all 445 existing questions still work

## Authoring workflow from here

1. Open the Rink Editor v2 artifact (saved in your claude.ai chat history)
2. Pick a question type
3. Build the scene — place players, draw lines, add regions
4. Tag mode — mark targets / answers / order numbers
5. Copy JSON
6. Paste into your App.jsx question bank array
7. Commit and push

Recommended cadence: retrofit your flagship 30 questions first (the ones
new users hit in their first session), then add 10 new rink-native
questions per age group over the next month.

## How self-healing behaves (reference)

| Input issue | What happens |
|---|---|
| `x: "200"` (string) | Parsed to number 200 |
| `x: NaN` or `x: undefined` | Falls back to center (CX or CY) |
| `x: 99999` (out of range) | Clamped to rink bounds ±20 units |
| `type: "ninja"` (unknown) | Warns + falls back to `"player"` |
| `lines: null` | Treated as empty array |
| `markers: "not an array"` | Treated as empty array |
| `zone: "fakezone"` | Warns + skips the zone overlay, rest renders |
| Question missing `targets` for drag-target | Shows skip card |
| React render error inside a question | Error boundary catches, shows skip card |
| Question with unknown `type` | Falls back to MC if `choices` exists, else skip card |

Every auto-fix logs to console as a warning so you can clean up the data
later, but the user never sees a broken question.

## Troubleshooting

**No warnings show but question looks wrong:** Coordinates may be valid
but placed outside the current view (e.g. a full-rink marker at x=500
won't show in left-half view). Check the view matches the marker range.

**Drag doesn't work on mobile:** The touch event listeners are attached
via useEffect — if they're missing, check that your App.jsx isn't
wrapping the question in something with `pointer-events: none`.

**Error boundary triggers repeatedly:** Check browser console for the
actual error. Most common: a question type uses an array field (targets,
slots, zones) but the bank has it as null or undefined. The validator
catches this but an edge case might slip through — the error boundary is
the last line of defense.

**Warnings flood the console:** Means multiple questions have data issues.
Filter by ID in the console: `[RinkReadsRinkQuestion] "u11q042" warnings:`
shows you exactly which questions need cleanup. Fix those IDs in the bank.
