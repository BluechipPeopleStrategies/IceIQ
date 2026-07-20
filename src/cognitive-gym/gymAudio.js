// Synthesized audio cues for the Cognitive Gym. No sound files: short
// oscillator notes through one lazily-created AudioContext (created on first
// cue, which always follows a user gesture — a tap — so autoplay rules pass).
// Everything is wrapped so a missing/blocked AudioContext can never break play.

const MUTE_KEY = "rinkreads_gym_muted";

// Cue spec: name -> notes [{ freq (Hz), dur (s), at (s offset) }].
// Exported for tests; the player below just reads it.
export const CUES = {
  tap: [{ freq: 660, dur: 0.05, at: 0 }],
  go: [{ freq: 880, dur: 0.09, at: 0 }],
  hit: [{ freq: 523, dur: 0.08, at: 0 }, { freq: 784, dur: 0.1, at: 0.07 }],
  perfect: [
    { freq: 659, dur: 0.08, at: 0 },
    { freq: 880, dur: 0.08, at: 0.07 },
    { freq: 1047, dur: 0.14, at: 0.14 },
  ],
  miss: [{ freq: 233, dur: 0.12, at: 0 }],
  levelUp: [
    { freq: 523, dur: 0.1, at: 0 },
    { freq: 659, dur: 0.1, at: 0.09 },
    { freq: 784, dur: 0.16, at: 0.18 },
  ],
  fanfare: [
    { freq: 523, dur: 0.12, at: 0 },
    { freq: 659, dur: 0.12, at: 0.11 },
    { freq: 784, dur: 0.12, at: 0.22 },
    { freq: 1047, dur: 0.28, at: 0.33 },
  ],
};

export function isMuted() {
  try { return localStorage.getItem(MUTE_KEY) === "1"; } catch { return false; }
}
export function setMuted(muted) {
  try { localStorage.setItem(MUTE_KEY, muted ? "1" : "0"); } catch { /* unavailable */ }
}

let ctx = null;
function audioCtx() {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

// Reward haptic on mobile: a short buzz for the win moments only.
const HAPTIC_CUES = { hit: 15, perfect: 25, levelUp: [20, 40, 20], fanfare: [20, 40, 40] };
function buzz(name) {
  try {
    const pattern = HAPTIC_CUES[name];
    if (pattern && typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch { /* haptics are best-effort */ }
}

export function cue(name) {
  if (isMuted()) return;
  buzz(name);
  const notes = CUES[name];
  if (!notes) return;
  try {
    const ac = audioCtx();
    if (!ac) return;
    const t0 = ac.currentTime;
    for (const n of notes) {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "triangle";
      osc.frequency.value = n.freq;
      gain.gain.setValueAtTime(0.0001, t0 + n.at);
      gain.gain.exponentialRampToValueAtTime(0.12, t0 + n.at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n.at + n.dur);
      osc.connect(gain).connect(ac.destination);
      osc.start(t0 + n.at);
      osc.stop(t0 + n.at + n.dur + 0.02);
    }
  } catch { /* audio must never break a rep */ }
}

// Ready-made hooks for createAdaptiveLevel: rep feedback + level-up jingle.
export function gymCueHooks() {
  return {
    onResult: (success) => cue(success ? "hit" : "miss"),
    onChange: (_level, delta) => { if (delta > 0) cue("levelUp"); },
  };
}
