// One-shot raw archive of the RinkReads Notion databases. The existing
// scripts/export-pov-from-notion.mjs flattens to a 12-property app-shape;
// this script preserves every Notion property (24 on Image Library, ~13 on
// Image Questions) so the archive captures everything before we park Notion.
//
// Output: archive/notion-2026-05-02/databases/{image-library,image-questions}.raw.json
//
// Reads NOTION_TOKEN from .env. Read-only against Notion.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT_DIR = resolve(ROOT, 'archive/notion-2026-05-02/databases');

const IMAGE_LIBRARY_ID   = '54c022917f7c43d7b0af357408c017a4';
const IMAGE_QUESTIONS_ID = 'f5e1886f3e864625acd9dc4f90776245';
const NOTION_VERSION     = '2022-06-28';

function loadEnv() {
  const env = {};
  try {
    const raw = readFileSync(resolve(ROOT, '.env'), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
      if (m) env[m[1]] = m[2];
    }
  } catch {}
  return env;
}

const env = loadEnv();
const TOKEN = env.NOTION_TOKEN || process.env.NOTION_TOKEN;
if (!TOKEN) {
  console.error('NOTION_TOKEN missing from .env');
  process.exit(1);
}

async function queryAll(databaseId) {
  const all = [];
  let cursor;
  while (true) {
    const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ start_cursor: cursor, page_size: 100 }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Notion ${res.status}: ${text}`);
    }
    const data = await res.json();
    all.push(...data.results);
    if (!data.has_more) break;
    cursor = data.next_cursor;
  }
  return all;
}

// Strip presigned S3 URLs (1-hour expiry) from File-property values so the
// archive doesn't bake in dead URLs or trip GitHub secret scanning.
function sanitize(obj) {
  if (Array.isArray(obj)) return obj.map(sanitize);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === 'url' && typeof v === 'string' && v.includes('prod-files-secure.s3') && v.includes('X-Amz-')) {
        out[k] = '[redacted-presigned-s3-url]';
      } else if (k === 'signed_url' && typeof v === 'string') {
        out[k] = '[redacted-signed-url]';
      } else {
        out[k] = sanitize(v);
      }
    }
    return out;
  }
  return obj;
}

mkdirSync(OUT_DIR, { recursive: true });

console.log('Fetching Image Library…');
const libraryRows = await queryAll(IMAGE_LIBRARY_ID);
console.log('  ', libraryRows.length, 'rows');
writeFileSync(
  resolve(OUT_DIR, 'image-library.raw.json'),
  JSON.stringify({ fetchedAt: new Date().toISOString(), source: 'notion-database', databaseId: IMAGE_LIBRARY_ID, rows: sanitize(libraryRows) }, null, 2),
);

console.log('Fetching Image Questions…');
const questionRows = await queryAll(IMAGE_QUESTIONS_ID);
console.log('  ', questionRows.length, 'rows');
writeFileSync(
  resolve(OUT_DIR, 'image-questions.raw.json'),
  JSON.stringify({ fetchedAt: new Date().toISOString(), source: 'notion-database', databaseId: IMAGE_QUESTIONS_ID, rows: sanitize(questionRows) }, null, 2),
);

console.log('\n✓ Archive written to', OUT_DIR);
