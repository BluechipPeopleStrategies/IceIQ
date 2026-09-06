/** One matching scene render establishes readiness; this is not a GPU completion fence. */
export function afterScenarioCameraRender(scene, camera, onReady, invalidate) {
  if (!scene || !camera) return undefined;
  const previous = scene.onAfterRender;
  let released = false;
  const release = () => {
    released = true;
    if (scene.onAfterRender === rendered) scene.onAfterRender = previous;
  };
  function rendered(...args) {
    previous?.apply(this, args);
    // Three calls scene.onAfterRender(renderer, scene, camera).
    if (released || args[2] !== camera) return;
    release();
    onReady?.();
  }
  scene.onAfterRender = rendered;
  invalidate();
  return release;
}
