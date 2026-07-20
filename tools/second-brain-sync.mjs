#!/usr/bin/env node
// Stop hook (Codex + Claude Code): append new RinkReads/IceIQ commits to the
// Second Brain Obsidian vault, so coding work in either tool stays visible
// outside the repo without manual "capture that" calls.
// Fails silent on any error and never blocks the session.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.env.RINKREADS_SYNC_ROOT || process.env.CLAUDE_PROJECT_DIR || 'C:\\Users\\mtsli\\IceIQ';
const VAULT_NOTE = process.env.RINKREADS_SYNC_NOTE || 'C:\\Users\\mtsli\\SecondBrain\\Command Center\\Projects\\RinkReads\\RinkReads - Commit Log.md';
const STATE = process.env.RINKREADS_SYNC_STATE || path.join(ROOT, '.claude', '.second-brain-sync-state.json');
const SECTION = '## Commit log (auto-synced)';
// Files that mark a real decision/spec, flagged inline instead of just "docs: ...".
const SPEC_MARKERS = ['docs/superpowers/specs/', 'docs/superpowers/plans/', 'docs/roadmap/TASKS.md'];

function emit(msg) {
  if (msg) process.stdout.write(JSON.stringify({ systemMessage: msg }));
  process.exit(0);
}

function git(args) {
  try {
    return execFileSync('git', ['-C', ROOT, ...args], { encoding: 'utf8', timeout: 10000 });
  } catch {
    return '';
  }
}

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE, 'utf8'));
  } catch {
    return {};
  }
}

function writeState(state) {
  try {
    fs.mkdirSync(path.dirname(STATE), { recursive: true });
    fs.writeFileSync(STATE, JSON.stringify(state));
  } catch {
    // never block on state write failure
  }
}

try {
  const head = git(['rev-parse', 'HEAD']).trim();
  if (!head) emit();

  const state = readState();
  if (!state.lastCommit) {
    // First run: baseline to current HEAD only, don't backfill history.
    writeState({ lastCommit: head });
    emit();
  }
  if (state.lastCommit === head) emit();

  const range = `${state.lastCommit}..${head}`;
  const log = git(['log', '--format=%H|%h|%ad|%s', '--date=short', '--reverse', range]);
  const commits = log
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [full, short, date, ...subjectParts] = line.split('|');
      return { full, short, date, subject: subjectParts.join('|') };
    });

  if (!commits.length) {
    writeState({ lastCommit: head });
    emit();
  }

  const lines = commits.map((c) => {
    const files = git(['show', '--name-only', '--format=', c.full])
      .split('\n')
      .filter(Boolean);
    const specHit = files.find((f) => SPEC_MARKERS.some((m) => f === m || f.startsWith(m)));
    const note = specHit ? ` — 📄 ${specHit}` : '';
    return `- ${c.date} \`${c.short}\` ${c.subject}${note}`;
  });

  let note = fs.readFileSync(VAULT_NOTE, 'utf8');
  if (!note.includes(SECTION)) {
    note += `\n\n${SECTION}\n\n_Auto-appended by \`tools/second-brain-sync.mjs\` (Codex + Claude Code Stop hook). Edit "Notes & thinking" above for manual capture; don't hand-edit below this line._\n`;
  }
  fs.writeFileSync(VAULT_NOTE, `${note.trimEnd()}\n${lines.join('\n')}\n`);

  writeState({ lastCommit: head });
  emit(`Second Brain: logged ${commits.length} new RinkReads commit(s) to Command Center/Projects/RinkReads/RinkReads - Commit Log.md`);
} catch {
  process.exit(0);
}
