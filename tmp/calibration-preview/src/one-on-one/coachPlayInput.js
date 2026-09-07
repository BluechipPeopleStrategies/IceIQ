const playKeys = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'p', 'tab']);
const actions = { ' ': 'shoot', p: 'pass', tab: 'switch' };

export function releaseCoachPlayInput({ keys, action, stick }) {
  keys.current.clear();
  action.current = null;
  stick.current = { x: 0, y: 0 };
}

export function resumeCoachPlay({ liveRef, frameRef, runRef, input }) {
  if (!liveRef.current || frameRef.current.outcome) return false;
  releaseCoachPlayInput(input);
  runRef.current = true;
  return true;
}

export function handleCoachPlayKeyDown(event, { running, live, input, stop }) {
  // A control nested in the rink keeps its normal keyboard behavior.
  if (event.target !== event.currentTarget || !running || !live) return false;
  const key = event.key.toLowerCase();
  if (key === 'escape') {
    event.preventDefault();
    stop();
    return true;
  }
  if (!playKeys.has(key)) return false;
  event.preventDefault();
  input.keys.current.add(key);
  if (!event.repeat && actions[key]) input.action.current = actions[key];
  return true;
}
