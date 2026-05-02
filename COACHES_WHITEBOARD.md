# Coach's Whiteboard — Image Briefs

**Purpose:** for every imageId that needs a real image, this doc describes the
play to depict and gives a Scene Composer sprite recipe so you can produce the
image without re-deriving the play each time.

**Workflow per image:**
1. Open Scenario Author → Scene mode
2. Pick the **RINK** specified in the brief
3. Drag sprites following the **SPRITE RECIPE** (yellow team = your team, black team = opponent)
4. Mark the **focus player** (Inspector → ⭐ Focus player) — this is the player THIS question is about
5. Place the puck at the specified location (or attach to a holder)
6. Click **+ New Question** if authoring fresh, or **✓ Apply to Question** if from a compose-handoff
7. The PNG renders at 1672×941 and binds to all questions with that imageId

**Coordinate system:** scene mode uses normalized 0-1 coordinates. (0, 0) = top-left of the rink bg, (1, 0.5625) = bottom-right (16:9 aspect). The RINK column tells you which bg image to load.

**Pose index reference** (for the new player sprite sheets, 4×2 grid = 8 poses):
- 0 = Athletic stance facing forward
- 1 = Skating forward, right-leg crossover
- 2 = Skating forward, left-leg crossover
- 3 = Skating backwards, knees bent
- 4 = Mid-stride forward
- 5 = T-stop sideways stance
- 6 = Defensive low-and-wide
- 7 = Skating backwards, stick across body

(If you renumber the sheet, update this section.)

---

# Priority — high-leverage briefs (4 images, 144 questions waiting)

These are the IMG-2v1 series. Get these 4 right and 144 placeholder questions become real-image questions.

---

## IMG-2v1-001 — *Defender between carrier and teammate*

**Archetype:** 2-on-1 Rush (Decision Quality / Read the Defender)
**Linked questions:** 37 (across U7 / U9 / U11 / U13)
**Read trigger:** the defender's body is square between the puck carrier and the teammate. Defender's stick is committed to taking away the cross-ice pass — he's daring the shooter to beat the goalie.
**Right read:** SHOOT. Defender has taken the pass; goalie is the only thing left.

### Coach's whiteboard

```
                 GOALIE
                   ●
                   ↓ (challenging out)

             ●           ●
          (carrier)   (teammate)
          yellow       yellow
          POV — drives   open in slot
          centre-right   weak side

                 ●
              (defender)
               black
               body square between
               the two yellows,
               stick low across the
               passing lane
```

The carrier is in a 2-on-1 rush, just over the offensive blue line. His teammate is open on the weak side, but the defender has positioned his BODY between them and committed his STICK to the passing lane. The shot is open.

### RINK

`rink-endzone.png` (offensive zone end-on view)

### SPRITE RECIPE

| # | Sprite | Position (x, y) | Pose | Scale | Flip | Notes |
|---|---|---|---|---|---|---|
| 1 | **yellow skater** ⭐ FOCUS | (0.42, 0.65) | 4 (mid-stride) | 1.0 | – | Carrier with puck — drive forward, head up |
| 2 | yellow skater | (0.65, 0.55) | 0 (athletic stance) | 1.0 | yes | Open teammate weak-side |
| 3 | black skater | (0.52, 0.50) | 6 (defensive low-wide) | 1.0 | – | Defender between the two yellows, stick committed to pass lane |
| 4 | yellow goalie | (0.50, 0.18) | 0 | 0.95 | – | Goalie at top of crease, challenging |

**Puck:** attach to player #1 (the carrier).
**Focus halo:** player #1 (the carrier — this is what the question is about).

### Style note

Defender's stick should clearly extend across toward player #2 (the teammate). That's the read — "his stick is in the passing lane, take the shot."

---

## IMG-2v1-002 — *Stick blocking the pass lane (body straight up)*

