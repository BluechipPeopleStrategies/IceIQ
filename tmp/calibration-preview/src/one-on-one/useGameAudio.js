import { useCallback, useEffect, useRef, useState } from 'react';

// Original synthesized cues. No asset downloads or audio before a user gesture.
export function useGameAudio(frame) {
  const context = useRef(null), lastEvent = useRef(0), lastTime = useRef(0);
  const [muted, setMuted] = useState(false);
  const unlock = useCallback(() => {
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      if (!context.current) context.current = new Audio();
      context.current.resume().catch(() => {});
    } catch { /* Audio support never blocks a rep. */ }
  }, []);
  useEffect(() => {
    const events = frame.events || [];
    if (frame.time < lastTime.current) lastEvent.current = 0;
    const fresh = events.slice(lastEvent.current);
    lastEvent.current = events.length; lastTime.current = frame.time;
    const ctx = context.current;
    if (muted || !ctx || ctx.state !== 'running') return;
    for (const e of fresh) {
      const frequency = { shot: 750, poke: 420, save: 190, goal: 880, turnover: 240, timeout: 310 }[e.type];
      if (!frequency) continue;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = e.type === 'goal' ? 'sine' : 'triangle'; o.frequency.setValueAtTime(frequency, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(e.type === 'goal' ? frequency * 1.5 : frequency * .5, ctx.currentTime + .10);
      g.gain.setValueAtTime(.0001, ctx.currentTime); g.gain.exponentialRampToValueAtTime(.035, ctx.currentTime + .005); g.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + .16);
      o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + .18);
      o.onended = () => { o.disconnect(); g.disconnect(); };
    }
  }, [frame, muted]);
  useEffect(() => () => { context.current?.close().catch(() => {}); context.current = null; }, []);
  return { muted, unlock, toggle: () => { unlock(); setMuted(v => !v); } };
}
