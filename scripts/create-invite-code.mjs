// Mint an invite code for a beta participant.
//
//   node scripts/create-invite-code.mjs --label "Coach D, U11" --wave 0
//   node scripts/create-invite-code.mjs --label "Thomas" --uses 999 --wave 0
//
// Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment. The
// service role key bypasses RLS, which is why this is a script you run and not
// anything that ships in the app.
//
// Codes use an alphabet without I, L, O, 0 or 1, because these get typed by a
// parent reading them out of a text message.
import { randomInt } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { INVITE_ALPHABET, formatInviteCode, generateInviteCode } from '../src/utils/inviteCode.js';

function arg(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`);
  return index > -1 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const label = arg('label');
const wave = Number(arg('wave', '0'));
const uses = Number(arg('uses', '1'));
const days = Number(arg('days', '60'));

if (!label) {
  console.error('A --label is required. It records who the code was issued to, so a redemption is traceable.');
  process.exit(1);
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this.');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const code = generateInviteCode(max => randomInt(max));
const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

const { error } = await supabase.from('invite_codes').insert({
  code, label, wave, max_uses: uses, expires_at: expires,
});

if (error) {
  console.error('Could not create the code:', error.message);
  process.exit(1);
}

console.log(`\n  ${formatInviteCode(code)}\n`);
console.log(`  for:     ${label}`);
console.log(`  wave:    ${wave}`);
console.log(`  uses:    ${uses}`);
console.log(`  expires: ${expires.slice(0, 10)}`);
console.log(`\n  Alphabet excludes I, L, O, 0 and 1, so it can be read aloud safely.\n`);
console.log(`  Sanity check before sending: every character is in ${INVITE_ALPHABET}\n`);
