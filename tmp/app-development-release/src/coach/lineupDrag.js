/** Pointer-only gesture boundary. A click, cancelled drag or outside drop never moves a player. */
export function createLineupDragController({ findTarget, onPreview, onDrop, threshold = 6 }) {
  let gesture = null;
  const point = event => [event.clientX, event.clientY].every(Number.isFinite);
  function release(current) { try { if (current?.element.hasPointerCapture?.(current.pointerId)) current.element.releasePointerCapture(current.pointerId); } catch { /* Capture may already be released by the browser. */ } }
  function cancel() { const current = gesture; gesture = null; release(current); onPreview(null); return current?.active === true; }
  return {
    down(event, playerId, context) {
      if (gesture) { cancel(); return false; }
      if (!playerId || event.button !== 0 || event.isPrimary === false || !point(event)) return false;
      gesture = { playerId, context, pointerId: event.pointerId, element: event.currentTarget, x: event.clientX, y: event.clientY, active: false };
      try { event.currentTarget.setPointerCapture?.(event.pointerId); } catch { /* Events still work while the pointer is over the card. */ }
      return true;
    },
    move(event) {
      if (!gesture || event.pointerId !== gesture.pointerId) return false;
      if (event.isPrimary === false || !point(event) || (event.buttons != null && event.buttons !== 1)) return cancel();
      gesture.active ||= Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) >= threshold;
      if (gesture.active) onPreview({ playerId: gesture.playerId, x: event.clientX, y: event.clientY, target: findTarget(event.clientX, event.clientY) });
      return gesture.active;
    },
    up(event) {
      if (!gesture || event.pointerId !== gesture.pointerId) return false;
      const current = gesture, target = current.active && event.button === 0 && event.isPrimary !== false && point(event) ? findTarget(event.clientX, event.clientY) : null;
      gesture = null; release(current); onPreview(null);
      if (target) onDrop(current.playerId, target, current.context);
      return current.active;
    },
    cancel,
  };
}
