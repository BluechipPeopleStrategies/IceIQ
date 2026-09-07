import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AGE_BANDS, profileForAge } from "./interactionProfiles.js";
import { resolveKindForAge, watchChainInfo } from "./questionKinds.js";
import { TWO_ON_ONE_READ_PLAY } from "./plays/twoOnOneRead.js";
import { logAnimatedPlayEvent, summarizeAnimatedPlayEvents } from "./telemetry.js";
import { ALL_ANIMATED_PLAYS } from "./playCatalog.js";
import { CoachFeedback } from "./CoachFeedback.jsx";
import { coachFeedbackHeadline } from "./coachFeedbackTone.js";
import { applyCoachAnswer, loadCoachReinforcement, saveCoachReinforcement } from "./coachReinforcement.js";
import { getCoachForQuestion } from "../coachPersonas.js";
import ScenarioRinkView from "../visuals/ScenarioRinkView.jsx";
import { animatedRinkBounds, animatedRinkOverlays, animatedZoneChoice, sampleAnimatedRink } from "./animatedRinkAdapter.js";
import { useAnimatedRinkPlayback } from "./useAnimatedRinkPlayback.js";
import { animatedActionIntents } from "./animatedActionIntents.js";
import RinkIcon from '../ui/RinkIcon.jsx';
import './AnimatedPlay.css';


