import fs from "node:fs";
import { ALL_ANIMATED_PLAYS } from "../src/play/playCatalog.js";
import { validatePlayCatalogFactoryStandards } from "../src/play/validateFactoryStandards.js";

const result = validatePlayCatalogFactoryStandards(ALL_ANIMATED_PLAYS);

let md = "# RinkReads Play Factory Standards Report\n\n";
md += "- **Plays checked:** " + ALL_ANIMATED_PLAYS.length + "\n";
md += "- **Hard errors:** " + result.errs.length + "\n";
md += "- **Warnings:** " + result.warns.length + "\n";
md += "- **Pass:** " + (result.ok ? "Yes" : "No") + "\n\n";

md += "## Hard Errors\n\n";
md += result.errs.length ? result.errs.map((err) => "- **" + err.playId + "** / " + (err.nodeId || "play") + ": " + err.message).join("\n") + "\n\n" : "_No hard errors._\n\n";

md += "## Warnings\n\n";
md += result.warns.length ? result.warns.map((warn) => "- **" + warn.playId + "** / " + (warn.nodeId || "play") + ": " + warn.message).join("\n") + "\n\n" : "_No warnings._\n\n";

fs.writeFileSync("docs/play-factory-standards-report.md", md, "utf8");

console.log("Wrote docs/play-factory-standards-report.md");
console.log("Hard errors:", result.errs.length);
console.log("Warnings:", result.warns.length);

if (!result.ok) process.exitCode = 1;
