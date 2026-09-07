// Task A verification script (RinkReads ten-hour-followthrough intake-verification).
//
// Reuses this repo's canonical hashing/composition helpers (tools/experimental-bank-files.mjs,
// tools/question-batch-core.mjs -> questionContentHash) rather than rolling a new hash
// convention. Reads the prior review's output package from docs/factory/claude-ten-hour-project/
// inside THIS worktree (see NOTE below for provenance). Writes nothing outside
// docs/factory/claude-ten-hour-project/output/ten-hour-followthrough/.
//
// NOTE ON INPUT LOCATION: this worktree (claude/ten-hour-followthrough, base 899e96f7) did not
// originally contain docs/factory/claude-ten-hour-project/ -- that directory was added one
// commit later (f245ca5, "Prepare bounded ten-hour Claude followthrough project") on branch
// codex/net-overlap-repairs, checked out read-only at
// C:/Users/mtsli/IceIQ/tmp/packets-production-release. Rather than have this task's evidence
// trail depend on that other worktree continuing to exist (it belongs to another in-progress
// worker and is explicitly read-only reference for this task), prior-return/,
// PRIOR-EVIDENCE-INVENTORY.json, START-HERE.md and assignment.json were copied byte-for-byte
// (verified identical, see intake-verification.json's inputProvenanceNote) into this worktree
// at docs/factory/claude-ten-hour-project/ before this script runs, so every artifact path this
// script records resolves inside THIS worktree. prior-packets/ needed no such reference copy: it
// is present natively at docs/factory/claude-visual-review-60/packets/ (this worktree's own base
// commit) and was diff-verified byte-for-byte identical to the reference worktree's copy; it was
// additionally copied to docs/factory/claude-ten-hour-project/prior-packets/ purely for
// structural parity with the task's described layout (diff -rq confirms zero differences).

import { readFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readBankFiles } from '../../../../../tools/experimental-bank-files.mjs';
import { questionContentHash } from '../../../../../tools/question-batch-core.mjs';

const WORKTREE = fileURLToPath(new URL('../../../../../', import.meta.url));
const REF_ROOT = join(WORKTREE, 'docs/factory/claude-ten-hour-project');
const PACKETS_DIR = join(WORKTREE, 'docs/factory/claude-visual-review-60/packets');
const PRIOR_RETURN = join(REF_ROOT, 'prior-return');
const INVENTORY_PATH = join(REF_ROOT, 'PRIOR-EVIDENCE-INVENTORY.json');

