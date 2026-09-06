import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { readBankFiles, projectRoot } from "../tools/experimental-bank-files.mjs";
import { selectPracticeQuestions } from "../src/one-on-one/practiceQuestionSelection.js";
process.chdir(projectRoot);

const levels = [
  "U7 / Initiation", "U9 / Novice", "U11 / Atom",
  "U13 / Peewee", "U15 / Bantam", "U18 / Midget",
];
const bank = JSON.parse(readFileSync("src/data/bank.json", "utf8"));
const live = [];
for (const [level, questions] of Object.entries(bank)) {
  for (const question of questions) {
    live.push({ ...question, source: "current-bank", type: question.type || "mc", levels: [level] });
  }
}
for (const file of readdirSync("src/scenario/seeds")) {
  const path = join("src/scenario/seeds", file);
  if (!file.endsWith(".json") || !statSync(path).isFile()) continue;
  const scenario = JSON.parse(readFileSync(path, "utf8"));
  if (scenario.type !== "scenario") continue;
  const targets = (scenario.levels?.length ? scenario.levels : [scenario.level]).filter(level => levels.includes(level) && !live.some(row => row.id === scenario.id && row.levels.includes(level)));
  if (targets.length) live.push({ ...scenario, source: "current-seed", levels: targets });
}

const count = (values) => Object.fromEntries(
  [...values].sort((a, b) => a[0].localeCompare(b[0])).map(([key, value]) => [key, value]),
);
const byLevel = {};
for (const level of levels) {
  const rows = live.filter((row) => row.levels.includes(level));
  const types = new Map();
  const categories = new Map();
  const situations = new Set();
  for (const row of rows) {
    const type = row.type || "scenario";
    types.set(type, (types.get(type) || 0) + 1);
    const category = row.cat || "(untagged)";
    categories.set(category, (categories.get(category) || 0) + 1);
    // nodeId groups generated variants; IDs remain the playable-row count.
    situations.add(row.nodeId || row.id);
  }
  byLevel[level] = {
    rows: rows.length,
    curriculumNodeProxy: situations.size,
    types: count(types),
    categories: count(categories),
  };
}

const queue = JSON.parse(readFileSync("docs/ai-pipeline/_queue-bank.json", "utf8"));
const reviewed = JSON.parse(readFileSync("docs/ai-pipeline/_reviewed-bank.json", "utf8"));
const liveIds = new Set(live.map((row) => row.id));
const staged = (rows) => ({
  rows: rows.length,
  uniqueIds: new Set(rows.map((row) => row.id)).size,
  overlapsLive: rows.filter((row) => liveIds.has(row.id)).length,
});

const experimental = readBankFiles().bank;
const experimentalByAge = {};
for (const age of ["U7", "U9", "U11", "U13", "U15", "U18"]) {
  const scenarios = experimental.filter((scenario) => scenario.ageBand === age);
  const types = new Map();
  const topics = new Map();
  let authoredQuestions = 0;
  for (const scenario of scenarios) {
    topics.set(scenario.topic, (topics.get(scenario.topic) || 0) + 1);
    for (const question of scenario.questions) {
      types.set(question.type, (types.get(question.type) || 0) + 1);
      authoredQuestions += 1;
    }
  }
  experimentalByAge[age] = {
    scenarios: scenarios.length,
    questions: authoredQuestions,
    visibleQuestions: scenarios.reduce((n, scenario) => n + selectPracticeQuestions(scenario).length, 0),
    practiceQuestions: scenarios.reduce((n, scenario) => n + selectPracticeQuestions(scenario).filter(q => q.type !== "explain").length, 0),
    optionalReflections: scenarios.reduce((n, scenario) => n + selectPracticeQuestions(scenario).filter(q => q.type === "explain").length, 0),
    types: count(types),
    topicScenarioCounts: count(topics),
    // Scenario IDs are authored containers, not evidence of tactical novelty.
    authoredScenarioContainers: scenarios.length,
  };
}

console.log(JSON.stringify({
  currentSource: {
    rows: live.length,
    uniqueIds: liveIds.size,
    sources: { bank: live.filter((row) => row.source === "current-bank").length, seeds: live.filter((row) => row.source === "current-seed").length },
    byLevel,
  },
  experimental: {
    scenarios: experimental.length,
    questions: experimental.reduce((sum, scenario) => sum + scenario.questions.length, 0),
    visibleQuestions: experimental.reduce((sum, scenario) => sum + selectPracticeQuestions(scenario).length, 0),
    practiceQuestions: experimental.reduce((sum, scenario) => sum + selectPracticeQuestions(scenario).filter(q => q.type !== "explain").length, 0),
    optionalReflections: experimental.reduce((sum, scenario) => sum + selectPracticeQuestions(scenario).filter(q => q.type === "explain").length, 0),
    byAge: experimentalByAge,
  },
  staging: { queue: staged(queue), reviewed: staged(reviewed) },
}, null, 2));
