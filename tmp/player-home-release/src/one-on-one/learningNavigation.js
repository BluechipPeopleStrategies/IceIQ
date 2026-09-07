/** Open only an authored lesson for the selected age; unknown links start safely. */
export function initialGuidedLessonIndex(lessons, strands, ageBand, lessonId) {
  const age = String(ageBand).split(' ')[0];
  const lesson = lessons.find(item => item.id === lessonId && item.ageBand === age);
  return Math.max(0, strands.indexOf(lesson?.curriculumStrand));
}
