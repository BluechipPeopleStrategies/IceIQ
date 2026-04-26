// RinkReads Admin shell — Sessions 1 + 2.
//
// Session 1: auth gate + tab layout (AdminRoute, AdminLayout).
// Session 2: Questions tab — list with filters, grouping, search, inline
// editors for all 6 formats, bulk actions, soft-delete with 30s undo toast.
// Sessions 3 (Images) and 4 (Stats + Trash + engine wiring) still placeholder.

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabase";
import * as SB from "./supabase";
import { C } from "./shared.jsx";

const TABS = [
  { id: "questions", label: "Questions", session: 2 },
  { id: "images",    label: "Images",    session: 3 },
  { id: "stats",     label: "Stats",     session: 4 },
  { id: "trash",     label: "Trash",     session: 4 },
];

const AGE_GROUPS = ["U5", "U7", "U9", "U11", "U13", "U15", "U18"];
const FORMATS = ["Multiple Choice", "True/False", "Hotspot", "Multi-Select", "Open Response", "Sequence"];
const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced", "Elite"];
const STATUSES = ["Draft", "Approved", "Live", "Flagged", "Killed"];
const TYPES = ["text", "pov_image"];

const STATUS_COLORS = {
  Draft:    C.dim,
  Approved: C.blue,
  Live:     C.green,
  Flagged:  C.yellow,
  Killed:   C.red,
};
const STATUS_BG = {
  Draft:    C.dimmest,
  Approved: C.blueDim,
  Live:     C.greenDim,
  Flagged:  C.yellowDim,
  Killed:   C.redDim,
};

// ─────────────────────────────────────────────
// AdminRoute — auth gate
// ─────────────────────────────────────────────
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
  if (state.status === "denied") return null;
  return typeof children === "function" ? children({ profile: state.profile, email: state.email }) : children;
}

