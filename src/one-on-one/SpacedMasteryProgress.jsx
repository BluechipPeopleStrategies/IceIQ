import { DEFAULT_MASTERY_POLICY } from './spacedMasteryCore.js';
import './SpacedMasteryProgress.css';

export default function SpacedMasteryProgress({progress,eligible=true,previewReason}) {
 const policy=progress?.policy||DEFAULT_MASTERY_POLICY;
 return <aside className="spaced-mastery" aria-label="Mastery progress">
  <strong>{progress?.mastered?`Practice requirements met · ${progress.points} points`:'Build mastery over time'}</strong>
  {eligible&&progress?<p>{progress.distinctQuestions} / {policy.minDistinctQuestions} different questions · {progress.practiceDays} / {policy.minPracticeDays} practice days · {Math.round(progress.accuracy*100)}% current accuracy</p>:<p>{previewReason||'This activity is practice only and does not add mastery evidence.'}</p>}
  <details><summary>What counts toward mastery?</summary>
   <p>For the same age, concept and question format: {policy.minDistinctQuestions} different eligible questions, at least {Math.round(policy.minAccuracy*100)}% accuracy, and {policy.minPracticeDays} practice dates across {policy.minCalendarWeeks} calendar weeks spanning at least {policy.minSpanDays} days.</p>
   <p>Only your first answer to a question each day counts. A later day can show improvement. Repeating a question does not add variety. There is no speed target or daily streak to protect.</p>
   {eligible&&progress&&<p>{progress.eligibleAvailable} eligible questions are currently available for this group.{progress.coverageShortfall>0?` This group needs ${progress.coverageShortfall} more different eligible questions before full mastery is possible.`:''} You have practised across {progress.calendarWeeks} calendar weeks and {progress.spanDays} days.</p>}
   <p>These are product practice requirements, separate from hockey certification. Historical points stay in your history; experimental scenarios do not count.</p>
  </details>
 </aside>;
}
