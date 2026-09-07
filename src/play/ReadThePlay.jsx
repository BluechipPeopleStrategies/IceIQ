// Read the Play — player-facing tile for the animated-play catalog.
// Serves playsForAge(band) for the player's age band (U11/U13 today). List of
// plays -> tap to run one in AnimatedPlay -> every interaction logged through
// the standard animated-play telemetry. No new rink primitives.
import { useMemo, useState } from "react";
import { FONT, StickyHeader, BackBtn } from "../shared.jsx";
import { playsForAge } from "./playCatalog.js";
import AnimatedPlay from "./AnimatedPlay.jsx";
import { logAnimatedPlayEvent, summarizeAnimatedPlayEvents } from "./telemetry.js";
import { classifyPlayFamily } from "./playFamilies.js";
import { resolveKind } from './questionKinds.js';
import RinkIcon from '../ui/RinkIcon.jsx';
import './ReadThePlay.css';

// Player-facing family name for a play's concept tag. Never show the raw
// concept string (e.g. "off-puck-support-offense", "backcheck-recovery") --
// it's an internal slug, not copy. Falls back to a hyphen/underscore-cleaned
// version only for the handful of plays with no family match.
function familyLabel(play) {
  const family = classifyPlayFamily(play);
  if (family?.title) return family.title;
  return play?.concept ? String(play.concept).replace(/[_-]/g, " ") : "";
}

// player.level is a division string like "U11 / Atom"; the catalog wants "U11".
export function bandFromLevel(level) {
  return String(level || "").trim().split(/[\s/]/)[0] || "";
}

export function playCardDetails(play) {
  const reads = Object.values(play.nodes).filter(node => node.ask && !node.terminal && !node.autoNext);
  const kind = resolveKind(reads[0]);
  const formats = { 'read-mc': ['Choose the play', 'play'], 'lane-pick': ['Pick a spot', 'target'], 'spot-mistake': ['Spot the mistake', 'scan'], verdict: ['Make the call', 'shield'], 'predict-next': ['Read what comes next', 'map'] };
  const [format, icon] = formats[kind] || ['Read the play', 'play'];
  return { format, icon, reads: reads.length, family: familyLabel(play) };
}

