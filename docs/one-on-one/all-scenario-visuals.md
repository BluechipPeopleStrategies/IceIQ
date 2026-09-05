# All-scenario visual quality pass

**September 5, 2026 — local implementation and asset verification; release pending.**

The visual refresh extends beyond Connected Reads to the existing scenario
renderers, animated plays, Brain Gym and source illustrations. It changes
presentation while preserving the authored situations, answer keys, scoring,
timing, input ownership and saved-data contracts. This is not new source-content
admission or a tactical/age-validity review.

## Renderer scope and the 3D boundary

| Surface | Rendering and scope |
| --- | --- |
| Shared player artwork | `src/visuals/HockeyPlayerArt.jsx` supplies decorative SVG jerseys, helmets, skates and goalie pads. Callers retain position, facing, labels, selection rings and hit targets. Unknown facing stays neutral. Legacy `RinkReadsRink.jsx`, unified `src/scenario/RinkStage.jsx` and relevant previews reuse it. |
| Animated plays | `src/play/AnimatedPlay.jsx` uses the shared art for figure/token age profiles, plus shaded ice, board trim, net mesh and a puck highlight. The 200 × 85 coordinate system, view crops, actor/puck transforms, motion timing, YOU/identity logic and answer interactions remain unchanged. U15/U18 X/O symbols remain symbols. |
| Gym player surfaces | `src/visuals/hockeyArtCanvas.js` draws neutral figures inside the caller's existing circular footprint. Find the Lane, Late Read, Best Option's 2D fallback, Snapshot, Read the Numbers, Run the Play and Tracking use it. Six tactical/memory introductory SVG diagrams also use the shared player art. |
| Gym ice and pucks | The existing `gymEngine.js` rink paint receives a consistent ice/board palette. All ten drills using that backdrop retain their rink geometry/orientation. Anticipation, Eyes Up and Two Things receive puck detail at the existing centres/radii; Snapshot and tactical carrier pucks retain their original positions. |
| Genuine 3D | Connected Reads, Coach Lab/practice scenes, Shootout and Best Option already have Three.js/WebGL scene paths. Their existence must not be described as a conversion of the SVG/canvas surfaces into 3D. This asset/AnimatedPlay/Gym drawing pass adds no WebGL renderer or new physics. |

SVG gradients, shadows and equipment detail provide depth cues; they are still
two-dimensional artwork. The Gym canvas painter is also 2D. Existing tactical
boards and context-loss fallbacks remain useful alternatives to genuine 3D.

Gym semantic cues stay local to each drill: gold YOU/open/memory markers, Xs,
double rings, numbers, feedback colours and selection marks retain their roles.
Tracking figures remain identical and unnumbered during movement; its keyboard
IDs appear only in the existing pick phase. Eyes Up's peripheral flash, Two
Things' shape signal, Tracking's soccer-ball/mascot cues and Reaction's
colour/word signal were not replaced with player art. Flash/hide durations,
movement speed, target radii and scoring were not changed.

## Source illustrations: 41 images, 133 bank questions

The live bank references **41 unique refreshed source images serving 133
questions**: **37 generated PNGs serving 129 questions**, plus **four authored
SVGs serving four questions**. The 129 figure is a question-binding count, not an
image count. These counts were checked against `src/data/bank.json`.

| Asset set | Verified coverage |
| --- | --- |
| `public/assets/scenes-u11/*.png` | All 37 outputs of `tools/scene-forge.mjs`; 181 actors, 35 contextual motion arrows, three pass-flight lines and 37 pucks. |
| `public/assets/images/img_u13_odd-man-reads_01.svg` through `_04.svg` | Four 1200 × 800 illustrations. White defenders/goalies remain white; gold teammates remain gold. White skater jerseys have a distinct twin-stripe pattern. |

The historical `img_u13_odd-man-reads_01b.svg` variant is unchanged and excluded
from this 41-image count. The count does not include unrelated background media.

The generator now supports:

```sh
node tools/scene-forge.mjs --assets-only
```

This refreshes the PNGs without rewriting the timestamped manifest. The normal
generator invocation retains its existing manifest-writing behaviour.

The generated scenes keep the exact `SCENES` definition bytes and `VIEWS`:

| View | Rink crop | Output pixels |
| --- | --- | --- |
| full | `-12 -12 624 324` | 1248 × 648 |
| oz | `250 -12 362 324` | 1086 × 972 |
| dz | `-12 -12 362 324` | 1086 × 972 |

Actor centres, original circle/rounded-square team shells, radii, authored
facing/stick endpoints, tag text/centres, orange YOU rings, puck centres/radii,
motion/flight endpoints and normalized overlay coordinates remain unchanged.
Tag typography was adjusted to leave equipment visible. Decorative figures stay
inside the existing actor footprints. The rink/net geometry stays fixed; paint,
equipment detail, subtle ice texture and contained net mesh supply the polish.
No lane/open-target answer overlay was added to the source rendering.

For the four SVGs, every original authored actor shell, stick, puck, rink line,
crease, net path and group transform is retained. Their title/description text
is unchanged; the title/description IDs now satisfy the existing accessible
name references. Added glyphs and paint do not alter the situation or answer.

## Verification evidence

All 37 PNGs changed, decoded successfully and retained their original output
dimensions. A second `--assets-only` build produced byte-identical PNGs and left
the manifest unchanged. All 37 outputs and the four SVGs were raster-inspected;
these are local asset checks, not physical-device or browser-interaction tests.

| Unchanged input | SHA-256 before and after |
| --- | --- |
| Generator `SCENES` source block | `04f3a42dafada7ee2d3bc5bfeffc7472eac711dee1e2bb03034a2a18cb2d96ca` |
| `src/data/bank.json` | `db6fb39a5fc51b89e01a62896de36df7dc8853444cb54c686ada3f67bed50d21` |
| `src/data/scene-manifest.json` | `84de1a755459ee38de8b4a2ad01e3e62b8073cfaa988731a45e166e7a9b433f6` |

The bank hash covers the unchanged source questions and answer keys; the
manifest hash covers the unchanged image bindings and normalized overlays.
Total PNG bytes increased from **2,534,636 to 4,186,402** across the 37-image
library, about 1.58 MiB additional storage.

Checks completed for this lane:

- Exact source-definition/VIEWS equality, retained authored SVG geometry and
  title/description checks, output count/dimension checks and deterministic
  regeneration.
- Generator syntax and diff checks; **15 art-lint tests** and **18 bank-content
  checks** pass. Those suites supplement the asset checks; they do not validate
  the tactical meaning of new artwork.
- Animated/Gym scope: **42 scoped runner tests** pass, plus their embedded
  assertions. Eleven changed component entrypoints bundle through esbuild.
  A canvas smoke check confirms unchanged centres/radii, no invented neutral
  facing, bounded figures, balanced context save/restore and inert invalid input.

Durable evidence files added with this note:

- [all-scenario-assets-audit.json](evidence/all-scenario-assets-audit.json) — an
  exact copy of the asset audit report; its `bindings: 129` field covers the
  generated PNG portion, with the additional four SVG bank questions above.
- [all-scenario-source-contact.png](evidence/all-scenario-source-contact.png) —
  a representative contact sheet of the actual refreshed `rush-2v1.png` and
  `img_u13_odd-man-reads_03.svg`, resized proportionally for review. This is not
  a screenshot of every image or evidence of a browser flow.

## Integrated local verification

`npm run test:practice`: **265 tests passed** after the final artwork/cue changes.
The production build passed. Separate checks passed for player identity (eight
rendered assertions), age views (41), placement reveal (30), goalie anchoring
(14), colorblind coverage (31), and question kinds (52). Existing chunk-size and
static/dynamic seed-import build warnings remain.

