import { journeyStops } from './worldMissionProgress.js';

function connectorPath(stops) {
  return stops.slice(0, -1).map((stop, index) => {
    const next = stops[index + 1];
    const middleY = (stop.y + next.y) / 2;
    return `M ${stop.x} ${stop.y} C ${stop.x} ${middleY - 16}, ${next.x} ${middleY + 16}, ${next.x} ${next.y}`;
  }).join(' ');
}

export default function WorldMissionJourney({ missions = [], selectedMissionId, visitedIds = [], suggestedMissionId, worldColor = '#c9a24b', onSelectMission }) {
  const stops = journeyStops(missions);
  const height = Math.max(150, 58 + Math.max(0, stops.length - 1) * 88 + 58);
  const visited = new Set(visitedIds);
  if (!missions.length) return null;
  return <div className="lw-journey" style={{ '--journey-color': worldColor }}>
    <div className="lw-journey-heading"><div><p className="lw-journey-kicker">YOUR PATH THROUGH THIS WORLD</p><h3>Choose a stop to explore</h3></div><p className="lw-journey-progress"><strong>{visited.size} of {missions.length}</strong> stops visited<span>Visiting a stop does not mean mastered.</span></p></div>
    <div className="lw-journey-map" style={{ '--journey-height': `${height}px` }}>
      <svg className="lw-journey-lines" viewBox={`0 0 320 ${height}`} preserveAspectRatio="none" aria-hidden="true"><path d={connectorPath(stops)} /></svg>
      <ol className="lw-journey-stops" aria-label="Learning stops">
        {stops.map(stop => {
          const mission = stop.mission;
          const selected = mission.id === selectedMissionId;
          const isVisited = visited.has(mission.id);
          const suggested = mission.id === suggestedMissionId;
          return <li key={mission.id} className={`lw-journey-stop lw-stop-${stop.side}${selected ? ' is-current' : ''}${isVisited ? ' is-visited' : ''}${suggested ? ' is-suggested' : ''}`} style={{ '--stop-x': `${stop.x / 320 * 100}%`, '--stop-y': `${stop.y}px` }}>
            <button type="button" data-mission-id={mission.conceptId} data-mission-key={mission.id} aria-current={selected ? 'step' : undefined} aria-label={`${stop.index + 1}. ${mission.title}${isVisited ? ', visited' : ''}${suggested ? ', suggested next' : ''}`} onClick={() => onSelectMission?.(mission)}>
              <span className="lw-stop-number">{String(stop.index + 1).padStart(2, '0')}</span>
              <span className="lw-stop-mark" aria-hidden="true">{isVisited ? '✓' : stop.index + 1}</span>
            </button>
            <span className="lw-stop-copy"><strong>{mission.title}</strong><small>{suggested ? 'Suggested next' : isVisited ? 'Visited' : mission.name}</small></span>
          </li>;
        })}
      </ol>
    </div>
  </div>;
}

