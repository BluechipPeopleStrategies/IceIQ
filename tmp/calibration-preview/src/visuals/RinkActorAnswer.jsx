import { useLayoutEffect, useRef } from 'react';

/** Select-only answer surface. A scroll, drag, cancellation or camera gesture
 * cannot become an actor answer, and no placement callback is involved. */
export default function RinkActorAnswer({ as: Tag = 'button', actorId, onAnswer, enabled = true, children, ...props }) {
  const element = useRef(null), gesture = useRef(null);
  useLayoutEffect(() => {
    gesture.current = null;
    if (!enabled) return undefined;
    const cancel = () => { gesture.current = null; };
    const second = event => { if (gesture.current && event.pointerId !== gesture.current.id) cancel(); };
    const doc = element.current?.ownerDocument;
    doc?.addEventListener('pointerdown', second, true);
    doc?.addEventListener('scroll', cancel, true);
    return () => { cancel(); doc?.removeEventListener('pointerdown', second, true); doc?.removeEventListener('scroll', cancel, true); };
  }, [enabled, actorId]);
  const answer = method => { if (enabled) onAnswer?.(actorId, method); };
  return <Tag {...props} ref={element} {...(Tag === 'button' ? { type: 'button', disabled: !enabled } : { role: 'button', tabIndex: enabled ? 0 : -1, 'aria-disabled': !enabled })}
    onPointerDown={event => {
      event.stopPropagation();
      gesture.current = enabled && event.button === 0 && event.isPrimary !== false
        ? { id: event.pointerId, x: event.clientX, y: event.clientY } : null;
    }}
    onPointerMove={event => {
      const g = gesture.current;
      if (g?.id === event.pointerId && Math.hypot(event.clientX - g.x, event.clientY - g.y) >= 8) gesture.current = null;
    }}
    onPointerLeave={() => { gesture.current = null; }}
    onPointerCancel={() => { gesture.current = null; }}
    onLostPointerCapture={() => { gesture.current = null; }}
    onPointerUp={event => {
      event.stopPropagation();
      const g = gesture.current; gesture.current = null;
      if (g?.id === event.pointerId && event.button === 0 && event.isPrimary !== false && Math.hypot(event.clientX - g.x, event.clientY - g.y) < 8) answer('rink-tap');
    }}
    onKeyDown={event => {
      if (['Enter', ' '].includes(event.key)) { event.preventDefault(); event.stopPropagation(); if (!event.repeat) answer('keyboard'); }
    }}
    onClick={event => { event.stopPropagation(); if (event.detail === 0) answer('keyboard'); }}>
    {children}
  </Tag>;
}
