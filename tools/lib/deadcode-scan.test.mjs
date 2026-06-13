#!/usr/bin/env node
// Unit tests for the dead-code scanner. Run: node tools/lib/deadcode-scan.test.mjs
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  parseImports, resolveImport, walkFiles, scanBrokenImports,
  parseGlobSpecs, globToRegExp, buildReachable, findUnusedFiles,
  packageNameOf, collectBareImports, scanStaleDeps, scanCruft, scanDeadCode,
} from "./deadcode-scan.mjs";

let pass = 0, fail = 0;
const ok = (name, cond) => { console.log(`${cond ? "PASS" : "FAIL"}  ${name}`); cond ? pass++ : fail++; };

// --- parseImports
{
  const src = `
    import a from "./a.js";
    import { b, c } from "../lib/b";
    import "./side-effect.css";
    export { d } from "./d";
    const e = require("./e.js");
    const f = await import("./f.jsx");
    import pkg from "some-pkg";
  `;
  const specs = parseImports(src);
  ok("parseImports finds default import", specs.includes("./a.js"));
  ok("parseImports finds named import", specs.includes("../lib/b"));
  ok("parseImports finds side-effect import", specs.includes("./side-effect.css"));
  ok("parseImports finds re-export", specs.includes("./d"));
  ok("parseImports finds require", specs.includes("./e.js"));
  ok("parseImports finds dynamic import", specs.includes("./f.jsx"));
  ok("parseImports finds bare package", specs.includes("some-pkg"));
}

// --- resolveImport + scanBrokenImports
{
  const root = mkdtempSync(join(tmpdir(), "dcs-"));
  mkdirSync(join(root, "src", "lib"), { recursive: true });
  writeFileSync(join(root, "src", "main.jsx"), `import a from "./a.js"; import miss from "./nope.js";`);
  writeFileSync(join(root, "src", "a.js"), `export default 1;`);
  writeFileSync(join(root, "src", "lib", "b.jsx"), `export const b = 2;`);
  writeFileSync(join(root, "src", "thing.test.jsx"), `import x from "./does-not-exist.js";`);

  ok("resolveImport finds .js sibling",
     resolveImport(join(root, "src", "main.jsx"), "./a.js") === join(root, "src", "a.js"));
  ok("resolveImport finds .jsx by extensionless spec",
     resolveImport(join(root, "src", "main.jsx"), "./lib/b") === join(root, "src", "lib", "b.jsx"));
  ok("resolveImport returns null for missing",
     resolveImport(join(root, "src", "main.jsx"), "./nope.js") === null);

  ok("walkFiles lists js/jsx under src",
     walkFiles(join(root, "src"), [".js", ".jsx"]).length === 4);

  const broken = scanBrokenImports(root);
  ok("scanBrokenImports flags exactly the missing one",
     broken.length === 1 && broken[0].spec === "./nope.js" && broken[0].file === join("src", "main.jsx"));
  ok("scanBrokenImports ignores bare packages",
     !broken.some(b => b.spec === "some-pkg"));
  ok("scanBrokenImports skips .test files",
     !scanBrokenImports(root).some(b => b.file.includes("thing.test")));

  rmSync(root, { recursive: true, force: true });
}

// --- glob helpers
ok("globToRegExp matches single star within a segment",
   globToRegExp("/a/*.json").test("/a/x.json") && !globToRegExp("/a/*.json").test("/a/b/x.json"));
ok("globToRegExp matches double star across segments",
   globToRegExp("/a/**/*.js").test("/a/b/c.js"));
ok("globToRegExp matches leading double-star",
   globToRegExp("**/*.json").test("a/b/c.json"));
ok("parseGlobSpecs extracts import.meta.glob pattern",
   parseGlobSpecs(`const m = import.meta.glob("./seeds/*.json", { eager: true });`)[0] === "./seeds/*.json");

