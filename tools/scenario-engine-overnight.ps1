#requires -Version 5.1
# scenario-engine-overnight.ps1 - the 2026-07-29 overnight scenario-engine build.
#
# Headless-invokes Claude Code (Opus 5, max effort, ultracode multi-agent orchestration
# authorized) to build the RinkReads scenario engine from the design spec at
#   docs/superpowers/specs/2026-07-29-scenario-engine-design.md
#
# "Do not stop until it works" is implemented as a RESUME LOOP: each pass is a headless
# claude run; if the agent has not written the DONE sentinel, the next pass resumes the
# same conversation with --continue. Up to -MaxPasses passes, then it stops and reports.
#
# Guardrails (also restated inside the prompt, since the prompt is what the model reads):
#   - never push to master/main, never open a PR, never deploy, never post anything
#   - never overwrite src/data/bank.json in place; stage and promote through the gate
#   - all existing npm gates must stay green; commit locally as it goes
#
# Permissions: an unattended run cannot answer prompts, so this uses
# --dangerously-skip-permissions. Acceptable here because the work is local-only: read,
# write, test, commit. Nothing is pushed, published, or sent.
#
# Register with register-scenario-engine-task.ps1 (once, by hand - task registration is
# blocked from inside a Claude sandbox).
[CmdletBinding()]
param(
  [string]$RepoDir = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
  [int]$MaxPasses = 8,
  [string]$Model = 'claude-opus-5',
  [string]$Effort = 'max',
  [string]$ClaudeExe
)
$ErrorActionPreference = 'Stop'

if (-not $ClaudeExe) {
  $c = Get-Command claude -ErrorAction SilentlyContinue
  if (-not $c) { throw "Claude Code CLI ('claude') not found on PATH. Pass -ClaudeExe <path>." }
  $ClaudeExe = $c.Source
}

$logDir = Join-Path $PSScriptRoot 'logs\scenario-engine'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$stamp = Get-Date -Format 'yyyy-MM-dd_HHmmss'
$log   = Join-Path $logDir "$stamp.log"

# The agent writes this file when the build is genuinely done and verified. Its presence
# ends the resume loop; its absence means "keep going".
$doneFile = Join-Path $RepoDir 'docs\factory\SCENARIO-ENGINE-DONE.md'
if (Test-Path $doneFile) { Remove-Item $doneFile -Force }

