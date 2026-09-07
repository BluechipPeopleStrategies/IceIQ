import { useEffect } from "react";
import { shiftPausedTimestamp } from "./gymVisualCore";

// requestAnimationFrame is throttled while a tab is hidden. Shift every live
// timestamp by the hidden duration before the queued frame can run, so returning
// to the drill never turns an ordinary tab switch into a timeout/save.
export default function useGymVisibilityPause(sceneRef, active, rootRef) {
  useEffect(() => {
    if (!active) return undefined;
    let hiddenAt = null;
    const onVisibility = () => {
      if (document.hidden) {
        hiddenAt = performance.now();
        rootRef?.current?.classList.add("is-gym-paused");
        return;
      }
      rootRef?.current?.classList.remove("is-gym-paused");
      if (hiddenAt == null) return;
      const pausedMs = performance.now() - hiddenAt;
      const scene = sceneRef.current;
      if (scene) {
        scene.startTs = shiftPausedTimestamp(scene.startTs, pausedMs);
        scene.shotAnimStart = shiftPausedTimestamp(scene.shotAnimStart, pausedMs);
        scene.pokeAnimStart = shiftPausedTimestamp(scene.pokeAnimStart, pausedMs);
        scene.stageStart = shiftPausedTimestamp(scene.stageStart, pausedMs);
      }
      hiddenAt = null;
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      rootRef?.current?.classList.remove("is-gym-paused");
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [active, rootRef, sceneRef]);
}
