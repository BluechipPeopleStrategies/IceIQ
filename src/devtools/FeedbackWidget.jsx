import { useState } from "react";
import "./feedback-widget.css";
import { isDevBypassEnabled } from "../utils/devBypass";
import { CATEGORIES, sanitizeNote, buildFeedbackContext } from "./feedbackContext";
import { savePlaytestFeedback } from "../supabase";

// Find the active game canvas (gym drills render <canvas class="gym-canvas">).
function gameCanvas() {
  return document.querySelector("canvas.gym-canvas") || document.querySelector("canvas");
}

// Capture the active canvas as a downscaled JPEG dataURL, or null. The gym
// canvases are drawn from shapes/text (no cross-origin images) so they are not
// tainted and toDataURL is safe.
function captureCanvasShot() {
  try {
    const c = gameCanvas();
    if (!c || !c.width) return null;
    const scale = Math.min(1, 720 / c.width);
    const off = document.createElement("canvas");
    off.width = Math.round(c.width * scale);
    off.height = Math.round(c.height * scale);
    off.getContext("2d").drawImage(c, 0, 0, off.width, off.height);
    return off.toDataURL("image/jpeg", 0.7);
  } catch {
    return null;
  }
}

export default function FeedbackWidget({ screen = null, version = null }) {
  const devOn =
    isDevBypassEnabled() ||
    (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV);

  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [shot, setShot] = useState(true);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null); // null | "ok" | { error }

  if (!devOn) return null;

  const hasCanvas = !!gameCanvas();

  async function send() {
    setSending(true);
    setStatus(null);
    const drillTitle =
      (document.querySelector(".gym-drill-title")?.textContent || "").trim() || null;
    const context = buildFeedbackContext({
      screen,
      drillTitle,
      version,
      viewport: { w: window.innerWidth, h: window.innerHeight },
      userAgent: navigator.userAgent,
      nowIso: new Date().toISOString(),
    });
    const screenshot = shot ? captureCanvasShot() : null;
    const res = await savePlaytestFeedback({
      screen,
      drill: drillTitle,
      category,
      note: sanitizeNote(note),
      context,
      screenshot,
      appVersion: version,
    });
    setSending(false);
    if (res && res.ok) {
      setStatus("ok");
      setNote("");
      setTimeout(() => { setStatus(null); setOpen(false); }, 1200);
    } else {
      setStatus({ error: (res && res.error) || "failed" });
    }
  }

  return (
    <div className="fbw-root">
      {!open && (
        <button className="fbw-fab" onClick={() => { setStatus(null); setOpen(true); }}>
          Feedback
        </button>
      )}
      {open && (
        <div className="fbw-panel" role="dialog" aria-label="Playtest feedback">
          <div className="fbw-head">
            <strong>Playtest feedback</strong>
            <button className="fbw-x" onClick={() => setOpen(false)} aria-label="Close">×</button>
          </div>
          <textarea
            className="fbw-note"
            rows={4}
            placeholder="What did you notice? (bug, idea, too hard/easy, art, copy...)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="fbw-chips">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                className={"fbw-chip" + (c === category ? " fbw-chip-on" : "")}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <label className="fbw-shot">
            <input
              type="checkbox"
              checked={shot && hasCanvas}
              disabled={!hasCanvas}
              onChange={(e) => setShot(e.target.checked)}
            />
            Include screenshot {hasCanvas ? "" : "(no game on screen)"}
          </label>
          <div className="fbw-actions">
            <button className="fbw-send" onClick={send} disabled={sending || !sanitizeNote(note)}>
              {sending ? "Sending..." : "Send"}
            </button>
            <span className="fbw-status" aria-live="polite">
              {status === "ok" ? "Sent" : status && status.error ? `Failed: ${status.error}` : ""}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
