# Content Factory — Cost Model

Two cost buckets. Only images cost real money.

## Bucket 1 — The "brains" (≈ $0 extra)
Layout generation, coach-panel gates, and question-bank generation all run as agents
inside Claude Code on the **Claude Max** subscription. No metered charge within plan limits.
This is the part that *looks* expensive (many agents) but costs nothing extra.

## Bucket 2 — Images (the only out-of-pocket cost)
OpenAI API, pay-as-you-go. Small, because **one image carries ~10-12 questions**.

### Assumptions
- 1 generated image → ~11 questions (the POV "one photo, many questions" model).
- ~2.5 generations per *shipped* image (keep best-of-N + occasional regen on vision-check reject).
- 16:9 landscape, matching the sample.
- OpenAI approximate prices (landscape, subject to change):
  - `dall-e-3`: standard ~$0.08, HD ~$0.12
  - `gpt-image-1`: medium ~$0.06, high ~$0.25

### Total cost by library size

| Shipped images | ~Questions | Standard (~$0.28/img) | Premium (~$0.60/img) |
|---|---|---|---|
| 25  | ~275   | ~$7  | ~$15  |
| 50  | ~550   | ~$14 | ~$30  |
| 100 | ~1,100 | ~$28 | ~$60  |
| 200 | ~2,200 | ~$56 | ~$125 |

One-time. Images are owned forever; no recurring cost unless the library grows.

### The one cost variable
If the image model resists exact player positioning (the "committed defender" problem),
regens rise and cost creeps. That — not price — is the only reason to later move to
FLUX + ControlNet (pose conditioning from the validated layout). Irrelevant at these volumes.

## Recommended start
Load **$10** of OpenAI credit → ~30 standard images → ~330 questions (already a sellable
launch). Review, then scale. Likely launch for under $10.

## Access note
A **ChatGPT Team membership does NOT include API access.** En-masse generation requires a
separate **platform.openai.com** API key with its own pay-as-you-go billing. `gpt-image-1`
also requires org ID verification; `dall-e-3` does not.
