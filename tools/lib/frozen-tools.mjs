// frozen-tools.mjs — the freeze switch for the legacy direct-writers.
//
// Phase 9 Task 1 of the scenario-engine plan. The design spec
// (docs/superpowers/specs/2026-07-29-scenario-engine-design.md) requires every
// producer to write immutable run artifacts into isolated staging, and requires
// exactly ONE promotion service to append events and generate a reviewable,
// idempotent patch. The framework-fit audit in
// docs/handoffs/2026-07-29-codex-scenario-engine-foundation-handoff.md
// ("Direct-write and mutable-history conflicts") names the legacy tools that
// still bypass that boundary and writes: "These paths must not be reused for
// the new engine."
//
// This module is how "must not be reused" becomes something the machine
// enforces rather than something a person has to remember at 11pm.
//
// Usage:
//   import { assertNotFrozen } from "../lib/frozen-tools.mjs";
//   assertNotFrozen("scripts/batch-approve.mjs");
//
// The override:
//   RINKREADS_ALLOW_FROZEN=1 lets a human run one of these deliberately. See
//   the note at the bottom of this file for why the escape hatch exists, and
//   for the one caller that does NOT get it.

export const ALLOW_ENV = "RINKREADS_ALLOW_FROZEN";

const SPEC = "docs/superpowers/specs/2026-07-29-scenario-engine-design.md";
const AUDIT = "docs/handoffs/2026-07-29-codex-scenario-engine-foundation-handoff.md";

// What each frozen entry point used to do, and where that job lives now.
// Keyed by the exact string each call site passes in.
const FROZEN = {
  "tools/seed-editor-plugin.mjs (POST /__seed/save)": {
    did: "wrote a scenario seed straight into src/scenario/seeds/, and with `force` it wrote seeds that failed validation.",
    instead:
      "Author through the factory pipeline (src/scenario-engine/factoryPipeline.js) so the run is staged and recorded, then promote with `node scripts/promote-scenario.mjs`. The editor's read-only view still works — only saving is frozen.",
  },
  "tools/review-store.mjs approve()": {
    did: "appended approved questions directly into src/data/bank.json, with no run record and no way to recall the decision.",
    instead:
      "Approvals belong in the engine's judgment record (src/scenario-engine/judgmentRecord.js); promotion into the live bank goes through `node scripts/promote-scenario.mjs`, which writes a reviewable report instead of editing the bank in place. Queueing and reading the review queue (enqueue/loadQueue/reject/sendBack/editItem) are NOT frozen.",
  },
  "tools/scenario-author.mjs": {
    did: "shelled out to the Claude CLI and wrote the generated scenario live into src/scenario/seeds/ by default.",
    instead:
      "Generate through the factory pipeline (src/scenario-engine/factoryPipeline.js), which stages an immutable run artifact, then promote with `node scripts/promote-scenario.mjs`.",
  },
  "scripts/generate-questions.mjs": {
    did: "spent metered LLM calls and wrote live scenario seeds into src/scenario/seeds/.",
    instead:
      "Question generation runs inside the factory pipeline (src/scenario-engine/factoryPipeline.js) so every candidate carries a run envelope and a novelty signature; promote with `node scripts/promote-scenario.mjs`.",
  },
  "scripts/batch-approve.mjs": {
    did: "deleted the existing same-ID file in src/scenario/seeds/ and moved the replacement over it — a destructive, unrecorded overwrite.",
    instead:
      "`node scripts/promote-scenario.mjs` — the single idempotent promoter. It is content-addressed, never overwrites live content in place, and produces a diff report a human applies deliberately.",
  },
};