// ─────────────────────────────────────────────
// AdminLayout — tab shell
// ─────────────────────────────────────────────
export function AdminLayout({ profile, email }) {
  const [tab, setTab] = useState(TABS[0].id);
  const active = TABS.find(t => t.id === tab) || TABS[0];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.white, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <header style={{
        padding: "20px 24px", borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 0.2 }}>RinkReads Admin</div>
          <div style={{ fontSize: 12, color: C.dim, marginTop: 2 }}>
            {profile?.name || email || "Admin"}
          </div>
        </div>
        <a href="#" onClick={(e) => { e.preventDefault(); window.location.hash = ""; }}
           style={{ fontSize: 13, color: C.blue, textDecoration: "none" }}>
          ← Back to app
        </a>
      </header>

      <nav style={{
        padding: "12px 24px", borderBottom: `1px solid ${C.border}`,
        display: "flex", gap: 8, overflowX: "auto",
      }}>
        {TABS.map(t => {
          const isActive = t.id === tab;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: isActive ? C.goldDim : "transparent",
              color: isActive ? C.gold : C.dim,
              border: `1px solid ${isActive ? C.goldBorder : C.border}`,
              borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600,
              cursor: "pointer", whiteSpace: "nowrap",
            }}>
              {t.label}
            </button>
          );
        })}
      </nav>

      <main style={{ padding: "24px 24px 96px", maxWidth: 1200, margin: "0 auto" }}>
        {tab === "questions" && <QuestionsTab />}
        {tab !== "questions" && (
          <div style={{
            background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12,
            padding: 32, textAlign: "center",
          }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{active.label}</div>
            <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.5 }}>
              Coming in Session {active.session}.
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────
// QuestionsTab — list, filters, search, grouping, bulk, undo
// ─────────────────────────────────────────────
function QuestionsTab() {
  const [rows, setRows] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    status: "all", age: "all", format: "all", type: "all", showKilled: false,
  });
  const [groupBy, setGroupBy] = useState("flat"); // 'flat' | 'image' | 'age'
  const [expanded, setExpanded] = useState({});
  const [selected, setSelected] = useState(() => new Set());
  const [visible, setVisible] = useState(150);
  const [undo, setUndo] = useState(null); // { ids: [...], prev: [{id,status,killed_at},...], expiresAt }

  // Refs let debounced + timeout closures see fresh state without re-binding
  const rowsRef = useRef(rows);
  useEffect(() => { rowsRef.current = rows; }, [rows]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [q, i] = await Promise.all([SB.listAdminQuestions(), SB.listAdminPovImages()]);
      if (cancelled) return;
      setRows(q);
      setImages(i);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // Build image lookup
  const imageById = useMemo(() => {
    const m = new Map();
    for (const img of images) m.set(img.id, img);
    return m;
  }, [images]);

  // Apply search + filters
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      if (!filters.showKilled && r.status === "Killed") return false;
      if (filters.status !== "all" && r.status !== filters.status) return false;
      if (filters.format !== "all" && r.format !== filters.format) return false;
      if (filters.type !== "all" && r.type !== filters.type) return false;
      if (filters.age !== "all" && !(r.age_groups || []).includes(filters.age)) return false;
      if (q) {
        const hay = [
          r.id, r.question_text, r.explanation,
          ...(r.options || []).map(o => o?.text || ""),
          ...(r.concepts || []),
        ].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, filters]);

  // Totals (across full unfiltered set so the user can see what filters hide)
  const totals = useMemo(() => {
    const t = { total: rows.length, Draft: 0, Approved: 0, Live: 0, Flagged: 0, Killed: 0, text: 0, pov_image: 0 };
    for (const r of rows) {
      t[r.status] = (t[r.status] || 0) + 1;
      t[r.type] = (t[r.type] || 0) + 1;
    }
    return t;
  }, [rows]);

  // Grouping
  const groups = useMemo(() => groupRows(filtered, groupBy, imageById), [filtered, groupBy, imageById]);

  // ─── handlers ───
  const saveTimers = useRef({});
  function patchLocal(id, patch) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  }
  function debouncedSave(id, patch, delay = 600) {
    patchLocal(id, patch);
    clearTimeout(saveTimers.current[id]);
    saveTimers.current[id] = setTimeout(async () => {
      const fresh = (rowsRef.current || []).find(r => r.id === id);
      if (!fresh) return;
      // Send only the fields the editor modifies — derived from the latest local row
      await SB.updateAdminQuestion(id, fresh);
    }, delay);
  }

  async function handleStatus(id, status) {
    if (status === "Killed") return handleKill([id]);
    patchLocal(id, { status, killed_at: null });
    await SB.updateAdminQuestion(id, { status, killed_at: null });
  }

  async function handleKill(ids) {
    const list = Array.isArray(ids) ? ids : [ids];
    if (!list.length) return;
    const prev = list.map(id => {
      const r = rows.find(x => x.id === id);
      return r ? { id, status: r.status, killed_at: r.killed_at } : null;
    }).filter(Boolean);
    const killedAt = new Date().toISOString();
    setRows(p => p.map(r => list.includes(r.id) ? { ...r, status: "Killed", killed_at: killedAt } : r));
    setSelected(new Set());
    await SB.bulkUpdateAdminQuestions(list, { status: "Killed", killed_at: killedAt });
    setUndo({ ids: list, prev, expiresAt: Date.now() + 30000 });
  }

  async function handleUndo() {
    if (!undo) return;
    setRows(p => p.map(r => {
      const restore = undo.prev.find(x => x.id === r.id);
      return restore ? { ...r, status: restore.status, killed_at: restore.killed_at } : r;
    }));
    // Server: restore each individually (status may differ per row)
    await Promise.all(undo.prev.map(p => SB.updateAdminQuestion(p.id, { status: p.status, killed_at: p.killed_at })));
    setUndo(null);
  }

  async function handleBulkStatus(status) {
    const ids = Array.from(selected);
    if (!ids.length) return;
    if (status === "Killed") return handleKill(ids);
    setRows(p => p.map(r => ids.includes(r.id) ? { ...r, status, killed_at: null } : r));
    setSelected(new Set());
    await SB.bulkUpdateAdminQuestions(ids, { status, killed_at: null });
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    const ids = filtered.slice(0, visible).map(r => r.id);
    setSelected(new Set(ids));
  }

  // ─── UI ───
  if (loading) {
    return <div style={{ color: C.dim, textAlign: "center", padding: 48 }}>Loading questions…</div>;
  }
  if (!rows.length) {
    return (
      <div style={{
        background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12,
        padding: 32, textAlign: "center",
      }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>No questions yet</div>
        <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.5 }}>
          Run <code style={{ color: C.gold }}>npm run admin:migrate-text</code> to import the bundled bank,
          or <code style={{ color: C.gold }}>npm run admin:migrate-pov</code> for the Notion POV export.
        </div>
      </div>
    );
  }

  const visibleSlice = sliceGroups(groups, visible);
  const totalShown = visibleSlice.reduce((n, g) => n + g.rows.length, 0);

  return (
    <>
      {/* Stat strip */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
        gap: 8, marginBottom: 16,
      }}>
        <Stat label="Total" n={totals.total} color={C.white} />
        <Stat label="Live" n={totals.Live} color={C.green} />
        <Stat label="Approved" n={totals.Approved} color={C.blue} />
        <Stat label="Draft" n={totals.Draft} color={C.dim} />
        <Stat label="Flagged" n={totals.Flagged} color={C.yellow} />
        <Stat label="Killed" n={totals.Killed} color={C.red} />
        <Stat label="Text" n={totals.text} color={C.dim} />
        <Stat label="POV" n={totals.pov_image} color={C.gold} />
      </div>

      {/* Toolbar */}
      <div style={{
        background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12,
        padding: 14, marginBottom: 12,
      }}>
        <input
          type="search"
          value={search}
          onChange={e => { setSearch(e.target.value); setVisible(150); }}
          placeholder="Search ID, question text, options, explanation, concepts…"
          style={{
            width: "100%", background: C.bg, color: C.white,
            border: `1px solid ${C.border}`, borderRadius: 8,
            padding: "10px 12px", fontSize: 14, marginBottom: 12, outline: "none",
          }}
        />

        <FilterRow label="Status" value={filters.status} options={["all", ...STATUSES]}
          onChange={v => setFilters(f => ({ ...f, status: v }))} colorMap={STATUS_COLORS} />
        <FilterRow label="Age" value={filters.age} options={["all", ...AGE_GROUPS]}
          onChange={v => setFilters(f => ({ ...f, age: v }))} />
        <FilterRow label="Format" value={filters.format} options={["all", ...FORMATS]}
          onChange={v => setFilters(f => ({ ...f, format: v }))} />
        <FilterRow label="Type" value={filters.type} options={["all", ...TYPES]}
          onChange={v => setFilters(f => ({ ...f, type: v }))} />

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginTop: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: C.dim, textTransform: "uppercase", letterSpacing: 0.05 }}>Group by</span>
            {["flat", "image", "age"].map(g => (
              <button key={g} onClick={() => setGroupBy(g)} style={chipStyle(groupBy === g)}>
                {g}
              </button>
            ))}
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.dim, cursor: "pointer" }}>
            <input type="checkbox" checked={filters.showKilled}
              onChange={e => setFilters(f => ({ ...f, showKilled: e.target.checked }))} />
            Show killed
          </label>
          <div style={{ marginLeft: "auto", fontSize: 12, color: C.dim }}>
            {filtered.length} match{filtered.length === 1 ? "" : "es"} · showing {totalShown}
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div style={{
          position: "sticky", top: 0, zIndex: 10,
          background: C.bgElevated, border: `1px solid ${C.goldBorder}`, borderRadius: 10,
          padding: "10px 14px", marginBottom: 12,
          display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10,
        }}>
          <strong style={{ color: C.gold, fontSize: 13 }}>{selected.size} selected</strong>
          <span style={{ color: C.dim, fontSize: 12 }}>Set status →</span>
          {STATUSES.map(s => (
            <button key={s} onClick={() => handleBulkStatus(s)} style={pillStyle(STATUS_COLORS[s])}>
              {s}
            </button>
          ))}
          <button onClick={() => setSelected(new Set())} style={{
            marginLeft: "auto", background: "transparent", color: C.dim,
            border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 10px",
            fontSize: 12, cursor: "pointer",
          }}>
            Clear
          </button>
        </div>
      )}

      {/* Select-all-visible affordance */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12, color: C.dim }}>
        <button onClick={selectAllVisible} style={linkBtn}>
          Select all {Math.min(visible, filtered.length)} visible
        </button>
        {selected.size > 0 && (
          <button onClick={() => setSelected(new Set())} style={linkBtn}>Deselect</button>
        )}
      </div>

      {/* Groups */}
      {visibleSlice.map(g => (
        <Group key={g.key} group={g} expanded={expanded} setExpanded={setExpanded}
               selected={selected} toggleSelect={toggleSelect}
               onStatus={handleStatus} onPatch={debouncedSave}
               imageById={imageById} />
      ))}

      {!visibleSlice.length && (
        <div style={{
          background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10,
          padding: 24, textAlign: "center", color: C.dim, fontSize: 13,
        }}>
          No questions match these filters.
        </div>
      )}

      {filtered.length > visible && (
        <button onClick={() => setVisible(v => v + 150)} style={{
          background: "transparent", color: C.dim, border: `1px dashed ${C.border}`,
          borderRadius: 10, padding: "12px", cursor: "pointer", fontSize: 13,
          fontWeight: 600, width: "100%", marginTop: 8,
        }}>
          Load more ({filtered.length - visible} remaining)
        </button>
      )}

      {undo && <UndoToast undo={undo} onUndo={handleUndo} onDismiss={() => setUndo(null)} />}
    </>
  );
}

