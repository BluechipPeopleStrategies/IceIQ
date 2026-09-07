import { useEffect, useId, useState } from 'react';
import { bandsAvailable } from '../path/pathData.js';
import { loadQB } from '../qbLoader.js';
import { masteryStorageKey } from '../one-on-one/spacedMasteryCore.js';
import { buildPlayerHomeModel, HOME_ACTIONS, loadHomePractice } from './playerLearningHomeCore.js';
import './PlayerLearningHome.css';

function HomeIcon({ kind }) {
  const paths = {
    book: <><path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Z" /><path d="M12 6v14" /></>,
    position: <><circle cx="12" cy="12" r="6" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /><circle cx="12" cy="12" r="1" /></>,
    experiment: <><path d="M9 3h6M10 3v6L4 19a1 1 0 0 0 1 2h14a1 1 0 0 0 1-2L14 9V3M7 15h10" /><path d="m10 18 1-1m3 1h1" /></>,
    goal: <><circle cx="11" cy="13" r="8" /><circle cx="11" cy="13" r="4" /><path d="m11 13 9-9M16 4h4v4" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4M17 3v4M3 10h18m-14 4h3m4 0h3m-10 3h3" /></>,
    progress: <><path d="M3 4v17h18M7 15l4-5 4 3 6-8M17 5h4v4" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[kind]}</svg>;
}

const worldStyle = world => ({ '--plh-art-position': `${(world.art % 3) * 50}% ${Math.floor(world.art / 3) * 100}%` });

