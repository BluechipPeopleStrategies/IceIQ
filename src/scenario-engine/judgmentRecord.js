// The judgment record format, per Phase 6 Task 2: "Claude provider/session
// identifier, model+version when exposed, reasoning configuration when
// exposed, rubric hash, prompt/context manifest, tool manifest, engine
// commit, calibration-corpus version. Missing/unavailable metadata is
// recorded explicitly and disables auto-promotion for that run (never
// silently defaulted)."
//
// "When exposed" is honored literally: model/reasoningConfig/
// calibrationCorpusVersion are string-or-null, where null means
// "genuinely unavailable to this attended session, recorded as such" --
// never omitted, never guessed. buildJudgmentRecord() computes
// metadataComplete from the ACTUAL field values (never trusts a caller's
// claim) and mechanically forces autoPromotionEligible to false whenever
// metadata is incomplete -- the "disables auto-promotion" requirement is
// an enforced invariant here, not a comment.

export const JUDGMENT_RECORD_SCHEMA_VERSION = "judgment-record-v1";

export const JUDGMENT_VERDICT = Object.freeze({
  APPROVE: "approve",
  REJECT: "reject",
  NEEDS_HUMAN: "needs-human",
});

// The two gates this project's own design docs name as real Claude
// judgment calls needing this record format (Phase 6 Task 11 / the FINAL
// SSR design doc's own task list) -- gate 5 (novelty) is built in a later
// phase; gate 8 (hockey/pedagogy correctness) is what Phase 6 Task 7
// actually exercises.
export const JUDGMENT_GATE = Object.freeze({
  GATE5_NOVELTY: "gate5-novelty",
  GATE8_HOCKEY_JUDGMENT: "gate8-hockey-judgment",
});

const CONFIDENCE_LEVELS = ["high", "medium", "low"];

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

export function validateJudgmentRecord(record) {
  const errs = [];
  if (!record || typeof record !== "object") return { ok: false, errs: ["record must be an object"] };

  if (record.schemaVersion !== JUDGMENT_RECORD_SCHEMA_VERSION) {
    errs.push(`schemaVersion must be "${JUDGMENT_RECORD_SCHEMA_VERSION}"`);
  }
  if (!isNonEmptyString(record.artifactId)) errs.push("artifactId is required");
  if (!isNonEmptyString(record.artifactHash)) errs.push("artifactHash is required");
  if (!Object.values(JUDGMENT_GATE).includes(record.gateId)) {
    errs.push(`gateId must be one of ${Object.values(JUDGMENT_GATE).join(", ")}`);
  }
  if (!isNonEmptyString(record.provider)) errs.push("provider is required");
  if (!isNonEmptyString(record.sessionId)) errs.push("sessionId is required");

  if (record.model !== null && !isNonEmptyString(record.model)) {
    errs.push("model must be a non-empty string, or explicitly null if genuinely unavailable");
  }
  if (record.reasoningConfig !== null && (typeof record.reasoningConfig !== "object" || record.reasoningConfig === undefined)) {
    errs.push("reasoningConfig must be an object, or explicitly null if genuinely unavailable");
  }
  if (record.calibrationCorpusVersion !== null && !isNonEmptyString(record.calibrationCorpusVersion)) {
    errs.push("calibrationCorpusVersion must be a string, or explicitly null if none exists yet");
  }

  if (!isNonEmptyString(record.rubricHash)) errs.push("rubricHash is required");
  if (!isNonEmptyString(record.promptContextManifestHash)) errs.push("promptContextManifestHash is required");
  if (!isNonEmptyString(record.toolManifestHash)) errs.push("toolManifestHash is required");
  if (!isNonEmptyString(record.engineCommit)) errs.push("engineCommit is required");

  if (!Object.values(JUDGMENT_VERDICT).includes(record.verdict)) {
    errs.push(`verdict must be one of ${Object.values(JUDGMENT_VERDICT).join(", ")}`);
  }
  if (!isNonEmptyString(record.rationale)) errs.push("rationale is required");
  if (!CONFIDENCE_LEVELS.includes(record.confidence)) errs.push(`confidence must be one of ${CONFIDENCE_LEVELS.join(", ")}`);

  // metadataComplete/autoPromotionEligible must be CORRECTLY DERIVED from
  // the real field values, not just present with any value -- a record
  // claiming metadataComplete:true while model is null (or similar) would
  // be exactly the "silently defaulted" failure mode the spec forbids.
  const trueMetadataComplete = record.model !== null && record.reasoningConfig !== null && record.calibrationCorpusVersion !== null;
  if (record.metadataComplete !== trueMetadataComplete) {
    errs.push(`metadataComplete must be ${trueMetadataComplete} given the actual model/reasoningConfig/calibrationCorpusVersion values -- it cannot be asserted independently of them`);
  }
  if (!trueMetadataComplete && record.autoPromotionEligible !== false) {
    errs.push("autoPromotionEligible must be false whenever metadata is incomplete -- never silently left eligible");
  }
  if (typeof record.autoPromotionEligible !== "boolean") errs.push("autoPromotionEligible must be a boolean");

  return { ok: errs.length === 0, errs };
}

// Builds a well-formed record from raw fields, computing metadataComplete
// and enforcing the auto-promotion invariant mechanically rather than
// trusting a caller to remember it. A caller MAY still explicitly opt a
// complete-metadata record OUT of auto-promotion (e.g. Task 8's "new
// template class always promotes manually" rule) via
// requestedAutoPromotionEligible: false -- but can never opt an
// incomplete-metadata record IN.
export function buildJudgmentRecord(fields) {
  const metadataComplete = fields.model !== null && fields.reasoningConfig !== null && fields.calibrationCorpusVersion !== null;
  const requestedAutoPromotionEligible = fields.requestedAutoPromotionEligible ?? true;
  const autoPromotionEligible = metadataComplete && requestedAutoPromotionEligible;

  const { requestedAutoPromotionEligible: _omit, ...rest } = fields;
  return Object.freeze({
    schemaVersion: JUDGMENT_RECORD_SCHEMA_VERSION,
    ...rest,
    metadataComplete,
    autoPromotionEligible,
  });
}
