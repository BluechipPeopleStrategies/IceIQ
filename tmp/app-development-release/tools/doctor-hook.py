#!/usr/bin/env python3
# SessionStart hook for RinkReads Doctor. Runs the fast deterministic pass at most
# once per 24h, and only when RinkReads has changed since the last run. Emits a
# one-line systemMessage. Fails silent on any error (never blocks session start).
import json, os, subprocess, sys, time

ROOT = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
STATE = os.path.join(ROOT, ".claude", ".doctor-state.json")
REPORT = os.path.join(ROOT, "docs", "checkups", "latest.json")
WATCH = ["src", "tools"]

def emit(msg=None):
    print(json.dumps({"systemMessage": msg} if msg else {}))
    sys.exit(0)

def read_state():
    try:
        with open(STATE, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}

def git(args):
    try:
        r = subprocess.run(["git", "-C", ROOT, *args],
                           capture_output=True, text=True, timeout=10)
        return r.stdout
    except Exception:
        return ""

def last_commit_epoch():
    try:
        return int((git(["log", "-1", "--format=%ct"]) or "0").strip() or 0)
    except Exception:
        return 0

def tree_dirty():
    return bool(git(["status", "--porcelain"]).strip())

def newest_mtime(dirs):
    newest = 0.0
    for d in dirs:
        for root, _, files in os.walk(os.path.join(ROOT, d)):
            if "node_modules" in root:
                continue
            for fn in files:
                try:
                    m = os.path.getmtime(os.path.join(root, fn))
                    if m > newest:
                        newest = m
                except OSError:
                    pass
    return newest

def main():
    state = read_state()
    last = float(state.get("lastRun", 0))
    now = time.time()
    if (now - last) < 24 * 3600:
        emit()
    active = (last_commit_epoch() > last) or tree_dirty() or (newest_mtime(WATCH) > last)
    if not active:
        emit()
    try:
        subprocess.run(["node", os.path.join("tools", "rinkreads-doctor.mjs"), "--fast"],
                       cwd=ROOT, capture_output=True, text=True, timeout=120)
    except Exception:
        emit()
    try:
        os.makedirs(os.path.dirname(STATE), exist_ok=True)
        with open(STATE, "w", encoding="utf-8") as f:
            json.dump({"lastRun": now}, f)
    except Exception:
        pass
    try:
        with open(REPORT, encoding="utf-8") as f:
            s = json.load(f).get("summary", {})
        parts = []
        if s.get("bankIssues"): parts.append(f"{s['bankIssues']} bank issues")
        if s.get("seedProblems"): parts.append(f"{s['seedProblems']} seed errors")
        if s.get("brokenImports"): parts.append(f"{s['brokenImports']} broken imports")
        if s.get("unusedFiles"): parts.append(f"{s['unusedFiles']} dead files")
        if s.get("staleDeps"): parts.append(f"{s['staleDeps']} stale deps")
        if s.get("cruft"): parts.append(f"{s['cruft']} cruft files")
        if s.get("ghost"): parts.append("preflight ghost-path")
        summary = ", ".join(parts) if parts else "all clear"
        emit(f"RinkReads checkup: {summary}. See docs/checkups/latest.md; run /checkup to fix.")
    except Exception:
        emit("RinkReads checkup ran. See docs/checkups/latest.md; run /checkup to fix.")

main()
