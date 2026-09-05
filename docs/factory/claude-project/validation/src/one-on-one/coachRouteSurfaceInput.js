import { NHL_200X85_PROFILE } from '../scenario-engine/rinkFrame.js';

const { bounds } = NHL_200X85_PROFILE;
const CORNER_RADIUS = 8.5344;
const TAP_DISTANCE = 8;

export function isCoachRoutePoint(point) {
  if (![point?.x, point?.y].every(Number.isFinite)) return false;
  const { x, y } = point;
  if (x < bounds.minX || x > bounds.maxX || y < bounds.minY || y > bounds.maxY) return false;
  const dx = Math.max(0, Math.abs(x) - (bounds.maxX - CORNER_RADIUS));
  const dy = Math.max(0, Math.abs(y) - (bounds.maxY - CORNER_RADIUS));
  return dx === 0 || dy === 0 || Math.hypot(dx, dy) <= CORNER_RADIUS + 1e-9;
}

export function worldPointToCoachRoute(point) {
  const routePoint = { x: -point?.z, y: point?.x };
  return isCoachRoutePoint(routePoint) ? routePoint : null;
}

export function portraitPointToCoachRoute(point) {
  const routePoint = { x: -point?.y, y: point?.x };
  return isCoachRoutePoint(routePoint) ? routePoint : null;
}

// Shared by the native WebGL canvas and SVG board. Waiting for pointer-up lets
// scrolling, cancelled gestures and multi-touch finish without adding a point.
export function listenForCoachRouteTaps(target, onTap) {
  let tap = null;
  const pointers = new Set();
  const captured = new Set();

  function release(pointerId) {
    captured.delete(pointerId);
    try {
      if (target.hasPointerCapture?.(pointerId)) target.releasePointerCapture(pointerId);
    } catch { /* The browser may already have released a cancelled pointer. */ }
  }

  function down(event) {
    const available = pointers.size === 0;
    pointers.add(event.pointerId);
    tap = available && event.button === 0 && event.isPrimary !== false &&
      [event.clientX, event.clientY].every(Number.isFinite)
      ? { id: event.pointerId, x: event.clientX, y: event.clientY } : null;
    // Track cancelled secondary pointers through their release even if they
    // leave the surface, so they cannot leave the next gesture blocked.
    try { target.setPointerCapture?.(event.pointerId); captured.add(event.pointerId); }
    catch { /* Tap tracking still works while the pointer stays on the surface. */ }
  }

  function move(event) {
    if (tap?.id !== event.pointerId) return;
    if (event.isPrimary === false || (event.buttons != null && event.buttons > 1) ||
        Math.hypot(event.clientX - tap.x, event.clientY - tap.y) >= TAP_DISTANCE) tap = null;
  }

  function up(event) {
    const completed = tap;
    tap = null;
    pointers.delete(event.pointerId);
    const accepted = completed?.id === event.pointerId && pointers.size === 0 &&
      event.button === 0 && event.isPrimary !== false &&
      Math.hypot(event.clientX - completed.x, event.clientY - completed.y) < TAP_DISTANCE;
    release(event.pointerId);
    if (accepted) onTap(event);
  }

  function cancel(event) {
    tap = null;
    pointers.delete(event.pointerId);
    release(event.pointerId);
  }

  const listeners = { pointerdown: down, pointermove: move, pointerup: up, pointercancel: cancel, lostpointercapture: cancel };
  for (const [name, handler] of Object.entries(listeners)) target.addEventListener(name, handler);
  return () => {
    tap = null;
    pointers.clear();
    for (const [name, handler] of Object.entries(listeners)) target.removeEventListener(name, handler);
    for (const pointerId of [...captured]) release(pointerId);
  };
}