const readJson = p => JSON.parse(readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
const sha256File = p => createHash('sha256').update(readFileSync(p)).digest('hex');
const exists = p => existsSync(p);

// ---- Load live bank (this worktree's current scenario content) ----
const { bank } = readBankFiles();
const bankById = new Map(bank.map(s => [s.id, s]));

// ---- Load prior-packets manifests/blind/after-solve (native to this worktree) ----
const PACKET_IDS = Array.from({ length: 11 }, (_, i) => `visual-${String(i + 1).padStart(2, '0')}`);
const manifests = {}, blindPackets = {}, afterSolvePackets = {};
for (const pid of PACKET_IDS) {
  manifests[pid] = readJson(join(PACKETS_DIR, `${pid}-manifest.json`));
  blindPackets[pid] = readJson(join(PACKETS_DIR, `${pid}-blind.json`));
  afterSolvePackets[pid] = readJson(join(PACKETS_DIR, `${pid}-after-solve.json`));
}

// ---- Load prior-return outputs ----
const allSixty = readJson(join(PRIOR_RETURN, 'all-60-summary.json'));
const hashVerificationResult = readJson(join(PRIOR_RETURN, 'hash-verification-result.json'));
const reviewByPacket = {}, blindReviewByPacket = {}, secondReviewByPacket = {}, secondBlindByPacket = {};
for (const pid of PACKET_IDS) {
  reviewByPacket[pid] = readJson(join(PRIOR_RETURN, pid, 'review.json'));
  blindReviewByPacket[pid] = readJson(join(PRIOR_RETURN, pid, 'blind.json'));
  secondReviewByPacket[pid] = readJson(join(PRIOR_RETURN, pid, 'second-review.json'));
  secondBlindByPacket[pid] = readJson(join(PRIOR_RETURN, pid, 'second-review-blind.json'));
}
const inventory = readJson(INVENTORY_PATH);

// ================= Section 1: per-question reconciliation =================
const questions = [];
for (const row of allSixty) {
  const { packet, questionId, scenarioId, verdict, blindMatchesKey, highRisk } = row;
  const manifest = manifests[packet];
  const manifestTarget = manifest?.targets?.find(t => t.questionId === questionId);
  const liveScene = bankById.get(scenarioId);
  const liveQuestion = liveScene?.questions?.find(q => q.id === questionId);
  const reproducedHash = liveScene && liveQuestion ? questionContentHash(liveScene, liveQuestion) : null;
  const hvrEntry = hashVerificationResult.results.find(r => r.questionId === questionId);
  const reviewRow = reviewByPacket[packet]?.rows?.find(r => r.questionId === questionId);
  const blindQ = blindPackets[packet]?.questions?.find(q => q.questionId === questionId) ||
                 blindPackets[packet]?.questions?.find(q => q.id === questionId);
  const blindReviewQ = blindReviewByPacket[packet]?.questions?.find(q => q.questionId === questionId);
  const secondReviewRow = secondReviewByPacket[packet]?.questions?.find(q => q.questionId === questionId);
  const secondBlindA = secondBlindByPacket[packet]?.answers?.find(a => a.questionId === questionId);

  const claims = [];

  // Claim 1: identity (packet/scenarioId/questionId agree across all sources this task can read)
  {
    const foundIn = {
      allSixtySummary: true,
      manifest: !!manifestTarget,
      liveBank: !!liveQuestion,
      reviewJson: !!reviewRow,
      blindJson: !!blindReviewQ,
      secondReviewJson: !!secondReviewRow,
      secondReviewBlindJson: !!secondBlindA,
    };
    const allFound = Object.values(foundIn).every(Boolean);
    claims.push({
      claim: 'identity',
      reportedValue: { packet, scenarioId, questionId },
      reproducedValue: foundIn,
      status: allFound ? 'verified' : (foundIn.manifest && foundIn.liveBank ? 'partial' : 'contradicted'),
      artifactPaths: [
        'docs/factory/claude-visual-review-60/packets/' + packet + '-manifest.json (this worktree)',
        REF_ROOT + '/prior-return/all-60-summary.json',
        REF_ROOT + '/prior-return/' + packet + '/review.json',
      ],
      nextAction: allFound ? 'none' : 'Confirm why this question ID is absent from: ' + Object.entries(foundIn).filter(([, v]) => !v).map(([k]) => k).join(', '),
    });
  }

  // Claim 2: scenario version + payload hash (manifest vs live bank vs hash-verification-result.json vs review.json)
  {
    const reportedHash = manifestTarget?.contentHash ?? null;
    const reportedVersion = manifestTarget?.scenarioVersion ?? null;
    const liveVersion = liveScene?.version ?? null;
    const agreesWithHvr = hvrEntry ? (hvrEntry.manifestHash === reportedHash && hvrEntry.liveHash === reproducedHash && hvrEntry.match === true) : null;
    const agreesWithReviewRow = reviewRow ? (reviewRow.contentHash === reportedHash) : null;
    let status;
    if (!manifestTarget || !liveQuestion) status = 'unavailable';
    else if (reportedHash === reproducedHash && reportedVersion === liveVersion && agreesWithHvr !== false && agreesWithReviewRow !== false) status = 'verified';
    else if (reportedHash === reproducedHash) status = 'partial';
    else status = 'contradicted';
    claims.push({
      claim: 'scenarioVersionAndPayloadHash',
      reportedValue: { scenarioVersion: reportedVersion, contentHash: reportedHash, hashVerificationResultClaim: hvrEntry ? { manifestHash: hvrEntry.manifestHash, liveHash: hvrEntry.liveHash, match: hvrEntry.match } : null },
      reproducedValue: { liveScenarioVersion: liveVersion, recomputedContentHash: reproducedHash, method: 'questionContentHash(scene,question) from tools/question-batch-core.mjs, scene loaded via tools/experimental-bank-files.mjs readBankFiles() against this worktree HEAD (899e96f7)' },
      status,
      artifactPaths: [
        'docs/factory/claude-visual-review-60/packets/' + packet + '-manifest.json',
        'src/one-on-one/experimental-bank/*.json + src/one-on-one/experimental-expansion/*.json (composed live bank, this worktree)',
        REF_ROOT + '/prior-return/hash-verification-result.json',
      ],
      nextAction: status === 'verified' ? 'none' : status === 'unavailable' ? 'Scenario/question not found in manifest or live bank; investigate before trusting any downstream claim for this ID.' : 'Recomputed hash disagrees with a reported value; treat prior verdict for this question as unverified pending manual diff of scene JSON.',
    });
  }

  // Claim 3: screenshot evidence (existence + cross-file hash agreement only; NOT pixel-level inspection)
  {
    const viewports = reviewRow?.viewports || [];
    const invMatches = viewports.map(vp => {
      const relPath = vp.screenshotPath?.replace(/^output\//, '');
      const invEntry = inventory.files.find(f => f.path === relPath);
      return {
        screenshotPath: vp.screenshotPath,
        declaredInReviewJson: vp.sha256 ?? null,
        declaredInInventory: invEntry ? invEntry.sha256 : null,
        inventoryIncludedFlag: invEntry ? invEntry.included : null,
        agree: invEntry ? (invEntry.sha256 === vp.sha256) : null,
        foundInInventory: !!invEntry,
      };
    });
    const allAgree = invMatches.length > 0 && invMatches.every(m => m.foundInInventory && m.agree === true);
    const anyDisagree = invMatches.some(m => m.foundInInventory && m.agree === false);
    const anyNotFound = invMatches.some(m => !m.foundInInventory);
    // Always capped at 'partial' at best: hash/path metadata can be fully cross-checked, but the
    // actual pixel content of every screenshot is unavailable in both worktrees, so this claim can
    // never reach 'verified' regardless of how clean the metadata cross-check comes back.
    const status = viewports.length === 0 ? 'unavailable' : anyDisagree ? 'contradicted' : 'partial';
    claims.push({
      claim: 'screenshotEvidence',
      reportedValue: { declaredCount: viewports.length, paths: viewports.map(v => v.screenshotPath) },
      reproducedValue: invMatches,
      status,
      metadataCrossCheck: anyDisagree ? 'FAILED: at least one screenshot\'s hash disagrees between review.json and PRIOR-EVIDENCE-INVENTORY.json.' : anyNotFound ? 'INCOMPLETE: at least one screenshot path in review.json has no corresponding inventory entry.' : 'PASSED: every screenshot path and sha256 declared in review.json has a matching entry in PRIOR-EVIDENCE-INVENTORY.json with an identical hash.',
      artifactPaths: [REF_ROOT + '/prior-return/' + packet + '/review.json', REF_ROOT + '/PRIOR-EVIDENCE-INVENTORY.json'],
      nextAction: 'Metadata cross-check (path + hash agreement between two independently-written records) is the only checkable dimension here -- see metadataCrossCheck above. Actual PNG bytes are not present in this worktree or the reference worktree (inventory marks them included:false by design; originals live only on Thomas\'s machine). Pixel-level visual inspection is OUT OF SCOPE for this task; see scopeExclusions / followUpForNextSession.',
    });
  }

  // Claim 4: review-verdict consistency (all-60-summary.json vs review.json row vs blind.json)
  {
    const blindAnswer = reviewRow?.blindAnswer ?? blindQ?.blindAnswer ?? null;
    const keyedAnswer = reviewRow?.keyedAnswer ?? null;
    const reviewRowBlindMatchesKey = reviewRow ? reviewRow.blindMatchesKey : null;
    const consistent = reviewRow ? (reviewRow.verdict === verdict && reviewRow.blindMatchesKey === blindMatchesKey && reviewRow.highRisk === highRisk) : null;
    claims.push({
      claim: 'reviewVerdictConsistency',
      reportedValue: { verdict, blindMatchesKey, highRisk },
      reproducedValue: reviewRow ? { verdict: reviewRow.verdict, blindMatchesKey: reviewRow.blindMatchesKey, highRisk: reviewRow.highRisk, blindAnswer, keyedAnswer } : null,
      status: reviewRow ? (consistent ? 'verified' : 'contradicted') : 'unavailable',
      artifactPaths: [REF_ROOT + '/prior-return/all-60-summary.json', REF_ROOT + '/prior-return/' + packet + '/review.json', REF_ROOT + '/prior-return/' + packet + '/blind.json'],
      nextAction: reviewRow ? (consistent ? 'none' : 'all-60-summary.json disagrees with the per-packet review.json row for this question; reconcile before relying on the summary alone.') : 'No matching review.json row found for this question ID.',
      caveat: 'These are all self-reported verdicts from an explicitly unqualified reviewer (4/8 calibration misses -- see calibrationSummary). Verified here means internally consistent across files, NOT hockey-correct.',
    });
  }

  questions.push({ packet, questionId, scenarioId, claims });
}

// ================= Section 2: inventory cross-check =================
const inventoryChecks = [];
for (const f of inventory.files) {
  if (f.included) {
    const actualPath = join(PRIOR_RETURN, f.path);
    if (!exists(actualPath)) {
      inventoryChecks.push({ path: f.path, reportedValue: { bytes: f.bytes, sha256: f.sha256, included: true }, reproducedValue: null, status: 'contradicted', artifactPaths: [REF_ROOT + '/PRIOR-EVIDENCE-INVENTORY.json'], nextAction: 'File marked included:true is missing on disk in prior-return/. Investigate immediately.' });
      continue;
    }
    const stat = statSync(actualPath);
    const actualHash = sha256File(actualPath);
    const bytesMatch = stat.size === f.bytes;
    const hashMatch = actualHash === f.sha256;
    inventoryChecks.push({
      path: f.path,
      reportedValue: { bytes: f.bytes, sha256: f.sha256, included: true },
      reproducedValue: { bytes: stat.size, sha256: actualHash },
      status: bytesMatch && hashMatch ? 'verified' : 'contradicted',
      artifactPaths: [REF_ROOT + '/PRIOR-EVIDENCE-INVENTORY.json', REF_ROOT + '/prior-return/' + f.path],
      nextAction: bytesMatch && hashMatch ? 'none' : 'Byte size or hash mismatch between inventory claim and actual file; treat file content as unverified.',
    });
  } else {
    // included:false -- expected to be absent from both prior-return/ and prior-packets/ in this package.
    const candidatePaths = [join(PRIOR_RETURN, f.path), join(WORKTREE, 'docs/factory/claude-visual-review-60/packets', f.path)];
    const foundAnywhere = candidatePaths.find(p => exists(p));
    inventoryChecks.push({
      path: f.path,
      reportedValue: { bytes: f.bytes, sha256: f.sha256, included: false },
      reproducedValue: { presentOnDiskInThisPackage: !!foundAnywhere, checkedPaths: candidatePaths },
      status: foundAnywhere ? 'contradicted' : 'verified',
      artifactPaths: [REF_ROOT + '/PRIOR-EVIDENCE-INVENTORY.json'],
      nextAction: foundAnywhere
        ? 'Inventory says included:false but a file was actually found on disk at ' + foundAnywhere + '; the inventory itself is stale or wrong for this path.'
        : 'absent-as-expected: this is a screenshot (or the verify-hashes.mjs helper script) that the inventory itself says was never copied into this evidence package. Originals live only on Thomas\'s machine at the inventory root path. Not a defect.',
    });
  }
}

// ================= Section 3: duplicate screenshot hash detection =================
const pngEntries = inventory.files.filter(f => f.path.endsWith('.png'));
const byHash = new Map();
for (const f of pngEntries) {
  if (!byHash.has(f.sha256)) byHash.set(f.sha256, []);
  byHash.get(f.sha256).push(f.path);
}
const duplicateHashes = [...byHash.entries()]
  .filter(([, paths]) => paths.length > 1)
  .map(([sha256, paths]) => ({ sha256, paths, distinctQuestionIds: [...new Set(paths.map(p => (p.match(/exp26b?-[a-z0-9-]+-q\d+/) || [null])[0]))] }));

const byFilenameBase = new Map();
for (const f of pngEntries) {
  const base = f.path.split('/').pop();
  if (!byFilenameBase.has(base)) byFilenameBase.set(base, []);
  byFilenameBase.get(base).push(f.path);
}
const duplicateFilenames = [...byFilenameBase.entries()].filter(([, paths]) => paths.length > 1).map(([name, paths]) => ({ name, paths }));

// Naming-convention observation: 121 of the 60-question screenshots use an abbreviated
// packet-prefix filename ("vNN_<questionId>_..."); exactly 3 files (all for the very first
// question reviewed, exp26-u9-003-q3 in visual-01) use a bare "<questionId>_..." filename with
// no prefix at all. Not a hash/identity defect (paths resolve correctly and hashes match), but a
// real, isolated inconsistency worth surfacing rather than silently normalizing away.
const questionScreenshots = pngEntries.filter(f => f.path !== 'work3-feedback-flow/screenshots/admin-panel-with-test-note.png');
const classifyPrefix = f => {
  const [packet, , file] = f.path.split('/');
  const abbrev = packet.replace('visual-', 'v') + '_';
  if (file.startsWith(abbrev)) return 'abbreviated-vNN_';
  if (file.startsWith(packet + '_')) return 'full-visual-NN_';
  return 'no-prefix';
};
const prefixCounts = {};
for (const f of questionScreenshots) { const k = classifyPrefix(f); prefixCounts[k] = (prefixCounts[k] || 0) + 1; }
const namingConventionObservation = {
  totalQuestionScreenshots: questionScreenshots.length,
  countsByConvention: prefixCounts,
  fullOrNoPrefixPaths: questionScreenshots.filter(f => classifyPrefix(f) !== 'abbreviated-vNN_').map(f => ({ path: f.path, convention: classifyPrefix(f) })),
  note: 'Three different screenshot-filename conventions appear across this package, all within packet visual-01: bare "<questionId>_..." (3 files, the very first question reviewed, exp26-u9-003-q3), full "visual-01_<questionId>_..." (8 files, the next 4 questions in visual-01), and abbreviated "vNN_<questionId>_..." (every other packet, visual-02 through visual-11, used consistently). exp26-u9-003-q3 also received 3 screenshots (an extra "phone-390x844_top" shot) where every later question received exactly 2. Reads as the reviewer settling on a naming convention over the course of visual-01 rather than a data-integrity problem: hashes and paths for all of these files still resolve and match cleanly (see screenshotEvidence claims above). Flagged for awareness, not a defect.',
};

// ================= Section 4: calibration summary =================
const calibDir = join(PRIOR_RETURN, 'calibration');
const leadRecon = readJson(join(calibDir, 'reconciliation.json'));
const secondRecon = readJson(join(calibDir, 'second-reviewer-reconciliation.json'));
const leadMissed = (leadRecon.perCase || []).filter(c => /missed/i.test(c.blindResult)).map(c => c.id);
const secondMissed = (secondRecon.cases || []).filter(c => c.caughtBlind === false).map(c => c.id);

const calibrationSummary = {
  leadReviewer: {
    scorecard: leadRecon.scorecard,
    missedCaseIds: leadMissed,
    conclusion: leadRecon.conclusion,
  },
  secondReviewer: {
    scorecard: secondRecon.scorecard,
    qualifiedThisRun: secondRecon.qualified_this_run,
    missedCaseIds: secondMissed,
  },
  overlapAnalysis: {
    missedByBoth: leadMissed.filter(id => secondMissed.includes(id)),
    missedByLeadOnly: leadMissed.filter(id => !secondMissed.includes(id)),
    missedBySecondOnly: secondMissed.filter(id => !leadMissed.includes(id)),
    note: '3 of 4 missed cases overlap between the two reviewers (same underlying model family, Claude Sonnet 5, disclosed by the second reviewer as NOT cross-model independence). This overlap is itself evidence the two passes share blind spots rather than providing independent corroboration.',
  },
  secondReviewerToolLimitation: 'The second reviewer explicitly disclosed no live browser/Playwright access for the visual-01 second-opinion pass and derived all answers solely from packet JSON (manifest + blind + after-solve), not the rendered scene or screenshots. This means the ONLY claimed independent confirmation of hash-verification and browser-interaction claims for visual-01 rests on the lead reviewer alone -- see second-review.json toolLimitation field.',
};

// ================= Assemble output =================
const now = new Date().toISOString();
const totalClaims = questions.reduce((n, q) => n + q.claims.length, 0);
const statusCounts = { verified: 0, partial: 0, contradicted: 0, unavailable: 0 };
for (const q of questions) for (const c of q.claims) statusCounts[c.status]++;

const output = {
  schemaVersion: 1,
  kind: 'rinkreads-intake-verification',
  generatedAtUtc: now,
  scope: 'Task A only (Verify the previous return), as scoped by the orchestrating session -- narrower than the full assignment.json section A. See scopeExclusions.',
  worktree: { path: 'C:/Users/mtsli/IceIQ/.worktrees/claude-ten-hour-followthrough', branch: 'claude/ten-hour-followthrough', head: '899e96f7a6c35e16422e6c9a99a1f9914d2f6d45' },
  inputProvenanceNote: 'This worktree\'s branch (claude/ten-hour-followthrough, base 899e96f7) was cut BEFORE docs/factory/claude-ten-hour-project/ was committed upstream (it landed one commit later, f245ca5 "Prepare bounded ten-hour Claude followthrough project", on branch codex/net-overlap-repairs). That branch is checked out read-only at C:/Users/mtsli/IceIQ/tmp/packets-production-release and belongs to another in-progress worker, so rather than depend on it persisting, prior-return/, PRIOR-EVIDENCE-INVENTORY.json, START-HERE.md and assignment.json were copied byte-for-byte from that read-only checkout into THIS worktree at docs/factory/claude-ten-hour-project/ before this script ran. prior-packets/ needed no such copy for correctness -- it was already present natively in this worktree at docs/factory/claude-visual-review-60/packets/ (added in this worktree\'s own base commit, 899e96f7) and was diff-verified byte-for-byte identical to the reference worktree\'s prior-packets/ before use; it was additionally copied to docs/factory/claude-ten-hour-project/prior-packets/ purely so the on-disk layout matches the task\'s described structure. All artifact paths recorded below point inside this worktree.',
  hashMethodology: {
    reused: true,
    function: 'questionContentHash(scene, question) from tools/question-batch-core.mjs: sha256(JSON.stringify({scene: {...s minus questions/version}, question: q}))',
    sceneSource: 'tools/experimental-bank-files.mjs readBankFiles() -- composes src/one-on-one/experimental-bank/*.json with src/one-on-one/experimental-expansion/*.json, exactly as the repo\'s own build/validate tooling does.',
    rolledOwnCodeFor: 'File-level sha256 (crypto.createHash) for whole-file byte verification against PRIOR-EVIDENCE-INVENTORY.json -- there is no existing repo helper for that because it is a generic file-integrity check, not a scenario/question content hash. No new hashing convention was invented for scenario/question content.',
    verifyHashesScriptNotAvailable: 'The prior reviewer\'s own output/verify-hashes.mjs (referenced throughout review.json as the tool that produced hash-verification-result.json) is listed in PRIOR-EVIDENCE-INVENTORY.json with included:false -- it was never copied into this evidence package, so its exact logic cannot be inspected or re-run. This script independently reproduces the same hashes using the repo\'s own canonical function instead of trusting that unavailable script.',
  },
  questions,
  inventoryCrossCheck: {
    summary: {
      totalEntries: inventory.files.length,
      includedTrue: inventory.files.filter(f => f.included).length,
      includedFalse: inventory.files.filter(f => !f.included).length,
      verified: inventoryChecks.filter(c => c.status === 'verified').length,
      contradicted: inventoryChecks.filter(c => c.status === 'contradicted').length,
    },
    checks: inventoryChecks,
  },
  duplicateScreenshotDetection: {
    method: 'Compared sha256 across all 122 PNG entries in PRIOR-EVIDENCE-INVENTORY.json (actual image bytes are not present in either worktree, so this is a hash/filename-level check only, not a pixel comparison).',
    duplicateHashesAcrossDifferentPaths: duplicateHashes,
    duplicateFilenamesAcrossPackets: duplicateFilenames,
    finding: duplicateHashes.length === 0 ? 'No two PNG entries in the inventory share a sha256 hash. No evidence in the inventory itself of a duplicated/reused screenshot image assigned to two different question IDs. This does NOT confirm the images are correct, only that the recorded hashes are all distinct.' : (duplicateHashes.length + ' hash collision(s) found -- see duplicateHashesAcrossDifferentPaths.'),
    namingConventionObservation,
  },
  calibrationSummary,
  statusTotals: { totalClaims, ...statusCounts },
  scopeExclusions: [
    'No screenshot image was visually inspected in this task. The 122 PNG files referenced throughout prior-return/ are not present anywhere in this worktree, the reference worktree, or the copy under docs/factory/claude-ten-hour-project/ (PRIOR-EVIDENCE-INVENTORY.json marks them included:false by design; originals exist only on Thomas\'s machine at the inventory root path). Any "N images inspected" requirement from the full assignment is OUT OF SCOPE for this task and is a follow-up item for whichever session/human has access to the original screenshots.',
    'No hockey-correctness judgment was made or implied. All verdict/blindMatchesKey/highRisk fields above are reproduced as internally-consistent-or-not, never re-graded for hockey accuracy.',
    'No geometry recomputation was performed for finite-segment-vs-infinite-line or any other question content (distances, angles, passing lanes). blind.json geometryCheck fields are noted as existing artifacts only, never independently recomputed here.',
    'No reviewer qualification is claimed or restored. Both the lead and second reviewer are documented as NOT QUALIFIED (4/8 calibration misses each) and that status is unchanged by this task.',
  ],
  followUpForNextSession: [
    'Visually inspect the required risk-selected sample (assignment.json / START-HERE.md specify at least 12 question pairs / 24 images, covering every represented age, plus all anomalies) once the original screenshots are available from Thomas\'s machine (inventory root: ' + inventory.root + ').',
    'A qualified (human or genuinely independent) hockey reviewer is still needed before any of these 60 verdicts can be treated as trusted clearances.',
    'Geometry recomputation for finite-segment-vs-infinite-line questions, if still required by the broader assignment, should be done as its own senior task with the live bank data this script already loads.',
  ],
};

process.stdout.write(JSON.stringify(output, null, 2) + '\n');
