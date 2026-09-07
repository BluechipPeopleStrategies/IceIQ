import React, { useId, useMemo, useState } from 'react';
import { getTrainingLog } from '../utils/trainingLog.js';
import {
  activeGoalCount, addGoalCheckIn, assessGoalPlan, categoriesFor, dateAfter,
  goalBand, goalFocusLimit, localDate, makeGoalStarters, mergeGoalSupplement,
  readGoalPlan, readGoalSupplement, summariseCheckIns, updateGoalPlan,
  trainingSessionContext, writeGoalSupplement,
} from './goalPlanCore.js';
import './GoalBuilder.css';

const STATUS_LABEL = { draft: 'Draft', active: 'My focus', 'up-next': 'Up next', reviewed: 'Reviewed' };
const newCheckIn = () => ({ date: localDate(), observation: 'not-observed', attempted: '', observed: '', rpe: '', durationMinutes: '', reflection: '', nextAdjustment: '', sessionLabel: '' });

function Field({ label, hint, value, onChange, type = 'textarea', ...rest }) {
  const id = useId();
  const Component = type === 'textarea' ? 'textarea' : 'input';
  return <div className="goal-builder__field">
    <label htmlFor={id}>{label}</label>
    <p id={`${id}-help`} className="goal-builder__hint">{hint}</p>
    <Component id={id} aria-describedby={`${id}-help`} value={value ?? ''} onChange={event => onChange(event.target.value)} {...(type === 'textarea' ? { rows: 2 } : { type })} {...rest}/>
  </div>;
}

function loadInitial(player) {
  try { return { goals: mergeGoalSupplement(player?.goals, readGoalSupplement(player?.id)), error: '' }; }
  catch (error) { return { goals: { ...player?.goals }, error: error.message }; }
}

export default function GoalBuilder(props) {
  return <GoalBuilderForPlayer key={props.player?.id || 'no-player'} {...props}/>;
}

