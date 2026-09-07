# 🎙️ RinkReads — Coach Persona Image Prompts

> Sub-page of the RinkReads hub. Archived 2026-05-02.
> Original URL: https://www.notion.so/350c5405e7f681b6b3a4e56b749a6b69

Generation prompts for the four coach avatars used in RinkReads quiz feedback. The coach is the **single feedback voice** after each answer — these portraits are the face attached to that voice.

## How to use

1. Generate all four in **one model session** (DALL-E 3 / GPT-4o image / Midjourney v6+) so the painterly style stays identical.
2. **Aspect ratio: 1:1 square**. The avatar component renders as a circle, so leave ~10% safe margin.
3. After generating, save each as `public/assets/coaches/<id>.png`.
4. The personas are coded in `src/App.jsx` under `COACH_PERSONAS` — voice / tilt / archetype is fixed there.

## Shared style block

```
ILLUSTRATED STYLIZED PORTRAIT, semi-realistic with painterly edges,
matching the RinkReads scene library aesthetic. NOT photorealistic.
NOT anime. NOT watercolor.

FRAMING: 1:1 square, head-and-shoulders bust, eye-level camera,
subject centered, ~70% face/upper-body fill. Background softly
out-of-focus rink interior — bench boards, faint glass, muted arena
lighting — never the hero, always atmosphere.

LIGHTING: soft overhead arena fluorescents with a hint of warm
side-fill. No harsh studio shadows. Cinematic but readable at
40px avatar size.

LINE/COLOR: clean confident outlines, restrained color palette
keyed to the coach's personality. Faces show character — wrinkles,
stubble, asymmetry — never airbrushed.

NEGATIVES: photorealistic, anime, chibi, watercolor, oil painting,
exaggerated cartoon, beauty-filter smooth skin, NHL team logos,
real-player likeness.
```

## 1. Coach Kincaid — Head Coach (technical / sarcastic)

**Voice:** *"Technically correct — the best kind of correct." / "I'm not going to say I'm proud. But I might nod at you in the hallway."*
**Tilts:** Decision-Making, Game Awareness. **Archetype:** technical.

```
SUBJECT: Coach Kincaid, mid-50s head coach, salt-and-pepper hair clipped close, sharp gray eyes, weathered face with one slightly arched eyebrow — a permanent expression of skeptical scrutiny. Faint creases around the mouth from years of NOT smiling. Clean-shaven, square jaw.

WARDROBE: pressed charcoal quarter-zip pullover with no visible logo, collar of a black athletic tee underneath, silver coach's whistle on a black lanyard, clipboard tucked under one arm.
HELMET: charcoal-gray hockey helmet with a half-shield visor, strap loose at the chin, slightly weathered. The helmet sits level and frames the face — readable as a coach who's been on the ice all morning, not a parent in the stands.

POSE: three-quarter angle, arms loosely crossed, head tilted down maybe 5°, looking up at camera with that "go on, impress me" stare. Closed mouth, neutral lips. Reads as: dry, observant, allergic to praise but quietly fond.

PALETTE: charcoal grays, gunmetal, off-white. Cold backlight from rink, warm key on face. The Bill Belichick of youth hockey.
```

## 2. Coach Danno — Skills Coach (chill / encouraging)

**Voice:** *"Nice read, bud. Smooth." / "Reset the feet, reset the mind, reset the scoreboard."*
**Tilts:** Scoring, Compete. **Archetype:** chill.

```
SUBJECT: Coach Danno, late 30s skills coach, easygoing weathered face, light scruff/beard, longer messy hair tucked behind one ear. Crinkles at the corners of warm hazel eyes — eyes of someone who's mid-laugh half the time. Slight asymmetric half-smile, relaxed jaw.

WARDROBE: faded heather-gray team hoodie with the sleeves pushed up to mid-forearm, tan undershirt visible at the neck. Hockey stick leaning against his shoulder, blade visible just behind him.
HELMET: warm-toned (cream or khaki) hockey helmet with a clear full cage, strap unbuckled and hanging loose — the easy-going skills coach who's been running drills with the kids. Helmet pushed up just enough that hair shows at the temples.

POSE: leaning forward on the rink boards, one elbow up, body relaxed at a 30° angle to camera, weight on the lean. Eyes soft, mouth in an easy half-grin. Reads as: been there, done that, nothing to prove, here for the kids.

PALETTE: warm whites, tan, soft amber, faded oatmeal. Golden-hour side light from a rink window. The favorite-uncle energy.
```

