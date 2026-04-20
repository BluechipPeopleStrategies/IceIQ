// When a demo user signs up, carry their in-session work (quizzes taken,
// ratings/goals edited, training added) over to their new real account.
//
// Flow:
//   enterDemo       → recordDemoSnapshot(player)   // baseline state
//   (user does stuff during demo)
//   triggerSignup   → captureDemoTransfer(player)  // diff vs snapshot
//                     writePendingTransfer(diff)   // stash until signup completes
//   exitDemo        → clearDemoSnapshot()          // clean the baseline
//   loadUser        → applyPendingTransfer(userId) // replay via SB.* + clear

const SNAPSHOT_KEY = "iceiq_demo_snapshot";
const PENDING_KEY = "iceiq_pending_transfer";
const TRAINING_KEY = "iceiq_training_log";

export function recordDemoSnapshot(player) {
  if (!player) return;
  try {
    const snap = {
      quizHistoryLength: (player.quizHistory || []).length,
      selfRatings: player.selfRatings ?? null,
      goals: player.goals ?? null,
      trainingSessionsCount: (player.trainingSessions || []).length,
    };
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snap));
  } catch {}
}

export function clearDemoSnapshot() {
  try { localStorage.removeItem(SNAPSHOT_KEY); } catch {}
}

export function captureDemoTransfer(player) {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    const snap = raw ? JSON.parse(raw) : null;
    if (!snap || !player) return null;

    const newQuizSessions = (player.quizHistory || []).slice(snap.quizHistoryLength);
    const selfRatingsChanged = stable(player.selfRatings) !== stable(snap.selfRatings);
    const goalsChanged = stable(player.goals) !== stable(snap.goals);

    const trainingRaw = localStorage.getItem(TRAINING_KEY);
    const trainingAll = trainingRaw ? JSON.parse(trainingRaw) : {};
    const currentDemoTraining = trainingAll["__demo__"]?.sessions || [];
    const newTrainingSessions = currentDemoTraining.slice(snap.trainingSessionsCount);

    const transfer = {
      quizSessions: newQuizSessions.length ? newQuizSessions : null,
      selfRatings: selfRatingsChanged ? player.selfRatings : null,
      goals: goalsChanged ? player.goals : null,
      trainingSessions: newTrainingSessions.length ? newTrainingSessions : null,
      sessionLength: player.sessionLength || 10,
      capturedAt: new Date().toISOString(),
    };
    const hasAny = transfer.quizSessions || transfer.selfRatings || transfer.goals || transfer.trainingSessions;
    return hasAny ? transfer : null;
  } catch { return null; }
}

export function writePendingTransfer(transfer) {
  if (!transfer) return;
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(transfer)); } catch {}
}

export function getPendingTransfer() {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearPendingTransfer() {
  try { localStorage.removeItem(PENDING_KEY); } catch {}
}

// Replay a captured transfer onto the newly-created real account.
// `SB` is the supabase module (pass it in to avoid a circular import).
// Returns the list of applied categories (e.g. ["2 quiz session(s)", "goals"]).
export async function applyPendingTransfer(userId, SB) {
  if (!userId) return null;
  const transfer = getPendingTransfer();
  if (!transfer) return null;
  // Clear first so a mid-apply failure doesn't cause duplicate replay on next login.
  clearPendingTransfer();

  const applied = [];
  try {
    if (transfer.quizSessions?.length) {
      for (const q of transfer.quizSessions) {
        await SB.saveQuizSession(userId, {
          results: q.results,
          score: q.score,
          sessionLength: transfer.sessionLength,
        });
      }
      const answers = transfer.quizSessions.flatMap(q =>
        (q.results || []).map(r => ({ questionId: r.id, correct: r.ok }))
      );
      if (answers.length && SB.recordQuestionAnswersBatch) {
        try { SB.recordQuestionAnswersBatch(answers); } catch {}
      }
      applied.push(`${transfer.quizSessions.length} quiz session(s)`);
    }
    if (transfer.selfRatings) {
      await SB.saveSelfRatings(userId, transfer.selfRatings);
      applied.push("self-ratings");
    }
    if (transfer.goals) {
      for (const [cat, g] of Object.entries(transfer.goals)) {
        if (g?.goal) await SB.saveGoal(userId, cat, g);
      }
      applied.push("goals");
    }
    if (transfer.trainingSessions?.length) {
      const raw = localStorage.getItem(TRAINING_KEY);
      const all = raw ? JSON.parse(raw) : {};
      const existing = all[userId]?.sessions || [];
      all[userId] = { sessions: [...existing, ...transfer.trainingSessions] };
      localStorage.setItem(TRAINING_KEY, JSON.stringify(all));
      applied.push(`${transfer.trainingSessions.length} training session(s)`);
    }
  } catch (e) {
    console.error("applyPendingTransfer failed:", e);
  }
  return applied.length ? applied : null;
}

function stable(obj) {
  if (obj === null || obj === undefined) return "null";
  if (typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return "[" + obj.map(stable).join(",") + "]";
  const keys = Object.keys(obj).sort();
  return "{" + keys.map(k => JSON.stringify(k) + ":" + stable(obj[k])).join(",") + "}";
}
