export const PRACTICE_JUDGE_ENDPOINT = '/__practice/judge';

const FALLBACK_MESSAGE = 'AI coach review is unavailable right now. Your answer has not been graded.';

async function readResponse(response) {
  try { return await response.json(); }
  catch { return null; }
}

function failure(code, message, unavailable = true) {
  return { ok: false, judgment: null, model: null, source: null, unavailable, code, message: message || FALLBACK_MESSAGE };
}

export async function getPracticeJudgeStatus({ fetchImpl = globalThis.fetch, signal } = {}) {
  try {
    const response = await fetchImpl(PRACTICE_JUDGE_ENDPOINT, { method: 'GET', headers: { Accept: 'application/json' }, signal });
    const body = await readResponse(response);
    if (!response.ok || !body?.configured) {
      return { configured: false, model: body?.model ?? null, message: body?.message || 'AI coach review is not configured on this local server.' };
    }
    return { configured: true, model: body.model ?? null, message: '' };
  } catch {
    return { configured: false, model: null, message: 'AI coach review is unavailable on this local server.' };
  }
}

export async function judgePracticeAttempt(payload, { fetchImpl = globalThis.fetch, signal } = {}) {
  try {
    const response = await fetchImpl(PRACTICE_JUDGE_ENDPOINT, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    });
    const body = await readResponse(response);
    if (!response.ok || !body?.ok || !body?.judgment) {
      const code = body?.code || (response.status === 503 ? 'not_configured' : 'judge_unavailable');
      const unavailable = response.status >= 500 || response.status === 429 || code === 'not_configured' || code === 'timeout';
      return failure(code, body?.message, unavailable);
    }
    return { ok: true, judgment: body.judgment, model: body.model ?? null, source: body.source ?? null, unavailable: false, code: null, message: '' };
  } catch (error) {
    return failure(error?.name === 'AbortError' ? 'cancelled' : 'network_error', FALLBACK_MESSAGE);
  }
}
