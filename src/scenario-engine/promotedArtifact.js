// The content-addressed promoted-artifact format, per Phase 6 Task 6:
// "promoted JSON artifacts plus a deterministic, regeneratable index."
// A promoted artifact is a durable, self-contained record -- it embeds the
// full CompiledTeachingPlay, judgment record, and dependency record rather
// than pointing back into a specific run's own blob store, because a
// promoted item is meant to outlive any one run directory. Stored under
// docs/factory/promoted/<family>/<artifactId>.json, with a generated,
// regeneratable docs/factory/promoted/index.json alongside.
//
// This module only builds/validates/writes RECORDS. It never touches
// src/play/playCatalog.js, src/play/playFamilies.js, or src/data/bank.json
// -- per Task 6's own file list ("playCatalog.js and bank.json are never
// hand-edited by this pipeline... via a generated, reviewable diff, not
// silent direct writes"), the actual catalog-facing diff is generated as
// its own separate, human-reviewable artifact (see
// scripts/promote-scenario.mjs's buildCatalogDiffReport), never applied
// automatically by this module or that script.

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { contentHash } from "./canonicalHash.js";

export const PROMOTED_ARTIFACT_SCHEMA_VERSION = "promoted-artifact-v1";
export const PROMOTED_INDEX_SCHEMA_VERSION = "promoted-index-v1";

export async function buildPromotedArtifactRecord({ family, compiledPlay, judgmentRecord, dependencyRecord, promotedAt, manualPromotionReason = null }) {
  // promotedAt is deliberately EXCLUDED from the hashed content -- it's
  // when-metadata, not semantic identity. Including it would make
  // re-promoting the exact same underlying content at a later timestamp
  // look like a real conflict (a different recordHash) instead of the
  // idempotent no-op it actually is -- caught while designing the
  // promoter's own idempotency proof, before it ever ran for real.
  // manualPromotionReason IS included -- unlike promotedAt, it's a real
  // justification (not volatile when-metadata): a genuinely different
  // reason legitimately describes a different promotion decision.
  const hashableContent = {
    schemaVersion: PROMOTED_ARTIFACT_SCHEMA_VERSION,
    family,
    artifactId: compiledPlay.id,
    artifactVersion: compiledPlay.version,
    compiledPlay,
    judgmentRecord,
    dependencyRecord,
    manualPromotionReason,
  };
  const recordHash = await contentHash(hashableContent);
  return Object.freeze({ ...hashableContent, promotedAt, recordHash });
}

function promotedArtifactPath(promotedRoot, family, artifactId) {
  return join(promotedRoot, family, `${artifactId}.json`);
}

// Writes a promoted artifact if it doesn't already exist with IDENTICAL
// content (by recordHash) -- genuinely idempotent, same convention as
// factoryRun.js's writeBlob. Returns { wrote: boolean, path, recordHash }
// so a caller (the promoter script) can tell a fresh write from a no-op.
export function writePromotedArtifact(promotedRoot, record) {
  const path = promotedArtifactPath(promotedRoot, record.family, record.artifactId);
  mkdirSync(join(promotedRoot, record.family), { recursive: true });
  if (existsSync(path)) {
    const existing = JSON.parse(readFileSync(path, "utf8"));
    if (existing.recordHash === record.recordHash) {
      return { wrote: false, path, recordHash: record.recordHash };
    }
    // A different artifactId+family already has a DIFFERENT recordHash on
    // disk -- this is a real conflict (e.g. re-promoting a changed
    // artifact under the same id/version), not something to silently
    // overwrite.
    throw new Error(`writePromotedArtifact: ${path} already exists with a DIFFERENT recordHash (${existing.recordHash} vs ${record.recordHash}) -- refusing to silently overwrite a promoted artifact`);
  }
  writeFileSync(path, JSON.stringify(record, null, 2) + "\n");
  return { wrote: true, path, recordHash: record.recordHash };
}

export function readPromotedArtifact(promotedRoot, family, artifactId) {
  const path = promotedArtifactPath(promotedRoot, family, artifactId);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

// Regenerates the index by scanning every promoted-artifact file on disk --
// deterministic and regeneratable (Task 6's own words), never hand-
// maintained incrementally, so it can never drift from what's actually
// promoted.
export function regeneratePromotedIndex(promotedRoot) {
  const entries = [];
  if (existsSync(promotedRoot)) {
    for (const family of readdirSync(promotedRoot)) {
      const familyDir = join(promotedRoot, family);
      if (!existsSync(join(familyDir))) continue;
      let files;
      try {
        files = readdirSync(familyDir).filter((f) => f.endsWith(".json"));
      } catch {
        continue; // not a directory (e.g. the index.json file itself sitting at promotedRoot)
      }
      for (const file of files) {
        const record = JSON.parse(readFileSync(join(familyDir, file), "utf8"));
        entries.push({
          family: record.family,
          artifactId: record.artifactId,
          artifactVersion: record.artifactVersion,
          recordHash: record.recordHash,
          promotedAt: record.promotedAt,
        });
      }
    }
  }
  entries.sort((a, b) => (a.artifactId < b.artifactId ? -1 : a.artifactId > b.artifactId ? 1 : 0));
  const index = { schemaVersion: PROMOTED_INDEX_SCHEMA_VERSION, entries };
  writeFileSync(join(promotedRoot, "index.json"), JSON.stringify(index, null, 2) + "\n");
  return index;
}
