# Initial generation 09 — goalie reference sheet, right-catching, solid navy

Status: generation brief, not an accepted runtime sprite sheet. Use this
complete text with ChatGPT image generation. A rendered-looking image is not
a rigged 3D model.

Supersedes `02-goalie-reference.prompt.md` (left-catching, black/yellow) and
the handedness clause of `07-goalie-navy-edit.prompt.md`. Those two remain
accurate provenance for the assets already generated from them; do not edit
them retroactively.

**What changed and why:**

- **Handedness inverted to right-catching (full right)** per the owner
  decision of 2026-09-12 recorded in `STANDARD.md`. This matches the
  character already rigged in the Shootout, so `gloveHi/gloveLo` and
  `blkrHi/blkrLo` keep their existing target positions.
- **Uniform is now a SOLID navy jersey with a matching navy helmet**, per the
  September 6 owner update. The gold shoulder bands, cuff/waist panels and
  bone separator stripes described in `07` are explicitly retired and must
  not be reintroduced.
- **Note the profile view flip:** with a right-catching goalie, the
  anatomical-right profile now shows the CATCHER side, not the blocker side.
  The layout caption below reflects this. Generating from `02`'s captions
  unchanged would produce an internally inconsistent sheet.

For the away variant, regenerate with solid gold `#C9A24B` jersey and
matching gold helmet, changing nothing else.

```text
Create one exceptionally polished goalie character-art reference sheet for RinkReads, an original youth hockey teaching game. Show THE SAME fully equipped ice hockey goalie in four separate views on genuine transparent alpha. Match premium contemporary sports-game character art: convincing three-dimensional form, realistic protective equipment, natural anatomy, fine material detail and restrained lighting. This is original unbranded art, not a photograph, toy, cartoon, egg-shaped figure, robot or licensed sports character.

CHARACTER LOCK: a youth-medium adolescent goalie with natural athletic proportions beneath correctly bulky goalie equipment. A deep navy goalie mask with a proper complete silver cage, throat protection, and a natural lighter-complexion youthful human face clearly visible behind the intact cage with realistic skin and a calm expression, never a black void or opaque mask. Solid deep navy #0B1A33 technical-knit goalie jersey with no bands, panels, stripes or contrasting shoulders. Solid deep navy padded goalie pants and a matching deep navy helmet shell. Large warm bone #F5EFE6 segmented leg pads with deep navy outer rails and restrained muted gold #C9A24B accents; visible stitching, knee blocks and believable straps. Bone/navy catching glove with a visibly shaped pocket and webbing, navy/bone rectangular blocker with muted gold edge detail, black goalie skates with thin steel blades. One black and bone goalie stick with a broad paddle. No brand marks, no NHL/team logos, no letters, no numbers, no watermark. Identical equipment shapes, colors and markings in all four views.

HANDEDNESS IS CRITICAL: a RIGHT-CATCHING goalie, also called full right. Catching glove on the goalie's anatomical RIGHT hand, therefore on the VIEWER'S LEFT in the front view. Blocker and stick on the goalie's anatomical LEFT hand, therefore on the VIEWER'S RIGHT in the front view. The left hand grips the shaft at the top of the paddle; the blade rests naturally on the ice ahead of the pads. The right glove is open and held forward, palm/pocket toward the incoming shooter. Do not mirror this equipment between views. No second stick, no bare hand, no ordinary skater glove in place of the catcher or blocker.

STANCE: balanced goalie ready stance, knees bent behind the pads, slight forward hinge at the hips, chest lifted, feet apart, both skate blades on one invisible flat ice plane. Pads stand in front of the shins rather than replacing the legs. Elbows softly bent, gloves held forward and clear of the torso. Leave a small natural five-hole opening. This is a set stance, not a butterfly, save, skating stride or split. The entire mask, catcher, blocker, stick, pads and both skates must be visible as appropriate to each angle. No puck, net or targets.

LAYOUT: square canvas, preferably 4096 by 4096 pixels if supported, a clean invisible 2-by-2 grid, one complete isolated goalie per quadrant. Equal projected scale in the first three views. At least 10 percent clear transparent padding around each full silhouette; extra space for glove and stick. No overlap, no panel borders, no captions. Top-left: straight front from the shooter's view, level chest-height camera. Top-right: exact anatomical-right profile, which for this right-catching goalie shows the CATCHING GLOVE side. Bottom-left: straight rear view showing real back straps and skate heels, no duplicated front pad faces. Bottom-right: elevated front-right three-quarter view, camera 35 degrees above the ice and 45 degrees around from the front. Camera changes; the character, equipment and ready stance stay consistent.

ALPHA AND LIGHT: genuine transparent alpha, including negative space through the cage and between the body, gloves, pads and stick. Do NOT paint a checkerboard, white studio floor, ice, rink, net, shadow, reflection, glow, fog or backdrop. Soft neutral studio/arena lighting, gentle top/front key with subtle cool fill, readable navy cloth that does not crush to black, realistic rough leather/fabric and restrained specular highlights. Crisp anti-aliased edges with no sticker outline or pale fringe. The goalie should composite naturally over pale ice and a dark UI.

Final visual check: exactly one RIGHT catcher on the viewer's left in the front view, one LEFT blocker on the viewer's right, one left-held goalie stick, two articulated legs inside two pads, two skates, a complete mask cage with a visible face behind it, a solid navy jersey with no bands or panels, one consistent character, and actual transparency rather than a drawn checkerboard.
```

## On return, before this counts as anything

Per `QUALITY-AND-INTEGRATION.md`, a returned image is `reference-only` until
measured. Record native dimensions, RGBA mode, transparent-pixel ratio,
SHA-256, prompt ID (`09`), and generation date. Check all four views for
changed stripes, missing blades, duplicated front pad faces in the rear
view, a swapped catcher/blocker, or a mirrored stick. One attractive panel
does not pass the sheet. Retain rejected outputs as evidence with a reason.
