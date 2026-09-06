Review the following RinkReads work using the hockey-authority agent:

$ARGUMENTS

Read `.claude/agents/hockey-authority.md` and
`docs/hockey-authority/INDEX.md`. If subagent dispatch is available, delegate
the bounded review to hockey-authority. Otherwise perform it in the Claude
Code session under the same contract and identify that execution mode.

If no scope was supplied, prepare the first assignment in
`docs/hockey-authority/first-3d-review.md`: inventory available evidence and
report missing inputs. Do not invent a completed movement or question review.

Save the returned review under `docs/hockey-authority/reviews/` with a dated,
unique filename. For existing question packets, use their assigned output
location and return schema instead. Do not modify reviewed assets or live data.
