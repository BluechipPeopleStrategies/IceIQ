// DraftTeachingPlay: a preview/diagnostic-export artifact for coach-authored
// drafts that have NOT cleared compileTeachingPlay()'s AGREE/physicsClean gate
// (or haven't been finalized yet at all). Unlike CompiledTeachingPlay, this
// type carries no proof of correctness -- it exists so a coach can see their
// own work-in-progress, including a physics-failed or disagreeing draft,
// without that draft ever masquerading as validated. Never enters the
// catalog/promotion pipeline; never substitutes for CompiledTeachingPlay.
// Per docs/superpowers/specs/2026-07-31-coach-authoring-video-export-design.md §6.

import { compareDeclaredToDerived, AGREEMENT } from "./decisionEvaluation.js";
import { deriveEventTimes } from "./compiledTeachingPlay.js";
import { hardFailuresOf } from "./physics/findings.js";

export const DRAFT_TEACHING_PLAY_SCHEMA_VERSION = "draft-teaching-play-v1";

export function buildDraftTeachingPlay(definition, trace, evaluation, declaredCandidateId) {
  const comparison = compareDeclaredToDerived(declaredCandidateId, evaluation);

  const failedChecks = [
    ...hardFailuresOf(trace.findings).map((f) => f.explanation),
    ...(comparison.agreement === AGREEMENT.AGREE ? [] : [comparison.explanation]),
  ];

  return Object.freeze({
    schemaVersion: DRAFT_TEACHING_PLAY_SCHEMA_VERSION,
    id: definition.id,
    version: definition.version,
    samples: trace.samples,
    eventTimes: deriveEventTimes(definition),
    questionFreezeTime: definition.decisionFreeze.time,
    observableCues: definition.decisionFreeze.observableCues,
    declaredRead: definition.declaredRead,
    physicsClean: trace.physicsClean,
    comparison,
    failedChecks,
  });
}