- At 390 px, all 28 published scenario openings rendered through the actual
  playground. The ice SVG and actor SVG had equal bounding rectangles and
  viewBoxes in every case; no document overflow occurred. This checks openings,
  not every continuation in the 32-frame expansion.
- The older image-native hotspot, label, drag and match formats have no current
  bank rows. A temporary local fixture mounted their actual renderer: correct
  and incorrect hotspot clicks returned true/false, label choice returned true,
  a native touch assigned a match and Submit returned true, and pointer-drag to
  the authored (0.6, 0.4) target followed by Submit returned true. The fixture was
  removed afterward. No test content was added to the app or bank.
- Fixed two existing coordinate defects: image-native spots were being scaled
  into SVG units a second time, and the unified actor layer included the height
  of the legend. Their authored data now reaches the correct existing coordinate
  consumer; the new tests check object/answer identity as well as rendering.
- Three older source questions omit media.type; the library now renders their existing image URLs as the main quiz already did. A real-component regression renders all 133 image questions without mutating their data. All 41 image URLs decoded in the production-preview browser.
- Source-picture inspection opens a native dialog and scales the entire
  composite. At 300%, image width 333→999 px, label width
  138.71875→416.15625 px and height 32→96 px all scaled together. Both axes could
  scroll (666 px horizontally, 78 px vertically); Fit restored the original
  composition, Escape closed it and focus returned to Enlarge picture. The 3:2
  and contained 16:9 fixtures retained their distinct fits. A scrollbar-width
  oscillation found in QA was fixed with a stable gutter.
- A tactical board inspected during normal Pass animation kept identical SVG
  markup over a 450 ms observation while the underlying play continued. Its
  copy had no focusable actor controls or canvas. At 300%, both axes scrolled;
  Escape returned focus. After closing inspection in read three, ArrowRight
  moved F2 from (17.1, -3.5) to (17.6, -3.5), preserving heading.
- Coach Question inspection remained read-only; closing it restored keyboard
  movement. A reason and comparison opened separate learner/reference boards.
  The coach-reference enlargement and 1280 px side-by-side layout worked.
- In the production preview, U11 guided MC → TF completed for 200 points.
  Full reload restored the exact two-answer JSON. Enlarging the curriculum
  board did not answer the question. A source 2-on-1 image loaded at 1086×972;
  its four original choices stayed unchanged after image inspection.
- All twelve Gym introduction/back flows opened at 1280 px without overflow;
  six showed the new figure diagrams. Find the Lane rendered its live canvas
  at phone width and reached the original timeout/reveal state. A color-cue
  review restored gray Snapshot defenders so its gold target remains unique.
  The other task colors, reveal gates and timers remain unchanged.
- The older animated 2-on-1 rendered four new figures, kept one visible YOU
  caption and completed Pass with its original Coach Danno explanation.
  Trainer labels were lifted above equipment and the defender X made a compact
  chest badge; U15/U18 symbols and actor anchors remain unchanged.

The checked production-preview flows reported no page exceptions, failed
requests or horizontal overflow. Evidence includes `all-scenario-unified-phone`,
`all-scenario-board-zoom-phone`, `all-scenario-source-zoom-phone`,
`all-scenario-source-desktop`, `all-scenario-animated-desktop`,
`all-scenario-coach-comparison-desktop` and `all-scenario-gym-lane-phone` PNGs in
the evidence folder. These are browser checks, not physical iPad/phone,
comprehension, performance-benchmark or tactical-validity acceptance.

The review landing also uses a single-column statistics layout at 320 px; its earlier two-column minimum widths overflowed. The 390 px layout retains two columns.

## Release

Local checks complete; commit, deployment and fresh public-origin verification
are pending. This line must be replaced before claiming the upgrade is live.

The earlier Connected Reads 3D release is recorded separately in
`phone-preview.md` and `verification.md`; it does not prove this broader pass is
live. No physical phone/iPad, sustained GPU, screen-reader-user, child
comprehension, live AI or tactical/age-validation claim is made here. The
original quiz's existing mixed-age policy remains outside this visual pass.
