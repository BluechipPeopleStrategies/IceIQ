import { useEffect, useId, useRef, useState } from 'react';
import './BoardInspection.css';

/** Inspect a captured, read-only composition. The caller keeps editing outside. */
export default function BoardInspection({ title = 'Hockey board', renderBoard }) {
  const [board, setBoard] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const dialog = useRef(null), trigger = useRef(null), viewport = useRef(null), composition = useRef(null);
  const titleId = useId(), helpId = useId();
  const open = board !== null;

  useEffect(() => {
    if (!open) return undefined;
    const element = dialog.current;
    if (!element.open) element.showModal();
    viewport.current?.scrollTo({ left: 0, top: 0 });
    const measure = () => {
      const width = viewport.current?.clientWidth || 0;
      const height = composition.current?.offsetHeight || 0;
      setSize(old => old.width === width && old.height === height ? old : { width, height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport.current);
    observer.observe(composition.current);
    return () => { observer.disconnect(); if (element.open) element.close(); };
  }, [open]);

  function close() {
    if (dialog.current?.open) dialog.current.close();
    setBoard(null);
    if (trigger.current?.isConnected) trigger.current.focus({ preventScroll: true });
  }

  function inspect() {
    setZoom(1);
    setSize({ width: 0, height: 0 });
    setBoard(renderBoard());
  }

  function fit() {
    setZoom(1);
    viewport.current?.scrollTo({ left: 0, top: 0 });
  }

  return <div className="board-inspection">
    <button ref={trigger} type="button" className="board-inspection-open" onClick={inspect} aria-haspopup="dialog" aria-label={`Enlarge board: ${title}`}>Enlarge board <span aria-hidden="true">↗</span></button>
    <dialog ref={dialog} className="board-inspection-dialog" aria-labelledby={titleId} aria-describedby={helpId} onClose={close} onCancel={event => { event.preventDefault(); close(); }}>
      <header><div><span>LOOK CLOSER</span><h2 id={titleId}>{title}</h2></div><button type="button" onClick={close} autoFocus>Close <span aria-hidden="true">×</span></button></header>
      <p id={helpId}>Zoom in to read the players and lanes. This picture stays at the moment you opened it.</p>
      <div className="board-inspection-tools" role="group" aria-label="Board zoom">
        <button type="button" aria-label="Zoom out" disabled={zoom <= 1} onClick={() => setZoom(value => Math.max(1, value - .5))}>−</button>
        <output aria-live="polite">{Math.round(zoom * 100)}%</output>
        <button type="button" aria-label="Zoom in" disabled={zoom >= 3} onClick={() => setZoom(value => Math.min(3, value + .5))}>+</button>
        <button type="button" onClick={fit}>Fit board</button>
        <span>Scroll to explore when zoomed.</span>
      </div>
      <div ref={viewport} className="board-inspection-viewport" role="region" aria-label="Enlarged board. Scroll to explore." tabIndex={0}>
        <div className="board-inspection-space" style={{ width: size.width ? size.width * zoom : '100%', height: size.height ? size.height * zoom : undefined }}>
          <div ref={composition} className="board-inspection-composition" style={{ width: size.width || '100%', transform: `scale(${zoom})` }}>{board}</div>
        </div>
      </div>
    </dialog>
  </div>;
}
