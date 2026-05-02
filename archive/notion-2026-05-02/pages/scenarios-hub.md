# 🎯 RinkReads — POV Image Scenarios Hub

> Sub-page of the RinkReads hub. Archived 2026-05-02.
> Original URL: https://www.notion.so/34dc5405e7f68179b9b5dc4ed104c217

Production system for AI-generated POV hockey images and the questions attached to them. Two linked databases — one for image assets, one for questions — plus the prompt template, naming conventions, and workflow.

## Naming conventions (legacy)

These were the Notion conventions. **Superseded 2026-05-02** by the age-first convention: `u{age}_{archetype}_{nnn}{suffix}` (e.g. `u11_2v1_001a1`).

### Image IDs
`IMG-{archetype}-{number}` — e.g. `IMG-2v1-001`, `IMG-wall-003`, `IMG-dz-007`

Archetype shortcodes:
- `2v1` — 2-on-1 Rush
- `wall` — OZ Wall Battle
- `bkwy` — Breakaway
- `cycle` — OZ Cycle Support
- `regroup` — NZ Regroup
- `entry` — OZ Entry
- `breakout` — DZ Breakout
- `forecheck` — Forecheck Pressure
- `dz` — DZ Coverage
- `f3` — F3 Support
- `bckchk` — Backcheck
- `pkclear` — PK Clear

### Question IDs (legacy)
`Q-{image_archetype}-{image_number}-{question_letter}` — e.g. `Q-2v1-001-A`

## v2.5 — Strict House Style with Variable Camera

Use this for any new RinkReads scenario images. Style and color are LOCKED. Camera angle is the only variable.

### Approved camera angles

- **TOP-DOWN** (90° overhead) — best for spatial reads, hot-spot tap targets, formations, full-rink composition
- **3D ISOMETRIC** (raised ~30-45°, mild perspective) — best for posture/stance, body position, stick angle, technique
- **BEHIND-NET POV** (behind own goalie looking out) — best for DZ coverage, point pressure, goalie's-view defending
- **SIDELINE BROADCAST** (boards level, near center ice) — best for rush/transition, neutral zone regroups, full-team flow
- **FIRST-PERSON POV** (helmet level, ~4'8") — best for "what would YOU do" decision-making under pressure

Pick ONE angle per image. Don't generate angle variants of the same scene — generate a new scene with a new ID if you need a different camera.

### House-style commitments

These are decided. Don't reopen them per-image.

- POV team is always **BLACK**
- Opposing team is always **WHITE**
- POV-team goalie wears **BLACK** equipment; opposing goalie wears **WHITE**
- Top-down is the DEFAULT camera if you're unsure
- Aspect ratio is always 16:9
- Every image is a flat illustration (not photorealistic)

### The full template (copy-paste, fill in Layer 3)

```
Generate a clean illustrated youth hockey diagram. Strict art-style rules apply.

═══════════════════════════════════════════════════════════════
LAYER 1 — HOUSE STYLE (LOCKED — DO NOT MODIFY)
═══════════════════════════════════════════════════════════════

COLOR CONVENTIONS:
- POV team: BLACK jerseys, BLACK pants
- Opposing team: WHITE jerseys, WHITE pants with thin colored trim
- POV-team goalie: BLACK equipment
- Opposing goalie: WHITE equipment
- Puck: solid black ellipse on the ice

RINK STYLE:
- White ice surface, clean
- Red goal lines + red center line (dashed center)
- Solid blue blue-lines
- Faceoff circles + dots in red
- Goal creases in light blue fill
- Boards dark blue with yellow kickplate
- NO advertising on boards, NO team logos, NO NHL branding

ILLUSTRATION STYLE:
- Flat illustration / playbook diagram aesthetic
- Solid colors, crisp line art, minimal shading
- NO motion blur, NO depth-of-field, NO atmospheric haze
- Even flat lighting — like an overhead arena map
- Players rendered as stylized figures with clear posture

PLAYER PROPORTIONS:
- All players youth/minor hockey age (8-13 years old)
- Full youth equipment, helmets with cages
- NO visible faces

═══════════════════════════════════════════════════════════════
LAYER 2 — CAMERA ANGLE (pick ONE from the approved list)
═══════════════════════════════════════════════════════════════

CAMERA ANGLE FOR THIS SCENE: {pick one — name it explicitly}

ASPECT RATIO: 16:9 widescreen

═══════════════════════════════════════════════════════════════
LAYER 3 — THIS SCENE (fill in every variable)
═══════════════════════════════════════════════════════════════

SCENE SUMMARY (one sentence):
{e.g. "A clean 1-on-0 breakaway with the goalie set deep in the crease."}

EXACT PLAYER COUNT (do not add extras):
- BLACK skaters: {N — list each one's role}
- WHITE skaters: {N — list each one's role}
- Goalie(s): {BLACK / WHITE / both / none}
- Officials: {0 unless explicitly required}
- TOTAL skaters in frame: {exact number}

POSITIONING (be specific — use rink landmarks):
- {Player 1: e.g. "Black puck-carrier just inside the offensive blue line, square to the net, head up"}
- {etc — one line per player}

THE TEACHING READ (one sentence):
{e.g. "The goalie is set — the read is SHOOT, not deke."}

═══════════════════════════════════════════════════════════════
LAYER 4 — DO NOT INCLUDE (LOCKED)
═══════════════════════════════════════════════════════════════

- NO crowd or spectators
- NO refs/linesmen unless explicitly listed
- NO additional players beyond the exact count
- NO jersey numbers, team logos, board advertising
- NO adult/NHL-style players — all youth (ages 8-13)
- NO motion blur, cinematic lighting, depth-of-field, atmospheric haze
- NO heavy shading or gradients
- NO arrows, labels, or coaching annotations on the image
- NO faces visible (helmets/cages only)
- NO warped sticks/skates or hand/finger anomalies
```

## Camera-angle cheat sheet

| Question type | Best angle |
|---|---|
| Hot-spot ("tap the open ice") | TOP-DOWN — coords stay accurate |
| Pov-mc tactical read ("best pass?") | TOP-DOWN or BEHIND-NET POV |
| Pov-mc technique ("where's your stick?") | 3D ISOMETRIC — body posture and stick angle visible |
| "Read the goalie" decision | 3D ISOMETRIC or FIRST-PERSON POV |
| Rush / transition / neutral zone | SIDELINE BROADCAST — shows the flow |
| DZ coverage / defending the points | BEHIND-NET POV — goalie's view |
| Net-front / scrum / body battle | 3D ISOMETRIC — postures matter |

## 12 Archetype Production Targets

### Decision-Making (4)
1. 2-on-1 Rush — puck carrier POV
2. OZ Wall Battle — just won puck, options forming
3. Breakaway — goalie at top of crease
4. OZ Cycle Support — puck on wall, you're support

### Reading the Play (4)
1. NZ Regroup — D-to-D pass developing
2. OZ Entry — defender stepping up at blue line
3. DZ Breakout — winger curling for support
4. Forecheck Pressure — puck behind net, F1 closing

### Spatial Awareness (4)
1. DZ Coverage — puck on far wall, you're weak-side D
2. F3 Support on a forecheck
3. Backcheck — you're third forward through NZ
4. PK Clear — you're second forward up ice
