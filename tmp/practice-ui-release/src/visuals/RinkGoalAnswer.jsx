import { NHL_200X85_PROFILE } from '../scenario-engine/rinkFrame.js';
import RinkActionCue from './RinkActionCue.jsx';

/** The answer belongs to the visible net; activation never moves the camera. */
export default function RinkGoalAnswer({ side = 'right', onAnswer, enabled = true }) {
  const x = NHL_200X85_PROFILE.landmarks.goalLineRight[0] * (side === 'left' ? -1 : 1);
  return <RinkActionCue action="shoot" point={{ x, y: 0 }} height={1.5} offset={[42, -4]}
    onAnswer={(_, method) => onAnswer?.(side, method)} enabled={enabled} label={`Shoot at the ${side} net`} />;
}
