# Five-question repair release

Released commit `5536aed68053c28602a61b0315888ea5103ec83c` to production on 2026-09-06. GitHub's Vercel status reports success: [deployment](https://vercel.com/bluechippeoplestrategies-projects/ice-iq/EEry92mdgdcZFeVyvEobKNbzEau2).

Scope: q5 in U13 scenes 002, 003, 006, 011 and 012. Setups and unrelated questions are unchanged. Scene versions, expansion bindings, current hashes and catalog are refreshed. Earlier rejected drafts and reviews are preserved. AI content clearance is not human coaching approval or tactical mastery certification.

Verification:

- 55 regression tests passed, including stale content, missing/distinct reviewer identity, invalid answers and input-preservation checks for the repair preparation tool.
- Production build and feedback release-boundary check passed. Existing bundle-size warnings remain.
- All five local question flows displayed their reviewed wording, accepted the keyed option and showed the expected confirmation. The support-angle scene rendered in 3D. These were response-flow checks, not new validation of all scene artwork.
- Live production q012 displayed the new defender-location comparison and returned “Yep, you got it.” The local-only coaching feedback form was absent from that production view.
- The longer q012 choices and feedback remained readable at a 390 × 844 viewport, with document content/client widths both 375 px (no horizontal overflow). The viewport was reset after inspection.
- Exact application identities and full before/after payloads are in `application-receipt.json`.

The remaining 78 lexical candidates are a separate review queue. This release does not clear or repair those questions.
