import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const repo = process.cwd();
const source = path.join(repo, 'docs/factory/coaching-panel/choice-repairs-60/packet-02-r2');
const files = ['candidates.json', 'FREEZE.json', 'independent-review.json', 'root-review.json'];

function copyPacket() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'choice-repair-'));
  for (const file of files) fs.copyFileSync(path.join(source, file), path.join(dir, file));
  return dir;
}

function rewriteCandidate(dir, mutate) {
  const file = path.join(dir, 'candidates.json');
  const pack = JSON.parse(fs.readFileSync(file, 'utf8'));
  mutate(pack);
  const bytes = JSON.stringify(pack, null, 2) + '\n';
  fs.writeFileSync(file, bytes);
  const freeze = JSON.parse(fs.readFileSync(path.join(dir, 'FREEZE.json'), 'utf8'));
  freeze.candidateSha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  fs.writeFileSync(path.join(dir, 'FREEZE.json'), JSON.stringify(freeze, null, 2) + '\n');
}

function run(dir) {
  try {
    return { ok: true, output: execFileSync(process.execPath, ['tools/prepare-choice-repair-application.mjs', dir], { cwd: repo, encoding: 'utf8', stdio: 'pipe' }) };
  } catch (error) {
    return { ok: false, output: `${error.stdout || ''}${error.stderr || ''}${error.message || ''}` };
  }
}

test('prepares a real frozen packet without bank writes', () => {
  const dir = copyPacket();
  try {
    const result = run(dir);
    assert.equal(result.ok, true, result.output);
    const adjudicated = JSON.parse(fs.readFileSync(path.join(dir, 'adjudicated-packet.json'), 'utf8'));
    assert.equal(adjudicated.changes.length, 2);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('rejects a mismatched top-level reviewer', () => {
  const dir = copyPacket();
  try {
    const file = path.join(dir, 'independent-review.json');
    const review = JSON.parse(fs.readFileSync(file, 'utf8')); review.reviewer = 'forged-reviewer';
    fs.writeFileSync(file, JSON.stringify(review, null, 2) + '\n');
    const result = run(dir);
    assert.equal(result.ok, false);
    assert.match(result.output, /Unexpected independent review provenance/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('rejects duplicate repair identity', () => {
  const dir = copyPacket();
  try {
    rewriteCandidate(dir, pack => { pack.changes.push(structuredClone(pack.changes[0])); });
    const result = run(dir);
    assert.equal(result.ok, false);
    assert.match(result.output, /Duplicate repair/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('rejects a forged after hash even when reviews repeat it', () => {
  const dir = copyPacket();
  try {
    rewriteCandidate(dir, pack => { pack.changes[0].afterHash = '0'.repeat(64); });
    for (const name of ['independent-review.json', 'root-review.json']) {
      const file = path.join(dir, name), review = JSON.parse(fs.readFileSync(file, 'utf8'));
      review.rows[0].contentHash = '0'.repeat(64);
      fs.writeFileSync(file, JSON.stringify(review, null, 2) + '\n');
    }
    const result = run(dir);
    assert.equal(result.ok, false);
    assert.match(result.output, /Candidate hash is not its actual payload/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
