import { useEffect, useState, useCallback } from "react";
import { calculateHockeyIQ } from "../supabase.js";

const EMPTY = { score: null, status: "calibrating", reps: 0, ewma: null, trend: null, bestWindow: null };

// Subscribes a component to a player's Hockey IQ score. Returns
// { score, status, reps, ewma, trend, bestWindow, loading, refresh }.
// `status` is "calibrating" when reps < MIN_REPS in the trailing window
// (consumers should render a placeholder, not a fake 100).
export function useHockeyIQScore(userId) {
  const [state, setState] = useState(EMPTY);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) { setState(EMPTY); return; }
    setLoading(true);
    try {
      const next = await calculateHockeyIQ(userId);
      setState(next);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { ...state, loading, refresh };
}
