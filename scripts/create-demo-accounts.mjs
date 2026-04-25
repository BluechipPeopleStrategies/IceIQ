// Creates three shareable demo accounts in Supabase so people can log in
// and try Ice-IQ at different tiers without signing up. Idempotent — re-
// running the script repairs any missing profile fields without
// duplicating users.
//
// Usage:
//   node scripts/create-demo-accounts.mjs            # dry-run summary
//   node scripts/create-demo-accounts.mjs --apply    # create the accounts
//   node scripts/create-demo-accounts.mjs --reset    # delete + recreate
//
// Requires in .env (see scripts/smoke-homework.mjs for reference):
//   VITE_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// PREREQUISITE: run supabase/migration_0009_profile_tier.sql in the
// Supabase Dashboard SQL editor first. Without that column, the script
// will create the auth users + profiles but tier won't take effect —
// resolveTier() reads profile.tier and falls back to FREE.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function loadEnv() {
  const env = {};
  try {
    const raw = readFileSync(join(ROOT, ".env"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
      if (m) env[m[1]] = m[2];
    }
  } catch {}
  return env;
}

const env = { ...loadEnv(), ...process.env };
const url = env.VITE_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const APPLY = process.argv.includes("--apply");
const RESET = process.argv.includes("--reset");

// ─────────────────────────────────────────────────────────────────────
// The three accounts. Shared password so the user can copy one block
// into a coach DM and have everything work. Emails use the @iceiq.demo
// domain so they read as obvious "this is a sample account."

const SHARED_PASSWORD = "IceIQDemo2026!";

const ACCOUNTS = [
  {
    email: "demo-free@iceiq.demo",
    profile: {
      role: "player",
      name: "Demo Player (Free)",
      level: "U11 / Atom",
      position: "Forward",
      season: "2025-26",
      session_length: 10,
      tier: "FREE",
    },
    description: "Free-tier player. Sees the FREE journey, the upgrade-to-Pro prompts, capped weekly quiz count. Perfect for showing parents what the on-ramp feels like.",
  },
  {
    email: "demo-pro@iceiq.demo",
    profile: {
      role: "player",
      name: "Demo Player (Pro)",
      level: "U13 / Peewee",
      position: "Forward",
      season: "2025-26",
      session_length: 10,
      tier: "PRO",
    },
    description: "Pro-tier player. Unlimited quizzes, full Journey, Skills Map, mastery tracking, speed-bonus scoring, all interactive question types. The full player experience.",
  },
  {
    email: "demo-coach@iceiq.demo",
    profile: {
      role: "coach",
      name: "Demo Coach",
      level: "U13 / Peewee",
      season: "2025-26",
      tier: "TEAM",
    },
    description: "Coach on the Team plan. Coach dashboard, team analytics, homework assignments, training-log visibility, team challenges. Use this to pitch coaches.",
  },
];

// ─────────────────────────────────────────────────────────────────────
// Helpers

function ok(msg)  { console.log(`  ✓ ${msg}`); }
function info(m)  { console.log(`  · ${m}`); }
function fail(m, e) { console.error(`  ✗ ${m}:`, e?.message || e); process.exitCode = 1; }

async function findUserByEmail(email) {
  // The admin API doesn't expose a single get-by-email; we paginate the
  // user list. Three accounts is small enough that page 1 always covers
  // the demos when a real user base is in play.
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  return (data?.users || []).find(u => (u.email || "").toLowerCase() === email.toLowerCase()) || null;
}

async function ensureUser(email, password) {
  const existing = await findUserByEmail(email);
  if (existing) return { user: existing, created: false };
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (error) throw error;
  return { user: data.user, created: true };
}

async function ensureProfile(userId, profile) {
  // Try update first; insert if no row exists.
  const { data: updated, error: upErr } = await admin.from("profiles")
    .update({ ...profile, updated_at: new Date().toISOString() })
    .eq("id", userId).select().maybeSingle();
  if (upErr && upErr.code !== "PGRST116") throw upErr;
  if (updated) return { row: updated, created: false };
  const { data: inserted, error: insErr } = await admin.from("profiles")
    .insert({ id: userId, ...profile }).select().single();
  if (insErr) throw insErr;
  return { row: inserted, created: true };
}

async function deleteAccount(email) {
  const u = await findUserByEmail(email);
  if (!u) return false;
  // Cascade through profiles → teams → assignments handles the rest.
  await admin.auth.admin.deleteUser(u.id).then(() => {}, () => {});
  return true;
}

// ─────────────────────────────────────────────────────────────────────
// Main

async function main() {
  console.log(`Ice-IQ demo accounts → ${url}\n`);

  if (RESET) {
    if (!APPLY) {
      console.log("DRY RUN. Pass --apply with --reset to actually delete + recreate.");
      return;
    }
    console.log("Resetting (delete + recreate):");
    for (const a of ACCOUNTS) {
      const removed = await deleteAccount(a.email);
      if (removed) info(`deleted existing ${a.email}`);
    }
    console.log("");
  }

  if (!APPLY) {
    console.log("DRY RUN. Pass --apply to create the accounts.");
    console.log("");
    for (const a of ACCOUNTS) {
      console.log(`  → would ensure ${a.email} (${a.profile.tier}, ${a.profile.role})`);
    }
    return;
  }

  for (const a of ACCOUNTS) {
    try {
      const { user, created } = await ensureUser(a.email, SHARED_PASSWORD);
      ok(`${created ? "created" : "found"} auth user ${a.email}`);
      const { row, created: profileCreated } = await ensureProfile(user.id, a.profile);
      ok(`${profileCreated ? "created" : "updated"} profile · tier=${row.tier} · role=${row.role}`);
    } catch (e) {
      fail(`${a.email}`, e);
    }
  }

  console.log("\n────────────────────────────────────────────────");
  console.log("DEMO ACCOUNTS — share these credentials");
  console.log("────────────────────────────────────────────────\n");
  console.log(`Password (all three): ${SHARED_PASSWORD}\n`);
  for (const a of ACCOUNTS) {
    console.log(`  ${a.profile.tier.padEnd(5)}  ${a.email}`);
    console.log(`         ${a.description}`);
    console.log("");
  }
  console.log("If tier doesn't take effect, the migration may not have run:");
  console.log("  supabase/migration_0009_profile_tier.sql\n");
}

try { await main(); }
catch (e) { fail("demo account setup", e); }
process.exit(process.exitCode || 0);