// ─────────────────────────────────────────────
// Grouping helpers
// ─────────────────────────────────────────────
function groupRows(rows, groupBy, imageById) {
  if (groupBy === "flat") {
    return [{ key: "all", label: null, rows }];
  }
  const buckets = new Map();
  for (const r of rows) {
    let key, label;
    if (groupBy === "image") {
      if (r.linked_image_id) {
        key = r.linked_image_id;
        const img = imageById.get(r.linked_image_id);
        label = img ? `${img.archetype}${img.variant ? ` · ${img.variant}` : ""} · ${r.linked_image_id}` : r.linked_image_id;
      } else {
        key = "_no_image";
        label = "Text-only (no image)";
      }
    } else { // age
      const ages = (r.age_groups || []);
      key = ages.length ? ages[0] : "_unscoped";
      label = ages.length ? ages[0] : "No age group";
    }
    if (!buckets.has(key)) buckets.set(key, { key, label, rows: [] });
    buckets.get(key).rows.push(r);
  }
  return Array.from(buckets.values()).sort((a, b) => String(a.label).localeCompare(String(b.label)));
}

function sliceGroups(groups, limit) {
  const out = [];
  let remaining = limit;
  for (const g of groups) {
    if (remaining <= 0) break;
    const take = g.rows.slice(0, remaining);
    out.push({ ...g, rows: take });
    remaining -= take.length;
  }
  return out;
}

