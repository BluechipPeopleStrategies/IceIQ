// Keep the authored scenario immutable while choosing the routine view.
// Explain prompts are optional reflections: normal practice keeps the first
// one, while a direct link may intentionally request a different reflection.
export function selectPracticeQuestions(scenario, requestedQuestionId = '') {
  const questions = Array.isArray(scenario?.questions) ? scenario.questions : [];
  const requested = questions.find(question => question.id === requestedQuestionId && question.type === 'explain');
  const reflectionId = requested?.id || questions.find(question => question.type === 'explain')?.id;
  return questions.filter(question => question.type !== 'explain' || question.id === reflectionId);
}

