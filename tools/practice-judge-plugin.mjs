import { loadEnv } from 'vite';
import { createPracticeJudge, MAX_JUDGE_BODY_BYTES, PRACTICE_JUDGE_PATH, PracticeJudgeError } from './practice-judge.mjs';

function json(res, status, value) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(value));
}

function loopbackAddress(value = '') {
  return value === '127.0.0.1' || value === '::1' || value === '::ffff:127.0.0.1';
}

function localHost(value = '') {
  const host = value.toLowerCase().replace(/^\[/, '').replace(/\](?=:|$)/, '');
  return host === 'localhost' || host.startsWith('localhost:') || host === '127.0.0.1' || host.startsWith('127.0.0.1:') || host === '::1' || host.startsWith('::1:');
}

export function isAllowedPracticeJudgeRequest(req) {
  const host = typeof req.headers?.host === 'string' ? req.headers.host : '';
  if (!localHost(host)) return false;
  const origin = req.headers?.origin;
  if (origin) {
    try {
      const parsed = new URL(origin);
      return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && localHost(parsed.host) && parsed.host.toLowerCase() === host.toLowerCase();
    } catch { return false; }
  }
  return loopbackAddress(req.socket?.remoteAddress);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_JUDGE_BODY_BYTES) {
        reject(new PracticeJudgeError(413, 'input_too_large', 'The judge request is too large.'));
        req.resume();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (size > MAX_JUDGE_BODY_BYTES) return;
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(new PracticeJudgeError(400, 'invalid_json', 'The judge request must contain valid JSON.')); }
    });
    req.on('error', () => reject(new PracticeJudgeError(400, 'invalid_request', 'The judge request could not be read.')));
  });
}

function timeoutFromEnv(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(1_000, Math.min(30_000, parsed)) : 12_000;
}

export function practiceJudgePlugin(options = {}) {
  let judge;
  return {
    name: 'rinkreads-practice-judge',
    apply: 'serve',
    configResolved(config) {
      const loaded = options.env ?? loadEnv(config.mode, config.root, '');
      const runtime = { ...loaded, ...process.env };
      judge = createPracticeJudge({
        apiKey: runtime.RINKREADS_JUDGE_API_KEY || runtime.OPENAI_API_KEY,
        model: runtime.RINKREADS_JUDGE_MODEL,
        timeoutMs: options.timeoutMs ?? timeoutFromEnv(runtime.RINKREADS_JUDGE_TIMEOUT_MS),
        fetchImpl: options.fetchImpl ?? globalThis.fetch,
        rootDir: options.rootDir ?? config.root,
      });
    },
    configureServer(server) {
      server.middlewares.use(PRACTICE_JUDGE_PATH, async (req, res, next) => {
        if (!judge) return json(res, 503, { ok: false, code: 'not_configured', message: 'AI coach review is not configured on this server.' });
        if (!isAllowedPracticeJudgeRequest(req)) return json(res, 403, { ok: false, code: 'forbidden_origin', message: 'AI coach review accepts same-origin local requests only.' });
        if (req.method === 'GET') return json(res, 200, { ok: true, ...judge.status() });
        if (req.method !== 'POST') {
          res.setHeader('Allow', 'GET, POST');
          return json(res, 405, { ok: false, code: 'method_not_allowed', message: 'Use GET or POST for AI coach review.' });
        }
        if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) {
          return json(res, 415, { ok: false, code: 'unsupported_media_type', message: 'AI coach review requires JSON.' });
        }
        try {
          const payload = await readJsonBody(req);
          return json(res, 200, await judge.judge(payload));
        } catch (error) {
          if (error instanceof PracticeJudgeError) return json(res, error.status, { ok: false, code: error.code, message: error.message });
          return json(res, 500, { ok: false, code: 'internal_error', message: 'AI coach review could not be completed.' });
        }
      });
    },
  };
}

export default practiceJudgePlugin;
