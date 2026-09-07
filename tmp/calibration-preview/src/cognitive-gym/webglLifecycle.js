// Loss is a native canvas event, not a React render error. Hand off once to
// the existing 2D game and detach before WebGL disposal can emit another loss.
export function watchWebglContextLoss(canvas, onLoss) {
  let listening = true;
  function cleanup() {
    if (!listening) return;
    listening = false;
    canvas.removeEventListener('webglcontextlost', handleLoss);
  }
  function handleLoss(event) {
    event.preventDefault();
    cleanup();
    onLoss();
  }
  canvas.addEventListener('webglcontextlost', handleLoss);
  return cleanup;
}
