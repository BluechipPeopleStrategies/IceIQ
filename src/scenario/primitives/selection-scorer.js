// Pure scorer for the selection primitive. Pulled out of selection.jsx
// so Node-side tools (CLI authoring, validators) can import it without
// pulling in React.

// Score a user's selection against the expected answer.
//
// `picked` and `correct` are both arrays of ids. Order-sensitive scoring
// is opt-in via `opts.ordered === true`; default is set-equality.
//
// Returns { ok, missed, wrong } where:
//   missed — correct ids the user didn't pick
//   wrong  — picked ids that aren't in the correct set
//   ok     — set match (or sequence match if ordered)
export function scoreSelection(picked, correct, opts = {}) {
  const pickedArr = Array.isArray(picked) ? picked : [];
  const correctArr = Array.isArray(correct) ? correct : [];
  if (opts.ordered) {
    const ok = pickedArr.length === correctArr.length
      && pickedArr.every((p, i) => p === correctArr[i]);
    return { ok, missed: ok ? [] : [...correctArr], wrong: ok ? [] : [...pickedArr] };
  }
  const correctSet = new Set(correctArr);
  const pickedSet = new Set(pickedArr);
  const missed = correctArr.filter(id => !pickedSet.has(id));
  const wrong = pickedArr.filter(id => !correctSet.has(id));
  return {
    ok: missed.length === 0 && wrong.length === 0,
    missed, wrong,
  };
}
