# Reviewed repair guard review

Scope: `tools/reviewed-question-repairs.mjs`, its test file, `questionContentHash`, and `validateExperimentalBank`. Code-only independent review; no source edits or human approval.

No material defect found within the function's stated contract of trusted adjudication inputs. It clones the input bank, checks current scenario/version and exact before payload/hash, preserves question ID/type, binds both approvals to the exact after hash, rejects a matching non-approval, and validates the entire resulting bank before returning. All unrelated bank content is preserved. The function contains no writes; caller filesystem persistence and atomicity are outside this review.

Validation: all 3 existing tests passed. Additional in-memory probes passed for two changes in one scene incrementing its version once and a stale second change rejecting without mutating any input.

Trust boundary: role/verdict records are supplied data. The function does not authenticate reviewer identity, establish actual independence or calibration qualification, or read signed review receipts. It will accept two exact-hash approve records carrying the required roles. The caller/root must derive those records from the real independent and root reviews, exclude advisory-only verdicts, and preserve provenance. This is not evidence of human approval and is not a security boundary against a caller inventing approval records.

Hash scope: the hash includes scene fields and the exact question, excluding scene version and sibling questions. Version is checked separately; unrelated questions are cloned and whole-bank validated. This is an exact-question identity guard, not a full-bank approval hash.

Tests do not currently encode the extra same-scene/late-failure probe or reviewer-provenance limitations. No scope-expanding changes recommended for this bounded preparation helper.