function buildMessage(toolName) {
  const entry = FROZEN[toolName];
  const lines = [
    "",
    "  ┌─────────────────────────────────────────────────────────────────┐",
    "  │  FROZEN TOOL — this did not run, and nothing was written.       │",
    "  └─────────────────────────────────────────────────────────────────┘",
    "",
    `  Tool:  ${toolName}`,
    "",
    "  Why:   It is one of the legacy direct-writers, frozen pending the",
    "         scenario-engine foundation. It writes straight into live",
    "         content instead of staging a run artifact and promoting it,",
    "         so a bad write leaves no run record and cannot be recalled.",
    "",
  ];

  if (entry) {
    lines.push(`  It used to: ${entry.did}`, "", `  Do this instead: ${entry.instead}`, "");
  } else {
    lines.push(
      "  Do this instead: stage through src/scenario-engine/factoryPipeline.js,",
      "         then promote with `node scripts/promote-scenario.mjs`.",
      "",
    );
  }

  lines.push(
    `  Read:  ${SPEC}`,
    `         ${AUDIT}  ("Direct-write and mutable-history conflicts")`,
    "",
    "  If you really do mean to run this by hand, and you accept that it",
    "  writes live content with no run record, re-run it with:",
    "",
    "      PowerShell:  $env:RINKREADS_ALLOW_FROZEN=1; <your command>",
    "      bash:        RINKREADS_ALLOW_FROZEN=1 <your command>",
    "",
    "  That override is for a person at a keyboard. It is deliberately NOT",
    "  honoured by the unattended overnight runner.",
    "",
  );

  return lines.join("\n");
}

// True when the caller has deliberately opted out of the freeze.
export function frozenOverrideActive(env = process.env) {
  const v = env[ALLOW_ENV];
  return v === "1" || String(v).toLowerCase() === "true";
}

export class FrozenToolError extends Error {
  constructor(toolName) {
    super(buildMessage(toolName));
    this.name = "FrozenToolError";
    this.toolName = toolName;
    this.frozen = true;
  }
}

/**
 * Refuse to run a frozen legacy direct-writer.
 *
 * Throws a FrozenToolError unless RINKREADS_ALLOW_FROZEN is set. Callers that
 * are plain CLIs should let it propagate (node exits 1 and prints the message);
 * callers inside a long-lived server should catch it and surface `.message`.
 *
 * @param {string} toolName  exact identifier, e.g. "scripts/batch-approve.mjs"
 * @param {object} [opts]
 * @param {NodeJS.ProcessEnv} [opts.env]  env to read (tests inject their own)
 */
export function assertNotFrozen(toolName, opts = {}) {
  const env = opts.env || process.env;
  if (frozenOverrideActive(env)) {
    // Loud on stderr: an override should never happen silently, so it shows up
    // in a log after the fact.
    console.error(
      `[frozen-tools] ${ALLOW_ENV} is set — running FROZEN tool ${toolName} anyway. ` +
        `This writes live content with no run record. See ${SPEC}.`,
    );
    return;
  }
  throw new FrozenToolError(toolName);
}

/** The message text, without throwing. For tests and for HTTP responses. */
export function frozenMessage(toolName) {
  return buildMessage(toolName);
}

/** The identifiers this module knows about — used by the test to stay in sync. */
export const FROZEN_TOOL_NAMES = Object.keys(FROZEN);

// ─────────────────────────────────────────────────────────────────────────────
// On the RINKREADS_ALLOW_FROZEN escape hatch
//
// It exists, on purpose, and it is narrow:
//
//   1. These tools are not dangerous in themselves — the danger is an
//      *unattended or accidental* invocation. An env var costs a human three
//      seconds and cannot be typed by a scheduled task that nobody is watching.
//   2. Without an escape hatch the realistic failure mode is that someone
//      comments the guard out — or reverts the commit — because they needed the
//      tool once. That disarms the freeze permanently and for everyone, which is
//      strictly worse than one logged, deliberate override.
//   3. tools/review-store.test.mjs exercises approve() directly. The override
//      lets that existing test keep passing without carving a permanent
//      exemption into the guard itself.
//
// And it is deliberately not universal: tools/scenario-engine-overnight.ps1
// stops unconditionally, with no override, because that script is the exact
// thing this task defends against — an 8-pass loop that shells
// `claude -p --dangerously-skip-permissions` across the whole working tree.
// An escape hatch there would be a hole in the only wall that matters.
