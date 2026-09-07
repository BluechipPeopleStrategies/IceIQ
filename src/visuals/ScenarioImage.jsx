import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { OverlayLayer } from '../OverlayLayer.jsx';
import ScenarioRinkView from './ScenarioRinkView.jsx';
import { sourceScene3D } from './sourceScene3D.js';
import './ScenarioImage.css';
const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** Authored image scenes now use the same read-only 3D rink as other lessons. */
export default function ScenarioImage(props) {
  const { media, overlays, questionId = '', sticky = false, onAvailabilityChange } = props;
  const scene = useMemo(() => sourceScene3D({ media, overlays }), [media, overlays]);
  const identity = JSON.stringify([questionId, media ?? null, overlays ?? null, scene?.id ?? null]);
  const gateRef = useRef(null), callback = useRef(onAvailabilityChange);
  if (gateRef.current?.identity !== identity) gateRef.current = { identity, mounted: true };
  const gate = gateRef.current; callback.current = onAvailabilityChange;
  const needsImage = !!media?.url && (!media.type || media.type === 'image');
  useBrowserLayoutEffect(() => {
    gate.mounted = true;
    callback.current?.(!needsImage);
    return () => { gate.mounted = false; };
  }, [gate, needsImage]);
  const reportAvailability = useMemo(() => available => {
    if (gateRef.current === gate && gate.mounted) callback.current?.(available === true);
  }, [gate]);
  if (!scene) return <ImageInspection key={identity} {...props} onAvailabilityChange={reportAvailability} />;
  return <figure className={`scenario-image${sticky ? ' scenario-image-sticky' : ''}`} data-source-scene={scene.id}>
    <ScenarioRinkView key={identity} state={scene.state} bounds={scene.bounds} title={scene.caption} focusActorId={scene.focusActorId}
      ageBand={props.ageBand} startingView={props.startingView} questionId={questionId}
      overlays={scene.overlays} playing={false} labelledActors showBothGoals={scene.showBothGoals}
      teamLabels={scene.teamLabels} onAvailabilityChange={reportAvailability} />
    <figcaption><span>{scene.caption}</span></figcaption>
  </figure>;
}

/** Read-only inspection. The exact source image, fit and overlays scale together. */
function ImageInspection({ media, overlays, sticky = false, frameRatio = '16/9', onAvailabilityChange }) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const dialog = useRef(null);
  const trigger = useRef(null);
  const inspection = useRef(null);
  const composition = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const title = useId();
  const ratio = frameRatio === null ? null : media?.ratio || frameRatio;
  useEffect(() => { setOpen(false); setZoom(1); }, [media?.url]);
  useEffect(() => {
    const element = dialog.current;
    if (open && element && !element.open) element.showModal();
    if (!open && element?.open) element.close();
  }, [open]);
  useEffect(() => () => { dialog.current?.close(); }, []);
  useEffect(() => {
    if (!open || !inspection.current || !composition.current) return;
    const measure = () => {
      const width = inspection.current?.clientWidth || 0;
      const height = composition.current?.offsetHeight || 0;
      setSize(old => old.width === width && old.height === height ? old : { width, height });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(inspection.current);
    observer.observe(composition.current);
    measure();
    return () => observer.disconnect();
  }, [open, media?.url]);
  // Older authored image questions omit `type`; their URL is still the source.
  if (!media?.url || (media.type && media.type !== 'image')) return null;
  const picture = (primary = false) => <div className="scenario-image-picture" style={{ aspectRatio: ratio || undefined }}>
    <img src={media.url} alt={media.alt || 'Hockey scenario'} draggable={false} decoding="async" onLoad={primary ? () => onAvailabilityChange?.(true) : undefined} onError={primary ? () => onAvailabilityChange?.(false) : undefined}
      style={{ height: ratio ? '100%' : 'auto', objectFit: media.aspect ? 'cover' : 'contain' }} />
    <OverlayLayer overlays={overlays} />
  </div>;
  function close() { setOpen(false); trigger.current?.focus({ preventScroll: true }); }
  return <figure className={`scenario-image${sticky ? ' scenario-image-sticky' : ''}`}>
    {picture(true)}
    <figcaption><span>Read the picture</span><button ref={trigger} type="button" onClick={() => { setZoom(1); setOpen(true); }} aria-haspopup="dialog">Enlarge picture <span aria-hidden="true">↗</span></button></figcaption>
    <dialog ref={dialog} className="scenario-image-dialog" aria-labelledby={title} onClose={close} onCancel={close}>
      <header><h2 id={title}>Look at the play</h2><button type="button" onClick={close} autoFocus>Close <span aria-hidden="true">×</span></button></header>
      <div className="scenario-image-tools" role="group" aria-label="Picture zoom">
        <button type="button" aria-label="Zoom out" disabled={zoom <= 1} onClick={() => setZoom(value => Math.max(1, value - .5))}>−</button>
        <output aria-live="polite">{Math.round(zoom * 100)}%</output>
        <button type="button" aria-label="Zoom in" disabled={zoom >= 3} onClick={() => setZoom(value => Math.min(3, value + .5))}>+</button>
        <button type="button" onClick={() => { setZoom(1); inspection.current?.scrollTo({ left: 0, top: 0 }); }}>Fit picture</button>
        <span>Scroll to explore when zoomed.</span>
      </div>
      <div className="scenario-image-inspection" ref={inspection} role="region" aria-label="Enlarged picture. Scroll to explore." tabIndex={0}>
        <div className="scenario-image-extent" style={{ width: size.width ? size.width * zoom : '100%', height: size.height * zoom }}>
          <div ref={composition} className="scenario-image-composition" style={{ width: size.width || '100%', transform: `scale(${zoom})` }}>{open && picture()}</div>
        </div>
      </div>
    </dialog>
  </figure>;
}
