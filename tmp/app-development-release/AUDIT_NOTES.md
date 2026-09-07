# Audit notes

Running log of assumptions, skipped areas, and confusions encountered
during the read-only consistency audit. Companion to [AUDIT.md](AUDIT.md).

---

## Assumptions made

### Intentional patterns from CLAUDE.md
- **Monolithic `src/App.jsx`** is intentional (CLAUDE.md line 8: "All logic/UI in `src/App.jsx`. NO `/components` or refactoring.") — not flagged as a finding.
- **Inline CSS / style-block** is intentional (CLAUDE.md line 8: "CSS: inline/style-block.") — not flagged.
- **localStorage keys prefixed `rinkreads_`** is the convention; I assumed any `rinkreads_`-prefixed key is in-family even without a central helper enforcing it.
- **Two localStorage key styles** (`rinkreads_free_cap` vs `rinkreads_weekly`) are by design — different data categories. Not flagged.
- **Demo coach tier → TEAM, demo player → FREE** (CLAUDE.md lines 67–68) is the resolver rule. I did not flag `resolveTier` returning different tiers for the same session as an inconsistency because this is documented.

### Severity scoring
- Applied severity conservatively: **HIGH** reserved for security/permission gaps or broken-on-reach code. **MED** for cross-file inconsistencies that slow onboarding or cause subtle bugs. **LOW** for style/polish.
- Rated `.env` committed-to-repo as HIGH even though anon keys are designed for client-side exposure. Rationale: rotating the key costs <5 minutes and removes an ambient smell; any auditor-to-come will flag it the same way.
- Rated the broken `audit-u13` npm script as HIGH in agent output but downgraded to HIGH in final write-up because it's a one-line config fix — impact is low but fix cost is negligible.

### What counts as "orphaned"
Files in the repo root that are referenced by zero imports/requires from `src/` or `tools/` were called orphans. Exception: `package-lock.json`, `node_modules`, `vite.config.js`, `index.html`, `public/`, `dist/`, `CLAUDE.md`, `REPORT_DESIGN.md` are obviously repo scaffolding.

### Off-limits token-optimization rule
CLAUDE.md line 117: "`App.jsx` contains 880+ questions. Do NOT read large question bank sections unless editing content." I did not scan question data in `src/data/questions.json` (771 questions) or inspect the large quiz-loading code paths beyond line numbers referenced by the Explore agents. All line-number references in AUDIT.md come from grep results or component-level reads.

---

## Areas skipped (and why)

### Question content / hockey correctness
Not in scope. Audit is for code structure, not content quality. Recent commits shipped a dedicated content quality-scanner at `tools/quality-scan.mjs` which reports separately.

### Rink.jsx SVG correctness
Not audited beyond the broadcast-overlay change. The 1400-line `src/Rink.jsx` has deliberate hockey-specific color constants (rink lines, goalie pads, opponent stripes) that are not style tokens and shouldn't be. CLAUDE.md doesn't gate this file, so I assumed visual-authenticity is the priority.

### Accessibility
- No scan for missing `aria-*` attributes, color-contrast WCAG compliance, keyboard navigation, or focus traps.
- No scan for text/SVG screen-reader handling of the broadcast lower-third overlay.
- Likely a large opportunity area — flag for a dedicated audit pass.

### Performance
- No bundle analysis beyond Vite's existing warning ("chunks >500KB"). Could dig into code-splitting opportunities in `screens.jsx` vs `App.jsx`.
- No scan for unnecessary re-renders, missing `useMemo`/`useCallback`, or expensive list rendering.

### Testing
- Repo has no test files (no `__tests__/`, no `*.test.js`, no `vitest`/`jest` config). Not flagged as a finding because greenfield projects commonly defer test infrastructure, but worth human discussion.

### Internationalization
- All copy is English, inline. No i18n library. If the product plans to serve French-speaking Canada (likely given Edmonton-heavy demo data), copy should be extracted. Not in audit scope per my reading.

### Migration hygiene
- `supabase/migration_0002_question_reports.sql` through `migration_0005_birth_year.sql` + `schema.sql` — I did not audit whether all RLS policies referenced by client code actually exist in the migrations. Worth a dedicated Supabase-consistency pass.

### Demo / preview-data drift
- `DEMO_COACH_ROSTER` and `DEMO_PROFILES` in `App.jsx` ship synthetic `quizHistory` with hand-tuned correct counts. Didn't check whether the synthetic quiz IDs (`u11q1`, `u11tempo1`, etc.) continue to align with `COMPETENCY_MAPPINGS` as both drift over time.

---

## Confusions worth human clarification

### Demo-ID taxonomy
Six apparent ephemeral ID markers exist (`__demo__`, `__demo_coach__`, `__dev__`, `__dev_coach__`, `__preview__`, `__coach__`). Some are player-level, some are profile-level. `resolveTier` at [src/App.jsx:46](src/App.jsx#L46) and `isEphemeralPlayer` at [src/utils/devBypass.js:11](src/utils/devBypass.js#L11) handle different subsets. Is this intentional fragmentation or drift? A human should document which marker means what.

### The `rinkreads_tier_override` contract
It's currently read on every render by `resolveTier`. The dev bypass panel's FREE/PRO/TEAM picker writes it. But so can any DevTools user. Is this an intentional "escape hatch" for support / testing, or did the override pre-date the dev-bypass gate and never get wired up? Gating it on `isDevBypassEnabled()` would close the production loophole but could break existing support workflows.

### "What is `_check.js` vs `_check2.cjs`?"
Both at repo root, zero references, zero comments. Treating as dead. But the `.cjs` extension suggests they were needed when the module system was CommonJS — were they used as one-shot migrations? If so, mark that in a `legacy-scripts/` archive rather than delete outright.

### Export style in `shared.jsx`
`export const Screen` (arrow) coexists with `export function RinkReadsLogo`. This may be a historical accident from a partial migration, or an explicit distinction (e.g. "const for pure-JSX passthrough components, function for components with logic"). I flagged as an inconsistency but a human should confirm intent before any sweep.

### Is `REPORT_DESIGN.md` still load-bearing?
File at repo root, unreferenced from any code, but clearly a design doc. CLAUDE.md doesn't mention it. Could be a planning artifact for the `AdminReports` screen or a stale brief. Not deleting — but worth a label ("archived design brief" vs "active spec").

---

## Methodology

- **Explore agents** — 3 parallel read-only agents ran against different audit dimensions (naming/components/styling; data/auth/errors; structure/types/deps/config).
- **File reads** — direct reads limited to top/middle/bottom samples of large files; relied on grep for coverage breadth.
- **No code execution** — didn't run the app; all findings from static analysis.
- **CLAUDE.md re-read** — conventions checked before scoring each finding.

## Acceptance-criteria self-check

- [x] AUDIT.md is skimmable in ~10 minutes (executive summary at top, findings by severity, cross-cutting patterns at bottom).
- [x] Every HIGH-severity finding has a specific file path or line reference.
- [x] No code files modified (only `AUDIT.md` and `AUDIT_NOTES.md` created).
- [ ] "If finished early, deepen top 3 HIGH findings with proposed fix outlines" — proposed fix outlines are included inline for each HIGH finding; the three cross-cutting patterns section provides strategic-level outlines (Pattern A, B, C, D) that collapse multiple findings into focused fixes. I judged this sufficient given the audit's breadth; a per-finding implementation spec was not in scope and would blur the boundary between audit and design.
