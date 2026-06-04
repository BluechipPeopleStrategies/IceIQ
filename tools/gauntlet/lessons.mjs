// Learned lessons the gauntlet accumulates from dropped questions, fed back into
// the creator prompt so the same failure modes get rarer. Pure + unit-tested.
import { readFileSync, writeFileSync } from "node:fs";

export const MAX_LESSONS = 40;
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

export function loadLessons(path) {
  try {
    const j = JSON.parse(readFileSync(path, "utf8"));
    return Array.isArray(j.lessons) ? j : { lessons: [] };
  } catch { return { lessons: [] }; }
}

// Add a lesson (deduped by normalized text → increments count). Caps the list at
// MAX_LESSONS, dropping the lowest-count entries first. Returns { ok, added }.
export function addLesson(path, text) {
  const clean = String(text || "").trim();
  if (clean.length < 5) return { ok: false, added: false };
  const data = loadLessons(path);
  const key = norm(clean);
  const existing = data.lessons.find((l) => norm(l.text) === key);
  let added;
  if (existing) { existing.count += 1; added = false; }
  else { data.lessons.push({ text: clean, count: 1 }); added = true; }
  data.lessons.sort((a, b) => b.count - a.count);
  if (data.lessons.length > MAX_LESSONS) data.lessons = data.lessons.slice(0, MAX_LESSONS);
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
  return { ok: true, added };
}

// Render lessons as a prompt-injectable block (empty string when there are none).
export function renderLessons(data) {
  const lessons = data?.lessons || [];
  if (!lessons.length) return "";
  return "Lessons learned from past rejected questions — follow these:\n" +
    lessons.map((l) => `- ${l.text}`).join("\n");
}
