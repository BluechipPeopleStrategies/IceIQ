import { useEffect, useId, useRef, useState } from 'react';
import { loadQB } from '../qbLoader.js';
import { ALL_ANIMATED_PLAYS } from '../play/playCatalog.js';
import { bandsAvailable } from '../path/pathData.js';
import { buildLibrary } from './lessonCore.js';
import { getLearningWorlds, LEARNING_ACTIVITIES, missionAvailability } from './learningWorldsCore.js';
import { missionProgressKey, readVisitedMissionIds, recordMissionVisit, summarizeMissionProgress } from './worldMissionProgress.js';
import WorldMissionJourney from './WorldMissionJourney.jsx';
import './LearningWorlds.css';

function WorldIcon({ kind }) {
  const shapes = {
    book: <><path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Z" /><path d="M12 6v14" /></>,
    library: <><path d="M4 4h4v16H4zM11 4h4v16h-4zM18 5l3 14" /></>,
    rink: <><rect x="2" y="5" width="20" height="14" rx="5" /><path d="M12 5v14M7 5v14M17 5v14" /><circle cx="12" cy="12" r="2" /></>,
    play: <><path d="m9 5 10 7-10 7V5Z" /><path d="M4 5v14" /></>,
    position: <><circle cx="12" cy="12" r="6" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /><circle cx="12" cy="12" r="1" /></>,
    stick: <><path d="m18 3-7 15H4l-1 3h10L21 4" /><path d="M16 19h5" /></>,
    scan: <><path d="M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5" /><path d="M5 12s3-4 7-4 7 4 7 4-3 4-7 4-7-4-7-4Z" /><circle cx="12" cy="12" r="1.5" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shapes[kind] || shapes.rink}</svg>;
}

const artStyle = world => ({ '--world-color': world.color, '--world-position': `${(world.art % 3) * 50}% ${Math.floor(world.art / 3) * 100}%` });
const availabilityLabel = { guided: 'Guided starter', library: 'In the library', study: 'Study the idea', loading: 'Checking lessons', unknown: 'Explore the idea' };

