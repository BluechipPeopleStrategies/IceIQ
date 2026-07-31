import { Composition } from "remotion";
import { CoachPlayComposition, durationSecondsFor } from "./CoachPlayComposition.jsx";

const FPS = 30;

// Duration is derived from the artifact's own event times (see
// durationSecondsFor in CoachPlayComposition.jsx) rather than fixed, since a
// CompiledTeachingPlay/DraftTeachingPlay's length varies per play. Remotion
// calls this both in Studio (as props change) and from selectComposition()
// in render-worker.mjs before renderMedia() runs, so the worker always
// renders exactly as many frames as the artifact needs -- never a truncated
// or over-long clip.
function calculateMetadata({ props }) {
  const durationInFrames = Math.max(1, Math.round(durationSecondsFor(props.compiledPlay) * FPS));
  return { durationInFrames, fps: FPS, width: 1920, height: 1080 };
}

export const RemotionRoot = () => {
  return (
    <Composition
      id="CoachPlay"
      component={CoachPlayComposition}
      calculateMetadata={calculateMetadata}
      fps={FPS}
      width={1920}
      height={1080}
      durationInFrames={300}
      defaultProps={{ compiledPlay: { samples: [], eventTimes: [], questionFreezeTime: null }, watermark: false }}
    />
  );
};
