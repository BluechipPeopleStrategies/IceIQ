// Lightweight toast queue. Module-level `toast(...)` API so any component
// can fire without hook plumbing; <ToastContainer/> renders the stack once
// at the app root.
//
// Intentionally NOT using context — the queue is ephemeral UI state and a
// global subscription model keeps consumer call sites one-liners:
//   toast.success("Saved!")
//   toast.error("Upload failed")
//   toast({ kind: "celebrate", title: "World Cleared!", body: "Frozen Pond → Learn-to-Play", icon: "🏆" })

import { useEffect, useState } from "react";
import { C, FONT } from "./shared.jsx";

let nextId = 1;
const listeners = new Set();
let queue = [];

const DEFAULT_DURATION = 4200;
const CELEBRATE_DURATION = 6500;

function emit() {
  for (const l of listeners) l(queue);
}

function add(t) {
  const id = nextId++;
  const dur = t.duration ?? (t.kind === "celebrate" ? CELEBRATE_DURATION : DEFAULT_DURATION);
  const item = { id, ...t, createdAt: Date.now() };
  queue = [...queue, item];
  emit();
  if (dur > 0) {
    setTimeout(() => dismiss(id), dur);
  }
  return id;
}

function dismiss(id) {
  queue = queue.filter(t => t.id !== id);
  emit();
}

export function toast(arg) {
  if (typeof arg === "string") return add({ kind: "info", body: arg });
  return add(arg || {});
}
toast.success    = (body, opts = {}) => add({ kind: "success", body, ...opts });
toast.error      = (body, opts = {}) => add({ kind: "error", body, ...opts });
toast.info       = (body, opts = {}) => add({ kind: "info", body, ...opts });
toast.warning    = (body, opts = {}) => add({ kind: "warning", body, ...opts });
toast.celebrate  = (props = {}) => add({ kind: "celebrate", ...props });
toast.dismiss    = dismiss;

// ────────────────────────────────────────────────────────────
// Render
// ────────────────────────────────────────────────────────────

function toastStyles(kind) {
  switch (kind) {
    case "success":
      return { bg: "rgba(34,197,94,.15)", border: C.greenBorder, color: C.green, icon: "✓" };
    case "error":
      return { bg: "rgba(239,68,68,.15)", border: C.redBorder, color: C.red, icon: "✕" };
    case "warning":
      return { bg: "rgba(234,179,8,.15)", border: "rgba(234,179,8,.45)", color: C.yellow || "#eab308", icon: "⚠" };
    case "celebrate":
      return { bg: `linear-gradient(135deg,rgba(252,76,2,.22),rgba(207,69,32,.08))`, border: C.goldBorder, color: C.gold, icon: "🎉" };
    case "info":
    default:
      return { bg: C.bgCard, border: C.border, color: C.white, icon: "ℹ" };
  }
}

export function ToastContainer() {
  const [items, setItems] = useState(queue);
  useEffect(() => {
    listeners.add(setItems);
    return () => listeners.delete(setItems);
  }, []);
  if (!items.length) return null;
  return (
    <div style={{position:"fixed",top:16,right:12,left:12,zIndex:400,display:"flex",flexDirection:"column",alignItems:"center",gap:".5rem",pointerEvents:"none"}}>
      <style>{`@keyframes iceiq-toast-in { from { opacity:0; transform: translateY(-8px); } to { opacity:1; transform: translateY(0); } }`}</style>
      {items.slice(-3).map(t => {
        const s = toastStyles(t.kind);
        const isBig = t.kind === "celebrate";
        return (
          <div key={t.id}
            onClick={() => dismiss(t.id)}
            style={{
              pointerEvents: "auto", cursor: "pointer",
              maxWidth: isBig ? 440 : 380,
              width: "100%",
              background: s.bg,
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: `1px solid ${s.border}`,
              borderRadius: 12,
              padding: isBig ? "1rem 1.1rem" : ".65rem .85rem",
              boxShadow: "0 10px 30px rgba(0,0,0,.4), 0 2px 6px rgba(0,0,0,.3)",
              color: C.white,
              fontFamily: FONT.body,
              display: "flex", alignItems: isBig ? "center" : "flex-start", gap: ".7rem",
              animation: "iceiq-toast-in .22s ease-out",
            }}>
            <div style={{fontSize: isBig ? 34 : 18, lineHeight: 1, flexShrink: 0, color: s.color}}>
              {t.icon || s.icon}
            </div>
            <div style={{flex: 1, minWidth: 0}}>
              {t.title && (
                <div style={{fontFamily: FONT.display, fontWeight: 800, fontSize: isBig ? 16 : 13, color: C.white, lineHeight: 1.25, marginBottom: t.body ? 2 : 0}}>
                  {t.title}
                </div>
              )}
              {t.body && (
                <div style={{fontSize: isBig ? 13 : 12, color: t.title ? C.dim : C.white, lineHeight: 1.45}}>
                  {t.body}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
