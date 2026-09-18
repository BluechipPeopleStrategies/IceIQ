// Auth callbacks can run before React commits a queued state update.
export function setLocalSessionMode(ref, setState, enabled) {
  ref.current = enabled;
  setState(enabled);
}