export function PlayerLearningHomeView({ player = {}, ageBand, onAgeChange, onNavigate, masteryState, trainingSessionCount }) {
  const model = buildPlayerHomeModel({ player, ageBand, masteryState, trainingSessionCount });
  const { band, worlds, practice } = model;
  const [selection, setSelection] = useState({ playerId: model.playerId, worldId: 'hockey-sense' });
  const world = worlds.find(item => item.id === (selection.playerId === model.playerId ? selection.worldId : 'hockey-sense')) || worlds[0];
  const regionId = `player-world-${useId().replaceAll(':', '')}`;
  const navigate = (id, extra = {}) => onNavigate?.({ id, ageBand: band, ...extra });
  const p = practice.policy;
  return <section className="plh-root" aria-label="Player learning home" data-player-age={band}>
    <div className="plh-hero">
      <header className="plh-welcome">
        <p className="plh-eyebrow">YOUR HOCKEY · {band}</p>
        <h1>Your hockey worlds.<span>There’s more to every play.</span></h1>
        <p>Read the ice, find your options and practise your next move. Explore the whole game, one idea at a time.</p>
        <div className="plh-hero-actions"><button type="button" className="plh-button plh-button-gold" onClick={() => navigate('learn')}>Learn the game <span aria-hidden="true">↗</span></button><button type="button" className="plh-button" onClick={() => navigate('practice')}>Practise a read <span aria-hidden="true">→</span></button></div>
      </header>
      <aside className="plh-practice plh-glass" aria-labelledby={`${regionId}-practice`}>
        <p className="plh-eyebrow">YOUR RECORDED PRACTICE</p><h2 id={`${regionId}-practice`}>Come back to the read.</h2>
        {practice.status === 'ready' ? <>
          <dl className="plh-stats"><div><dt>Groups practised</dt><dd>{practice.groupsPractised}</dd></div><div><dt>Meet practice requirements</dt><dd>{practice.requirementsMet}</dd></div></dl>
          <p className="plh-progress-note">{practice.groupsPractised ? 'Keep practising each concept and question format across different days.' : 'Start a library lesson to begin recording eligible reads for this age group.'}</p>
          <details className="plh-requirements"><summary>How practice progress works</summary><p>A group is one concept and one question format at {band}. Its requirements are {p.minDistinctQuestions} different questions, {Math.round(p.minAccuracy * 100)}% accuracy and {p.minPracticeDays} practice days spanning at least {p.minSpanDays} days and {p.minCalendarWeeks} calendar weeks.</p><p>These are app practice requirements. Experimental answers and unreviewed draft lessons earn no mastery credit. On-ice ability still needs on-ice practice and coaching.</p>{practice.availableGroups === 0 && <p>No eligible question groups are available for this age in the current catalog.</p>}</details>
        </> : <p className="plh-progress-note" role="status">{practice.status === 'loading' ? 'Loading this player’s practice record…' : 'Practice progress is unavailable right now. You can still explore the worlds and practise.'}</p>}
        <button type="button" className="plh-text-button" onClick={() => navigate('library')}>Open the lesson library <span aria-hidden="true">→</span></button>
      </aside>
    </div>

    <section className="plh-worlds" aria-labelledby={`${regionId}-worlds`}>
      <div className="plh-section-heading"><div><p className="plh-eyebrow">SIX PARTS OF THE GAME</p><h2 id={`${regionId}-worlds`}>Choose a world to explore.</h2><p>{model.missionCount} curriculum focuses for {band}. Open a world to see what you can learn.</p></div>{onAgeChange ? <label className="plh-age">AGE GROUP<select value={band} onChange={event => onAgeChange(event.target.value)} aria-label="Player learning age group">{bandsAvailable().map(age => <option key={age} value={age}>{age}</option>)}</select></label> : <button type="button" className="plh-age-badge" onClick={() => navigate('profile')} aria-label={`Age group ${band}. Open profile`}>{band}<span aria-hidden="true">↗</span></button>}</div>
      <div className="plh-world-grid" role="group" aria-label="Choose a hockey world">{worlds.map(item => <button type="button" className={`plh-world plh-glass${item.id === world.id ? ' is-selected' : ''}`} style={worldStyle(item)} key={item.id} data-world-id={item.id} aria-pressed={item.id === world.id} aria-controls={regionId} onClick={() => setSelection({ playerId: model.playerId, worldId: item.id })}>
        <span className="plh-world-art" aria-hidden="true" /><span className="plh-world-copy"><span className="plh-domain">{item.domainName}</span><strong>{item.name}</strong><span className="plh-world-description">{item.subtitle}</span><span className="plh-world-foot">{item.missions.length ? `${item.missions.length} learning focuses` : `${band} foundations`}<span>{item.id === world.id ? 'Selected' : 'Explore'} <span aria-hidden="true">↗</span></span></span></span>
      </button>)}</div>
      <div className="plh-world-detail plh-glass" id={regionId} aria-labelledby={`${regionId}-title`}>
        <div><p className="plh-eyebrow">{world.domainName} · {band}</p><h3 id={`${regionId}-title`}>{world.name}</h3><p>{world.description}</p>{world.missions.length ? <ul className="plh-mission-preview" aria-label={`${world.name} learning focuses`}>{world.missions.slice(0, 3).map(mission => <li key={mission.id}>{mission.title}</li>)}</ul> : <p>No separate curriculum missions for {band} in this world yet. Explore its foundations and related activities.</p>}{world.missions.length > 3 && <p className="plh-more-focuses">+ {world.missions.length - 3} more learning focuses in this world</p>}</div>
        <button type="button" className="plh-button plh-button-gold" data-action="world" onClick={() => navigate('learn', { worldId: world.id })}>Explore this world <span aria-hidden="true">↗</span></button>
      </div>
    </section>

    <section className="plh-activities" aria-labelledby={`${regionId}-activities`}><div className="plh-section-heading"><div><p className="plh-eyebrow">MAKE IT PART OF YOUR GAME</p><h2 id={`${regionId}-activities`}>What will you work on today?</h2></div></div><div className="plh-action-grid">{HOME_ACTIONS.map(action => <button type="button" className="plh-action plh-glass" key={action.id} data-home-action={action.id} onClick={() => navigate(action.id)}><span className="plh-action-icon"><HomeIcon kind={action.icon} /></span><span className="plh-action-copy">{action.label && <small>{action.label}</small>}<strong>{action.title}</strong><span>{action.id === 'training' && model.trainingSessionCount !== null ? `${model.trainingSessionCount} logged ${model.trainingSessionCount === 1 ? 'session' : 'sessions'}. Add your next practice, game or extra work.` : action.description}</span></span><span className="plh-action-arrow" aria-hidden="true">↗</span></button>)}</div></section>
    <nav className="plh-other-ways" aria-label="More ways to practise"><span>More ways to practise</span>{[['play', 'Play'], ['brain', 'Brain Gym'], ['quiz', 'Take a quiz']].map(([id, label]) => <button type="button" key={id} onClick={() => navigate(id)}>{label}<span aria-hidden="true">↗</span></button>)}</nav>
    <footer className="plh-history"><p>Worlds show what there is to learn. Your earlier activity history stays available.</p><button type="button" className="plh-text-button" onClick={() => navigate('history')}>Activity history{model.historySessions ? ` · ${model.historySessions} quiz ${model.historySessions === 1 ? 'session' : 'sessions'}` : ''}<span aria-hidden="true">→</span></button></footer>
  </section>;
}

export default function PlayerLearningHome(props) {
  const { playerId, band } = buildPlayerHomeModel(props);
  const [loaded, setLoaded] = useState(null);
  useEffect(() => {
    if (props.masteryState) return undefined;
    let active = true;
    const refresh = () => loadHomePractice({ playerId, ageBand: band, loadBank: loadQB, readStorage: key => { if (!active) throw new Error('Profile changed'); return globalThis.localStorage.getItem(key); } }).then(state => { if (active) setLoaded(state); });
    const onStorage = event => { if (event.key === masteryStorageKey(playerId) || event.key === null) refresh(); };
    refresh();
    window.addEventListener('storage', onStorage);
    return () => { active = false; window.removeEventListener('storage', onStorage); };
  }, [playerId, band, props.masteryState]);
  const state = props.masteryState || loaded || { playerId, ageBand: band, status: 'loading' };
  return <PlayerLearningHomeView {...props} masteryState={state} />;
}
