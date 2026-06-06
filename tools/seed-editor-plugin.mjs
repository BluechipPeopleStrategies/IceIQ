// Dev-only Vite middleware that lets the #scenarios playground save a scenario
// seed back to disk while you drag actors around the real board. Mirrors the
// review-server plugin: thin HTTP shell, present only under `npm run dev`
// (apply: "serve"), never in a production build. The editor is owner-only.
//
// Route:
//   POST /__seed/save  { id, scenario, force? }
//     → validates the scenario server-side (schema + hockey rules); on hard
//       errors it refuses to write (unless force) and returns the errors so
//       the UI can show them. On success writes src/scenario/seeds/<id>.json.
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";
import { validateScenario } from "../src/scenario/schema.js";
import { runHockeyValidators } from "../src/scenario/validators.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const seedsDir = resolve(__dirname, "..", "src/scenario/seeds");

function readBody(req) {
  return new Promise((res) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => { try { res(data ? JSON.parse(data) : {}); } catch { res({}); } });
  });
}
const send = (res, code, obj) => {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(obj));
};

// Combine the two validators the same way validate-seed.mjs does.
function lint(scenario) {
  const schema = validateScenario(scenario);
  const hockey = runHockeyValidators(scenario);
  return {
    errs: [...(schema.errs || []), ...(hockey.errs || [])],
    warns: [...(schema.warns || []), ...(hockey.warns || [])],
  };
}

export function seedEditorPlugin() {
  return {
    name: "rinkreads-seed-editor",
    apply: "serve", // dev only
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith("/__seed/")) return next();
        const route = req.url.split("?")[0];
        try {
          if (route === "/__seed/save" && req.method === "POST") {
            const body = await readBody(req);
            const { id, scenario, force } = body;
            // Allow hyphens too (seed ids embed nodeId slugs like
            // "decision-making"). No dots/slashes → no path traversal.
            if (!id || !/^[a-z0-9_-]+$/i.test(id)) {
              return send(res, 400, { ok: false, errs: ["invalid or missing id (use a-z, 0-9, _, -)"] });
            }
            if (!scenario || typeof scenario !== "object") {
              return send(res, 400, { ok: false, errs: ["missing scenario body"] });
            }
            // Keep the file's id in sync with the route id.
            scenario.id = id;
            const { errs, warns } = lint(scenario);
            if (errs.length && !force) {
              return send(res, 400, { ok: false, errs, warns, wrote: false });
            }
            const path = resolve(seedsDir, id + ".json");
            writeFileSync(path, JSON.stringify(scenario, null, 2) + "\n");
            return send(res, 200, { ok: true, errs, warns, wrote: true, path: `src/scenario/seeds/${id}.json` });
          }
          return send(res, 404, { ok: false, errs: ["unknown seed route"] });
        } catch (e) {
          return send(res, 500, { ok: false, errs: [String(e && e.message || e)] });
        }
      });
    },
  };
}
