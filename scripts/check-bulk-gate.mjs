import { spawnSync } from "node:child_process";

const steps = [
  "test:play-catalog",
  "test:play-factory",
  "test:prototype-telemetry",
  "test:scenario-families",
  "report:play-factory",
  "report:prototype-telemetry",
  "report:scenario-families",
  "report:next-variants",
  "build"
];

console.log("\nRinkReads Bulk Gate");
console.log("====================\n");

for (const step of steps) {
  console.log("\n>>> npm run " + step);

  const result = process.platform === "win32"
    ? spawnSync("cmd.exe", ["/d", "/s", "/c", "npm", "run", step], {
        stdio: "inherit",
        shell: false
      })
    : spawnSync("npm", ["run", step], {
        stdio: "inherit",
        shell: false
      });

  if (result.error) {
    console.error("\nBulk gate could not start: " + result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error("\nBulk gate failed at: npm run " + step);
    process.exit(result.status ?? 1);
  }
}

console.log("\nBulk gate passed.");
console.log("Ready for controlled bulk-assisted scenario creation.");
