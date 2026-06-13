// Zero-dependency dead-code / dependency / cruft scanner for RinkReads (src/ only).
// Heuristic by design: import parsing is regex-based, so it can over-report a broken
// import (e.g. a spec inside a comment) and under-reports nothing important. Findings
// are reported, never auto-applied; the agent verifies each before acting.
import fs from "node:fs";
import path from "node:path";

// Extract import/require/dynamic-import/re-export specifiers from JS/JSX source.
export function parseImports(src) {
  const specs = new Set();
  const patterns = [
    /import\s+[^;]*?from\s*['"]([^'"]+)['"]/g, // import x from "..."
    /import\s*['"]([^'"]+)['"]/g,              // import "..."
    /export\s+[^;]*?from\s*['"]([^'"]+)['"]/g, // export ... from "..."
    /require\(\s*['"]([^'"]+)['"]\s*\)/g,      // require("...")
    /import\(\s*['"]([^'"]+)['"]\s*\)/g,       // dynamic import("...")
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(src))) specs.add(m[1]);
  }
  return [...specs];
}

// Resolve a RELATIVE specifier from importerFile against the filesystem.
// Honors .js/.jsx/.json and index files. Returns absolute path or null.
export function resolveImport(importerFile, spec) {
  const base = path.resolve(path.dirname(importerFile), spec);
  const candidates = [
    base, base + ".js", base + ".jsx", base + ".json",
    path.join(base, "index.js"), path.join(base, "index.jsx"),
  ];
  for (const c of candidates) {
    try { if (fs.statSync(c).isFile()) return c; } catch { /* not a file */ }
  }
  return null;
}

// Recursively list files under dir with one of the given extensions. Skips node_modules.
export function walkFiles(dir, exts) {
  const out = [];
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.name === "node_modules") continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkFiles(full, exts));
    else if (exts.some(x => e.name.endsWith(x))) out.push(full);
  }
  return out;
}

// Relative imports under src/ that do not resolve to a real file.
export function scanBrokenImports(root) {
  const srcDir = path.join(root, "src");
  const broken = [];
  for (const f of walkFiles(srcDir, [".js", ".jsx"])) {
    const src = fs.readFileSync(f, "utf8");
    for (const spec of parseImports(src)) {
      if (!spec.startsWith(".")) continue; // bare packages handled by stale-deps
      if (resolveImport(f, spec) === null) {
        broken.push({ file: path.relative(root, f), spec });
      }
    }
  }
  return broken;
}
