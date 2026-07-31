// Renders a CompiledTeachingPlay or DraftTeachingPlay (both artifact types
// carry samples/eventTimes/questionFreezeTime identically -- see design doc
// §6) as plain SVG against the rink coordinate space. Never imports the main
// app's React components or scenario-engine modules (isolated React 19
// runtime, per design §5) -- the rink dimensions and the sample-interpolation
// algorithm below are deliberately duplicated from
// src/scenario-engine/rinkFrame.js and src/scenario-engine/playbackClock.js
// rather than imported, so this package's own React 19 tree never touches
// the main app's React 18 tree. Keeping the SAME interpolation algorithm
// (linear interpolation between straddling samples, not a step function)
// matters for parity: playbackClock.js's own header comment states "the
// same deterministic clock must produce identical position/timing samples
// regardless of which consumer walks a CompiledTeachingPlay -- player
// preview, coach preview, or video export."
import { useCurrentFrame, useVideoConfig } from "remotion";

export const RINK_LENGTH_M = 60.96; // NHL_200X85_PROFILE.lengthM, duplicated here
export const RINK_WIDTH_M = 25.908; // deliberately -- see file header.
const SCALE = 30; // px per metre

// Padding, in seconds, appended after the artifact's final event time so the
// last frame isn't cut off the instant the last sample lands (breathing room
// to let a viewer register the final position). Also the fallback duration
// used when an artifact has no samples/eventTimes at all (e.g. the empty
// `defaultProps` used by Remotion Studio's composition list).
export const TAIL_PADDING_SECONDS = 1;
const FALLBACK_DURATION_SECONDS = 10;

function round6(n) {
  return Math.round(n * 1e6) / 1e6;
}

// Mirrors playbackClock.js's sampleAt() exactly (linear interpolation
// between the two samples straddling t, clamped at the ends) so the export
// renderer never disagrees with the live player/coach preview about where an
// actor is at a given time. Returns a fresh array, never a live reference
// into the artifact's samples.
function sampleAt(samples, actorId, t) {
  const track = samples.filter((s) => s.actorId === actorId).sort((a, b) => a.t - b.t);
  if (track.length === 0) return null;
  if (t <= track[0].t) return [...track[0].pos];
  if (t >= track[track.length - 1].t) return [...track[track.length - 1].pos];
  for (let i = 1; i < track.length; i++) {
    if (t <= track[i].t) {
      const prev = track[i - 1];
      const cur = track[i];
      const span = cur.t - prev.t;
      const frac = span === 0 ? 0 : (t - prev.t) / span;
      return [
        round6(prev.pos[0] + (cur.pos[0] - prev.pos[0]) * frac),
        round6(prev.pos[1] + (cur.pos[1] - prev.pos[1]) * frac),
      ];
    }
  }
  return [...track[track.length - 1].pos]; // unreachable given the bounds checks above
}

// The full event-time list plus the compiled play's declared question
// freeze, matching playbackClock.js's eventTimes() aggregation (duplicated
// here for the same isolation reason as sampleAt above).
export function deriveEventTimes(compiledPlay) {
  const times = new Set([0]);
  for (const e of compiledPlay.eventTimes || []) times.add(e);
  if (Number.isFinite(compiledPlay.questionFreezeTime)) times.add(compiledPlay.questionFreezeTime);
  return [...times].sort((a, b) => a - b);
}

// The video's total duration in seconds: the last event time plus a short
// tail, or a fixed fallback for an artifact with no events at all (the
// composition's own empty defaultProps).
export function durationSecondsFor(compiledPlay) {
  const times = deriveEventTimes(compiledPlay);
  const lastEvent = times[times.length - 1];
  if (!Number.isFinite(lastEvent) || lastEvent <= 0) return FALLBACK_DURATION_SECONDS;
  return lastEvent + TAIL_PADDING_SECONDS;
}

// How close (in seconds) the playhead needs to be to questionFreezeTime for
// the decision-point marker to show. A window rather than an exact-frame
// match so the marker reads clearly for a beat instead of flickering for a
// single frame.
const FREEZE_MARKER_WINDOW_SECONDS = 0.4;

export function CoachPlayComposition({ compiledPlay, watermark }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const samples = compiledPlay.samples || [];
  const actorIds = [...new Set(samples.map((s) => s.actorId))];
  const showFreezeMarker =
    Number.isFinite(compiledPlay.questionFreezeTime) &&
    Math.abs(t - compiledPlay.questionFreezeTime) <= FREEZE_MARKER_WINDOW_SECONDS;

  const svgWidth = RINK_LENGTH_M * SCALE;
  const svgHeight = RINK_WIDTH_M * SCALE;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0B1A33",
      }}
    >
      <svg width={svgWidth} height={svgHeight} style={{ background: "#eef" }}>
        {actorIds.map((id) => {
          const pos = sampleAt(samples, id, t);
          if (!pos) return null;
          const cx = (pos[0] + RINK_LENGTH_M / 2) * SCALE;
          const cy = (pos[1] + RINK_WIDTH_M / 2) * SCALE;
          return (
            <g key={id}>
              <circle cx={cx} cy={cy} r={12} fill={id === "puck" ? "#111" : "steelblue"} />
              {showFreezeMarker && id !== "puck" && (
                <circle cx={cx} cy={cy} r={20} fill="none" stroke="#C9A24B" strokeWidth={2} strokeDasharray="4 3" />
              )}
            </g>
          );
        })}
        {showFreezeMarker && (
          <text x={svgWidth / 2} y={30} textAnchor="middle" fontSize={22} fill="#C9A24B" fontWeight="bold">
            DECISION POINT
          </text>
        )}
        {watermark && (
          <text x={20} y={svgHeight - 20} fontSize={28} fill="red" fontWeight="bold">
            DRAFT — NOT VALIDATED
          </text>
        )}
      </svg>
    </div>
  );
}
