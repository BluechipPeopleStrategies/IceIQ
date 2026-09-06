# Reviewed packets 01–09 production deployment

Thomas explicitly requested deployment of all reviewed packets. Published packet-only release `4457ee6218185e4300aa8acb0a2893aa27054b50` to GitHub main from isolated branch `codex/packets-01-09-release`.

Production baseline was `f1f4306`, which already contained packet01 calibration. This release adds packets02–09: 37 scenarios and 187 changed question versions. All experimental bank and extension files, plus the current-content manifest, exactly match reviewed local commit `39854d4`. No approved-bank or mastery promotion.

Vercel reported success and “Deployment has completed” for that exact commit. [Deployment](https://vercel.com/bluechippeoplestrategies-projects/ice-iq/H9KCRnEZYSZ7ABVu92BUhmqbb371). [Live repaired question](https://ice-iq.vercel.app/?arena=experimental&age=U9&scenario=exp26b-u9-001&question=exp26b-u9-001-q2#practice-arena).

Before publication: 32 focused tests passed in the isolated release checkout, combined bank audit reported 200 scenarios / 1,600 authored questions / zero open AI question flags, and production build passed with existing bundle warnings. Vercel supplies its existing production environment; no local development environment was published.

Live verification: fresh isolated browser context at 390x844, actual 3D corner scene and repaired question/feedback visible. Selected both correct cues, submitted, observed “You read the scene”, then reloaded and confirmed saved feedback and both selections. No horizontal overflow. This is a representative interaction check, not all camera/device combinations or human coach approval.

The standalone docs/factory/claude-question-kit/catalog.json URL returns404 because the existing asset allowlist does not publish it. The question bank is bundled in the working in-app experimental catalog; no standalone-catalog deployment is claimed.

Separate local player-home, training, coach and unfinished rendering work was excluded. Root main retains those local commits and working changes. It now diverges from origin/main because production uses the isolated packet-only release; reconcile deliberately before a future push, never force-push over the release.