// ─────────────────────────────────────────────
// Group + Row + Editor
// ─────────────────────────────────────────────
function Group({ group, expanded, setExpanded, selected, toggleSelect, onStatus, onPatch, imageById }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginBottom: 14 }}>
      {group.label && (
        <button onClick={() => setOpen(o => !o)} style={{
          width: "100%", textAlign: "left",
          background: C.bgGlass, border: `1px solid ${C.border}`,
          borderRadius: 8, padding: "8px 12px", marginBottom: 6,
          color: C.white, fontSize: 13, fontWeight: 600, cursor: "pointer",
          display: "flex", justifyContent: "space-between",
        }}>
          <span>{open ? "▾" : "▸"} {group.label}</span>
          <span style={{ color: C.dim, fontWeight: 500 }}>{group.rows.length}</span>
        </button>
      )}
      {open && group.rows.map(r => (
        <Row key={r.id} row={r}
             expanded={!!expanded[r.id]}
             onToggle={() => setExpanded(e => ({ ...e, [r.id]: !e[r.id] }))}
             selected={selected.has(r.id)}
             onSelect={() => toggleSelect(r.id)}
             onStatus={(s) => onStatus(r.id, s)}
             onPatch={(p) => onPatch(r.id, p)}
             image={r.linked_image_id ? imageById.get(r.linked_image_id) : null} />
      ))}
    </div>
  );
}

