#!/usr/bin/env node
// Unit tests for the dead-code scanner. Run: node tools/lib/deadcode-scan.test.mjs
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  parseImports, resolveImport, walkFiles, scanBrokenImports,
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

  ok("resolveImport finds .js sibling",
     resolveImport(join(root, "src", "main.jsx"), "./a.js") === join(root, "src", "a.js"));
  ok("resolveImport finds .jsx by extensionless spec",
     resolveImport(join(root, "src", "main.jsx"), "./lib/b") === join(root, "src", "lib", "b.jsx"));
  ok("resolveImport returns null for missing",
     resolveImport(join(root, "src", "main.jsx"), "./nope.js") === null);

  ok("walkFiles lists js/jsx under src",
     walkFiles(join(root, "src"), [".js", ".jsx"]).length === 3);

  const broken = scanBrokenImports(root);
  ok("scanBrokenImports flags exactly the missing one",
     broken.length === 1 && broken[0].spec === "./nope.js" && broken[0].file === join("src", "main.jsx"));
  ok("scanBrokenImports ignores bare packages",
     !broken.some(b => b.spec === "some-pkg"));

  rmSync(root, { recursive: true, force: true });
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
