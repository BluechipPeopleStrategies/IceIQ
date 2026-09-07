import { useMemo, useState } from 'react';
import { buildPracticeInsights, createPracticeAnalyticsStore } from './experimentalPracticeAnalytics.js';
import './ExperimentalPracticeInsights.css';

function downloadJSON(text) {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof Blob === 'undefined') return;
  const link = document.createElement('a');
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }));
  link.href = url;
  link.download = 'rinkreads-experimental-practice-insights.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function rankedRows(rows, empty) {
  if (!rows.length) return <p className="epi-empty">{empty}</p>;
  return <ul className="epi-ranked">{rows.slice(0, 5).map(row => <li key={`${row.key}:${row.category || ''}`}><b>{row.count}</b><span>{row.scenarioId} · {row.questionId}{row.category ? ` · ${row.category}` : ''}</span></li>)}</ul>;
}

function completionRows(rows) {
  const usable = rows.filter(row => row.rate !== null).sort((a, b) => b.totalViews - a.totalViews || a.questionId.localeCompare(b.questionId)).slice(0, 5);
  if (!usable.length) return <p className="epi-empty">No reliable view-to-check sample yet.</p>;
  return <ul className="epi-ranked">{usable.map(row => <li key={row.key}><b>{Math.round(row.rate * 100)}%</b><span>{row.scenarioId} · {row.questionId} · {row.distinctViewIDsWithCheckOrSkip}/{row.totalViews} views checked or skipped</span></li>)}</ul>;
}

export default function ExperimentalPracticeInsights({ store: suppliedStore, storage }) {
  const store = useMemo(() => suppliedStore || createPracticeAnalyticsStore({ storage }), [suppliedStore, storage]);
  const [snapshot, setSnapshot] = useState(() => store.getState());
  const [notice, setNotice] = useState('');
  const insights = useMemo(() => buildPracticeInsights(snapshot), [snapshot]);
  const refresh = () => { setSnapshot(store.getState()); setNotice('Report refreshed from this browser.'); };
  const clear = () => { setSnapshot(store.clear()); setNotice('Local experimental practice data cleared.'); };
  const s = insights.sampleSizes;
  return <section className="epi-root" aria-labelledby="epi-title">
    <div className="epi-heading"><div><p className="epi-kicker">LOCAL PRACTICE REPORT</p><h2 id="epi-title">See what your practice is asking for.</h2><p>Anonymous counts from this browser, grouped by exact scenario, version and question.</p></div><div className="epi-actions"><button type="button" onClick={refresh}>Refresh report</button><button type="button" onClick={() => downloadJSON(store.exportJSON())}>Export JSON</button><button type="button" className="epi-clear" onClick={clear}>Clear local data</button></div></div>
    {notice && <p className="epi-notice" role="status">{notice}</p>}
    <div className="epi-samples" aria-label="Practice sample sizes">
      <div><b>{s.views}</b><span>question views</span></div><div><b>{s.checkedAttempts}</b><span>checked attempts</span></div><div><b>{s.retries}</b><span>retries</span></div><div><b>{s.flags}</b><span>flags</span></div><div><b>{s.reflectionSkips}</b><span>reflection skips</span></div>
    </div>
    <div className="epi-grid"><article><h3>Most viewed</h3>{rankedRows(insights.mostViewed, 'No question views recorded yet.')}</article><article><h3>Most retried</h3>{rankedRows(insights.mostRetried, 'No retries recorded yet.')}</article><article><h3>Most flagged</h3>{rankedRows(insights.mostFlagged, 'No flags recorded yet.')}</article></div>
    <div className="epi-detail"><div><h3>Scene checks</h3><p>{s.sceneChecks} checked · {s.sceneMatches} matched</p><small>{insights.sceneMatch.rate === null ? 'No scene-match sample yet.' : `${Math.round(insights.sceneMatch.rate * 100)}% of this local sample matched the scene answer.`}</small></div><div><h3>Question formats checked</h3><ul className="epi-plain">{insights.framingUsage.length ? insights.framingUsage.map(row => <li key={row.key}>{row.format}: {row.count}</li>) : <li>No checked formats yet.</li>}</ul></div><div><h3>Camera controls used</h3><ul className="epi-plain">{insights.cameraUsage.length ? insights.cameraUsage.map(row => <li key={row.key}>{row.action}: {row.count}</li>) : <li>No camera-use events yet.</li>}</ul></div><div><h3>View follow-through</h3>{completionRows(insights.completionRates)}</div><div><h3>Retention and storage</h3><p>{insights.droppedCount} dropped events · {insights.storageStatus}</p><small>Events beyond the local cap or invalid restored records are counted. Status reports whether this browser could persist the store.</small></div></div>
    <p className="epi-footnote">Follow-through counts distinct question views with a checked attempt or an optional reflection skip, divided by total views for the exact question identity. Unassociated events are omitted from that rate. These browser-local counts do not award mastery or compare players.</p>
  </section>;
}
