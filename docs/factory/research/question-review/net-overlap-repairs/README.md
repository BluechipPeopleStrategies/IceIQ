# Net-overlap repairs

Nine audited scenes now place their actors outside the actual PracticeScene goal footprint. Six goalies and three skaters were moved. Behind-net carriers keep their puck at the blade; the two goalie outlets preserve current possession. Two prompts now specify a Gold skater, avoiding ambiguity with the goalie.

- 9 scene versions bumped; 58 affected question hashes refreshed; 191 other scenes unchanged.
- All 200 opening scenes and 295 placement examples pass the net-footprint regression, including rendered pucks.
- 28 targeted tests passed and the isolated production build passed. Existing chunk-size and mixed-import warnings remain.
- All nine repaired opening views were captured and inspected at desktop and phone sizes (18 captures), without load failures or horizontal overflow.
- All ten affected placement questions submitted and retained coordinates/feedback after reload.
- Independent AI review covered all 58 affected question versions. This is not human coach approval or exhaustive animation/collision testing.

[Desktop comparison sheet](desktop-sheet.png) · [Phone comparison sheet](phone-sheet.png) · [Exact before/after receipt](receipt.json) · [Independent recheck](independent-review.json) · [Browser evidence](browser-verification.json)

The original September 6 audit is historical evidence. Its nine findings are repaired in this release candidate, not erased from that snapshot. Old packet review labels do not carry over to changed question hashes. The generated catalog correctly marks these 58 versions as awaiting the normal review-status admission process; independent repair review is retained separately here.

Prepared on `codex/net-overlap-repairs` from production release `3851cae`. No push or production deployment was performed for this repair.

## Reproduce

```powershell
node --test tools/net-overlap-regressions.test.mjs tools/packet-geometry-regressions.test.mjs src/one-on-one/experimentalBankCore.test.mjs src/one-on-one/experimentalExpansionCore.test.mjs src/one-on-one/practiceQuestionSelection.test.mjs
node tools/verify-net-repair-receipt.mjs
npm run build
```

`repair-net-overlaps.mjs` is a one-time, baseline-specific migration and refuses to rerun when its receipt exists. Do not delete the receipt to force a repeat.
