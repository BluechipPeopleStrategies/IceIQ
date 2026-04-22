# Dashboard authoring roadmap

**Goal:** make `tools/dashboard.html` the equivalent of a coaching whiteboard tool (HockeyShare / CoachPad / TacticalPad / Dartfish) — not just a data editor.

The best-in-class coaching tools let a coach draw up a play in under 60 seconds and export/share it. Our dashboard today lets you author one question at a time with a blank scene and a drag-and-drop rink editor. The gap is **authoring speed** and **drawing expressiveness**.

This doc is a roadmap — each phase is a self-contained ship. Phases are ordered by expected impact per day of work.

---

## Phase 1 — Play templates library (highest leverage)

**What coaching tools do well:** HockeyShare ships with a library of ~200 pre-drawn plays that you can insert and modify. Coaches don't start from blank; they start from "1-2-2 forecheck" and edit.

**Ship:**
- New button in the dashboard Add modal: **"Start from template"**.
- Dropdown of ~10 preset scenes, each a fully-populated `{team, opponents, puck, arrows, flags}`:
  - Forechecks: `1-2-2`, `2-1-2`, `1-3-1`, `left-wing lock`
  - Breakouts: `wheel`, `reverse`, `over`
  - PP setups: `umbrella`, `1-3-1`, `diamond`
  - D-zone: `box+1`, `zone coverage`, `man-to-man`
  - Rush: `2-on-1`, `3-on-2`
- Each template has a default `scene.question` stubbed in (mode = choice or zone-click, empty prompt) so the author just fills in the situation.

**Where to put it:** `tools/dashboard.html` has the Add modal at line ~2597 (`openAddModal`). Add a template picker right above the rink editor slot; selecting a template populates `row.scene` via `window.IceIQEmptyScene()` → custom populated object. Templates defined inline in the file as a `TEMPLATES` const.

**Effort:** M (half day).

---

## Phase 2 — Drawing-tools palette expansion

**What coaching tools do well:** a palette of primitives — straight arrow, curved arrow, dashed (skating) vs solid (pass), freehand pen, shape fills (highlight zones), numbered sequence markers (1 → 2 → 3).

**Ship (incremental):**
- **Arrow variants** — the current Arrow component in `src/Rink.jsx:449` is always dashed+curved. Add `a.style: "pass"|"skate"|"shot"` field:
  - `"pass"` — straight solid line
  - `"skate"` — dashed curved (current default)
  - `"shot"` — zigzag or lightning (per convention)
