// scripts/promote-scenario.mjs
// The single idempotent promoter, per Phase 6 Task 6/8. This is the ONLY
// code in this project allowed to reason about writing engine-originated
// content into src/play/playCatalog.js / src/play/playFamilies.js /
// src/data/bank.json -- and even here, it never does so directly. It
// writes the factory's OWN promoted-artifact record (content-addressed,
// under docs/factory/promoted/) and generates a REVIEWABLE report
// describing what, if anything, would need to change in the live catalog
// -- applying that report is a deliberate, separate, human-confirmed step,
// never automatic.
//
// Exported as a module (promoteScenario, buildCatalogDiffReport) so
// Phase 6's own orchestration (scripts/run-phase6-state-machine-demo.mjs)
// can call it directly for the real breakout promotion.

import { join } from "node:path";
import { globalCurrentState, appendStateTransition, STATES } from "../src/scenario-engine/stateMachine.js";
import { buildPromotedArtifactRecord, writePromotedArtifact, regeneratePromotedIndex } from "../src/scenario-engine/promotedArtifact.js";
import { validateJudgmentRecord, JUDGMENT_VERDICT } from "../src/scenario-engine/judgmentRecord.js";
import { ALL_ANIMATED_PLAYS } from "../src/play/playCatalog.js";

export const PROMOTED_ROOT = join(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]):/, "$1:"), "docs", "factory", "promoted");

// Checks whether this content is already present in the LIVE catalog,
// using a caller-supplied known link (the tactical claim's own
// linkedKernelIds, or similar) rather than guessing by fuzzy matching --
// this project's tactical claims already name the exact live play id a
// ScenarioDefinition was adapted from (see Phase 4's seeded claim), so the
// caller always has this in hand when it's relevant.
export function buildCatalogDiffReport(definition, { linkedLiveCatalogPlayId = null } = {}) {
  if (!linkedLiveCatalogPlayId) {
    return {
      alreadyLive: false,
      linkedLiveCatalogPlayId: null,
      note: "no linked live catalog play id supplied -- this artifact has no known existing catalog entry; promoting it for real would need NEW playCatalog.js/playFamilies.js entries, which this script does not generate (the per-option copy, icons, and wrong-answer text a real catalog play needs are outside CompiledTeachingPlay's schema and require human authoring).",
    };
  }
  const existing = ALL_ANIMATED_PLAYS.find((p) => p.id === linkedLiveCatalogPlayId);
  if (existing) {
    return {
      alreadyLive: true,
      linkedLiveCatalogPlayId,
      note: `"${linkedLiveCatalogPlayId}" already exists in the live catalog (src/play/playCatalog.js) -- this promotion's job is proving the factory pipeline validates and traces that ALREADY-SHIPPED content, not inserting a duplicate. No playCatalog.js/playFamilies.js changes needed.`,
    };
  }
  return {
    alreadyLive: false,
    linkedLiveCatalogPlayId,
    note: `"${linkedLiveCatalogPlayId}" was NOT found in the live catalog -- promoting this for real would need new playCatalog.js/playFamilies.js entries, which this script does not generate automatically (see the no-link case above for why).`,
  };
}

// The idempotent promotion step itself. Requires the artifact to already
// be "staged" (Task 8's own state-machine requirement) OR already
// "promoted" (the idempotent re-run case: same content, already done,
// safe no-op) -- any other state is refused. State is checked GLOBALLY
// (across every run, via stateMachine.js's globalCurrentState), not just
// the caller's own run -- matching appendStateTransition's own
// cross-run-safe design.
//
// The judgment record itself is validated and enforced HERE, not trusted
// from the caller: it must pass validateJudgmentRecord and carry verdict
// "approve". If it isn't auto-promotion-eligible (incomplete metadata, or
// a real policy/calibration gap), the caller MUST supply an explicit
// manualPromotionReason -- the "explicit human/Claude-attended decision"
// Task 8 requires for a first-of-class item; without it, promotion is
// refused. (Both checks caught missing entirely by Phase 6's adversarial
// review, 2026-07-31 -- the first version gated purely on the state
// machine's STAGED marker and never inspected the judgment record at all,
// so ANY judgment object -- invalid, or even a REJECT verdict -- would
// have been silently promoted.)
export async function promoteScenario({ runDir, family, definition, compiledPlay, judgmentRecord, dependencyRecord, linkedLiveCatalogPlayId = null, promotedAt, manualPromotionReason = null, promotedRoot = PROMOTED_ROOT }) {
  const validation = validateJudgmentRecord(judgmentRecord);
  if (!validation.ok) {
    throw new Error(`promoteScenario: judgmentRecord is invalid -- ${validation.errs.join("; ")}`);
  }
  if (judgmentRecord.verdict !== JUDGMENT_VERDICT.APPROVE) {
    throw new Error(`promoteScenario: refusing to promote -- judgment verdict is "${judgmentRecord.verdict}", not "${JUDGMENT_VERDICT.APPROVE}"`);
  }
  if (!judgmentRecord.autoPromotionEligible && !manualPromotionReason) {
    throw new Error(`promoteScenario: refusing to promote -- judgment record is not auto-promotion-eligible (${judgmentRecord.metadataComplete ? "policy/calibration gap" : "incomplete judgment metadata"}) and no manualPromotionReason was supplied. An explicit, recorded human/Claude-attended override is required for a first-of-class (or otherwise non-eligible) item -- see Phase 6 Task 8.`);
  }

  const artifactId = definition.id;
  const runsRoot = join(runDir, "..");
  const state = globalCurrentState(runsRoot, artifactId);
  if (state !== STATES.STAGED && state !== STATES.PROMOTED) {
    throw new Error(`promoteScenario: ${artifactId} must be staged (or already promoted, for an idempotent re-run) before promotion -- current global state: "${state}"`);
  }

  const record = await buildPromotedArtifactRecord({ family, compiledPlay, judgmentRecord, dependencyRecord, promotedAt, manualPromotionReason });
  const writeResult = writePromotedArtifact(promotedRoot, record);
  regeneratePromotedIndex(promotedRoot);

  let transitionEvent = null;
  if (state === STATES.STAGED) {
    transitionEvent = appendStateTransition(
      runDir, artifactId, compiledPlay.compiledHash, STATES.PROMOTED,
      writeResult.wrote ? "promoted: new artifact written" : "promoted: artifact already existed with identical content (idempotent no-op)"
    );
  }

  const catalogDiff = buildCatalogDiffReport(definition, { linkedLiveCatalogPlayId });

  return { record, writeResult, transitionEvent, catalogDiff, alreadyPromoted: state === STATES.PROMOTED };
}
