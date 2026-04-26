// RinkReads Admin shell (Session 1).
//
// Renders only when the current user has profiles.is_admin = true. Anyone
// else lands on the home screen via the parent's hash-route dispatcher.
// Content is intentionally placeholder — sessions 2–4 build the Questions,
// Images, Stats, and Trash tabs on top of this layout.

import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { C } from "./shared.jsx";

const TABS = [
  { id: "questions", label: "Questions", session: 2 },
  { id: "images",    label: "Images",    session: 3 },
  { id: "stats",     label: "Stats",     session: 4 },
  { id: "trash",     label: "Trash",     session: 4 },
];

// Auth gate. While the profile lookup is in flight we render `loading`; on
// failure (no auth, no profile, is_admin=false) we render `denied`. Both
// branches let the caller in App.jsx redirect via setScreen("home").
export function AdminRoute({ onDenied, children }) {
  const [state, setState] = useState({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!supabase) {
        if (!cancelled) setState({ status: "denied", reason: "supabase-not-configured" });
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setState({ status: "denied", reason: "not-signed-in" });
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin, name")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (profile?.is_admin === true) setState({ status: "ok", profile, email: user.email });
      else setState({ status: "denied", reason: "not-admin" });
    }
    check();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (state.status === "denied" && typeof onDenied === "function") onDenied(state.reason);
  }, [state.status, state.reason, onDenied]);

  if (state.status === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, color: C.dim, display: "grid", placeItems: "center", fontSize: 14 }}>
        Checking admin access…
      </div>
    );
  }
  if (state.status === "denied") {
    // Parent dispatcher routes us out via onDenied. Render nothing in the
    // meantime — a flash of "access denied" copy is worse than a blank frame.
    return null;
  }

  return typeof children === "function" ? children({ profile: state.profile, email: state.email }) : children;
}

export function AdminLayout({ profile, email }) {
  const [tab, setTab] = useState(TABS[0].id);
  const active = TABS.find(t => t.id === tab) || TABS[0];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.white, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <header style={{
        padding: "20px 24px",
        borderBottom: `1px solid ${C.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 0.2 }}>RinkReads Admin</div>
          <div style={{ fontSize: 12, color: C.dim, marginTop: 2 }}>
            {profile?.name || email || "Admin"} · Session 1 foundation
          </div>
        </div>
        <a href="#" onClick={(e) => { e.preventDefault(); window.location.hash = ""; }}
           style={{ fontSize: 13, color: C.blue, textDecoration: "none" }}>
          ← Back to app
        </a>
      </header>

      <nav style={{
        padding: "12px 24px",
        borderBottom: `1px solid ${C.border}`,
        display: "flex",
        gap: 8,
        overflowX: "auto",
      }}>
        {TABS.map(t => {
          const isActive = t.id === tab;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: isActive ? C.goldDim : "transparent",
              color: isActive ? C.gold : C.dim,
              border: `1px solid ${isActive ? C.goldBorder : C.border}`,
              borderRadius: 8,
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}>
              {t.label}
            </button>
          );
        })}
      </nav>

      <main style={{ padding: "32px 24px", maxWidth: 960, margin: "0 auto" }}>
        <div style={{
          background: C.bgCard,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: 32,
          textAlign: "center",
        }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{active.label}</div>
          <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.5 }}>
            Coming in Session {active.session}.<br />
            Foundation is in place — schema, RLS, migration scripts, and this shell.
          </div>
        </div>
      </main>
    </div>
  );
}