export default function ReadThePlay({ player, onBack }) {
  const band = bandFromLevel(player?.level);
  const plays = useMemo(() => playsForAge(band), [band]);
  const [active, setActive] = useState(null);
  // Bump to refresh per-play summaries after a run ends.
  const [statsBump, setStatsBump] = useState(0);
  const [family, setFamily] = useState('all');

  const stats = useMemo(() => {
    const m = {};
    for (const p of plays) m[p.id] = summarizeAnimatedPlayEvents(p.id);
    return m;
  }, [plays, statsBump]);

  // The play after the one being run, so a finished read has somewhere to go.
  // Falling off the end returns to the list rather than dead-ending.
  const activeIndex = active ? plays.findIndex((p) => p.id === active.id) : -1;
  const nextPlay = activeIndex >= 0 ? plays[activeIndex + 1] : null;
  const families = [...new Set(plays.map(familyLabel).filter(Boolean))];
  const visible = family === 'all' ? plays : plays.filter(play => familyLabel(play) === family);
  const practised = plays.filter(play => stats[play.id]?.answers > 0).length;
  const totalAnswers = plays.reduce((sum, play) => sum + (stats[play.id]?.answers || 0), 0);
  const featured = plays.find(play => !stats[play.id]?.answers) || plays[0];

  function leaveActivePlay(destination) {
    // The run that just ended has written its events; refresh the per-play
    // summaries so the list reflects it the moment we come back.
    setStatsBump((b) => b + 1);
    setActive(destination || null);
  }

  return (
    <div className="rtp-screen" style={{ fontFamily: FONT.body }}>
      <StickyHeader>
        <div className="rtp-header">
          <BackBtn onClick={() => (active ? leaveActivePlay(null) : onBack())} />
          <span className="rtp-header-icon"><RinkIcon name="scan" size={22}/></span>
          <div className="rtp-header-title" style={{ fontFamily: FONT.display }}>Read the Play</div>
          <span className="rtp-age">{band}</span>
        </div>
      </StickyHeader>

      <div className={`rtp-content ${active ? 'is-playing' : ''}`}>
        {active ? (
          <><div className="rtp-active-heading"><span>{familyLabel(active)}</span><h1 style={{ fontFamily: FONT.display }}>{active.title}</h1></div><AnimatedPlay
            key={active.id + "-" + band}
            play={active}
            ageBand={band}
            onEvent={(e) => logAnimatedPlayEvent(e)}
            onNext={() => leaveActivePlay(nextPlay)}
            nextLabel={nextPlay ? "Next play →" : "Done — back to all plays"}
          /></>
        ) : plays.length === 0 ? (
          <div className="rtp-empty"><RinkIcon name="book" size={38}/><h1>No plays in this collection yet.</h1><p>Go back to your learning activities to find more for {band || 'your age group'}.</p></div>
        ) : (
          <>
            <section className="rtp-intro"><div><span className="rtp-eyebrow">SEE IT. READ IT. PLAY IT.</span><h1 style={{ fontFamily: FONT.display }}>The next move<br/><em>starts with your read.</em></h1><p>Watch the players. Find the opening. Make your choice and see what happens next.</p></div><div className="rtp-practice-stats" aria-label="Recent practice on this device"><div><strong>{plays.length}</strong><span>situations to explore</span></div><div><strong>{practised}</strong><span>practised recently</span></div><div><strong>{totalAnswers}</strong><span>recent decisions</span></div></div></section>
            {featured && <button type="button" className="rtp-featured" data-featured-play={featured.id} onClick={()=>setActive(featured)}><span className="rtp-feature-art" aria-hidden="true"><RinkIcon name={playCardDetails(featured).icon} size={48}/><span className="rtp-feature-orbit"/></span><span className="rtp-feature-copy"><span className="rtp-eyebrow">{stats[featured.id]?.answers ? 'REVISIT A READ' : 'TRY A FRESH READ'}</span><strong style={{fontFamily:FONT.display}}>{featured.title}</strong><small>{playCardDetails(featured).format} · {familyLabel(featured)}</small></span><span className="rtp-start">Play <RinkIcon name="arrow" size={18}/></span></button>}
            <div className="rtp-list-heading"><div><span className="rtp-eyebrow">YOUR PLAYBOOK</span><h2 style={{fontFamily:FONT.display}}>Pick your next situation.</h2></div><label>Skill<select aria-label="Filter plays by skill" value={family} onChange={event=>setFamily(event.target.value)}><option value="all">All skills</option>{families.map(value=><option key={value} value={value}>{value}</option>)}</select></label></div>
            <div className="rtp-play-grid">{visible.map(p => {
              const s = stats[p.id];
              const details = playCardDetails(p);
              const done = s && s.answers > 0;
              // A play with one read used to report "1/1 reads", which counts
              // the attempt instead of saying how it went — and reads as
              // progress through a set that does not exist. Say whether the
              // read was made correctly; only use a tally once there is
              // actually more than one read to tally.
              const allCorrect = done && s.correct === s.answers;
              const statusText = !done
                ? "Ready to play"
                : s.answers === 1
                ? (allCorrect ? "Read it ✓" : "Missed it")
                : `${s.correct} of ${s.answers} correct`;
              return (
                <button
                  key={p.id}
                  type="button"
                  data-play-id={p.id}
                  onClick={() => setActive(p)}
                  className={`rtp-play-card ${done ? allCorrect ? 'is-correct' : 'is-practised' : ''}`}
                >
                  <span className="rtp-card-top"><span className="rtp-card-icon"><RinkIcon name={details.icon} size={25}/></span><span className="rtp-status">{done&&allCorrect&&<RinkIcon name="check" size={13}/>} {statusText}</span></span>
                  <span className="rtp-card-family">{details.family}</span>
                  <strong className="rtp-card-title" style={{fontFamily:FONT.display}}>{p.title}</strong>
                  <span className="rtp-card-bottom"><span>{details.format}<small>{details.reads} {details.reads===1?'read':'connected reads'}</small></span><span className="rtp-card-arrow"><RinkIcon name="arrow" size={18}/></span></span>
                </button>
              );
            })}</div>
            <p className="rtp-device-note">Recent practice is saved on this device. Replay any situation whenever you want.</p>
          </>
        )}
      </div>
    </div>
  );
}