function Row({ row, expanded, onToggle, selected, onSelect, onStatus, onPatch, image }) {
  const isKilled = row.status === "Killed";
  return (
    <div style={{
      background: C.bgCard,
      border: `1px solid ${selected ? C.goldBorder : C.border}`,
      borderLeft: `3px solid ${STATUS_COLORS[row.status] || C.dim}`,
      borderRadius: 10, marginBottom: 8,
      opacity: isKilled ? 0.55 : 1,
      transition: "border-color 120ms",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px" }}>
        <input type="checkbox" checked={selected} onChange={onSelect} onClick={(e) => e.stopPropagation()} />
        <button onClick={onToggle} style={{
          flex: 1, textAlign: "left", background: "transparent", border: "none",
          color: C.white, cursor: "pointer", padding: 0, minWidth: 0,
        }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 4 }}>
            <code style={{ background: C.bg, color: C.gold, fontSize: 11, padding: "2px 6px", borderRadius: 4 }}>{row.id}</code>
            <Pill color={STATUS_COLORS[row.status]} bg={STATUS_BG[row.status]}>{row.status}</Pill>
            {row.type === "pov_image" && <Pill color={C.gold}>POV</Pill>}
            <Pill color={C.dim}>{row.format}</Pill>
            {(row.age_groups || []).map(a => <Pill key={a} color={C.blue}>{a}</Pill>)}
            {row.difficulty && <Pill color={C.purple}>{row.difficulty}</Pill>}
          </div>
          <div style={{
            fontSize: 13, color: C.white, lineHeight: 1.4,
            overflow: "hidden", textOverflow: "ellipsis",
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          }}>
            {row.question_text || <span style={{ color: C.dimmer, fontStyle: "italic" }}>(no question text)</span>}
          </div>
        </button>
        <span style={{ color: C.dim, fontSize: 18, padding: "0 6px" }}>{expanded ? "▾" : "▸"}</span>
      </div>

      {expanded && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: 14 }}>
          <Editor row={row} onPatch={onPatch} image={image} />

          <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {STATUSES.map(s => (
              <button key={s} onClick={() => onStatus(s)} style={{
                ...pillStyle(STATUS_COLORS[s]),
                opacity: row.status === s ? 1 : 0.7,
                outline: row.status === s ? `2px solid ${STATUS_COLORS[s]}` : "none",
              }}>
                {s === "Killed" ? "Kill" : s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Editor — dispatches by format
// ─────────────────────────────────────────────
function Editor({ row, onPatch, image }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* Common fields: image link preview, age groups, difficulty, question text */}
      {image && (
        <div style={{
          background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8,
          padding: 10, fontSize: 12, color: C.dim,
        }}>
          <strong style={{ color: C.gold }}>Linked image:</strong> {image.archetype}
          {image.variant ? ` · ${image.variant}` : ""} <code style={{ marginLeft: 6 }}>{image.id}</code>
          {image.read_trigger && <div style={{ marginTop: 4 }}><em>Read trigger:</em> {image.read_trigger}</div>}
        </div>
      )}

      <Field label="Question text">
        <TextArea value={row.question_text || ""} onChange={v => onPatch({ question_text: v })} />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <Field label="Age groups (multi)">
          <MultiChip options={AGE_GROUPS} value={row.age_groups || []}
            onChange={v => onPatch({ age_groups: v })} />
        </Field>
        <Field label="Difficulty">
          <Select value={row.difficulty || ""} options={["", ...DIFFICULTIES]}
            onChange={v => onPatch({ difficulty: v || null })} />
        </Field>
        <Field label="Format">
          <Select value={row.format} options={FORMATS}
            onChange={v => onPatch({ format: v })} />
        </Field>
      </div>

      {/* Format-specific body */}
      {row.format === "Multiple Choice" && <MCEditor row={row} onPatch={onPatch} multi={false} />}
      {row.format === "Multi-Select"     && <MCEditor row={row} onPatch={onPatch} multi={true} />}
      {row.format === "True/False"       && <TFEditor row={row} onPatch={onPatch} />}
      {row.format === "Hotspot"          && <HotspotEditor row={row} onPatch={onPatch} />}
      {row.format === "Open Response"    && <OpenEditor row={row} onPatch={onPatch} />}
      {row.format === "Sequence"         && <SequenceEditor row={row} onPatch={onPatch} />}

      <Field label="Explanation">
        <TextArea value={row.explanation || ""} onChange={v => onPatch({ explanation: v })} />
      </Field>

      <Field label="Concepts (comma-separated)">
        <Input
          value={(row.concepts || []).join(", ")}
          onChange={v => onPatch({ concepts: v.split(",").map(s => s.trim()).filter(Boolean) })}
        />
      </Field>

      {row.status === "Flagged" && (
        <Field label="Flag reason">
          <Input value={row.flagged_reason || ""} onChange={v => onPatch({ flagged_reason: v })} />
        </Field>
      )}
    </div>
  );
}

// ─── format editors ───
const LETTERS = ["A", "B", "C", "D", "E", "F"];

function MCEditor({ row, onPatch, multi }) {
  const opts = row.options || [];
  const correctSet = new Set(String(row.correct_answer || "").split(",").map(s => s.trim()).filter(Boolean));

  function setCorrect(letter) {
    if (multi) {
      const next = new Set(correctSet);
      if (next.has(letter)) next.delete(letter); else next.add(letter);
      onPatch({ correct_answer: Array.from(next).sort().join(",") });
    } else {
      onPatch({ correct_answer: letter });
    }
  }
  function setOpt(idx, text) {
    const next = opts.map((o, i) => i === idx ? { ...o, text } : o);
    onPatch({ options: next });
  }
  function addOpt() {
    if (opts.length >= LETTERS.length) return;
    onPatch({ options: [...opts, { label: LETTERS[opts.length], text: "" }] });
  }
  function removeOpt(idx) {
    onPatch({ options: opts.filter((_, i) => i !== idx).map((o, i) => ({ ...o, label: LETTERS[i] })) });
  }

  return (
    <Field label={`Options${multi ? " — pick all correct" : " — pick one correct"}`}>
      <div style={{ display: "grid", gap: 6 }}>
        {opts.map((o, i) => {
          const letter = o.label || LETTERS[i];
          const isCorrect = correctSet.has(letter);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button onClick={() => setCorrect(letter)} style={{
                background: isCorrect ? C.greenDim : "transparent",
                color: isCorrect ? C.green : C.dim,
                border: `1px solid ${isCorrect ? C.greenBorder : C.border}`,
                borderRadius: 6, width: 32, height: 32, fontWeight: 700,
                cursor: "pointer", flexShrink: 0,
              }}>
                {letter}
              </button>
              <Input value={o.text || ""} onChange={v => setOpt(i, v)} />
              <button onClick={() => removeOpt(i)} style={iconBtn} title="Remove">×</button>
            </div>
          );
        })}
        <button onClick={addOpt} disabled={opts.length >= LETTERS.length} style={{
          background: "transparent", color: C.gold, border: `1px dashed ${C.goldBorder}`,
          borderRadius: 6, padding: "6px 10px", fontSize: 12, fontWeight: 600,
          cursor: opts.length >= LETTERS.length ? "not-allowed" : "pointer",
          opacity: opts.length >= LETTERS.length ? 0.4 : 1,
        }}>
          + Add option
        </button>
      </div>
    </Field>
  );
}

function TFEditor({ row, onPatch }) {
  const correct = row.correct_answer === "True" ? "True" : row.correct_answer === "False" ? "False" : "";
  return (
    <Field label="Correct answer">
      <div style={{ display: "flex", gap: 8 }}>
        {["True", "False"].map(v => (
          <button key={v} onClick={() => onPatch({ correct_answer: v })} style={{
            ...pillStyle(correct === v ? C.green : C.dim),
            opacity: correct === v ? 1 : 0.7, padding: "8px 18px",
          }}>
            {v}
          </button>
        ))}
      </div>
    </Field>
  );
}

function HotspotEditor({ row, onPatch }) {
  const h = row.hotspot_coords || { x: 50, y: 50, radius: 10 };
  function set(k, v) {
    const num = Number(v);
    if (Number.isNaN(num)) return;
    onPatch({ hotspot_coords: { ...h, [k]: num } });
  }
  return (
    <Field label="Hotspot coords (% of image; radius in %)">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <NumField label="x" value={h.x} onChange={v => set("x", v)} />
        <NumField label="y" value={h.y} onChange={v => set("y", v)} />
        <NumField label="radius" value={h.radius} onChange={v => set("radius", v)} />
      </div>
    </Field>
  );
}

function OpenEditor({ row, onPatch }) {
  return (
    <>
      <Field label="Expected answer (free-form)">
        <TextArea value={row.correct_answer || ""} onChange={v => onPatch({ correct_answer: v })} />
      </Field>
      <Field label="Auto-grade">
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.dim, cursor: "pointer" }}>
          <input type="checkbox" checked={row.is_auto_graded !== false}
            onChange={e => onPatch({ is_auto_graded: e.target.checked })} />
          Auto-grade based on expected answer match
        </label>
      </Field>
    </>
  );
}

function SequenceEditor({ row, onPatch }) {
  const items = Array.isArray(row.sequence_items) ? row.sequence_items : [];
  function setItem(i, v) {
    const next = items.map((x, idx) => idx === i ? v : x);
    onPatch({ sequence_items: next });
  }
  function move(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = items.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onPatch({ sequence_items: next });
  }
  function add() { onPatch({ sequence_items: [...items, ""] }); }
  function remove(i) { onPatch({ sequence_items: items.filter((_, idx) => idx !== i) }); }

  return (
    <Field label="Sequence (correct order)">
      <div style={{ display: "grid", gap: 6 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: C.gold, fontWeight: 700, width: 20, textAlign: "center" }}>{i + 1}</span>
            <Input value={typeof item === "string" ? item : (item?.text || "")}
                   onChange={v => setItem(i, v)} />
            <button onClick={() => move(i, -1)} disabled={i === 0} style={iconBtn} title="Up">↑</button>
            <button onClick={() => move(i, +1)} disabled={i === items.length - 1} style={iconBtn} title="Down">↓</button>
            <button onClick={() => remove(i)} style={iconBtn} title="Remove">×</button>
          </div>
        ))}
        <button onClick={add} style={{
          background: "transparent", color: C.gold, border: `1px dashed ${C.goldBorder}`,
          borderRadius: 6, padding: "6px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}>
          + Add step
        </button>
      </div>
    </Field>
  );
}

