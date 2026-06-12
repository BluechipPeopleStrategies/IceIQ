// Supabase service-role sink for coach verdicts. Used by gauntlet-audit --sink supabase.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

function loadEnv() {
  const env = {};
  try {
    for (const line of readFileSync(join(ROOT, ".env"), "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
      if (m) env[m[1]] = m[2];
    }
  } catch { /* no .env */ }
  return env;
}

// Returns { upsert(row) }. Throws if env is missing (caller surfaces it).
export function createCoachSink() {
  const env = { ...loadEnv(), ...process.env };
  const url = env.VITE_SUPABASE_URL, key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  const sb = createClient(url, key, { auth: { persistSession: false } });
  return {
    async upsert(row) {
      const { error } = await sb.from("coach_reviews").upsert(row, { onConflict: "scenario_id" });
      if (error) throw new Error(error.message);
    },
  };
}