// Display-order shuffle for button-rendered answer options (read-mc, verdict,
// predict-next). A catalog-wide audit (2026-07-30) found the correct answer
// sitting at a fixed array position across most of the catalog -- literally
// every 2-on-1/odd-man-reads play at index 1 of 4, most others at index 0 --
// letting a player pass every one of these items by always tapping the same
// button slot, with zero hockey reading. Never applied to lane-pick or
// spot-mistake: those answer via rink position, not list order, so there is
// no position to leak. `next`/`ok`/`id` all live on the option object itself,
// never looked up by array index, so shuffling display order is safe -- see
// AnimatedPlay.jsx's own choose(opt, index): index is pure UI highlight
// state, opt carries every real semantic.
function shuffledOptions(opts) {
  const a = (opts || []).slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// What job the player has on this read. Keyed off the actor's authored ROLE,
// which is one of exactly four values across the whole catalog: puckCarrier,
// support, defender, goalie. The line this replaced tested `=== "F1"`, so every
// decision actor not literally named F1 was called a "support read" — the
// backchecker, both forecheckers, all three gap-control defenders, and, most
// wrongly, the puck carrier in the goalie-slide play.
const DECISION_ROLE_LABEL = {
  puckCarrier: "you have the puck",
  support: "off-puck read",
  defender: "defensive read",
  goalie: "goalie read",
};
function decisionRoleLabel(actor) {
  return DECISION_ROLE_LABEL[actor?.role] || "your read";
}

function actorDisplayLabel(actor, isDecisionActor, profile) {
  if (isDecisionActor) return "YOU";

  if (profile.token === "figure") {
    if (actor.role === "goalie") return "Goalie";
    if (actor.role === "puckCarrier") return "Puck";
    if (actor.role === "support" && actor.team === "home") return "Helper";
    if (actor.role === "support" && actor.team !== "home") return "Open";

    // U7/U9 screens should not label every checker.
    // The contrasting uniform already communicates pressure; repeated labels create clutter.
    return "";
  }

  return actor.label;
}

function questionTextForAge(node, profile) {
  if (profile?.token === "figure") {
    return playerFacingTextForAge(node?.youngQ || node?.ask?.youngQ || node?.ask?.q || node?.q || "", profile);
  }

  return node?.ask?.q || node?.q || "";
}

function isFilmRoomProfile(profile) {
  const label = JSON.stringify(profile || {}).toLowerCase();
  return label.includes("u15") || label.includes("u18") || label.includes("film");
}

function playerFacingTextForAge(value, profile) {
  const raw = String(value || "");

  // U15/U18 can keep film-room shorthand, but younger groups should not.
  if (isFilmRoomProfile(profile)) return raw;

  return raw
    .replace(/\bF2\b/g, "support teammate")
    .replace(/\bF1\b/g, "teammate with the puck")
    .replace(/\bD1\b/g, "defender")
    .replace(/\bA1\b/g, "puck carrier")
    .replace(/\bA2\b/g, "open player")
    .replace(/\bBC1\b/g, "backchecker")
    .replace(/\bbackchecker\b/gi, "backchecker")
    .replace(/\bsupport option\b/gi, "support teammate");
}

function optionTextForAge(opt, actorMap, profile) {
  if (!opt) return "";

  const raw = profile?.token === "figure" && opt.youngT ? opt.youngT : opt.t;
  return playerFacingTextForAge(raw, profile);
}

function feedbackTextForAge(opt, profile) {
  if (!opt) return "";

  const raw =
    profile?.token === "figure"
      ? opt.youngWhy || opt.why || opt.no || opt.outcome || ""
      : opt.why || opt.no || opt.outcome || "";

  return playerFacingTextForAge(raw, profile);
}

function answerToneForAge(opt, profile) {
  if (!opt) return "";

  if (opt.ok) {
    return profile?.token === "figure" ? "Nice read" : "Correct read";
  }

  return profile?.token === "figure" ? "Try again" : "Not quite";
}

function resultCardTitleForAge(opt, profile) {
  if (!opt) return "";

  const action = optionTextForAge(opt, {}, profile);
  const tone = answerToneForAge(opt, profile);

  return action ? tone + ": " + action : tone;
}

function cueLabelForAge(cue, profile) {
  if (!cue) return "";

  const profileText = JSON.stringify(profile || {}).toLowerCase();
  const isFilmRoom = profileText.includes("u15") || profileText.includes("u18") || profileText.includes("film");

  // shortLabel used to win here, which is how a lone "Angle" pill ended up
  // floating over the ice with nothing to explain it. The short form is a
  // truncation, not a plainer phrasing — youngLabel is the plainer phrasing.
  // Fall back to the full label so the marker always says what it marks.
  if (!isFilmRoom) {
    return cue.youngLabel || cue.label || cue.shortLabel || "";
  }

  return cue.label || "";
}

function NodeSummary({ node, profile, pickedOption, lastKind, coachFeedback, onReplay, onNext, nextLabel }) {
  if (!node.terminal) return null;
  const spotMistakeFeedback = lastKind === "spot-mistake" && pickedOption
    ? (pickedOption.ok ? pickedOption.why : pickedOption.no)
    : null;
  const coachExplanation = [spotMistakeFeedback, questionTextForAge(node, profile)]
    .filter(Boolean)
    .join(" ");
  return (
    <div>
      {profile.celebrate && pickedOption?.ok && <div style={{ fontSize: 24, marginBottom: 6 }}>Goal!</div>}
      {coachFeedback?.showCoach && (
        <CoachFeedback
          coach={coachFeedback.coach}
          headline={coachFeedback.headline}
          correct={!!pickedOption?.ok}
          explanation={coachExplanation}
        />
      )}
      {lastKind === "spot-mistake" && pickedOption && !coachFeedback?.showCoach && (
        <div
          role="status"
          style={{
            background: pickedOption.ok ? "#1b463a80" : "#65452a70",
            border: `1px solid ${pickedOption.ok ? "#2E8B57" : "#C26A1B"}`,
            borderRadius: 9,
            color: pickedOption.ok ? "#c0ebcf" : "#f2d2b3",
            marginBottom: 10,
            padding: "9px 11px",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 900 }}>
            {pickedOption.ok ? "Correct" : "Not quite"}
          </div>
          {spotMistakeFeedback && (
            <div style={{ fontSize: 12.5, fontWeight: 650, lineHeight: 1.45, marginTop: 3 }}>
              {pickedOption.ok ? pickedOption.why : pickedOption.no}
            </div>
          )}
        </div>
      )}
      {/* A finished read used to dead-end here on Replay alone: the only way
          onward was the browser-style back arrow in the header. Forward is the
          primary action and reads as the primary action; Replay steps back to
          secondary so the two are not competing for the same weight. */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {onNext && (
          <button
            onClick={onNext}
            className="ap-control is-primary"
          >
            {nextLabel || "Next play →"}
          </button>
        )}
        <button
          onClick={onReplay}
          className={`ap-control ${onNext ? '' : 'is-primary'}`}
        >
          Replay
        </button>
      </div>
    </div>
  );
}

export default function AnimatedPlay({ play, ageBand = "U11", onEvent, onNext, nextLabel, coachOverride }) {
  const profile = profileForAge(ageBand);
  const [nodeId, setNodeId] = useState(play.start);
  // Who YOU are, carried past the read that asked.
  //
  // Identity was `node.decisionActor === actor.id`, and NO terminal node in the
  // catalog carries decisionActor — 65 of 65. So the gold ring and the "YOU"
  // caption both vanished the instant you answered, which is the moment the
  // outcome is being explained to you. On the backcheck play that left two
  // identical navy circles with no text at all, and the feedback then talks
  // about "F1".
  //
  // Sticky rather than derived from the graph, because a play can ask twice
  // (dz_breakout does) and the right answer on an outcome screen is whoever you
  // were on the read that produced it.
  const youIdRef = useRef(null);
  const [picked, setPicked] = useState(null);
  const [pickedOption, setPickedOption] = useState(null);
  const [judgePick, setJudgePick] = useState(null);
  const [lastKind, setLastKind] = useState(null);
  const [coachFeedback, setCoachFeedback] = useState(null);
  // Per node: the flag is about one read, so it clears when the play moves on
  // and the acknowledgement doesn't linger over the next question.
  const [unclearFlagged, setUnclearFlagged] = useState(false);
  const [sceneAvailable, setSceneAvailable] = useState(false);
  const [playbackPaused, setPlaybackPaused] = useState(false);
  const [replayVersion, setReplayVersion] = useState(0);
  const [pendingNext, setPendingNext] = useState(null);
  const [tapIntent, setTapIntent] = useState(null);
  const everReadyRef = useRef(false), sceneAvailableRef = useRef(false), answerLockRef = useRef(false);
  const onAvailabilityChange = useCallback(available => {
    sceneAvailableRef.current = available === true;
    setSceneAvailable(available === true);
    if (available) everReadyRef.current = true;
    else if (everReadyRef.current) setPlaybackPaused(true);
  }, []);
  const startedAtRef = useRef(Date.now());
  const watchedChainsRef = useRef(new Set());

  const actorMap = useMemo(() => Object.fromEntries(play.actors.map((a) => [a.id, a])), [play.actors]);
  const node = play.nodes[nodeId];
  // Latch on the way past. Terminal nodes carry no decisionActor, so this holds
  // the last one a read declared and every downstream outcome keeps marking the
  // same player as YOU.
  if (node?.decisionActor) youIdRef.current = node.decisionActor;
  const youId = node?.decisionActor || youIdRef.current;
  const kind = resolveKindForAge(node, ageBand);
  const activeOpts = kind === "verdict" && judgePick ? node.ask?.justify?.opts : node.ask?.opts;
  // Re-shuffles on every new node/judge step (new `activeOpts` identity), not
  // on every re-render -- so a button doesn't jump under the player's finger
  // mid-decision, but a fresh question (or a replay of the same one) gets an
  // independent order each time.
  const displayOpts = useMemo(() => shuffledOptions(activeOpts), [activeOpts, replayVersion]);
  const choreographyKey = `${node.autoNext?.next || ''}:${node.autoNext?.ms ?? ''}`;
  const playbackKey = `${play.id}:${nodeId}:${ageBand}:${replayVersion}:${choreographyKey}`;
  const playback = useAnimatedRinkPlayback(node, playbackKey, sceneAvailable, playbackPaused, sceneAvailableRef);

  useEffect(() => {
    startedAtRef.current = Date.now();
    setJudgePick(null); setUnclearFlagged(false); setTapIntent(null); answerLockRef.current = false;
  }, [playbackKey]);
  useEffect(() => {
    if (!sceneAvailable || playbackPaused || !playback.watchFinished || !node.autoNext) return;
    const nextNode = play.nodes[node.autoNext.next];
    if (!nextNode?.autoNext) watchedChainsRef.current.add(`${play.id}:${node.autoNext.next}`);
    setNodeId(node.autoNext.next);
  }, [playback.watchFinished, sceneAvailable, playbackPaused, nodeId, node.autoNext?.next, node.autoNext?.ms]);
  useEffect(() => {
    if (!pendingNext || !sceneAvailable || playbackPaused) return undefined;
    const timer = setTimeout(() => {
      setNodeId(pendingNext.id); setPicked(null); setJudgePick(null); setPendingNext(null);
    }, pendingNext.delay);
    return () => clearTimeout(timer);
  }, [pendingNext, sceneAvailable, playbackPaused]);

  function choose(opt, index) {
    if (!sceneAvailableRef.current || answerLockRef.current || picked !== null || node.terminal || !playback.canAnswer || node.autoNext) return;
    const ms = Date.now() - startedAtRef.current;
    setLastKind(kind);

    if (kind === "verdict" && node.ask.justify && !judgePick) {
      setJudgePick(opt);
      onEvent?.({ playId: play.id, nodeId, event: "judge", kind, answerId: opt.id, ok: !!opt.ok, ms });
      return;
    }

    setPicked(index);
    setTapIntent(null);
    answerLockRef.current = true;
    setPickedOption(opt);
    const coach = coachOverride || getCoachForQuestion({ id: `${play.id}:${nodeId}`, cat: play.coachCategory });
    const reinforcement = loadCoachReinforcement();
    const reinforcementResult = applyCoachAnswer(reinforcement, {
      id: `${play.id}:${nodeId}:${opt.id}`,
      correct: !!opt.ok,
    });
    saveCoachReinforcement(globalThis.sessionStorage, reinforcementResult.state);
    setCoachFeedback({
      showCoach: reinforcementResult.showCoach,
      coach,
      headline: coachFeedbackHeadline({ id: `${play.id}:${nodeId}:${opt.id}`, correct: !!opt.ok }),
    });
    if (kind === "verdict" && judgePick) {
      onEvent?.({ playId: play.id, nodeId, event: "answer", kind, answerId: judgePick.id, justifyId: opt.id, ok: !!(judgePick.ok && opt.ok), judgeOk: !!judgePick.ok, justifyOk: !!opt.ok, ms });
      setPendingNext({ id: judgePick.next, delay: judgePick.ok && opt.ok ? 750 : 1050 });
      return;
    }

    onEvent?.({ playId: play.id, nodeId, event: "answer", kind, answerId: opt.id, ok: !!opt.ok, ms });
    setPendingNext({ id: opt.next, delay: opt.ok ? 750 : 1050 });
  }

  function replay() {
    youIdRef.current = null;
    setNodeId(play.start);
    setPicked(null);
    setPickedOption(null);
    setJudgePick(null);
    setLastKind(null);
    setCoachFeedback(null);
    setPendingNext(null); setReplayVersion(value => value + 1); setPlaybackPaused(false); answerLockRef.current = false;
    onEvent?.({ playId: play.id, nodeId: play.start, event: "replay", ms: 0 });
  }

  const labels = Object.fromEntries(play.actors.map(actor => [actor.id, actorDisplayLabel(actor, youId === actor.id, profile)]));
  const frame = sampleAnimatedRink(play, node, playback.progress, youId, labels);
  const bounds = useMemo(() => animatedRinkBounds(play), [play]);
  const cueLabel = node.cue ? cueLabelForAge(node.cue, profile) : '';
  const overlays = animatedRinkOverlays(node, { elapsed: playback.elapsed, kind, cueLabel, young: profile.token === 'figure' });
  const canChoose = playback.canAnswer && picked === null && !node.terminal && !node.autoNext;
  const actorChoices = kind === 'spot-mistake' ? node.ask?.opts || [] : [];
  const actionIntents = kind === 'read-mc' ? animatedActionIntents(play, node) : [];
  function chooseActor(id) {
    if (!sceneAvailableRef.current || !canChoose) return;
    const intent = actionIntents.find(item => item.kind === 'pass' && item.actorId === id);
    if (intent) { setTapIntent(intent); return; }
    const index = actorChoices.findIndex(option => option.actorId === id); if (index >= 0) choose(actorChoices[index], index);
  }
  function chooseGoal(side) { if (sceneAvailableRef.current && canChoose) { const intent = actionIntents.find(item => item.kind === 'shoot' && item.goalSide === side); if (intent) setTapIntent(intent); } }
  function chooseZone(point) { const match = animatedZoneChoice(node, point, { young: profile.token === 'figure' }); if (match) choose(match.option, match.index); }

  return (
    <div className="animated-play">
      <ScenarioRinkView state={frame} bounds={bounds} title={`${play.title}. ${youId ? 'Your player is marked YOU.' : 'Watch the play.'}`}
        ageBand={ageBand} questionId={`${play.id}:${nodeId}`} questionEntryToken={replayVersion} startingView={node.ask?.startingView ?? node.startingView}
        focusActorId={youId} playing={playback.playing} time={playback.elapsed / 1000} overlays={overlays}
        onAvailabilityChange={onAvailabilityChange} hideZoneLines={['U7', 'U9'].includes(ageBand)}
        showBothGoals={play.view !== 'half-right' && play.view !== 'half-left'}
        selectableIds={canChoose ? [...actorChoices.map(option => option.actorId), ...actionIntents.filter(intent => intent.kind === 'pass').map(intent => intent.actorId)] : []} onActorAnswer={chooseActor}
        passActorIds={canChoose ? actionIntents.filter(intent => intent.kind === 'pass').map(intent => intent.actorId) : []}
        onGoalAnswer={canChoose && actionIntents.some(intent => intent.kind === 'shoot') ? chooseGoal : undefined}
        onIcePoint={canChoose && kind === 'lane-pick' ? chooseZone : undefined} />
      {cueLabel && <p data-testid="rink-cue-marker" className="ap-cue">{cueLabel}</p>}
      {youId && <p className="ap-identity">YOU: {actorMap[youId]?.label || youId} · {decisionRoleLabel(actorMap[youId])}</p>}
      {!!actionIntents.length && <p className="ap-help">You can also tap your teammate for a pass, or tap the net for a shot. Check your choice before confirming.</p>}
      {tapIntent && <div role="group" aria-label="Confirm rink choice" className="ap-confirm">
        <p role="status" style={{ margin: '0 0 10px' }}>Your play: <b>{optionTextForAge(tapIntent.option, actorMap, profile)}</b></p>
        <button type="button" className="ap-control is-primary" disabled={!canChoose} onClick={() => choose(tapIntent.option, displayOpts.findIndex(option => option.id === tapIntent.option.id))}>Confirm play</button>{' '}
        <button type="button" className="ap-control" onClick={() => setTapIntent(null)}>Change my choice</button>
      </div>}
      {!sceneAvailable ? <p role="status" className="ap-help">The play is paused until the rink is ready.</p>
        : playbackPaused ? <button type="button" className="ap-control" onClick={() => setPlaybackPaused(false)}>Continue play</button>
        : playback.reducedMotion && playback.elapsed < playback.duration ? <button type="button" className="ap-control" onClick={playback.finish}>Show the next position</button>
        : playback.playing ? <button type="button" className="ap-control" onClick={() => setPlaybackPaused(true)}>Pause play</button> : null}

      <div className="ap-question-panel">
        <div className="ap-eyebrow">
          {/* This branched on an actor ID, not a role, so everything not
              literally named "F1" was labelled "support read" — including the
              backchecker, both forecheckers, all three gap-control D, and the
              player who is carrying the puck in the goalie-slide play. Nine of
              21 decision nodes described the wrong job. Read the role. */}
          {profile.label}{youId ? ` - ${decisionRoleLabel(actorMap[youId])}` : ""}
        </div>
        {node.terminal && lastKind === "predict-next" && pickedOption && (
          <div className="ap-help" style={{ margin: "4px 0 2px" }}>
            You predicted: {optionTextForAge(pickedOption, actorMap, profile)}. Watch what actually happens.
          </div>
        )}
        {!node.terminal && (
          <div className="ap-question" style={{ fontSize: profile.big ? 21 : 18 }}>
            {kind === "verdict" && judgePick ? node.ask.justify.q : questionTextForAge(node, profile)}
          </div>
        )}
        {node.terminal ? (
          <NodeSummary node={node} profile={profile} pickedOption={pickedOption} lastKind={lastKind} coachFeedback={coachFeedback} onReplay={replay} onNext={onNext} nextLabel={nextLabel} />
        ) : node.autoNext ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="ap-help">Watch the play…</div>
            {["U13", "U15", "U18"].includes(ageBand) && watchedChainsRef.current.has(`${play.id}:${watchChainInfo(play, nodeId).endNodeId}`) && (
              <button
                disabled={!sceneAvailable || playbackPaused}
                onClick={() => {
                  if (!sceneAvailable || playbackPaused) return;
                  onEvent?.({ playId: play.id, nodeId, event: "watch_skip", ms: Date.now() - startedAtRef.current });
                  setNodeId(watchChainInfo(play, nodeId).endNodeId);
                }}
                className="ap-control">
                Skip to the question
              </button>
            )}
          </div>
        ) : kind === "lane-pick" ? (
          // lane-pick has no button list -- the rink itself is the only
          // control, so nothing previously told a first-time player HOW to
          // answer beyond the small numbered dashed circles. This both
          // states the interaction and gives the screen real content to
          // fill the space a button list would otherwise occupy.
          <div className="ap-rink-instruction">
            <RinkIcon name="target" size={24}/>
            <span style={{ fontSize: profile.big ? 15 : 13, fontWeight: 700, lineHeight: 1.35 }}>
              {profile.token === "figure"
                ? "Tap a spot on the ice to pick."
                : "Tap a numbered spot on the ice to make your read."}
            </span>
          </div>
        ) : kind === "spot-mistake" ? (
          <div role="group" aria-label="Choose a player" className="ap-direct-choices">{actorChoices.map((opt, index) => <button type="button" className="ap-answer" key={opt.id} disabled={!canChoose} onClick={() => choose(opt, index)}>{optionTextForAge(opt, actorMap, profile)}</button>)}</div>
        ) : (
          displayOpts
            .filter((opt) => !opt.u13Only || ["U13", "U15", "U18"].includes(ageBand))
            .map((opt, index) => {
            const isPicked = picked === index;
            const suppressImmediateFeedback = kind === "predict-next";
            const showOk = isPicked && opt.ok && !suppressImmediateFeedback;
            const showBad = isPicked && !opt.ok && !suppressImmediateFeedback;
            return (
              <button key={opt.id} data-answer-id={opt.id} onClick={() => choose(opt, index)} disabled={!canChoose}
                className={`ap-answer ${showOk ? 'is-correct' : showBad ? 'is-incorrect' : ''}`}
                style={{
                  fontSize: profile.big ? 16 : 13.5,
                  padding: profile.big ? "13px 14px" : "10px 12px",
                  cursor: picked !== null ? "default" : "pointer",
                  fontWeight: showOk ? 800 : 600,
                }}>
                {profile.token === "figure" && opt.icon ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span aria-hidden="true" style={{ fontSize: 23, width: 30, textAlign: "center" }}>{opt.icon}</span>
                    <span>{opt.youngT || opt.t}{showOk ? " - nice read!" : ""}</span>
                  </span>
                ) : (
                  <>{optionTextForAge(opt, actorMap, profile)}{showOk ? " - right read" : ""}</>
                )}
                {showBad && opt.no && !suppressImmediateFeedback && <div style={{ fontSize: 12, marginTop: 5, fontWeight: 500 }}>{playerFacingTextForAge(opt.no, profile)}</div>}
              </button>
            );
          })
        )}
        {!node.terminal && !node.autoNext && kind === 'lane-pick' && <div role="group" aria-label="Choose a numbered spot" className="ap-direct-choices">{(node.ask?.opts || []).map((opt, index) => <button type="button" className="ap-answer" key={opt.id} data-answer-id={opt.id} disabled={!canChoose} onClick={() => choose(opt, index)}>{index + 1}. {optionTextForAge(opt, actorMap, profile)}</button>)}</div>}
        {/* Judge-why surfacing: once the justify answer lands, show the coaching
            copy authored on the judge pick (why/no) — it never had a display
            path, and showing it earlier would leak the justify answer. */}
        {kind === "verdict" && judgePick && picked !== null && (judgePick.why || judgePick.no) && (
          <div className={`ap-call-feedback ${judgePick.ok ? 'is-correct' : 'is-incorrect'}`}>
            <span style={{ fontWeight: 800 }}>Your call: {optionTextForAge(judgePick, actorMap, profile)}.</span>{" "}
            {playerFacingTextForAge(judgePick.why || judgePick.no, profile)}
          </div>
        )}
        {/* This was a bordered button carrying more visual weight than Replay,
            for the least useful thing on the screen: a binary flag that tells
            us a read was confusing but never why. Demoted to a quiet text
            link — it still logs the signal so the confusing plays surface in
            telemetry — and it hands off to the Feedback widget, which is where
            the detail that actually fixes a play gets written. */}
        {unclearFlagged ? (
          <div className="ap-help" style={{ marginTop: 10 }}>
            Thanks — flagged. Tap <strong>Feedback</strong> (bottom right) to tell us what was confusing.
          </div>
        ) : (
          <button
            onClick={() => {
              setUnclearFlagged(true);
              onEvent?.({ playId: play.id, nodeId, event: "unclear", ms: Date.now() - startedAtRef.current });
            }}
            className="ap-report-link"
          >
            This read wasn't clear
          </button>
        )}
      </div>
    </div>
  );
}

