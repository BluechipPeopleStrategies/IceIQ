from pathlib import Path
import subprocess, os, json, hashlib, datetime

root = Path(r'C:\Users\mtsli\IceIQ')
out = root / 'docs/hockey-authority/reviews/2026-09-06-calibration'
out.mkdir(parents=True, exist_ok=True)
claude = Path(r'C:\Users\mtsli\AppData\Roaming\npm\node_modules\@anthropic-ai\claude-code\bin\claude.exe')
paths = ['.claude/agents/hockey-authority.md', 'docs/hockey-authority/review-contract.md',
         'docs/factory/CLAUDE-REVIEW-UPDATE.md', 'docs/factory/claude-review-calibration/cases.json']
prompt = '''You are executing the hockey-authority role's FIRST BLIND HISTORICAL CALIBRATION.
All tools are disabled to keep the answer key inaccessible. Use only the supplied evidence.
Review ALL EIGHT cases independently. The owner wants evidence and appropriate approval, not a ceremonial pass.
For every case resolve actual roles/team/owner/end, evaluate marked answer, all options and feedback, calculate relevant geometry explicitly, separate event/state, and check grammar/comparators.
Return ONLY a JSON object with reviewer, executionMode, calibrationLimits, and cases array. Each case needs id, verdict (PASS/REVISE/HOLD), findings array (issue, evidence, proposedCorrection, uncertainty), and sceneEvidence. A demonstrated defect means REVISE even if other checks are unavailable.
Do not claim rendered review, human approval or certification. Do not refer to an answer key you have not seen.
The correction guide is supplied, so this is blind to the exact answer key, not an unaided or held-out expertise test.
'''
hashes = {}
for name in paths:
    p = root / name
    prompt += '\n\n=== INPUT ' + name + ' ===\n' + p.read_text(encoding='utf-8')
    hashes[name] = hashlib.sha256(p.read_bytes()).hexdigest()
(out/'blind-prompt.txt').write_text(prompt, encoding='utf-8')
env = os.environ.copy()
for key in ['ANTHROPIC_API_KEY','ANTHROPIC_AUTH_TOKEN','CLAUDE_CODE_USE_BEDROCK','CLAUDE_CODE_USE_VERTEX','CLAUDE_CODE_USE_FOUNDRY']:
    env.pop(key, None)
cmd = [str(claude), '-p', '--agent', 'hockey-authority', '--tools', '', '--output-format', 'json', '--no-session-persistence']
record={'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(), 'inputHashes':hashes, 'answerKeySupplied':False,'tools':[], 'auth':'verified claude.ai Max subscription; API environment overrides removed', 'command':cmd}
(out/'run.json').write_text(json.dumps(record,indent=2),encoding='utf-8')
result = subprocess.run(cmd, input=prompt, text=True, encoding='utf-8', capture_output=True, cwd=root, env=env)
(out/'blind-raw.json').write_text(result.stdout,encoding='utf-8')
(out/'blind-stderr.txt').write_text(result.stderr,encoding='utf-8')
record.update(completedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),exitCode=result.returncode,outputSha256=hashlib.sha256(result.stdout.encode()).hexdigest())
(out/'run.json').write_text(json.dumps(record,indent=2),encoding='utf-8')
print(json.dumps({'exitCode':result.returncode,'outputBytes':len(result.stdout),'output':str(out/'blind-raw.json')}),flush=True)