// ─────────────────────────────────────────────
// UndoToast
// ─────────────────────────────────────────────
function UndoToast({ undo, onUndo, onDismiss }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.ceil((undo.expiresAt - Date.now()) / 1000)));
  useEffect(() => {
    const t = setInterval(() => {
      const r = Math.max(0, Math.ceil((undo.expiresAt - Date.now()) / 1000));
      setRemaining(r);
      if (r <= 0) { clearInterval(t); onDismiss(); }
    }, 250);
    return () => clearInterval(t);
  }, [undo.expiresAt, onDismiss]);

  return (
    <div style={{
      position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
      background: C.bgElevated, border: `1px solid ${C.redBorder}`, borderRadius: 10,
      padding: "10px 16px", display: "flex", alignItems: "center", gap: 14,
      boxShadow: "0 10px 30px rgba(0,0,0,0.4)", zIndex: 100,
      fontSize: 13, color: C.white,
    }}>
      <span>
        Killed {undo.ids.length} question{undo.ids.length === 1 ? "" : "s"} · {remaining}s
      </span>
      <button onClick={onUndo} style={{
        background: C.gold, color: C.bg, border: "none",
        borderRadius: 6, padding: "5px 12px", fontWeight: 700,
        fontSize: 12, cursor: "pointer",
      }}>
        Undo
      </button>
      <button onClick={onDismiss} style={{
        background: "transparent", color: C.dim, border: "none",
        cursor: "pointer", fontSize: 14,
      }}>
        ✕
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// Tiny primitives
// ─────────────────────────────────────────────
function Stat({ label, n, color }) {
  return (
    <div style={{
      background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8,
      padding: "8px 10px", textAlign: "center",
    }}>
      <div style={{ fontSize: 18, fontWeight: 800, color, lineHeight: 1 }}>{n}</div>
      <div style={{ fontSize: 9, color: C.dimmer, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.08 }}>{label}</div>
    </div>
  );
}

function Pill({ children, color, bg }) {
  return (
    <span style={{
      display: "inline-block", fontSize: 10, fontWeight: 700,
      color: color || C.dim,
      background: bg || "transparent",
      border: `1px solid ${color ? `${color}55` : C.border}`,
      padding: "2px 8px", borderRadius: 999, letterSpacing: 0.04, textTransform: "uppercase",
    }}>
      {children}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: C.dimmer, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.05, marginBottom: 4 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%", background: C.bg, color: C.white,
  border: `1px solid ${C.border}`, borderRadius: 6,
  padding: "8px 10px", fontSize: 13, outline: "none",
  fontFamily: "inherit",
};
function Input({ value, onChange }) {
  return <input style={inputStyle} value={value} onChange={e => onChange(e.target.value)} />;
}
function TextArea({ value, onChange }) {
  return <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={value} onChange={e => onChange(e.target.value)} />;
}
function Select({ value, options, onChange }) {
  return (
    <select style={inputStyle} value={value} onChange={e => onChange(e.target.value)}>
      {options.map(o => <option key={o} value={o}>{o || "—"}</option>)}
    </select>
  );
}
function NumField({ label, value, onChange }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ fontSize: 10, color: C.dimmer, marginRight: 4 }}>{label}</span>
      <input type="number" style={inputStyle} value={value ?? ""} onChange={e => onChange(e.target.value)} />
    </label>
  );
}
function MultiChip({ options, value, onChange }) {
  function toggle(o) {
    const next = value.includes(o) ? value.filter(x => x !== o) : [...value, o];
    onChange(next);
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {options.map(o => {
        const on = value.includes(o);
        return (
          <button key={o} onClick={() => toggle(o)} style={chipStyle(on)}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

function FilterRow({ label, value, options, onChange, colorMap }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <span style={{ display: "inline-block", width: 64, fontSize: 10, color: C.dimmer, textTransform: "uppercase", letterSpacing: 0.05 }}>{label}</span>
      <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 4 }}>
        {options.map(o => {
          const active = value === o;
          const tint = colorMap && colorMap[o];
          return (
            <button key={o} onClick={() => onChange(o)} style={{
              background: active ? (tint ? `${tint}25` : C.goldDim) : "transparent",
              color: active ? (tint || C.gold) : C.dim,
              border: `1px solid ${active ? (tint || C.goldBorder) : C.border}`,
              borderRadius: 14, padding: "3px 10px", cursor: "pointer",
              fontSize: 11, fontWeight: 600,
            }}>
              {o}
            </button>
          );
        })}
      </span>
    </div>
  );
}

function chipStyle(active) {
  return {
    background: active ? C.goldDim : "transparent",
    color: active ? C.gold : C.dim,
    border: `1px solid ${active ? C.goldBorder : C.border}`,
    borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 600,
    cursor: "pointer",
  };
}
function pillStyle(color) {
  return {
    background: `${color}25`, color, border: `1px solid ${color}55`,
    borderRadius: 6, padding: "5px 10px", fontSize: 12, fontWeight: 700,
    cursor: "pointer",
  };
}
const iconBtn = {
  background: "transparent", color: C.dim, border: `1px solid ${C.border}`,
  borderRadius: 6, width: 28, height: 28, cursor: "pointer", flexShrink: 0,
};
const linkBtn = {
  background: "transparent", color: C.blue, border: "none",
  cursor: "pointer", fontSize: 12, padding: 0, textDecoration: "underline",
};
