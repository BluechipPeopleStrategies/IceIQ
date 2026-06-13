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
    if (/\.test\.(js|jsx)$/.test(f)) continue;
    let src;
    try { src = fs.readFileSync(f, "utf8"); } catch { continue; }
    for (const spec of parseImports(src)) {
      if (!spec.startsWith(".")) continue; // bare packages handled by stale-deps
      if (resolveImport(f, spec) === null) {
        broken.push({ file: path.relative(root, f), spec });
      }
    }
  }
  return broken;
}

// Build-time dependencies that legitimately have no src/ import.
export const BUILD_DEPS = new Set([
  "vite", "@vitejs/plugin-react", "postcss", "tailwindcss", "autoprefixer", "eslint",
]);

// Extract import.meta.glob("PATTERN") specifiers from source.
export function parseGlobSpecs(src) {
  const out = [];
  const re = /import\.meta\.glob\(\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(src))) out.push(m[1]);
  return out;
}

// Convert a glob pattern (supports * and **) to an anchored RegExp over "/"-joined paths.
export function globToRegExp(pattern) {
  let re = "";
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === "*") {
      if (pattern[i + 1] === "*") { re += ".*"; i++; if (pattern[i + 1] === "/") i++; }
      else re += "[^/]*";
    } else if ("/.+?()[]{}^$|\\".includes(c)) {
      re += "\\" + c;
    } else {
      re += c;
    }
  }
  return new RegExp("^" + re + "$");
}

// Set of absolute file paths reachable from the entry via static imports and globs.
export function buildReachable(root, entryRel = "src/main.jsx") {
  const srcDir = path.join(root, "src");
  const entry = path.join(root, entryRel);
  const reachable = new Set();
  const stack = [];
  if (fs.existsSync(entry)) { reachable.add(entry); stack.push(entry); }
  const srcFiles = walkFiles(srcDir, [".js", ".jsx", ".json"]);
  while (stack.length) {
    const f = stack.pop();
    let src;
    try { src = fs.readFileSync(f, "utf8"); } catch { continue; }
    for (const spec of parseImports(src)) {
      if (!spec.startsWith(".")) continue;
      const r = resolveImport(f, spec);
      if (r && !reachable.has(r)) { reachable.add(r); stack.push(r); }
    }
    for (const g of parseGlobSpecs(src)) {
      const absPattern = path.resolve(path.dirname(f), g).split(path.sep).join("/");
      const rx = globToRegExp(absPattern);
      for (const cand of srcFiles) {
        const norm = cand.split(path.sep).join("/");
        if (rx.test(norm) && !reachable.has(cand)) { reachable.add(cand); stack.push(cand); }
      }
    }
  }
  return reachable;
}

// src/ .js/.jsx files not reachable from the entry (test files excluded).
export function findUnusedFiles(root, entryRel = "src/main.jsx") {
  const srcDir = path.join(root, "src");
  const reachable = buildReachable(root, entryRel);
  const unused = [];
  for (const f of walkFiles(srcDir, [".js", ".jsx"])) {
    if (reachable.has(f)) continue;
    if (/\.test\.(js|jsx)$/.test(f)) continue;
    unused.push(path.relative(root, f));
  }
  return unused;
}

// Normalize a bare specifier to its package name (handles scopes and subpaths).
export function packageNameOf(spec) {
  if (spec.startsWith("@")) {
    const parts = spec.split("/");
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : parts[0];
  }
  return spec.split("/")[0];
}

// Set of package names imported anywhere under src/ (excludes relative and node: specs).
export function collectBareImports(root) {
  const srcDir = path.join(root, "src");
  const names = new Set();
  for (const f of walkFiles(srcDir, [".js", ".jsx"])) {
    let src;
    try { src = fs.readFileSync(f, "utf8"); } catch { continue; }
    for (const spec of parseImports(src)) {
      if (spec.startsWith(".") || spec.startsWith("node:")) continue;
      names.add(packageNameOf(spec));
    }
  }
  return names;
}

// dependencies declared in package.json but never imported under src/ (build deps allowlisted).
export function scanStaleDeps(root, allowlist = BUILD_DEPS) {
  let pkg;
  try { pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")); }
  catch { return []; }
  // devDependencies are intentionally excluded: build-time tooling has no src/ import.
  const deps = Object.keys(pkg.dependencies || {});
  const used = collectBareImports(root);
  return deps.filter(d => !used.has(d) && !allowlist.has(d));
}

// Stray backup/temp files loose directly in src/data/ (the backups/ subdir is intentional).
export function scanCruft(root) {
  const dataDir = path.join(root, "src", "data");
  const out = [];
  let entries;
  try { entries = fs.readdirSync(dataDir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.isDirectory()) continue;
    if (/\.(bak|tmp|orig)$/i.test(e.name)) out.push(path.relative(root, path.join(dataDir, e.name)));
  }
  return out;
}

// Aggregate all four buckets.
export function scanDeadCode({ root, entry = "src/main.jsx" } = {}) {
  return {
    brokenImports: scanBrokenImports(root),
    unusedFiles: findUnusedFiles(root, entry),
    staleDeps: scanStaleDeps(root),
    cruft: scanCruft(root),
  };
}