**Archetype:** 2-on-1 Rush (Decision Quality / Pass vs Shoot)
**Linked questions:** 35
**Read trigger:** defender stays vertical between the two yellows but his STICK is heavily extended into the passing lane. His body isn't taking away the shot.
**Right read:** PASS. Defender is committed to the pass-block; shooting lane is open. (Actually — read carefully. In this scenario the right play is the OPPOSITE of -001. Confirm with the question text: in -002, defender's stick blocks pass → shoot. Or, wait. Let me re-read the questions.)

*(Re-confirming play with question text: u11_2v1_002a1 says "The defender's stick is in the passing lane.")*

### Coach's whiteboard

```
                 GOALIE
                   ●
                   ↓

             ●           ●
          (carrier)   (teammate)
          yellow       yellow
          POV         open

             ●
          (defender)
           stick extended
           AWAY from carrier
           toward teammate
           BUT body squared
           vertical, taking
           away the shot
```

In contrast to -001, the defender here is showing the SHOT lane open and using his stick to block the pass. Carrier should pass through the soft spot below the defender's stick OR beat the defender wide.

### RINK

`rink-endzone.png`

### SPRITE RECIPE

| # | Sprite | Position (x, y) | Pose | Scale | Flip | Notes |
|---|---|---|---|---|---|---|
| 1 | **yellow skater** ⭐ FOCUS | (0.40, 0.62) | 4 | 1.0 | – | Carrier driving down centre-right |
| 2 | yellow skater | (0.68, 0.55) | 0 | 1.0 | yes | Teammate weak-side, stick on ice ready |
| 3 | black skater | (0.55, 0.45) | 6 | 1.0 | yes | Defender, body vertical, stick extended LEFT into pass lane |
| 4 | yellow goalie | (0.50, 0.18) | 0 | 0.95 | – | Goalie at top of crease |

**Puck:** attach to player #1.
**Focus halo:** player #1.

### Style note

The defender's stick is the visual hero — it should clearly extend across the gap, blocking the pass lane.

---

## IMG-2v1-003 — *Defender far away, time and space*

**Archetype:** 2-on-1 Rush (Decision Quality / Patience)
**Linked questions:** 36
**Read trigger:** defender is deep / retreating, lots of empty ice between him and the carrier. Carrier has TIME — the read is to slow down, wait for the defender to commit, then read.
**Right read:** WAIT / CARRY. Don't force a shoot-or-pass; use the space to make the defender pick.

### Coach's whiteboard

```
                 GOALIE
                   ●
                   ↓

                 ●  (defender — back-pedaling
                  | yellow goalie zone, deep)
                  |
                  v


             ●           ●
          (carrier)   (teammate)
          yellow       yellow
          mid-zone, lots of space
          ahead
```

Carrier just crossed the blue line. Defender is deep, ~25 ft back, retreating. Carrier has open ice ahead and a teammate alongside. No need to rush — patient drive forces the defender to commit.

### RINK

`rink-endzone.png`

### SPRITE RECIPE

| # | Sprite | Position (x, y) | Pose | Scale | Flip | Notes |
|---|---|---|---|---|---|---|
| 1 | **yellow skater** ⭐ FOCUS | (0.42, 0.78) | 4 | 1.0 | – | Carrier just past blue line, head up |
| 2 | yellow skater | (0.62, 0.75) | 1 | 1.0 | yes | Teammate alongside, stride supporting |
| 3 | black skater | (0.50, 0.40) | 7 (skating backwards) | 1.0 | – | Defender deep, retreating to crease |
| 4 | yellow goalie | (0.50, 0.18) | 0 | 0.95 | – | Goalie at top of crease |

**Puck:** attach to player #1.
**Focus halo:** player #1.

### Style note

Vertical separation between carrier (mid-zone, y≈0.78) and defender (deep, y≈0.40) is the visual read. Lots of clear ice between them = the "time and space" cue.

---

## IMG-2v1-004 — *Aggressive defender attacking carrier*

**Archetype:** 2-on-1 Rush (Decision Quality / Read the Aggressor)
**Linked questions:** 36
**Read trigger:** defender steps up aggressively at the carrier, crossing his body forward and committing weight. He's GIVING UP space behind him.
**Right read:** USE HIS MOMENTUM. Chip past or pass through the space he just vacated. Don't try to skate around him — he's coming at you.

### Coach's whiteboard

```
                 GOALIE
                   ●
                   ↓

                ↗ (defender — stepping up,
              ●   committed forward)
             black
             leans in, weight forward

             ●           ●
          (carrier)   (teammate)
          yellow       yellow
          stops up,    moves into
          lifts head    soft area behind
                        the defender
```

Defender has stepped up early — he's lunging at the carrier. Carrier should NOT engage; pass through the gap behind him to teammate moving into the soft area.

### RINK

`rink-endzone.png`

### SPRITE RECIPE

| # | Sprite | Position (x, y) | Pose | Scale | Flip | Notes |
|---|---|---|---|---|---|---|
| 1 | **yellow skater** ⭐ FOCUS | (0.40, 0.70) | 5 (T-stop) | 1.0 | – | Carrier breaking down, eyes up reading the aggressor |
| 2 | yellow skater | (0.65, 0.45) | 4 | 1.0 | yes | Teammate streaking into the soft area BEHIND the defender |
| 3 | black skater | (0.45, 0.55) | 4 (mid-stride forward) | 1.05 | – | Defender lunging — stride extended, body angled at carrier |
| 4 | yellow goalie | (0.50, 0.18) | 0 | 0.95 | – | Goalie at top of crease |

**Puck:** attach to player #1.
**Focus halo:** player #1.

### Style note

The CONTRAST in motion is the read — carrier braking, defender lunging, teammate streaking BEHIND the defender. Use scale 1.05 on the defender to slightly emphasize his forward commitment.

---

# Lighter briefs — 10 fundamentals images, 30 questions waiting

Each image below covers a single fundamental concept and serves 3 questions across U7 / U9 / U11.

---

## IMG-eyesup-001 — *Eyes up while carrying the puck through center*

**Archetype:** Eyes Up · 3 questions
**Read:** carrier's head is fully up, scanning the ice ahead, NOT looking at the puck.
**Rink:** `rink-fullrink.png` (top-down — show the ice ahead the carrier is looking at)

### Sprite recipe
| # | Sprite | Position | Pose | Notes |
|---|---|---|---|---|
| 1 | yellow skater ⭐ | (0.50, 0.50) | 0 | Carrier centered at red line, head up |
| 2-3 | yellow skater | scattered ahead at (0.65, 0.30), (0.40, 0.30) | 0 | Teammates ahead in offensive zone |
| 4 | black skater | (0.55, 0.25) | 0 | Defender ahead, gap-controlling |

**Focus halo:** player #1.

---

## IMG-eyesup-002 — *Scan before the pass arrives*

**Archetype:** Eyes Up · 3 questions
**Read:** receiver looks UP-ICE before the puck arrives at his stick — already reading what he'll do next.
**Rink:** `rink-endzone.png`

### Sprite recipe
| # | Sprite | Position | Pose | Notes |
|---|---|---|---|---|
| 1 | yellow skater ⭐ | (0.45, 0.55) | 0 | Receiver — head up, stick on ice ready, looking up-ice |
| 2 | yellow skater | (0.20, 0.65) | 4 | Passer over by the boards, just released |
| 3 | black skater | (0.62, 0.50) | 6 | Defender approaching |

**Puck:** floating between #1 and #2 (mid-pass), free (no holder).
**Focus halo:** player #1.

---

## IMG-stance-001 — *Faceoff ready stance*

**Archetype:** Athletic Stance · 3 questions
**Read:** centre is in a textbook faceoff stance — knees bent, blade on ice, weight forward.
**Rink:** `rink-endzone.png`

### Sprite recipe
| # | Sprite | Position | Pose | Notes |
|---|---|---|---|---|
| 1 | yellow skater ⭐ | (0.50, 0.50) | 0 | Centre at faceoff dot, athletic stance |
| 2 | black skater | (0.52, 0.50) | 0 | Opposing centre, mirror stance |

**Puck:** floating between them at the faceoff dot.
**Focus halo:** player #1.

---

## IMG-stance-002 — *Defensive slot stance*

**Archetype:** Athletic Stance · 3 questions
**Read:** defenseman in low-wide ready stance in front of his net, prepared to react.
**Rink:** `rink-endzone.png`

### Sprite recipe
| # | Sprite | Position | Pose | Notes |
|---|---|---|---|---|
| 1 | yellow skater ⭐ | (0.50, 0.30) | 6 | Defenseman, low-wide stance, in slot |
| 2 | yellow goalie | (0.50, 0.18) | 0 | Goalie behind |
| 3 | black skater | (0.65, 0.45) | 4 | Attacker driving in |

**Focus halo:** player #1.

---

## IMG-stickoi-001 — *Stick on ice in the passing lane (DZ)*

**Archetype:** Stick on Ice · 3 questions
**Read:** defenseman has his stick fully extended on the ice INTO the passing lane, killing a cross-ice option.
**Rink:** `rink-endzone.png`

### Sprite recipe
| # | Sprite | Position | Pose | Notes |
|---|---|---|---|---|
| 1 | yellow skater ⭐ | (0.55, 0.35) | 6 | Defenseman, stick on ice extended into lane |
| 2 | black skater | (0.30, 0.45) | 0 | Attacker on left wall with puck, looking to pass |
| 3 | black skater | (0.75, 0.40) | 0 | Attacker on right wall expecting the cross-ice |

**Puck:** attach to player #2.
**Focus halo:** player #1.

---

## IMG-stickoi-002 — *Stick blade as receiver target*

**Archetype:** Stick on Ice · 3 questions
**Read:** receiver has his stick blade flat on the ice, presenting a clear target for the passer.
**Rink:** `rink-endzone.png`

### Sprite recipe
| # | Sprite | Position | Pose | Notes |
|---|---|---|---|---|
| 1 | yellow skater ⭐ | (0.65, 0.45) | 0 | Receiver, stick on ice presenting target |
| 2 | yellow skater | (0.30, 0.55) | 4 | Passer about to release |

**Puck:** attached to player #2.
**Focus halo:** player #1 (the receiver — that's the eyes up / target read).

---

## IMG-pp-001 — *Puck protection on the wall*

**Archetype:** Puck Protection · 3 questions
**Read:** carrier has his body BETWEEN the defender and the puck, using the wall as a third leg.
**Rink:** `rink-endzone.png` (or `rink-fullrink.png` for OZ angle)

### Sprite recipe
| # | Sprite | Position | Pose | Notes |
|---|---|---|---|---|
| 1 | yellow skater ⭐ | (0.20, 0.50) | 6 | Carrier on the wall, body between defender and puck |
| 2 | black skater | (0.30, 0.50) | 6 | Defender pressing |

**Puck:** attached to player #1.
**Focus halo:** player #1.

---

## IMG-pp-002 — *Turn away from the forecheck*

**Archetype:** Puck Protection · 3 questions
**Read:** carrier feels the forechecker, turns his back to him, protects the puck on the side away.
**Rink:** `rink-fullrink.png` (NZ regroup view)

### Sprite recipe
| # | Sprite | Position | Pose | Notes |
|---|---|---|---|---|
| 1 | yellow skater ⭐ | (0.50, 0.50) | 7 (skating backwards) | Carrier turning away from check |
| 2 | black skater | (0.52, 0.42) | 4 | Forechecker arriving |

**Puck:** attached to player #1.
**Focus halo:** player #1.

---

## IMG-pass-001 — *Soft hands receiving a pass*

**Archetype:** Receiving a Pass · 3 questions
**Read:** receiver's stick blade is FLAT on the ice, slightly cushioning back as the puck arrives — soft hands.
**Rink:** `rink-fullrink.png` (NZ angle)

### Sprite recipe
| # | Sprite | Position | Pose | Notes |
|---|---|---|---|---|
| 1 | yellow skater ⭐ | (0.55, 0.50) | 0 | Receiver, stick blade flat, eyes up |
| 2 | yellow skater | (0.30, 0.55) | 4 | Passer just released |

**Puck:** floating between them, free, mid-pass.
**Focus halo:** player #1.

---

## IMG-cross-001 — *Crossover footwork (NZ)*

**Archetype:** Skating Crossovers · 3 questions
**Read:** skater mid-crossover, outside leg crossing OVER inside leg, body leaning into the turn.
**Rink:** `rink-fullrink.png`

### Sprite recipe
| # | Sprite | Position | Pose | Notes |
|---|---|---|---|---|
| 1 | yellow skater ⭐ | (0.50, 0.50) | 1 (right-leg crossover) | Skater mid-crossover at speed |

**No defender / no puck** — this is a pure technique image.
**Focus halo:** player #1.

---

# How to use this doc

1. **Start with the 4 IMG-2v1 briefs.** They unlock 144 questions.
2. For each image:
   - Open Scenario Author → Scene mode
   - Pick the rink in the brief
   - Drag sprites following the recipe
   - Mark focus, place puck
   - Click **+ New Question** → pick the type (mostly POV-MC) → fills meta from scene
   - The image binds to all questions with that imageId via the bulk-bind script (forthcoming)
3. After the 4 high-leverage images are done, do the 10 fundamentals (one image, 3 questions each).
4. Total: 14 images → 174 questions go from placeholder to real.

## What I'll build next (when you say go)

A **bulk-bind script** that walks the bank, finds questions by `imageId`, and rewrites their `media.url` from `/pov-placeholder.svg` to `/assets/images/<filename>.png`. Run once per imageId after you save the rendered PNG. ~30 sec per imageId.

Also a **scene-recipe loader** for Scene Composer — paste the table from this doc and it auto-populates the sprites at the right positions. Saves you manual dragging. Worth building once you've manually composed the first 1-2 scenes and confirmed the recipes are accurate.