function GoalBuilderForPlayer({ player, onSave, onBack }) {
  const [initial] = useState(() => loadInitial(player));
  const [goals, setGoals] = useState(initial.goals);
  const [active, setActive] = useState(() => Object.keys(initial.goals).find(category => readGoalPlan(initial.goals[category], player?.level).status === 'active') || categoriesFor(player?.level, initial.goals)[0]);
  const [dirty, setDirty] = useState(new Set());
  const [error, setError] = useState(initial.error);
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [checkIn, setCheckIn] = useState(newCheckIn);
  const [showHistory, setShowHistory] = useState(false);
  const band = goalBand(player?.level);
  const young = band <= 7;
  const plan = readGoalPlan(goals[active], player?.level);
  const quality = assessGoalPlan(plan, { level: player?.level });
  const categories = categoriesFor(player?.level, goals);
  const limit = goalFocusLimit(player?.level);
  const occupied = activeGoalCount(goals, player?.level, active);
  const canFocus = occupied < limit || plan.status === 'active';
  const starters = makeGoalStarters(player?.level, active);
  const history = [...plan.checkIns].reverse();
  const progress = summariseCheckIns(plan.checkIns);
  const recentTraining = useMemo(() => {
    try { return [...(getTrainingLog(player?.id)?.sessions || [])].reverse().sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 8); }
    catch { return []; }
  }, [player?.id]);

  function edit(patch) {
    setGoals(current => updateGoalPlan(current, active, patch, { level: player?.level }));
    setDirty(current => new Set([...current, active]));
    setNotice('');
    setError('');
  }

  function chooseCategory(category) {
    setActive(category);
    setCheckIn(newCheckIn());
    setShowHistory(false);
    setError(initial.error);
    setNotice('');
  }

  async function persist(next, { navigate, message }) {
    setSaving(true);
    setError('');
    let deviceSaved = false;
    let appSaveStarted = false;
    try {
      for (const category of new Set([...dirty, active])) {
        writeGoalSupplement(player?.id, category, next[category]);
        deviceSaved = true;
      }
      setGoals(next);
      setDirty(new Set());
      appSaveStarted = true;
      await onSave(next, { navigate });
      setNotice(message);
      return true;
    } catch (failure) {
      setError(appSaveStarted
        ? `Your device copy was saved, but the app save could not finish. ${failure.message}`
        : deviceSaved
          ? `Some device copies were saved, but this save could not finish. Please retry. ${failure.message}`
          : `This save did not finish. ${failure.message}`);
      return false;
    } finally { setSaving(false); }
  }

  async function savePlan(status) {
    try {
      const next = updateGoalPlan(goals, active, {}, { level: player?.level, status });
      await persist(next, { navigate: true, message: status === 'active' ? 'Your practice focus is saved.' : `${STATUS_LABEL[status]} saved.` });
    } catch (failure) { setError(failure.message); }
  }

  async function saveCheckIn(event) {
    event.preventDefault();
    try {
      const next = addGoalCheckIn(goals, active, checkIn);
      if (await persist(next, { navigate: false, message: 'Check-in saved on this device. You can adjust your next try below.' })) setCheckIn(newCheckIn());
    } catch (failure) { setError(failure.message); }
  }

  function useSession(index) {
    const session = recentTraining[Number(index)];
    if (index === '' || !session) return;
    const context = trainingSessionContext(session);
    setCheckIn(current => ({ ...current, date: context.date || current.date, ...context }));
  }

  return <main className="goal-builder">
    <header className="goal-builder__header">
      <div className="goal-builder__header-inner">
        <button type="button" className="goal-builder__back" onClick={onBack} disabled={saving} aria-label="Back to home">← Back</button>
        <div><span className="goal-builder__eyebrow">YOUR DEVELOPMENT</span><h1>{young ? 'My next try' : 'Make a practice plan'}</h1></div>
        <span className="goal-builder__band">U{band}</span>
      </div>
    </header>
    <div className="goal-builder__layout">
      <aside className="goal-builder__focus-panel">
        <div className="goal-builder__glass goal-builder__intro">
          <span className="goal-builder__eyebrow">{young ? 'READ TOGETHER' : 'A SMALL FOCUS, A REAL NEXT STEP'}</span>
          <h2>{young ? 'Pick one thing to try.' : `${limit === 1 ? 'One focus' : `Up to ${limit} focuses`} at a time.`}</h2>
          <p>{young ? 'A grown-up can read these with you. Choose your own try-it phrase for the next practice.' : 'Choose an action you can control. Keep other ideas Up next. A missed try is useful information when you review.'}</p>
          <p className="goal-builder__hint">{activeGoalCount(goals, player?.level)} active · {limit} suggested for this age</p>
        </div>
        <nav className="goal-builder__categories" aria-label="Goal categories">
          {categories.map(category => {
            const item = readGoalPlan(goals[category], player?.level);
            return <button type="button" key={category} aria-current={active === category ? 'page' : undefined} onClick={() => chooseCategory(category)} disabled={saving}>
              <span>{category}</span><small>{item.action ? STATUS_LABEL[item.status] : 'Add an idea'}{dirty.has(category) ? ' · edited' : ''}</small>
            </button>;
          })}
        </nav>
      </aside>

      <div className="goal-builder__content">
        <section className="goal-builder__glass goal-builder__editor" aria-labelledby="goal-title">
          <div className="goal-builder__section-heading"><div><span className="goal-builder__eyebrow">{STATUS_LABEL[plan.status]}</span><h2 id="goal-title">{active}</h2></div><span className="goal-builder__step-mark" aria-hidden="true">01</span></div>
          <p>{young ? 'Tap an idea, or say your own. Your helper can write it.' : 'Use an idea below, then make it fit your practice. Your own reason stays yours to write.'}</p>
          <div className="goal-builder__chips" aria-label="Starting ideas">
            {starters.map(starter => <button key={starter.id} type="button" disabled={saving} onClick={() => edit(Object.fromEntries(Object.entries(starter).filter(([key]) => ['action', 'measure', 'schedule'].includes(key))))}>{starter.label}</button>)}
          </div>
          <Field label={young ? 'I will try…' : 'What will I do?'} hint={young ? 'One short phrase. Six words or fewer is enough.' : 'Name one visible action. “Look for a teammate before a pass” gives you something to try.'} value={plan.action} onChange={action => edit({ action })} maxLength={500} disabled={saving}/>
          {!young && <>
            <Field label="What will I notice or record?" hint={band === 9 ? 'Tell your helper whether you tried it, and one thing you noticed.' : 'Name the drill or situation and what you can observe. Count a few attempts, or write one concrete example.'} value={plan.measure} onChange={measure => edit({ measure })} maxLength={800} disabled={saving}/>
            <Field label="When can I practise this?" hint="Use a real opportunity in your week. Adjust it with a parent or coach if needed." value={plan.schedule} onChange={schedule => edit({ schedule })} maxLength={800} disabled={saving}/>
            <div className="goal-builder__chips" aria-label="Practice opportunities">
              {['At my next practice, in a suitable drill', 'In a short practice at home with a helper', 'At my next video review, with one paused play'].map(schedule => <button type="button" key={schedule} onClick={() => edit({ schedule })} disabled={saving}>{schedule}</button>)}
            </div>
            <Field label="Why did I choose this?" hint="Use your own words. What would make this useful or enjoyable for you?" value={plan.why} onChange={why => edit({ why })} maxLength={800} disabled={saving}/>
            <Field label="Who or what could help? · optional" hint="A practice partner, a reminder, equipment, or a question for your coach." value={plan.support} onChange={support => edit({ support })} maxLength={500} disabled={saving}/>
            <Field label="When will I review it?" hint="Pick a short first check-in after a real chance to practise. You can change the plan then." type="date" value={plan.reviewDate} onChange={reviewDate => edit({ reviewDate })} min={localDate()} disabled={saving}/>
            {plan.reviewWhen && !/^\d{4}-\d{2}-\d{2}$/.test(plan.reviewWhen) && <p className="goal-builder__hint">Existing timing: {plan.reviewWhen}. It stays as written until you choose a date.</p>}
            <div className="goal-builder__chips" aria-label="Review date shortcuts">{[[3, 'In 3 days'], [7, 'In a week'], [14, 'In 2 weeks']].map(([days, label]) => <button type="button" key={days} onClick={() => edit({ reviewDate: dateAfter(days) })} disabled={saving}>{label}</button>)}</div>
          </>}
          {young && <p className="goal-builder__next-practice">Next practice · then ask, “Did you try it?”</p>}
        </section>

        <section className="goal-builder__glass goal-builder__preview" aria-labelledby="goal-preview-title">
          <div className="goal-builder__section-heading"><div><span className="goal-builder__eyebrow">READ IT BACK</span><h2 id="goal-preview-title">{young ? 'My try-it card' : 'My plan in plain words'}</h2></div><span className="goal-builder__step-mark" aria-hidden="true">02</span></div>
          <p className="goal-builder__preview-action">{plan.action || (young ? 'Choose something you want to try.' : 'Your next action will appear here.')}</p>
          {!young && <dl className="goal-builder__plan-details">{[['I will notice', plan.measure], ['My opportunity', plan.schedule], ['My reason', plan.why], ['Help I can use', plan.support], ['Review', plan.reviewDate || plan.reviewWhen]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'Still to choose'}</dd></div>)}</dl>}
          {young && <p>At the next practice. A grown-up can help me remember.</p>}
          {!young && <fieldset className="goal-builder__checks"><legend>Check the plan together if helpful</legend>
            {[
              ['ownAction', 'I can choose to do this action.'],
              ['observable', 'I can tell what happened, or record it with help.'],
              ['feasible', 'This fits the practice time and help I have.'],
            ].map(([key, label]) => <label key={key}><input type="checkbox" checked={plan.checks[key] === true} onChange={event => edit({ checks: { ...plan.checks, [key]: event.target.checked } })} disabled={saving}/><span>{label}</span></label>)}
          </fieldset>}
          {quality.hints.map(hint => <p className="goal-builder__hint goal-builder__quality-hint" key={hint}>{hint}</p>)}
          <div id="goal-readiness" className="goal-builder__readiness">
            {quality.ready ? <p>{young ? 'Ready for a try.' : 'The plan fields and your checks are ready. Review what happens after practice.'}</p> : <><p>{young ? 'One small thing to finish:' : 'Before making this your focus:'}</p><ul>{quality.missing.map((item, index) => <li key={`${item.field}-${index}`}>{item.label}</li>)}</ul><p>You can save an incomplete draft anytime.</p></>}
            {!canFocus && <p>Your focus list is full. Save this Up next, or park another focus first.</p>}
          </div>
        </section>

        {plan.action.trim() && <GoalCheckInSection {...{ band, young, plan, checkIn, setCheckIn, recentTraining, useSession, saveCheckIn, saving, history, progress, showHistory, setShowHistory }}/>}

        <div className="goal-builder__save-panel goal-builder__glass">
          <div role="alert" className="goal-builder__error">{error}</div>
          <div role="status" aria-live="polite" className="goal-builder__notice">{notice}</div>
          <p className="goal-builder__storage-note">Plans and check-ins are kept on this device for this player. The app can sync the goal’s SMART text; check-in history, effort and plan status are device-only.</p>
          <div className="goal-builder__save-actions">
            <button type="button" className="goal-builder__primary" disabled={saving || !quality.ready || !canFocus} aria-describedby="goal-readiness" onClick={() => savePlan('active')}>{saving ? 'Saving…' : young ? 'Save my next try' : 'Save my focus'}</button>
            <button type="button" disabled={saving} onClick={() => savePlan('draft')}>Save draft</button>
            {plan.action.trim() && <button type="button" disabled={saving} onClick={() => savePlan('up-next')}>Save Up next</button>}
          </div>
          <p className="goal-builder__hint">Saves the edits in your goal list and returns home. Your older goal categories remain available.</p>
        </div>
      </div>
    </div>
  </main>;
}

