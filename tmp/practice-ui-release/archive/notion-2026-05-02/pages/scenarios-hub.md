# 🎯 RinkReads — POV Image Scenarios Hub

> Sub-page of the RinkReads hub. Archived 2026-05-02. **Updated 2026-05-02** with the v2.6 anime/cel-shaded house style after a user-supplied reference image re-anchored the visual conventions (YELLOW opposing team instead of WHITE; RRH branding instead of CCM; faces visible through cages; 3D ISOMETRIC default camera).
> Original URL: https://www.notion.so/34dc5405e7f68179b9b5dc4ed104c217

Production system for AI-generated POV hockey images and the questions attached to them. Two linked databases — one for image assets, one for questions — plus the prompt template, naming conventions, and workflow.

## Naming conventions (legacy)

The Notion-era convention. **Superseded 2026-05-02** by the age-first convention: `u{age}_{archetype}_{nnn}{suffix}` (e.g. `u11_2v1_001a1`).

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

## v2.6 — Anime cel-shaded house style with variable camera

Use this for any new RinkReads scenario images. Style and color are LOCKED. Camera angle is the only variable.

### Approved camera angles

- **TOP-DOWN** (90° overhead) — best for spatial reads, hot-spot tap targets, formations, full-rink composition
- **3D ISOMETRIC** (raised ~30-45°, mild perspective) — **default** for tactical reads, posture/stance, body position, stick angle. Matches the user's reference-image style most directly.
- **BEHIND-NET POV** (behind own goalie looking out) — best for DZ coverage, point pressure, goalie's-view defending
- **SIDELINE BROADCAST** (boards level, near center ice) — best for rush/transition, neutral zone regroups, full-team flow
- **FIRST-PERSON POV** (helmet level, ~4'8") — best for "what would YOU do" decision-making under pressure

Pick ONE angle per image. Don't generate angle variants of the same scene — generate a new scene with a new ID if you need a different camera.

### House-style commitments (do not reopen per-image)

- POV team is always **BLACK** jerseys + BLACK pants + BLACK socks with WHITE horizontal stripes
- Opposing team is always **YELLOW** jerseys (with BLACK numbers and a black/yellow team crest) + BLACK pants + YELLOW socks with BLACK stripes
- POV-team goalie wears BLACK equipment
- Opposing goalie wears YELLOW jersey, WHITE pads, BLACK helmet with white cage
- **Faces are visible** through the cages (eyes / expressions readable)
- Equipment branding: **RRH only**, never CCM/Bauer/Easton/Warrior/True or any real-world brand
- Boards: dark blue with red + white horizontal kickplate stripe
- Default camera = **3D ISOMETRIC** when uncertain
- Aspect ratio is always **16:9**
- Art style: anime / cel-shaded youth sports illustration — clean line art, flat colors with mild shading. NOT photorealistic. NOT flat playbook diagram.
- Players are youth/minor hockey age (8-13)

### The full template (copy-paste, fill in Layer 3)

```
[ATTACH the user's house-style reference image FIRST in the ChatGPT message,
 then send this text. The reference image is the strongest style anchor —
 always attach it for new scenes.]

Generate a clean illustrated youth hockey scene in the EXACT visual style
of the attached reference image. Match the art style, camera angle, line
work, color palette, equipment detail, and character proportions.

═══════════════════════════════════════════════════════════════
LAYER 1 — HOUSE STYLE (LOCKED — DO NOT MODIFY)
═══════════════════════════════════════════════════════════════

ART STYLE:
- Anime / cel-shaded youth sports illustration
- Clean line art, flat colors with mild shading
- NOT photorealistic, NOT flat playbook diagram
- Faces visible through helmet cages — eyes / expressions readable
- 16:9 widescreen aspect ratio

COLOR CONVENTIONS:
- POV team: BLACK jerseys with WHITE numbers, BLACK pants, BLACK socks
  with horizontal WHITE stripes
- Opposing team: YELLOW jerseys with BLACK numbers + black/yellow team
  crest, BLACK pants, YELLOW socks with BLACK stripes
- POV-team goalie: BLACK equipment
- Opposing goalie: YELLOW jersey, WHITE pads, BLACK helmet with white cage
- Puck: solid black ellipse on the ice

RINK STYLE:
- White ice surface, clean
- Red goal lines + red center line (dashed center)
- Solid blue blue-lines
- Faceoff circles + dots in red
- Goal creases in light blue fill
- Boards dark blue with red + white horizontal kickplate stripe
- NO advertising on boards, NO team logos, NO NHL branding

EQUIPMENT BRANDING:
- ONLY "RRH" appears as equipment branding (helmets, pants, gloves, sticks)
- Match the font weight, size, and placement that real CCM logos use
- ABSOLUTELY NO CCM, Bauer, Easton, Warrior, True, or any real-world brand

PLAYER PROPORTIONS:
- All players youth/minor hockey age (8-13)
- Full youth equipment, helmets with cages
- Faces visible through the cages (NOT hidden, NOT blurred)

JERSEY NUMBERS:
- Every scene uses a DIFFERENT set of jersey numbers — never reuse the
  same combo across the library
- Numbers are 1-99 (no double-zero or three-digit), realistic for youth
  hockey, clean and legible
- Each visible player gets exactly ONE number, BIG on the back of the
  jersey, small or absent on the front
- Specify exact numbers for each player in Layer 3 below to lock them in
  (DALL-E often hallucinates numbers if you don't pin them)

═══════════════════════════════════════════════════════════════
LAYER 2 — CAMERA ANGLE (pick ONE from the approved list)
═══════════════════════════════════════════════════════════════

CAMERA ANGLE FOR THIS SCENE: {one of: TOP-DOWN / 3D ISOMETRIC /
  BEHIND-NET POV / SIDELINE BROADCAST / FIRST-PERSON POV — name it
  explicitly with full description from the approved list}

ASPECT RATIO: 16:9 widescreen

═══════════════════════════════════════════════════════════════
LAYER 3 — THIS SCENE (fill in every variable)
═══════════════════════════════════════════════════════════════

SCENE SUMMARY (one sentence):
{e.g. "A clean 1-on-0 breakaway with the YELLOW goalie set deep in the crease."}

EXACT PLAYER COUNT (do not add extras):
- BLACK skaters: {N — list each one's role}
- YELLOW skaters: {N — list each one's role}
- Goalie(s): {BLACK / YELLOW / both / none}
- Officials: {0 unless explicitly required by the read}
- TOTAL skaters in frame: {exact number}

POSITIONING (be specific — use rink landmarks AND assign each player
a unique jersey number):
- {Player 1: "BLACK #{NN} puck-carrier just inside the offensive blue
   line, square to the net, head up"}
- {Player 2: "YELLOW #{NN} goalie set DEEP in the crease, butterfly
   stance, both pads down, gloves at chest"}
- {etc — one line per player, jersey number called out explicitly}

JERSEY NUMBER VARIETY ACROSS THE SET:
- Use a different number combo for every new scene
- Track which numbers you've used — log them in the question's `concepts`
  or alt-text so future scenes can avoid duplicates
- Goalies don't need to be unique across scenes (kids see the same goalie
  outline anyway), but skater numbers should rotate

THE TEACHING READ (one sentence on what the image must communicate):
{e.g. "The goalie is set — the read is SHOOT, not deke."}

═══════════════════════════════════════════════════════════════
LAYER 4 — DO NOT INCLUDE (LOCKED)
═══════════════════════════════════════════════════════════════

- NO crowd or spectators (empty stands, no people in background)
- NO refs/linesmen unless explicitly listed in Layer 3 player count
- NO additional players beyond the exact count
- NO jersey numbers, team logos, or board advertising other than the
  opposing-team crest matching the reference
- NO real-world equipment brands (CCM/Bauer/Easton/Warrior/True/etc.) —
  RRH only
- NO adult/NHL-style players — all youth (ages 8-13)
- NO photorealism, NO motion blur, NO depth-of-field, NO atmospheric haze
- NO heavy shading or gradients — keep it flat and clean (cel-shaded)
- NO arrows, labels, or coaching annotations drawn on the image
- NO warped sticks/skates or hand/finger anomalies
```

## Camera-angle cheat sheet

| Question type | Best angle |
|---|---|
| Hot-spot ("tap the open ice") | TOP-DOWN — coords stay accurate, no perspective distortion |
| Pov-mc tactical read ("best pass?") | 3D ISOMETRIC — defender body + stick geometry reads clearly |
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

## Style anchor

Save the reference image (the youth-2-on-1 anime-cel-shaded scene) at:

```
C:\Users\mtsli\IceIQ\public\assets\style-reference\house-style.png
```

When you save an RRH branding wordmark/logo, save it at:

```
C:\Users\mtsli\IceIQ\public\assets\style-reference\rrh-branding.png
```

Attach `house-style.png` (and `rrh-branding.png` when you have one) as the FIRST message in any new ChatGPT session generating scenes — DALL-E / GPT-4o image carries the visual memory across the whole session, which keeps a multi-image set looking consistent.