## 3. Coach Marques — Mental Performance Coach (motivator / HYPE)

**Voice:** *"YESSIR! That's what I'm TALKING about!" / "Pressure's a privilege. Feel it, then use it."*
**Tilts:** Coachability. **Archetype:** motivator.

```
SUBJECT: Coach Marques, early 40s mental-performance coach, broad-shouldered, beaming open-mouth smile mid-celebration, eyes lit up wide, expressive raised eyebrows. Clean-shaven or neat short beard. Strong jaw, athletic neck. Full of motion even in stillness.

WARDROBE: bright cardinal-red zip-up training jacket (vivid, high-saturation), white technical tee underneath, stopwatch on a navy lanyard. Pen-clicker or rolled-up coaching notes in one hand mid-gesture.
HELMET: matching cardinal-red hockey helmet with a half-shield, gloss finish catching the warm overhead light. Helmet sits level, strap snug — energetic and ready, the hype coach who jumps on the ice with his players.

POSE: forward-leaning toward camera, one fist raised slightly into frame in a hype gesture (not full fist-pump — the moment JUST before), other hand at his side. Mouth open mid-encouragement. Reads as: belief factory, hype man, championship-mentality coach who would absolutely cry at your highlight reel.

PALETTE: high-saturation cardinal red + bright white + a hint of gold at the edges (the goal-celebration warm spot light from above). The Ted-Lasso-meets-Magic-Johnson energy.
```

## 4. Coach Kowalski — Assistant Coach (deadpan / six-words-a-shift)

**Voice:** *"Acceptable." / "No notes. Terrifying for me, good for you."*
**Tilts:** Defense. **Archetype:** deadpan.

```
SUBJECT: Coach Kowalski, mid-60s old-school assistant coach, silver-gray mustache or short beard, deeply lined face, half-hooded eyes that have seen everything, mouth in a perfectly neutral straight line. Not frowning. Not smiling. Just observing. A small permanent crease between the brows.

WARDROBE: faded heritage team windbreaker (vintage navy, the old logo) over a wool sweater collar, well-worn coach's whistle on a braided lanyard. Hockey gloves tucked under one elbow.
HELMET: scuffed vintage navy hockey helmet with deep paint chips along the edges, full metal cage (the old style), strap tight to the chin. Looks like he's been wearing this same helmet since the '80s. The helmet does the talking — old-school, weathered, has-seen-it-all.

POSE: dead-on to camera, arms crossed at chest, slight backwards lean, weight evenly distributed. No tilt of the head, no expression in the mouth — eyes cut directly through the lens. Reads as: 40 years on the bench, six words a shift, all of them right, has literally seen it all.

PALETTE: muted slate blue, worn navy, weathered silver, cold gray. Dim rink light, no warmth. Empty arena vibe. The Lou-Lamoriello-meets-Scotty-Bowman archetype.
```

## Diversity / casting note

Ethnicity is intentionally unspecified above — pick deliberately rather than letting the model default to white-male-coach for all four. Suggested casting:

- **Kincaid** — flexible; gruff-veteran archetype
- **Danno** — flexible; favorite-uncle archetype, often white or Indigenous in hockey culture
- **Marques** — Black coach (the name leans Caribbean/Black-American, the energy fits)
- **Kowalski** — older white Eastern-European-coded (Polish; Lou-Lamoriello-ish)

Append a one-line cast directive to each prompt at generation time, e.g. `CAST: Black coach, mid-40s.`

## After generation

1. Save each PNG to `public/assets/coaches/<coach-id>.png` (kincaid / danno / marques / kowalski).
2. Wire the avatar source into `AvatarDisc` so the coach disc on the feedback card uses the portrait instead of generated initials.
3. Commit + push so the GitHub raw URLs resolve.