function GoalCheckInSection({ band, young, plan, checkIn, setCheckIn, recentTraining, useSession, saveCheckIn, saving, history, progress, showHistory, setShowHistory }) {
  const formId = useId();
  const patch = change => setCheckIn(current => ({ ...current, ...change }));
  return <section className="goal-builder__glass goal-builder__check-in" aria-labelledby={`${formId}-title`}>
    <div className="goal-builder__section-heading"><div><span className="goal-builder__eyebrow">AFTER A CHANCE TO PRACTISE</span><h2 id={`${formId}-title`}>{young ? 'Did you give it a try?' : 'Check in and adjust'}</h2></div><span className="goal-builder__step-mark" aria-hidden="true">03</span></div>
    <p>{young ? 'A helper can ask you after practice. Trying counts, even when it is tricky.' : 'Notice the action you chose. A check-in records your experience; it does not mark a goal achieved.'}</p>
    <form onSubmit={saveCheckIn}>
      <Field label="Practice or check-in date" hint="Use the day you are reflecting on." type="date" value={checkIn.date} onChange={date => patch({ date })} max={localDate()} required disabled={saving}/>
      <fieldset className="goal-builder__observation"><legend>{young ? 'Did you try it?' : 'Did you get a chance to try the action?'}</legend>
        {[
          ['tried', young ? 'I tried it' : 'I tried it'],
          ['not-yet', 'Not yet'],
          ['not-observed', young ? 'We did not see it' : 'Not observed / I cannot tell'],
        ].map(([value, label]) => <label key={value}><input type="radio" name={`${formId}-observation`} value={value} checked={checkIn.observation === value} onChange={() => patch({ observation: value, ...(value === 'not-observed' ? { attempted: '', observed: '' } : {}) })} disabled={saving}/><span>{label}</span></label>)}
      </fieldset>
      {band >= 11 && checkIn.observation !== 'not-observed' && <details className="goal-builder__optional"><summary>Record counted attempts · optional</summary>
        <p className="goal-builder__hint">Use this only if your plan has a countable measure: {plan.measure || 'choose a measure first'}. Blank means no count was recorded.</p>
        <div className="goal-builder__paired-fields">
          <Field label="Attempts observed" hint="How many attempts did you watch or record?" type="number" min="0" step="1" value={checkIn.attempted} onChange={attempted => patch({ attempted })} disabled={saving}/>
          <Field label="Times the planned action happened" hint="A count within the attempts observed. Zero is a real observation." type="number" min="0" step="1" value={checkIn.observed} onChange={observed => patch({ observed })} disabled={saving}/>
        </div>
      </details>}
      <Field label={young ? 'What did you notice? · helper notes, optional' : 'What did I notice? · optional'} hint={young ? 'Write the child’s words if they want to share.' : 'One concrete moment is useful: what helped, what was difficult, or what changed?'} value={checkIn.reflection} onChange={reflection => patch({ reflection })} maxLength={1200} disabled={saving}/>
      <Field label={young ? 'Something to try next · optional' : 'One adjustment for next time · optional'} hint={young ? 'Keep it small and let the child choose.' : 'You can keep the same focus, simplify it, or ask for help.'} value={checkIn.nextAdjustment} onChange={nextAdjustment => patch({ nextAdjustment })} maxLength={800} disabled={saving}/>
      <details className="goal-builder__optional"><summary>{young ? 'Helper: add session context · optional' : 'Session context and perceived effort · optional'}</summary>
        {recentTraining.length > 0 && <div className="goal-builder__field"><label htmlFor={`${formId}-session`}>Use a recent training session</label><p id={`${formId}-session-help`} className="goal-builder__hint">Copy its date, label and available minutes into this check-in.</p><select id={`${formId}-session`} aria-describedby={`${formId}-session-help`} defaultValue="" onChange={event => useSession(event.target.value)} disabled={saving}><option value="">Choose a session</option>{recentTraining.map((session, index) => <option key={`${session.date}-${index}`} value={index}>{session.date} · {session.label || String(session.type).replaceAll('_', ' ')}</option>)}</select></div>}
        <Field label="Session label · optional" hint="For example, a team practice or a short partner drill." type="text" value={checkIn.sessionLabel} onChange={sessionLabel => patch({ sessionLabel })} maxLength={180} disabled={saving}/>
        <Field label="Session duration in minutes · optional" hint="The duration you are reporting for this session. Leave it blank if unknown." type="number" min="0" step="any" value={checkIn.durationMinutes} onChange={durationMinutes => patch({ durationMinutes })} disabled={saving}/>
        {!young && <div className="goal-builder__field"><label htmlFor={`${formId}-rpe`}>Perceived exertion (RPE) · optional</label><p id={`${formId}-rpe-help`} className="goal-builder__hint">How hard did this session feel to you? 0 is the effort of sitting; 10 is your maximum effort. {band <= 9 ? 'A helper can read this aloud; the answer is yours. ' : ''}Higher effort does not mean more learning or a better session.</p><select id={`${formId}-rpe`} aria-describedby={`${formId}-rpe-help`} value={checkIn.rpe} onChange={event => patch({ rpe: event.target.value })} disabled={saving}><option value="">Not reported</option>{Array.from({ length: 11 }, (_, value) => <option key={value} value={value}>{value}{value === 0 ? ' · effort of sitting' : value === 10 ? ' · maximum effort' : ''}</option>)}</select><p className="goal-builder__hint">These are self-reported effort anchors. <a href="https://www.cdc.gov/physical-activity-basics/measuring/index.html" target="_blank" rel="noreferrer">About relative effort · CDC</a></p></div>}
      </details>
      <button type="submit" className="goal-builder__secondary" disabled={saving}>{saving ? 'Saving…' : 'Save check-in on this device'}</button>
    </form>
    <div className="goal-builder__history">
      <h3>My check-ins on this device</h3>
      {progress.recorded ? <><p>{progress.recorded} recorded · {progress.tried} marked “I tried it” · {progress.notObserved} not observed</p><ol>{(showHistory ? history : history.slice(0, 3)).map((item, index) => <li key={`${item.date}-${index}`}>
        <div className="goal-builder__history-heading"><strong>{item.date}</strong><span>{item.observation === 'tried' ? 'I tried it' : item.observation === 'not-yet' ? 'Not yet' : 'Not observed'}</span></div>
        {item.sessionLabel && <p>{item.sessionLabel}</p>}
        {item.action && item.action !== plan.action && <p className="goal-builder__hint">Focus at this check-in: {item.action}</p>}
        {Number.isFinite(item.attempted) && <p>Attempts observed: {item.attempted}{Number.isFinite(item.observed) ? ` · Planned action happened: ${item.observed}` : ' · Action count not recorded'}</p>}
        {(Number.isFinite(item.rpe) || Number.isFinite(item.durationMinutes)) && <p>{Number.isFinite(item.durationMinutes) ? `${item.durationMinutes} minutes` : 'Duration not reported'} · {Number.isFinite(item.rpe) ? `Self-reported effort ${item.rpe}/10` : 'Effort not reported'}</p>}
        {item.reflection && <p>{item.reflection}</p>}{item.nextAdjustment && <p><strong>Next try:</strong> {item.nextAdjustment}</p>}
      </li>)}</ol>{history.length > 3 && <button type="button" onClick={() => setShowHistory(current => !current)}>{showHistory ? 'Show recent check-ins' : `Show all ${history.length} check-ins`}</button>}</> : <p>No check-ins yet. Return after an opportunity to try your action.</p>}
    </div>
  </section>;
}
