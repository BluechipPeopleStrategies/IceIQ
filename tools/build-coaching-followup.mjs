import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { projectRoot, readJson } from "./experimental-bank-files.mjs";
import { loadHistoricalQuestionSnapshots, resolveHistoricalQuestion } from "./coaching-followup-history.mjs";

const directory = join(projectRoot, "docs/factory/research/question-review/followup");
const repairDirectory = join(projectRoot, "docs/factory/research/question-review/repairs");
const rows = ["mixed", "u13"].flatMap(lane => readJson(join(directory, `${lane}-proposals.json`)).entries);
const bank = ["u7", "u9", "u11", "u13", "u15", "u18"].flatMap(age => readJson(join(projectRoot, `src/one-on-one/experimental-bank/${age}.json`)));
const source = new Map(bank.flatMap(scenario => scenario.questions.map(question => [question.id, { s: scenario, q: question }])));
const historicalSnapshots = loadHistoricalQuestionSnapshots(repairDirectory);
const checkPath = join(directory, "u9-006-recheck.json");
const check = existsSync(checkPath) ? readJson(checkPath) : null;
const checkRows = check?.results || (check?.questionId ? [check] : []);

if (rows.length !== 55 || new Set(rows.map(row => row.questionId)).size !== 55) throw Error("Expected55 unique follow-up records");
const resolved = rows.map(row => {
  const current = source.get(row.questionId);
  if (!current) throw Error(`Missing current question ${row.questionId}`);
  return { row, current, historical: resolveHistoricalQuestion(row, current, historicalSnapshots) };
});

const esc = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
const question = q => `<p>${esc(q.prompt)}</p>${q.options ? `<ul>${q.options.map(option => `<li>${esc(option.text)}</li>`).join("")}</ul>` : ""}<p>${esc(q.explanation)}</p>`;
const cards = resolved.sort((a, b) => (a.row.decision === "keep") - (b.row.decision === "keep") || a.row.questionId.localeCompare(b.row.questionId)).map(({ row, current, historical }) => {
  const { s, q } = current;
  const verified = checkRows.some(checkRow => checkRow.questionId === q.id && checkRow.contentHash === historical.contentHash && (checkRow.status === "pass" || checkRow.verdict === "retain"));
  const archivedLabel = historical.matchesCurrent ? "Archived review · matches current" : "Archived review · current wording differs";
  const reviewBody = historical.matchesCurrent
    ? `<details><summary>Read the archived reviewed question</summary>${question(historical.question)}</details>`
    : `<div class="two"><section><h3>Archived reviewed question</h3>${question(historical.question)}<small>Exact archived hash: ${esc(historical.contentHash)} · ${esc(historical.receipt)}</small></section><section><h3>Current question</h3>${question(q)}<small>Current wording is linked below; it is not relabeled as the archived review.</small></section></div>`;
  return `<article><p class="kicker">${esc(s.ageBand)} · ${esc(archivedLabel)}${verified ? " · recheck recorded" : ""}</p><h2>${esc(s.title)}</h2><small>${esc(q.id)}</small><p>${esc(row.reason)}</p>${reviewBody}<a href="http://localhost:5173/?arena=experimental&age=${encodeURIComponent(s.ageBand)}&scenario=${encodeURIComponent(s.id)}&question=${encodeURIComponent(q.id)}#practice-arena">Open the current question on the rink ↗</a></article>`;
}).join("");
const changedCount = resolved.filter(item => !item.historical.matchesCurrent).length;
const output = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RinkReads · Luna follow-up</title><style>body{font:16px/1.55 system-ui;background:#0c1a2e;color:#edf2f7;margin:0}main{max-width:960px;margin:auto;padding:30px 20px}h1,h2{font-family:Georgia,serif;font-weight:500}h1{font-size:44px;line-height:1.12}.kicker{color:#e0b95c;font-size:12px;letter-spacing:.15em}article{border:1px solid #aec5dd33;border-radius:16px;padding:22px;background:linear-gradient(135deg,#c3dcec10,#c3dcec03);margin:20px 0}small{overflow-wrap:anywhere;color:#aebdd1}.two{display:grid;grid-template-columns:1fr 1fr;gap:24px}a{color:#e0b95c}summary{cursor:pointer;padding:10px 0}@media(max-width:650px){.two{grid-template-columns:1fr}h1{font-size:34px}}</style><main><p class="kicker">RINKREADS / LUNA COACHING REVIEW</p><h1>55 historical follow-ups.</h1><p>These cards preserve the exact question wording that was reviewed at the time. ${changedCount ? `${changedCount} current questions have since changed; those cards show the archived review beside the current question.` : "Current wording still matches every archived review."}</p><p>This is an AI coaching review, separate from human coach approval. The rink link always opens the current question.</p>${cards}<p>Archived follow-ups retain their original content hashes. Repairs and final checks have separate receipts.</p></main></html>`;
writeFileSync(join(directory, "review.html"), output);
console.log(JSON.stringify({ reviewed: rows.length, archivedCurrentMatches: resolved.filter(item => item.historical.matchesCurrent).length, archivedWordingDiffers: changedCount }));