// --- unused files, deps, cruft, aggregate
{
  const root = mkdtempSync(join(tmpdir(), "dcs2-"));
  mkdirSync(join(root, "src", "scenario", "seeds"), { recursive: true });
  mkdirSync(join(root, "src", "data", "backups"), { recursive: true });
  writeFileSync(join(root, "package.json"), JSON.stringify({
    dependencies: { "used-pkg": "1.0.0", "dead-pkg": "1.0.0", "vite": "5.0.0" },
    devDependencies: { "esbuild": "1.0.0" },
  }));
  writeFileSync(join(root, "src", "main.jsx"),
    `import a from "./a.js"; import x from "used-pkg"; ` +
    `const s = import.meta.glob("./scenario/seeds/*.json", { eager: true });`);
  writeFileSync(join(root, "src", "a.js"), `export default 1;`);
  writeFileSync(join(root, "src", "orphan.jsx"), `export const dead = 1;`);
  writeFileSync(join(root, "src", "a.test.js"), `// test file, not dead`);
  writeFileSync(join(root, "src", "scenario", "seeds", "s1.json"), `{ "id": "s1" }`);
  writeFileSync(join(root, "src", "data", "x.bak"), `old`);
  writeFileSync(join(root, "src", "data", "questions.json.ship.tmp"), `old`);
  writeFileSync(join(root, "src", "data", "backups", "keep.bak"), `intentional`);

  const reachable = buildReachable(root, "src/main.jsx");
  ok("buildReachable includes entry and static import",
     reachable.has(join(root, "src", "main.jsx")) && reachable.has(join(root, "src", "a.js")));
  ok("buildReachable includes glob-matched seed",
     reachable.has(join(root, "src", "scenario", "seeds", "s1.json")));

  const unused = findUnusedFiles(root, "src/main.jsx");
  ok("findUnusedFiles flags orphan", unused.includes(join("src", "orphan.jsx")));
  ok("findUnusedFiles ignores test files", !unused.some(u => u.endsWith("a.test.js")));
  ok("findUnusedFiles does not flag reachable files", !unused.includes(join("src", "a.js")));

  ok("packageNameOf handles scoped pkg", packageNameOf("@scope/pkg/sub") === "@scope/pkg");
  ok("packageNameOf handles plain pkg", packageNameOf("react/jsx-runtime") === "react");

  const used = collectBareImports(root);
  ok("collectBareImports finds used package", used.has("used-pkg"));

  const stale = scanStaleDeps(root);
  ok("scanStaleDeps flags unused dependency", stale.includes("dead-pkg"));
  ok("scanStaleDeps ignores used dependency", !stale.includes("used-pkg"));
  ok("scanStaleDeps ignores build-time dep on allowlist", !stale.includes("vite"));

  const cruft = scanCruft(root);
  ok("scanCruft flags .bak loose in data", cruft.includes(join("src", "data", "x.bak")));
  ok("scanCruft flags .ship.tmp", cruft.includes(join("src", "data", "questions.json.ship.tmp")));
  ok("scanCruft leaves backups/ dir alone", !cruft.some(c => c.includes("backups")));

  const all = scanDeadCode({ root, entry: "src/main.jsx" });
  ok("scanDeadCode aggregates all four buckets",
     Array.isArray(all.brokenImports) && all.unusedFiles.includes(join("src", "orphan.jsx")) &&
     all.staleDeps.includes("dead-pkg") && all.cruft.length >= 2);

  rmSync(root, { recursive: true, force: true });
}

// --- buildReachable with a missing entry returns an empty set
{
  const root = mkdtempSync(join(tmpdir(), "dcs3-"));
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "src", "lonely.jsx"), `export const x = 1;`);
  ok("buildReachable returns empty set when entry is missing",
     buildReachable(root, "src/nonexistent-entry.jsx").size === 0);
  ok("findUnusedFiles flags everything when entry is missing",
     findUnusedFiles(root, "src/nonexistent-entry.jsx").includes(join("src", "lonely.jsx")));
  rmSync(root, { recursive: true, force: true });
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