export function AnimatedPlayTest() {
  const [age, setAge] = useState("U11");
  const [playId, setPlayId] = useState(TWO_ON_ONE_READ_PLAY.id);
  const [events, setEvents] = useState([]);

  const activePlay = useMemo(
    () => ALL_ANIMATED_PLAYS.find((play) => play.id === playId) || TWO_ON_ONE_READ_PLAY,
    [playId]
  );

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6FA", fontFamily: "Inter, system-ui, Arial, sans-serif", padding: "20px 16px 60px" }}>
      <div style={{ maxWidth: 660, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "#C9A24B", fontWeight: 900 }}>Animated read kernel</div>
            <div style={{ fontSize: 19, fontWeight: 900, color: "#0B1A33" }}>{activePlay.title}</div>
            {activePlay.variantOf && (
              <div style={{ marginTop: 3, fontSize: 12, color: "#5B6575", fontWeight: 700 }}>
                Variant: {activePlay.variantLabel || activePlay.difficulty}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 10, marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12, color: "#4B5563", fontWeight: 800 }}>
            Scenario
            <select value={playId} onChange={(event) => { setPlayId(event.target.value); setEvents([]); }} style={{ display: "block", width: "100%", marginTop: 5, fontFamily: "inherit", fontSize: 14, padding: "8px 10px", borderRadius: 9, border: "1px solid #CDD5E0" }}>
              {ALL_ANIMATED_PLAYS.map((play) => (
                <option key={play.id} value={play.id}>
                  {play.variantOf ? "Variant - " : ""}{play.title}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "block", fontSize: 12, color: "#4B5563", fontWeight: 800 }}>
            Age band
            <select value={age} onChange={(event) => setAge(event.target.value)} style={{ display: "block", width: "100%", marginTop: 5, fontFamily: "inherit", fontSize: 14, padding: "8px 10px", borderRadius: 9, border: "1px solid #CDD5E0" }}>
              {AGE_BANDS.map((band) => <option key={band} value={band}>{profileForAge(band).label}</option>)}
            </select>
          </label>
        </div>

        <AnimatedPlay
          key={activePlay.id + "-" + age}
          play={activePlay}
          ageBand={age}
          onEvent={(event) => {
            const logged = logAnimatedPlayEvent(event);
            setEvents((prev) => [...prev.slice(-5), logged || event]);
          }}
        />

        <div style={{ marginTop: 14, fontSize: 12, color: "#5B6575", lineHeight: 1.5 }}>
          Use the selector to test core scenarios and slight variations. Variants change pressure, spacing, or timing without changing the underlying renderer.
        </div>

        <div style={{ marginTop: 12, background: "#FFFFFF", border: "1px solid #DDE3EC", borderRadius: 10, padding: 10, fontSize: 12, color: "#243044" }}>
          <strong>Prototype telemetry:</strong> {JSON.stringify(summarizeAnimatedPlayEvents(activePlay.id))}
        </div>

        <pre style={{ marginTop: 12, background: "#0B1A33", color: "#E5E7EB", borderRadius: 10, padding: 10, fontSize: 11, overflowX: "auto" }}>
          {JSON.stringify(events, null, 2)}
        </pre>
      </div>
    </div>
  );
}
