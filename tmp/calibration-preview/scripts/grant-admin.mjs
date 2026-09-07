// Grant or revoke admin access on the RinkReads admin dashboard.
//
// Usage:
//   node scripts/grant-admin.mjs <email>            # grant admin
//   node scripts/grant-admin.mjs <email> --revoke   # revoke admin
//   node scripts/grant-admin.mjs --list             # list current admins
//
// Looks up the user via auth.users using the service-role key, then sets
// profiles.is_admin. Re-runnable.
//
// Requires in .env:
//   VITE_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
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

const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

const args = process.argv.slice(2);
const wantList = args.includes("--list");
const wantRevoke = args.includes("--revoke");
const email = args.find(a => !a.startsWith("--"));

if (wantList) {
  const { data, error } = await sb
    .from("profiles")
    .select("id, name, is_admin")
    .eq("is_admin", true);
  if (error) { console.error(error.message); process.exit(1); }
  if (!data?.length) { console.log("No admins set."); process.exit(0); }

  // Resolve emails for the listed admin profiles
  const { data: users } = await sb.auth.admin.listUsers({ perPage: 1000 });
  const emailById = new Map((users?.users || []).map(u => [u.id, u.email]));

  console.log("Current admins:");
  for (const p of data) {
    const e = emailById.get(p.id) || "(email unknown)";
    console.log(`  ${e}  —  ${p.name || "(no name)"}  —  ${p.id}`);
  }
  process.exit(0);
}

if (!email) {
  console.error("Usage: node scripts/grant-admin.mjs <email> [--revoke]");
  console.error("       node scripts/grant-admin.mjs --list");
  process.exit(1);
}

// Look up user by email via the admin auth API. Pages through up to 1k users.
const { data: list, error: listErr } = await sb.auth.admin.listUsers({ perPage: 1000 });
if (listErr) { console.error(listErr.message); process.exit(1); }
const user = (list?.users || []).find(u => (u.email || "").toLowerCase() === email.toLowerCase());
if (!user) {
  console.error(`No auth.users row found for "${email}".`);
  console.error("The user must sign up via the app first so a profile row exists.");
  process.exit(1);
}

// Make sure profile row exists. Schema comment in supabase/schema.sql says the
// app creates profile rows on signup; if the user signed up but never finished
// onboarding, the row may be missing. Insert a minimal row so is_admin can be set.
const { data: existing } = await sb.from("profiles").select("id, is_admin, name").eq("id", user.id).maybeSingle();
if (!existing) {
  const { error: insErr } = await sb.from("profiles").insert({
    id: user.id,
    role: "coach",                  // role is a NOT NULL check-constraint column; coach is safe for admin users
    name: (user.email || "admin").split("@")[0],
    is_admin: !wantRevoke,
  });
  if (insErr) { console.error(insErr.message); process.exit(1); }
  console.log(`Created profile row for ${email} with is_admin = ${!wantRevoke}.`);
  process.exit(0);
}

const target = !wantRevoke;
if (existing.is_admin === target) {
  console.log(`No change: ${email} already has is_admin = ${target}.`);
  process.exit(0);
}

const { error: updErr } = await sb.from("profiles").update({ is_admin: target }).eq("id", user.id);
if (updErr) { console.error(updErr.message); process.exit(1); }

console.log(`${target ? "Granted" : "Revoked"} admin for ${email} (profile.id = ${user.id}).`);
