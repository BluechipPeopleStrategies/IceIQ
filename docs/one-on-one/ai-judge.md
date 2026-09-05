# Local AI practice judge

The one-on-one practice judge reviews a player's written reason, static rink placement, and Shoot/Pass/Carry choice. It can recognize a plausible alternative to the coach-authored reference. It does not prove exact positions, hidden movement, or whether a shot scores.

## Local setup

The judge is disabled until the Vite server has an API key. Put one of these variables in the repository's uncommitted `.env.local` file, then restart `npm run dev`:

```dotenv
RINKREADS_JUDGE_API_KEY=your_server_key
# Or: OPENAI_API_KEY=your_server_key

# Optional. The default is gpt-4.1-mini; this remains configurable.
RINKREADS_JUDGE_MODEL=gpt-4.1-mini
RINKREADS_JUDGE_TIMEOUT_MS=12000
```

Do not use a `VITE_` prefix. Vite exposes `VITE_` variables to browser code. The practice-judge plugin loads these variables only in the local server process and sends requests to the OpenAI Responses API from that process. No key is returned by either endpoint.

`GET /__practice/judge` returns only whether the service is configured and its configured model. `POST /__practice/judge` accepts the bounded question and attempt contract used by `src/one-on-one/judgeClient.js`. A question may include a bounded rubric with `mode`, `mustNotice`, `acceptableActions`, `avoid`, and `followUpCue`; an open rubric explicitly supports more than one sound read. With no key, POST returns HTTP 503 and the client shows an unavailable message without inventing a grade.

The server reads source documents only when `question.sourceRef.note` is an exact `docs/library/*.md` reference. It resolves the real file path inside that directory before reading. A plain coach-authored note is labeled `authored-reference-unreviewed`; its result is forced to `needs-coach-review` with low confidence. Paths outside the allowlist are rejected.

Local middleware accepts same-origin requests on `localhost`, `127.0.0.1`, or `::1`, caps request and source sizes, permits one active model request, and times out stalled requests. The model receives the question, rubric when present, action, written reason, approved library text or clearly labeled authored reference, and a reduced static-geometry view of each draft. Draft titles, labels, IDs, and telemetry are removed before the model request.

## Production boundary

This Vite middleware is for local development and preview work. A production deployment needs a separate authenticated server endpoint with per-user authorization, rate limiting, abuse controls, request logging appropriate to the privacy policy, and secret management. Never put the OpenAI key in browser code, a public environment variable, or a client-side request.

The structured result uses `sound`, `needs-work`, `plausible-alternative`, or `needs-coach-review`, plus a headline, explanation, cue, follow-up question, and low/medium/high confidence. It intentionally has no percentage grade.
