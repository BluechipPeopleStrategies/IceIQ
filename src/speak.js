// Text-to-speech via the browser's built-in Web Speech API. Free, client-side,
// no backend or API cost. Reads question prompts + choices aloud for players who
// would rather hear the read (younger bands, hands-free). Quality is the device's
// own voice — good on Apple, decent elsewhere.
const SUPPORTED = typeof window !== "undefined"
  && "speechSynthesis" in window
  && typeof SpeechSynthesisUtterance !== "undefined";

const READ_ALOUD_KEY = "rinkreads_read_aloud";

export function ttsSupported() { return SUPPORTED; }

export function stopSpeaking() {
  if (!SUPPORTED) return;
  try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
}

// ── Coach voices ─────────────────────────────────────────────────────────────
//
// Every coach used to speak in the one system default voice. Four personas with
// four faces, four written voices, and a single spoken one — and, because the
// default is usually male, Coach Marques (the only woman on the staff) spoke in
// a man's voice. Thomas flagged it directly: "when the female's giving feedback
// it's a female coach voice, and when the male's giving feedback it's a male
// voice, and they also have to be different based on the coaching personalities
// we have."
//
// The Web Speech API gives no gender field, so we match on the voice names the
// platforms actually ship. Unknown voices are left unclassified rather than
// guessed at — a wrong guess is worse than the default.
const FEMALE_HINTS = [
  "female", "samantha", "victoria", "karen", "moira", "tessa", "fiona", "serena",
  "allison", "ava", "susan", "zira", "hazel", "catherine", "linda", "heather",
  "google uk english female", "google us english female",
];
const MALE_HINTS = [
  "male", "alex", "daniel", "fred", "tom", "aaron", "arthur", "oliver", "rishi",
  "david", "mark", "george", "james", "guy", "ryan",
  "google uk english male", "google us english male",
];

function voiceList() {
  if (!SUPPORTED) return [];
  try { return window.speechSynthesis.getVoices() || []; } catch { return []; }
}

function classify(voice) {
  const n = (voice?.name || "").toLowerCase();
  if (FEMALE_HINTS.some(h => n.includes(h))) return "female";
  if (MALE_HINTS.some(h => n.includes(h))) return "male";
  return null;
}

/**
 * Pick a voice for a coach.
 *
 * `gender` narrows the pool; `variant` then spreads the personas across whatever
 * distinct voices that pool has, so two coaches of the same gender don't sound
 * identical. English voices are preferred, and if nothing matches we return null
 * and the browser default is used — deliberately, rather than forcing a voice
 * that might be the wrong language.
 */
export function pickVoice({ gender = null, variant = 0 } = {}) {
  const all = voiceList();
  if (!all.length) return null;
  const english = all.filter(v => (v.lang || "").toLowerCase().startsWith("en"));
  const pool = english.length ? english : all;
  const matching = gender ? pool.filter(v => classify(v) === gender) : pool;
  const usable = matching.length ? matching : pool;
  return usable[variant % usable.length] || null;
}

// Per-persona voice settings. `gender` is the coach's own, taken from the
// avatars in public/assets/coaches (verified 2026-08-03, confirmed by Thomas):
// Marques is the one woman; Kincaid, Danno and Kowalski are men. `variant`
// spreads the three men across distinct voices, and rate/pitch carry each
// persona's written temperament — Kincaid clipped and flat, Danno warm and
// easy, Marques bright and fast, Kowalski slow and dry.
export const COACH_VOICES = {
  kincaid:  { gender: "male",   variant: 0, rate: 0.95, pitch: 0.92 },
  danno:    { gender: "male",   variant: 1, rate: 0.98, pitch: 1.05 },
  marques:  { gender: "female", variant: 0, rate: 1.06, pitch: 1.12 },
  kowalski: { gender: "male",   variant: 2, rate: 0.86, pitch: 0.85 },
};

/** Voice settings for a coach id, falling back to the neutral read-aloud voice. */
export function coachVoiceOptions(coachId) {
  const cfg = COACH_VOICES[coachId];
  if (!cfg) return { rate: 0.95, pitch: 1 };
  return { rate: cfg.rate, pitch: cfg.pitch, voice: pickVoice(cfg) };
}

// Speak each part as its own queued utterance, in order (prompt, then each choice).
// Cancels anything already speaking first so a re-read doesn't pile up.
export function speakParts(parts, { rate = 0.95, pitch = 1, voice = null, coachId = null } = {}) {
  if (!SUPPORTED || !Array.isArray(parts)) return;
  const opts = coachId ? coachVoiceOptions(coachId) : { rate, pitch, voice };
  stopSpeaking();
  for (const part of parts) {
    const text = (part == null ? "" : String(part)).trim();
    if (!text) continue;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = opts.rate ?? rate;
    u.pitch = opts.pitch ?? pitch;
    if (opts.voice) u.voice = opts.voice;
    try { window.speechSynthesis.speak(u); } catch { /* ignore */ }
  }
}

// "Read questions aloud" preference (persisted, off by default).
export function getReadAloud() {
  try { return localStorage.getItem(READ_ALOUD_KEY) === "1"; } catch { return false; }
}
export function setReadAloud(on) {
  try { localStorage.setItem(READ_ALOUD_KEY, on ? "1" : "0"); } catch { /* ignore */ }
}
