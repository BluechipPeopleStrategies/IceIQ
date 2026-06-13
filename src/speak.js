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

// Speak each part as its own queued utterance, in order (prompt, then each choice).
// Cancels anything already speaking first so a re-read doesn't pile up.
export function speakParts(parts, { rate = 0.95, pitch = 1 } = {}) {
  if (!SUPPORTED || !Array.isArray(parts)) return;
  stopSpeaking();
  for (const part of parts) {
    const text = (part == null ? "" : String(part)).trim();
    if (!text) continue;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = rate;
    u.pitch = pitch;
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
