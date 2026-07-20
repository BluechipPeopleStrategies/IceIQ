// Pure add/remove/move operations on a parsed TASKS.md structure (see
// rinkreads-tasks-parser.mjs for the shape). Every function returns a NEW
// structure rather than mutating its input, so the server/client can reason
// about state changes without aliasing bugs. No DOM, no fs.

const EDITABLE_SECTIONS = ["now", "next", "later", "parking"];

function assertEditable(section) {
  if (!EDITABLE_SECTIONS.includes(section)) {
    throw new Error(`cannot edit section: ${section} (changelog is read-only)`);
  }
}

export function removeItem(data, section, index) {
  assertEditable(section);
  const items = data[section].slice();
  if (index < 0 || index >= items.length) throw new Error(`no item at ${section}[${index}]`);
  items.splice(index, 1);
  return { ...data, [section]: items };
}

export function addItem(data, section, text) {
  assertEditable(section);
  const trimmed = String(text || "").trim();
  if (!trimmed) throw new Error("cannot add an empty item");
  return { ...data, [section]: [...data[section], trimmed] };
}

export function moveItem(data, fromSection, index, toSection) {
  const text = data[fromSection] && data[fromSection][index];
  if (text == null) throw new Error(`no item at ${fromSection}[${index}]`);
  const removed = removeItem(data, fromSection, index);
  return addItem(removed, toSection, text);
}

// TASKS.md's own stated rule: "NOW — active front (max 3)". A soft,
// non-blocking check — the UI shows this but never prevents a save.
export const NOW_SOFT_LIMIT = 3;
export function nowWarning(data) {
  return data.now.length > NOW_SOFT_LIMIT
    ? `Today has ${data.now.length} items (recommended max ${NOW_SOFT_LIMIT}).`
    : null;
}
