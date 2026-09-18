# Gear games, images and parent fitting guide — September 18, 2026

## Implemented
- Literal generated illustrations for 13 gear types, three playful off-ice choices and an open hockey bag. Tap or drag to pack; toys never grant completion.
- Optional three-clue Find the gear game with hints, unlimited retries, replay and free-packing exit. Already-packed correct answers advance without unpacking. No timer or mastery claim.
- Helmet front, angled, side and inside views, numbered parts, pan/zoom and keyboard controls. These are illustrated views, not continuous 3D geometry.
- Parent guide reachable in the activity and from home: illustrated child helmet examples, official fitting demonstrations, manufacturer measuring links, and a Bauer shoulder-pad chest chart in inches/converted centimetres.
- Eight optional accessories with a separate, temporary checklist: cloth tape, clear sock tape, stretch grip tape, approved anti-fog, cloth, bottle, hard guards and soft soakers.
- Generated holding-referee image replaces that sample's crude 2D fallback. Other referee signal artwork is unchanged.
- Frontend skill and product principles now retain the owner's image-first preference.

## Sources checked September 18
Hockey Canada's equipment-fitting collection supplies the linked demonstrations and fit checks:
https://hockeycanada.ca/en-ca/hockey-programs/players/essentials/equipment-fitting
Helmet: https://video.hockeycanada.ca/en-ca/videos?title=equipment-fitting-player-the-hockey-helmet
Shoulder pads: https://www.hockeycanada.ca/en-ca/videos?title=equipment-fitting-player-shoulder-pads
The guide also links that collection's elbow-pads, hockey-gloves, hockey-pants, shin-pads, skates, neck-guard, pelvic-area-protection, hockey-jersey and hockey-stick demonstrations.

Bauer's live, expanded shoulder chart was inspected in the browser: Youth S 20–22, M 22–23, L 23–25; Junior S 24–26, M 26–28; Intermediate M 28–32 inches chest. These are examples, not universal size recommendations. Centimetres are arithmetic conversions.
https://www.bauer.com/pages/size-guide-shoulder-pads
Bauer elbow, glove, shin and helmet measurement pages are linked per item. Compare the exact model and all relevant measurements; no age-to-size calculator is offered.

ADA mouthguard guidance: https://www.mouthhealthy.org/all-topics-a-z/mouthguards
Bauer manuals: https://www.bauer.com/pages/product-manuals
Concept 3 booklet, maintenance section: https://cdn.shopify.com/s/files/1/0658/4749/2861/files/FS_Concept-3_Booklet_QR_S26r2.pdf?v=1766096802
This shield's chemical/anti-fog restriction is model-specific, not a generic approval for sprays.
Accessory references: https://howieshockeytape.com/products/black-stretchy-hockey-grip-tape and https://bladetechhockey.com/blogs/news/soakers-vs-hard-guards

## Artwork provenance and prompt briefs
Generated with the built-in ChatGPT Image tool. It exposes no model-version selector; Image 2.5 could not be verified. No product endorsement or certification is implied. Original outputs remain in the Codex generated_images session folder; versioned copies are in public/assets/gear.
- gear-atlas-v1.png: 4×4 isolated, recognizable navy/gold hockey gear, 13 items followed by yo-yo, duck and teddy. Consistent scale, clean white background, no labels/logos.
- hockey-bag-v1.png: literal open navy hockey duffel with gold trim, clearly visible opening, studio illustration.
- helmet-views-v1.png: consistent detailed navy youth hockey helmet/full wire cage, equal front/angled/side panels, realistic material and straps, white background.
- helmet-inside-v1.png: underside/interior of the same style helmet, visible cushioning, rear adjustment and strap, no wearer.
- helmet-fit-kids-v1.png: fictional child wearing navy helmet and full cage, front/side views, level brow position and chin-cup contact. Illustration only; does not certify fit.
- accessories-v1.png: 4×2 isolated accessory sheet: black cloth tape, clear tape, yellow stretch tape, spray, cloth, bottle, hard guards, soft soakers.
- referee-holding-v1.png: original adult referee demonstrating holding by grasping a wrist in front of the chest; no branding.
These are production prompt briefs, not a claim to reproduce exact tool-request strings.

## Verification
Browser checks on local production preview: toy choices do not pack; correct gear packs; reload retains gear; wrong clue retries; already-packed correct clue advances; all three clues complete; optional extras do not affect 3/13 packed count; Continue remains blocked until required gear while Skip remains available. Parent units and disclosure links work; inside view, zoom/reset and controls render correctly. No horizontal document overflow at 320/390/768/1280 widths, with helmet, parent guide and accessories expanded. Screenshots inspected. Physical touch devices and an assistive-technology user remain untested; native drag/drop was not repeated in this final pass.
Preview and full-account builds pass; existing large-chunk warnings remain. Full test-script sweep status will be appended after completion.

## Bounded review and limitations
Qwen qwen3.8-huihui:27b was verified installed and given only packing source for a bounded critique at loopback Ollama. It timed out after 90 seconds; no usable result. Evidence: work/gear-qwen-error.txt.
Existing Claude access then performed one read-only, no-tools packing review; no Codex worker was substituted. Removed toggle semantics from toys and restored focus after removing packed chips. Review did not cover later parent/game additions and is not equipment/content clearance. Files: work/gear-claude-brief.txt and work/gear-claude-result.json. Usage: fresh input 2; cache creation 7,584; cache read 0; output 4,649 including 3,638 reasoning; one call. Savings unmeasured.
Qualified equipment and referee-content review remains outstanding. Preview completion does not prove fit, mastery or account authorization.

## Next playful candidates (not implemented)
1. Rink scavenger hunt: find a named landmark, with hints and replay.
2. Referee match-up: pair a gesture with its call, using reviewed artwork.
3. What's missing?: remember a small gear set, then identify the missing item.
Keep these optional, untimed and skippable. Avoid scoring fit or encouraging children to judge protective equipment safety from a picture.

Final local checks: all 69 registered test scripts passed; preview and full-account builds passed. Keyboard unpack returned focus to the matching gear card. New-clue status announces the next prompt. Release awaiting live verification.
