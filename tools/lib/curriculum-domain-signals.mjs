// Shared domain/concept text-signal matching for the cross-catalog curriculum
// matrix (docs/factory/claude-ten-hour-project, Task B, 2026-09-07).
//
// This reuses the SAME six-domain keyword taxonomy already defined in
// tools/build-curriculum-coverage.mjs (DOMAIN_RULES) instead of inventing a
// second guessed keyword list, per that task's explicit instruction. It also
// reuses the concept id/name phrase-match convention already used by that
// tool's `directConceptRows` (exact concept id-with-dashes-as-spaces or
// concept name phrase found in the metadata text).
//
// Both matchers are text-only signals over whatever metadata a given catalog
// happens to expose (tags/topic/family/objective/cat/concept/themes/prompt).
// They are an inventory aid, not an authored curriculum binding -- callers
// must still report the resolution method (explicit binding vs keyword
// signal) so the matrix does not overstate confidence.
import { DOMAIN_RULES } from '../build-curriculum-coverage.mjs';

export { DOMAIN_RULES };

export function domainSignalsForText(text) {
  const haystack = String(text || '').toLowerCase();
  return DOMAIN_RULES
    .map(rule => ({ domainId: rule.id, matchedTokens: rule.tokens.filter(token => haystack.includes(token)) }))
    .filter(signal => signal.matchedTokens.length);
}

export function conceptSignalsForText(text, ledger) {
  const haystack = String(text || '').toLowerCase();
  return ledger.concepts
    .filter(concept => {
      const needles = [concept.id.replaceAll('-', ' '), concept.name.toLowerCase()];
      return needles.some(needle => haystack.includes(needle));
    })
    .map(concept => ({ conceptId: concept.id, domainId: concept.domainId }));
}
