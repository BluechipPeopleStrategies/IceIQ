# Navy and gold character references

The selected pack now follows BlueChip's navy `#0B1A33`, gold `#C9A24B` and bone `#F5EFE6` direction. It contains four actual transparent four-view sheets: a skater and goalie in each uniform. Faces remain visible behind complete protective cages. Open [Character Studio](index.html) to switch between Navy, Gold and the historical Before artwork.

| Current reference | Native size | Fully transparent pixels | SHA-256 |
|---|---|---:|---|
| [Navy skater](references/skater-navy-transparent-v1.png) | 1254 × 1254 RGBA | 82.0955% | `7931c2a2d207df55dbad24ef28ba671fcb7e754474dbfd4e4804ec570d55976b` |
| [Gold skater](references/skater-gold-transparent-v1.png) | 1254 × 1254 RGBA | 82.0435% | `b02ab7e70af98a5b7a2238da1bc426c89916db61224b22c86d324b632267a2e5` |
| [Navy goalie](references/goalie-navy-transparent-v1.png) | 1254 × 1254 RGBA | 68.2569% | `047200cd0e1807e87296888562f7278a1f0faa4ab1cecd6eea9a757def1327bc` |
| [Gold goalie](references/goalie-gold-transparent-v1.png) | 1254 × 1254 RGBA | 68.3143% | `e1df53c3bde6282d9d71750672efcce39815c127d4e258a2ad902ca9b4daaecc` |

## What was done

Four built-in GPT image edits used the previously inspected character sheets. Exact submitted prompts are saved as files 05–08 and repeated with hashes and provider output paths in [the generation record](navy-gold-generation-record.json). Original RGB outputs remain beside their alpha derivatives. The earlier skin-edit wording in file 04 was recovered from the root task's retained history and is attributed accordingly.

All four generated outputs again contained RGB painted checkerboards. Explicitly authorized local IS-Net segmentation produced actual RGBA files. It changed only alpha; every RGB pixel in each final derivative matches that new generated source exactly. The skaters were split at the empty row gutter y=575 so lower helmets remain intact. The goalies use y=627. Source-specific, visually inspected catcher-web polygons refine small bright apertures without removing the large bone-colored pads or blocker.

The [machine verification](evidence/navy-gold-alpha-verification-v1.json) records alpha bounds, transparent fractions, exact RGB preservation, hashes and sampled face/helmet/stick/pad alpha. Sampled skater helmets, face regions and sticks are fully opaque. Sampled goalie helmets/faces/blockers and pads retain alpha of 251–255. These point checks supplement visual review; they do not certify every pixel.

## Visual review

The actual final files were composited on both black and white and inspected:

- [Navy skater proof](evidence/skater-navy-reference-v1-alpha-proof-v1.png)
- [Gold skater proof](evidence/skater-gold-reference-v1-alpha-proof-v1.png)
- [Navy goalie proof](evidence/goalie-navy-reference-v1-alpha-proof-v1.png)
- [Gold goalie proof](evidence/goalie-gold-reference-v1-alpha-proof-v1.png)

All four views retain complete helmets, skates, sticks and major equipment. The skin remains visible through the cages. Navy and gold jerseys are distinguishable by their large light/dark fields as well as trim. Rendered lighting means the image's shaded cloth pixels vary; the hex values are the requested material direction, not a claim that every lit pixel equals an exact brand swatch.

The skater remains **left-shot**, despite the first historical brief asking for a right-shot player. This was deliberately preserved and recorded, not mirrored or mislabeled. The goalie remains standard anatomical-left catching. These identities are explicit in the manifest and review page.

Fine light fringes around some cage/web apertures remain under magnification. Views are illustrated approximations, not camera-calibrated exports. Gear and fabric can vary subtly between generated angles. These are **concept references**, not production sprite mattes, completed animation frames or rigged 3D assets. The 40 animation clips remain specified work; arbitrary rink cameras still require the authored 3D master.

## Review-page delivery

The local HTML review uses navy/gold/bone glass styling, local Playfair Display headings and Inter body text. Font files were copied from the repository's existing `public/fonts/` alongside their SIL Open Font License notices. It has no external CDN dependency. Controls select skater/goalie, navy/gold/before and dark/light/checker backgrounds; download and full-size links point to the exact selected PNG.

Earlier black/yellow files stay historical provenance and are available only through Before or the source inventory. The rejected white-jersey misunderstanding is not featured. No asset purchase occurred, and no new artwork was integrated into gameplay by this packet.