$specRel = 'docs/superpowers/specs/2026-07-29-scenario-engine-design.md'
$specAbs = Join-Path $RepoDir ($specRel -replace '/', '\')

$firstPrompt = @"
ultracode

You are building the RinkReads scenario engine tonight, autonomously, start to finish.

READ FIRST, in this order:
1. docs/factory/SCENARIO-ENGINE-DECISIONS.md -- AUTHORITATIVE owner decisions. Where it
   and the spec disagree, the decisions file WINS and the spec must be reconciled to it.
   Three decisions matter most: (a) FREE ONLY - no paid API key, ever; the Claude session
   is the judge and local Ollama does the mechanical bulk, (b) the coach video MVP is a
   coach AUTHORING their own play, not exporting a catalog play, (c) tiered auto-approve
   with a conservative, single-point-tunable confidence threshold.
2. $specRel  -- the design spec. It was written today by a six-agent audit of this repo
   plus a three-lens adversarial review. It is your build plan. Follow its build order,
   corrected by the decisions file.
3. CLAUDE.md and AGENTS.md at the repo root.
4. docs/roadmap/TASKS.md -- where this sits in the roadmap.

If that spec file does not exist, do NOT improvise a different plan: audit the scenario
creation surface yourself first (src/play/kernels/, src/play/noveltyGate.js,
src/play/artLint.js, scripts/, tools/, docs/factory/, docs/ai-pipeline/, src/data/),
write the spec, then build from it.

WHAT THE OWNER ASKED FOR, verbatim:
- "Create a scenario engine that will allow for the mass production of content for the
  training app with limited input needed."
- "Build this out so that coaches can create videos. I just want to get to a minimal
  viable product."
- "Do not stop until you have an engine that can realistically create hundreds of
  scenarios and questions a day that would then go into the app."
- "Really tighten the app up so we can have generative AI use judgment to create hockey
  questions that are meaningful and accurate for people to answer."
- "Do not stop until you have hockey strategies and tactics that can be used in
  questions, and self-verifies and updates based on the judgment that it would create
  for itself."

That last one is the heart of it. The engine must hold real tactical hockey knowledge,
generate scenarios and questions from it, JUDGE its own output for hockey accuracy and
pedagogical meaningfulness, and UPDATE its own knowledge and rules from what those
judgments teach it. Build that closed loop for real, in code, with the learning written
back to disk.

DEFINITION OF DONE - all of these, demonstrated, not asserted:
A. A single command generates a batch of scenarios + questions end to end with no
   hand-authoring, and you have RUN it and shown the real output.
B. Measured throughput arithmetic from that real run supports hundreds of publishable
   scenarios and questions per day. If it does not, name the bottleneck and fix it.
C. A machine-readable tactical hockey knowledge base exists, is seeded with real
   principles, and the generator demonstrably reasons over it.
D. The self-verification loop runs: generated items are judged, rejects are rejected
   with reasons, and at least one real judgment has been written back into the knowledge
   base or lessons ledger. Show the before and after.
E. Correctness is defended: explain and demonstrate why a shipped item's "correct"
   answer is actually correct. Geometry-decided answers stay correct-by-construction.
F. Coach video MVP: a coach can AUTHOR their own play -- place players, draw routes, mark
   the read, name the options -- and get a rendered, exportable artifact out of it. The
   coach's drawing must compile down to the same play format the existing engine already
   animates, so authored plays flow through the same pipeline and gates as generated ones.
   Read COACHES_WHITEBOARD.md before designing this from scratch.
G. Every existing npm gate is green. Run them and paste the output.
H. Work is committed locally in coherent commits.

HARD GUARDRAILS - these are absolute:
- FREE ONLY. Do NOT add, request, or depend on a paid API key (Anthropic, OpenAI, Gemini,
  anything metered). YOU are the hockey judge; local Ollama at http://localhost:11434
  (llama3.1:8b, hermes3:8b, deepseek-r1:8b, nomic-embed-text) does the mechanical bulk.
  An 8B local model is NEVER the authority on whether a hockey read is correct.
- Do NOT git push. Do NOT open a PR. Do NOT merge to master or main. Do NOT deploy.
  Do NOT post or send anything anywhere. Thomas reviews in the morning.
- Do NOT overwrite src/data/bank.json or src/data/povQuestions.json in place with
  generated content. Generate into a staging bank and promote only through the existing
  gate, so a bad batch can never corrupt shipped content.
- Do NOT weaken, skip, or delete an existing test or gate to make something pass.
- Never ship a question whose correctness the engine cannot justify from the knowledge
  base or from kernel geometry.
- Work on the current branch (feature/shareable-beta) or a new local branch off it.

HOW TO WORK:
- You have the whole night and a max-effort Opus session. Use multi-agent workflows for
  the parallelizable parts (surveying, generating candidate batches, adversarial judging
  of output). Verify adversarially before you believe your own results.
- Verify by looking at the artifact, not at your own report about it. Run the command,
  read the generated JSON, check the question actually renders and is answerable.
- Commit after each build step so an interrupted night still leaves value.
- Keep a running log at docs/factory/SCENARIO-ENGINE-BUILD-LOG.md: what you built, what
  you verified with which command, what failed, what is left. Update it as you go, not
  at the end. This is the resume point if the session is interrupted.

WHEN AND ONLY WHEN every item A through H is genuinely done and verified, write
docs/factory/SCENARIO-ENGINE-DONE.md containing: what was built, the real measured
throughput numbers, the verification commands you ran with their output, what is
deliberately left for Thomas to decide, and the exact first thing he should look at.
Writing that file ends the run - so do not write it early. If you are not done, just
keep working; you will be resumed automatically.

Begin.
"@

$resumePrompt = @"
Continue the scenario engine build. Re-read docs/factory/SCENARIO-ENGINE-BUILD-LOG.md
and $specRel to re-anchor, then keep going from where you stopped.

The same hard guardrails apply: no push, no PR, no merge, no deploy, nothing posted or
sent; never overwrite src/data/bank.json in place; never weaken a gate.

Do not stop while any of the definition-of-done items A through H is still unmet. When
all of them are genuinely done and verified, write docs/factory/SCENARIO-ENGINE-DONE.md
as specified. Keep updating the build log as you go.
"@

"[$(Get-Date -Format o)] scenario-engine overnight build starting" | Tee-Object -FilePath $log -Append
"  repo=$RepoDir  model=$Model  effort=$Effort  maxPasses=$MaxPasses" | Tee-Object -FilePath $log -Append
"  spec=$specAbs (exists: $(Test-Path $specAbs))" | Tee-Object -FilePath $log -Append

Push-Location $RepoDir
try {
  for ($pass = 1; $pass -le $MaxPasses; $pass++) {
    "[$(Get-Date -Format o)] --- pass $pass/$MaxPasses ---" | Tee-Object -FilePath $log -Append

    $common = @('--model', $Model, '--effort', $Effort, '--dangerously-skip-permissions')
    $t0 = Get-Date
    if ($pass -eq 1) {
      & $ClaudeExe -p $firstPrompt @common *>> $log
    } else {
      & $ClaudeExe -p $resumePrompt --continue @common *>> $log
    }
    $code = $LASTEXITCODE
    $elapsed = (Get-Date) - $t0
    "[$(Get-Date -Format o)] pass $pass exited $code after $([int]$elapsed.TotalMinutes)m" | Tee-Object -FilePath $log -Append

    if (Test-Path $doneFile) {
      "[$(Get-Date -Format o)] DONE sentinel found after pass $pass - build reports complete." | Tee-Object -FilePath $log -Append
      break
    }

    # A pass that fails in under 5 minutes did not do real work - it hit a usage limit,
    # an auth problem, or a startup error. Retrying immediately just burns the remaining
    # passes in a few minutes, so back off long enough for a limit window to reset.
    if ($code -ne 0 -and $elapsed.TotalMinutes -lt 5) {
      "[$(Get-Date -Format o)] fast failure - backing off 45m before pass $($pass + 1) (likely usage limit or auth)." | Tee-Object -FilePath $log -Append
      Start-Sleep -Seconds 2700
    } else {
      Start-Sleep -Seconds 20
    }
  }
} finally {
  Pop-Location
}

if (Test-Path $doneFile) {
  "[$(Get-Date -Format o)] finished COMPLETE. Read: $doneFile" | Tee-Object -FilePath $log -Append
} else {
  "[$(Get-Date -Format o)] finished INCOMPLETE after $MaxPasses passes. Resume point: docs\factory\SCENARIO-ENGINE-BUILD-LOG.md" | Tee-Object -FilePath $log -Append
  Write-Warning "scenario-engine build did not signal done. See $log"
}
"[$(Get-Date -Format o)] log: $log" | Tee-Object -FilePath $log -Append