- **Numbered sequence markers** — small floating circles on arrows: `a.step: 1|2|3`. Renders as a gold circle with the number at the arrow midpoint. Lets authors describe sequential plays.
- **Zone highlight** — a new scene field `scene.highlightZones: [zoneKey]` that paints a low-opacity colored fill over one or more zones (like TacticalPad's "emphasis" layer).
- **Freehand pen (stretch)** — drag to record pointer path as a polyline; persist as a new scene field `scene.drawings: [{path: "M... L..."}]`. Higher implementation cost (pointer capture + smoothing); defer until basic arrow variants land.

**Where:** `src/Rink.jsx` — extend the Arrow + RinkBackground rendering. The Inspector at line 994 gains arrow-style/step fields when an arrow is selected.

**Effort:** L (1–2 days for the full palette; arrow variants alone are M).

---

## Phase 3 — Animation / multi-step plays

**What coaching tools do well:** plays unfold over time. Click "next step" and the puck/players advance to their next position. HockeyShare uses keyframe sliders, CoachPad uses a timeline.

**Ship:**
- New scene field `scene.frames: [frame1, frame2, ...]` where each frame is the full `{team, opponents, puck, arrows}` snapshot at that step.
- Play-mode Rink component renders a frame selector (◀ Step 1 / 2 / 3 ▶) and swaps the rendered scene on click.
- Author UI in dashboard: "Save as frame 2" button that snapshots the current state into the next frame slot.
- New question mode `"sequence-play"` where the player is asked a question at each frame and the answer gates moving to the next.

**Effort:** L (2–3 days). Architecturally biggest lift — every renderer needs to know about frames.

**Why ship this:** unlocks the "reading a developing play" question type which is the single most valuable hockey-IQ assessment format and doesn't exist elsewhere.

---

## Phase 4 — Playbook / team library

**What coaching tools do well:** plays live in a team's playbook. Coach creates a play once, shares it with players, tags it by system (forecheck / PP / PK / D-zone).

**Ship:**
- New Supabase table `plays` with `{id, coach_id, team_id, name, system, scene, description, created_at}`.
- New screen `TeamPlaybook` at `/playbook` — list of plays the coach has saved, filterable by system + team.
- "Save to playbook" button on any authored rink scenario.
- Player-side: a player whose team has saved plays sees a "Your team's playbook" tab with the plays their coach has drawn up.

**Effort:** XL (new table + RLS + 2 new screens). Big. Flag this as a real v2 feature.

---

## Phase 5 — Export formats

**What coaching tools do well:** export to PDF (one play per page, printable for team meetings), share-by-link (read-only URL), export to animated GIF.

**Ship:**
- "Export this scene as PNG" button in the dashboard Inspector — uses browser's SVG-to-Canvas + canvas.toBlob. Cheap.
- "Copy share link" that encodes the scene into a URL fragment — any viewer pasting the link sees the scene read-only.
- PDF export — stretch, needs a PDF lib.

**Effort:** M (PNG + share link) or L (with PDF).

---

## Phase 6 — Quality-of-life

- **Mirror / flip** — current rink is offensive zone only. A `flip-horizontal` button mirrors all x-coords (lets you reuse a left-side play as a right-side play).
- **Copy scene** — "Duplicate this question" in the review dashboard — starts a new authoring row with the current scene copied. Trivial.
- **Role labels** — auto-label teammates F1/F2/F3/D1/D2 based on zone, not manual position picker. Inspector adds a "Label by role" toggle.
- **Undo/redo stack** — track scene changes for ~30 steps. Keyboard: Ctrl+Z / Ctrl+Y.
- **Grid snap** — pointer drops snap to a 20px grid for clean-looking scenes.

**Effort:** Each S–M, good "polish session" work.

---

## What we're NOT copying

- **Animated player avatars with skates/sticks** — fidelity overkill for a hockey-IQ app, not a coach's whiteboard.
- **Video overlay / telestration** — requires video source infrastructure; out of scope.
- **Pen-tablet pressure sensitivity** — coaches draw on phones/laptops, not tablets.
- **Multi-user real-time collaboration** — big engineering lift, no proven demand from our users.

---

## Recommended sequence (if I only had a week)

1. **Day 1:** Phase 1 (templates library) — fastest perceptual win. Authoring speed ↑ 3×.
2. **Day 2–3:** Phase 2 arrow variants + zone highlights. Plays look "coached", not "diagrammed".
3. **Day 4:** Phase 5 PNG export + share link. Users start sharing plays, creating viral loop.
4. **Day 5–6:** Phase 3 multi-frame plays. Unlocks the killer "read the developing play" quiz type.
5. **Week 2+:** Phase 4 playbook (biggest feature, dedicated sprint).

## Known risks / open questions

- **Dashboard is `file://`-hosted, no Node/fs write access from the browser.** Play templates + PNG export work fine; sharing to Supabase needs the normal patch-file → `apply-dashboard-patch.mjs` round-trip OR an in-app admin route.
- **Scene schema is already embedded in 700+ rink questions.** Any schema change (e.g. adding `frames: [...]`) needs backward compat — treat single-frame scenes as "frames: [currentScene]".
- **Rink.jsx is auto-copied into dashboard.html via build-rink-editor.mjs.** Every new scene primitive needs to work both in the Vite app and in the Babel-Standalone dashboard — minor, but worth checking.
