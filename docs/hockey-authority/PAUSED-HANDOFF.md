# Hockey Authority and shared 3D players — paused

**Owner direction:** Thomas paused this work September 6, 2026. Do not resume
calibration, model production, animation, scenario migration or deployment until
he explicitly resumes it. This pause concerns this workstream, not other
RinkReads work. All task agents and Claude/Blender jobs from this work have ended.

## Resume here

Read this file, [review evidence](reviews/INDEX.md),
[qualification.json](qualification.json) and the
[rim requirements](rim-demonstration-requirements-draft.md). Refresh the current
worktree before editing; other work continues in this shared checkout.

Latest substantive commit: `1c4ab1f` (failed calibration, remediation, contact
evidence and rejected master). Role creation: `0a8dc7b`. Prior shared renderer
and first-person equipment work: `9985d59` and `4dc276c`. No deployment of this
workstream was performed. Unrelated and mixed existing WIP was preserved.

## What is actually complete

- Hockey Authority role and command created and invoked in an actual Claude
  Code subscription session. No paid model API was used for hockey judgment.
- Initial blind-to-key historical calibration: four defects caught, four
  incorrect passes out of eight known-defect cases. Original response preserved.
- Revised procedure: ten synthetic transfer verdicts matched. These are not
  human-reviewed held-out qualification. The authority remains **unqualified**
  and cannot recommend real-work approval. No app promotion gate integration
  is implied by the qualification file.
- Rim-pickup requirements drafted and diagnostically reviewed: approach,
  preparation, actual contact, controlled possession and exit; viewpoint-bound
  information and optional question starting angle.
- Root reproduced blade/puck separation: blade bottom 30mm, puck top 25.4mm,
  gap 4.6mm in six pose/view cases. Carry-marker proximity does not prove contact.
- Moshey supplied a Blender refinement script. Root corrected execution issues,
  rendered front/three-quarter candidates and independently reopened native/GLB
  files. Nine skinned meshes and 13 bones preserved. **Art acceptance held**:
  material/shading changes did not solve body, face, topology or equipment shape.

## Still outstanding, in order after explicit resumption

1. Prepare genuinely human-reviewed held-out hockey calibration. Do not erase
   the initial failures or qualify the agent from exposed/synthetic cases alone.
2. Rework character topology/body/face/equipment and the stick/hand/contact
   contract. No full pickup can pass with the current floating blade and static
   carry marker. Keep existing references and candidates unchanged.
3. Build one versioned complete diagnostic rim trace and animation, preserving
   authored source position, velocity, possession events and time. The current
   lab rim puck is fixed far from the skater; it is only a preparation study.
4. Inspect actual external and first-person sequences on phone/desktop, with
   own stick/gloves, optional saved entry angle and deliberately hidden-cue case.
5. Hockey domain review, Moshey craft review, Reel clarity review, engineering
   checks and Thomas's visual-standard review precede age-family expansion.

No scored tactical answer, complete skating/pickup clip, final character master,
all-scenario acceptance or final Reel sequence review has been delivered.

## Preserve the selected direction

Solid gold jerseys/gold helmets versus navy jerseys/navy helmets. Young players
use friendly rounded anime-like proportions, progressing toward older athletic
features. Optional X/O presentation is external; first-person retains physical
players. G means goalie, and skaters use actual numbers. No 3D player halos.
Stick/gloves stay tied to real world geometry. Camera changes must not change
scenario state. A question may optionally open at its saved angle.

"Transparent puck" remains unresolved between transparent locator background
and translucent physical material. Current implementation removes the backing
and keeps the physical black puck visible; do not silently treat that as a
confirmed material choice. Exact age boundaries/art acceptance remain open.

## Durable local backups

Archive folder: `C:/Users/mtsli/IceIQ/local-archives/hockey-3d-20260906/`.

- `paused-work.zip`: 470 files covering both original temporary artifact trees,
  current visual/player consumers, reports, rigs and design references.
- `manifest.json`: per-file SHA-256 plus archive SHA-256 and CRC verification.
- `integration-source.zip` and `integration-manifest.json`: remaining play,
  scenario and Blender integration sources plus App and lab entry snapshots.

Both ZIP archives passed CRC checks. Archives are local-only and ignored by
Git; they are separate from temporary folders. They include mixed existing WIP:
**compare before restoring; never bulk overwrite the current worktree.**

Current candidate remains at
`tmp/hockey-authority-20260906/moshey-master-v1/` (`master.blend`, `master.glb`,
two PNGs and modifications ledger). Original age/team families and browser
evidence remain under `tmp/shared-3d-20260906/`. All are also backed up above.
The old lab URL was `http://127.0.0.1:5198/player-lab.html`; availability was not
rechecked for this pause and must not be assumed when resuming.