export function LearningWorldsView({ ageBand = 'U11', initialWorldId, playerId = 'practice-preview', onAgeChange, onNavigate, library = [], libraryStatus = 'ready' }) {
  const { band, worlds, missionCount, guidedCount } = getLearningWorlds(ageBand, { library });
  const [selection, setSelection] = useState(() => ({ worldId: worlds.some(world => world.id === initialWorldId) ? initialWorldId : 'hockey-sense', conceptId: initialWorldId ? null : 'scanning' }));
  const [, bumpProgress] = useState(0);
  const detailRef = useRef(null);
  const regionId = `learning-world-${useId().replaceAll(':', '')}`;
  const world = worlds.find(item => item.id === selection.worldId) || worlds[0];
  const mission = world.missions.find(item => item.conceptId === selection.conceptId) || world.missions[0];
  const progressScope = { playerId, ageBand: band, worldId: world.id };
  const progressScopeKey = missionProgressKey(progressScope);
  const progressRef = useRef(null);
  if (!progressRef.current || progressRef.current.scopeKey !== progressScopeKey) {
    progressRef.current = { scopeKey: progressScopeKey, visitedIds: readVisitedMissionIds(undefined, progressScope) };
  }
  const progress = summarizeMissionProgress(world.missions, progressRef.current.visitedIds);
  const availability = mission ? missionAvailability(mission, libraryStatus) : null;
  const navigate = target => onNavigate?.({ ...target, ageBand: band });
  function visitMission(item) {
    if (!item) return;
    progressRef.current.visitedIds = recordMissionVisit(undefined, progressScope, item.id);
    bumpProgress(value => value + 1);
  }
  const openGuide = (lesson, linkedMission) => { visitMission(linkedMission); navigate({ tab: 'learn', learn: 'guided', lessonId: lesson.id }); };
  function selectWorld(item) {
    setSelection({ worldId: item.id, conceptId: item.missions[0]?.conceptId || null });
    detailRef.current?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  }
  function selectMission(item) {
    setSelection({ worldId: world.id, conceptId: item.conceptId });
    visitMission(item);
  }
  return <section className="lw-root" aria-label="Your hockey worlds">
    <header className="lw-heading">
      <div><p className="lw-kicker">RINKREADS / LEARN THE WHOLE GAME</p><h1>Your hockey worlds<span>There’s more to every play.</span></h1><p className="lw-intro">From moving on the ice to reading a rush. Explore six parts of the game, learn a read, then find a way to practise it.</p></div>
      <label className="lw-age">YOUR AGE GROUP<select value={band} aria-label="Learning age group" onChange={event => onAgeChange?.(event.target.value)}>{bandsAvailable().map(age => <option key={age} value={age}>{age}</option>)}</select><span>{missionCount} learning focuses for {band}</span></label>
    </header>
    <div className="lw-world-grid" role="group" aria-label="Choose a hockey world">
      {worlds.map((item, index) => <button type="button" className={`lw-world-card${item.id === world.id ? ' is-selected' : ''}`} style={artStyle(item)} key={item.id} data-world-id={item.id} aria-pressed={item.id === world.id} aria-controls={regionId} onClick={() => selectWorld(item)}>
        <span className="lw-world-art" aria-hidden="true" /><span className="lw-world-number" aria-hidden="true">0{index + 1}</span>
        <span className="lw-world-copy"><span className="lw-domain">{item.domainName}</span><strong>{item.name}</strong><span className="lw-world-subtitle">{item.subtitle}</span><span className="lw-world-footer">{item.missions.length ? `${item.missions.length} learning focuses` : `${band} foundations`}<span>{item.id === world.id ? 'Selected' : 'Explore'} <span aria-hidden="true">↗</span></span></span></span>
      </button>)}
    </div>

    <section id={regionId} ref={detailRef} className="lw-detail" style={artStyle(world)} aria-labelledby={`${regionId}-title`}>
      <header className="lw-detail-heading"><div><p className="lw-kicker">{world.domainName} / {band}</p><h2 id={`${regionId}-title`}>{world.name}</h2><p>{world.description}</p></div><span className="lw-detail-count">{world.missions.length} <span>learning focuses</span></span></header>
      {mission ? <div className="lw-mission-layout">
        <WorldMissionJourney key={`${band}:${world.id}`} missions={world.missions} selectedMissionId={mission.id} visitedIds={progress.visitedIds} suggestedMissionId={progress.suggestedMissionId} worldColor={world.color} onSelectMission={selectMission} />
        <article className="lw-mission" id={`${regionId}-mission`} aria-labelledby={`${regionId}-mission-title`}>
          <p className="lw-mission-status">{availabilityLabel[availability]}</p><h3 id={`${regionId}-mission-title`}>{mission.title}</h3><p className="lw-objective">{mission.objective}</p>
          <div className="lw-study"><span>WHAT YOU’RE LEARNING TO NOTICE</span><p>{mission.readConnection || mission.definition}</p></div>
          {mission.guidedLessons.length > 0 && <div className="lw-guided-options"><p>Try a guided starter</p>{mission.guidedLessons.map(lesson => <button type="button" className="lw-primary" key={lesson.id} data-lesson-id={lesson.id} onClick={() => openGuide(lesson, mission)}><span>{lesson.title}<small>{band} · {lesson.questionCount} scenario</small></span><span aria-hidden="true">→</span></button>)}</div>}
          {mission.libraryCount > 0 && <button type="button" className="lw-secondary" onClick={() => { visitMission(mission); navigate({ tab: 'learn', learn: 'library', conceptId: mission.conceptId }); }}>Explore {mission.libraryCount} {mission.libraryCount === 1 ? 'library lesson' : 'library lessons'} <span aria-hidden="true">→</span></button>}
          {availability === 'study' && <p className="lw-availability">No matching guided or library lesson for {band} yet. Read the idea above, or explore the rink to get familiar with its spaces.</p>}
          {availability === 'loading' && <p className="lw-availability" role="status">Checking the lesson library… You can explore the learning focus while it loads.</p>}
          {availability === 'unknown' && <p className="lw-availability" role="status">Library availability could not be checked. You can still read the idea and open the library.</p>}
          {['study', 'loading', 'unknown'].includes(availability) && <button type="button" className="lw-secondary" onClick={() => navigate({ tab: 'learn', learn: availability === 'unknown' ? 'library' : 'discover', ...(availability === 'unknown' ? { conceptId: mission.conceptId } : {}) })}>{availability === 'unknown' ? 'Open lesson library' : 'Explore the rink'} <span aria-hidden="true">→</span></button>}
        </article>
      </div> : <div className="lw-empty"><h3>No separate missions for {band} in this world yet.</h3><p>Your age group starts with simpler reads. Explore the other worlds or use the guided starters to build your foundations.</p><button type="button" className="lw-secondary" onClick={() => navigate({ tab: 'learn', learn: 'guided' })}>Explore guided starters <span aria-hidden="true">→</span></button></div>}
      {world.foundations.length > 0 && <div className="lw-foundations"><h3>A guided foundation for {band}</h3><p>This starter introduces the idea before its separate curriculum missions.</p>{world.foundations.map(lesson => <button type="button" className="lw-primary" key={lesson.id} data-lesson-id={lesson.id} onClick={() => openGuide(lesson)}>{lesson.title} <span aria-hidden="true">→</span></button>)}</div>}
    </section>

    <section className="lw-activities" aria-labelledby={`${regionId}-activities`}><header><p className="lw-kicker">LEARN IT. TRY IT. COME BACK TO IT.</p><h2 id={`${regionId}-activities`}>Find your way into the game.</h2><p>The worlds show what there is to learn. These activities give you different ways to explore it.</p></header><div className="lw-activity-grid">{LEARNING_ACTIVITIES.map(activity => <button type="button" key={activity.id} className="lw-activity" data-activity-id={activity.id} onClick={() => navigate(activity.target)}><span className="lw-activity-icon"><WorldIcon kind={activity.icon} /></span><span><strong>{activity.title}</strong><span>{activity.description}</span></span><span className="lw-activity-arrow" aria-hidden="true">↗</span></button>)}</div></section>
    <p className="lw-boundary">{guidedCount} guided starters for {band} are one part of this curriculum. Learning focuses describe what to notice; they don’t mean a lesson is complete. On-ice practice remains part of learning the game.</p>
  </section>;
}

export default function LearningWorlds(props) {
  const [catalog, setCatalog] = useState({ library: [], status: 'loading' });
  useEffect(() => {
    let active = true;
    loadQB().then(bank => { if (active) setCatalog({ library: buildLibrary(bank, ALL_ANIMATED_PLAYS), status: 'ready' }); })
      .catch(() => { if (active) setCatalog({ library: [], status: 'error' }); });
    return () => { active = false; };
  }, []);
  return <LearningWorldsView {...props} library={catalog.library} libraryStatus={catalog.status} />;
}
