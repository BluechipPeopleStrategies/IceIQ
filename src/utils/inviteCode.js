// Invite code format. Pure: no storage, no network, no React.
//
// The alphabet deliberately excludes I, L, O, 0 and 1. A parent typing a code
// out of a text message misreads those constantly, and a rejected code at the
// signup screen is the worst possible first impression of the app.

export const INVITE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const INVITE_CODE_LENGTH = 8;

export function normalizeInviteCode(input) {
  if (!input) return '';
  return String(input).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function isValidInviteFormat(input) {
  const code = normalizeInviteCode(input);
  if (code.length !== INVITE_CODE_LENGTH) return false;
  return [...code].every(character => INVITE_ALPHABET.includes(character));
}

// Randomness is injected so this is deterministic under test. Callers in the
// mint script pass a crypto-backed integer source.
export function generateInviteCode(nextInt) {
  let code = '';
  for (let index = 0; index < INVITE_CODE_LENGTH; index += 1) {
    code += INVITE_ALPHABET[nextInt(INVITE_ALPHABET.length)];
  }
  return code;
}

// Grouped for reading aloud or copying into a message.
export function formatInviteCode(input) {
  const code = normalizeInviteCode(input);
  return code.length === INVITE_CODE_LENGTH ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}
