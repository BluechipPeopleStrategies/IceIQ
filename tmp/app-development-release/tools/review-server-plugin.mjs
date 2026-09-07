// Dev-only Vite middleware for the founder review dashboard. Exposes the review
// store over HTTP so the browser dashboard can approve/reject/sendback/edit and
// have the changes hit disk (src/data/*) during `npm run dev`. Thin shell over
// tools/review-store.mjs. NOT present in production builds — the review tool is
// owner-only and runs locally.
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadQueue, approve, reject, sendBack, editItem } from "./review-store.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const paths = {
  queue: resolve(root, "src/data/review-queue.json"),
  bank: resolve(root, "src/data/bank.json"),
  log: resolve(root, "src/data/review-log.jsonl"),
};

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

export function reviewServerPlugin() {
  return {
    name: "rinkreads-review-server",
    apply: "serve", // dev only
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith("/__review/")) return next();
        const route = req.url.split("?")[0];
        const ts = new Date().toISOString();
        try {
          if (route === "/__review/queue" && req.method === "GET") {
            return send(res, 200, loadQueue(paths));
          }
          if (req.method !== "POST") return send(res, 405, { ok: false, error: "method not allowed" });
          const body = await readBody(req);
          const id = body.id;
          if (!id) return send(res, 400, { ok: false, error: "missing id" });
          let r;
          if (route === "/__review/approve") r = approve(paths, id, ts);
          else if (route === "/__review/reject") r = reject(paths, id, body.note || "", ts);
          else if (route === "/__review/sendback") r = sendBack(paths, id, body.note || "", ts);
          else if (route === "/__review/edit") r = editItem(paths, id, body.question, ts);
          else return send(res, 404, { ok: false, error: "unknown review route" });
          return send(res, r.ok ? 200 : 400, r);
        } catch (e) {
          return send(res, 500, { ok: false, error: String(e && e.message || e) });
        }
      });
    },
  };
}
