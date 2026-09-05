// Additive composition deliberately preserves existing scenario versions and answers.
// Changing an existing question requires the separate revision/review workflow.
export function composeExperimentalBank(original, newScenarios = [], additions = []) {
  const bank = structuredClone(original), byId = new Map(bank.map(s => [s.id, s]));
  const questionIds = new Set(bank.flatMap(s => s.questions.map(q => q.id)));
  const append = (scenario, questions) => {
    for (const q of questions) {
      if (questionIds.has(q.id)) throw new Error(`Question ID already exists: ${q.id}`);
      questionIds.add(q.id);
      scenario.questions.push(structuredClone(q));
    }
  };
  const extended = new Set();
  for (const addition of additions) {
    const scenario = byId.get(addition.scenarioId);
    if (!scenario) throw new Error(`Unknown existing scenario: ${addition.scenarioId}`);
    if (scenario.version !== addition.scenarioVersion) throw new Error(`Stale scenario version: ${scenario.id}`);
    if (extended.has(scenario.id)) throw new Error(`Repeated extension: ${scenario.id}`);
    extended.add(scenario.id);
    append(scenario, addition.questions);
  }
  for (const incoming of newScenarios) {
    if (byId.has(incoming.id)) throw new Error(`Scenario ID already exists: ${incoming.id}`);
    const scenario = { ...structuredClone(incoming), questions: [] };
    append(scenario, incoming.questions);
    bank.push(scenario);
    byId.set(scenario.id, scenario);
  }
  return bank.sort((a,b) => Number(a.ageBand.slice(1)) - Number(b.ageBand.slice(1)) || a.id.localeCompare(b.id));
}
