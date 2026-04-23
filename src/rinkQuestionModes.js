// Rink question-mode registry.
//
// Each entry describes a way a player can answer a rink-type scenario. The
// Rink component consults this registry to score a player's action and to
// render mode-specific prompts. The dashboard authoring UI reads the same
// registry to list available modes and generate a blank question object.
//
// To add a new mode:
//   1. Add an entry below with `id`, `label`, `defaultQuestion`, `score`.
//   2. If the mode needs play-mode UI beyond a bottom prompt (e.g. a
//      draggable marker, a path-drawing overlay), extend Rink.jsx where it
//      checks `scene.question?.mode` — the minimal new-mode cost is editing
//      this file only; richer UX costs a Rink.jsx change too.
//   3. Run `npm run build:dashboard` so tools/dashboard.html picks up the
//      new mode in its dropdown.
//
// Contract for each entry:
//   id                string matching scene.question.mode
//   label             human-readable, shown in author dropdowns
//   defaultQuestion() factory for a blank question object of this mode
//   score(action, q)  returns { verdict, choice, feedback } given the user's
//                     action payload (zone key for zone-click, item id for
//                     spot-mistake, option object for choice, etc.) and the
//                     question config.

function pickFeedback(q, verdict) {
  return (q?.feedback && q.feedback[verdict]) || '';
}

export const QUESTION_MODES = {
  choice: {
    id: 'choice',
    label: 'Multiple choice',
    defaultQuestion: () => ({
      mode: 'choice',
      prompt: '',
      options: [],
    }),
    // action === the selected option object { text, verdict, feedback }
    score: (action, _q) => ({
      verdict: action?.verdict || 'wrong',
      choice: action?.text || '',
      feedback: action?.feedback || '',
    }),
  },

  'zone-click': {
    id: 'zone-click',
    label: 'Zone click',
    defaultQuestion: () => ({
      mode: 'zone-click',
      prompt: '',
      zones: { correct: [], partial: [], wrong: [] },
      feedback: { correct: '', partial: '', wrong: '' },
    }),
    // action === zoneKey string
    score: (zoneKey, q) => {
      const zones = q?.zones || {};
      let verdict = 'wrong';
      if ((zones.correct || []).includes(zoneKey)) verdict = 'correct';
      else if ((zones.partial || []).includes(zoneKey)) verdict = 'partial';
      return { verdict, choice: zoneKey, feedback: pickFeedback(q, verdict) };
    },
  },

  'spot-mistake': {
    id: 'spot-mistake',
    label: 'Spot the mistake',
    defaultQuestion: () => ({
      mode: 'spot-mistake',
      prompt: '',
      targets: { correct: [], partial: [], wrong: [] },
      feedback: { correct: '', partial: '', wrong: '' },
    }),
    // action === item id (teammate / opponent / puck / flag)
    score: (itemId, q) => {
      const t = q?.targets || {};
      let verdict = 'wrong';
      if ((t.correct || []).includes(itemId)) verdict = 'correct';
      else if ((t.partial || []).includes(itemId)) verdict = 'partial';
      return { verdict, choice: itemId, feedback: pickFeedback(q, verdict) };
    },
  },
};

// Cycle helper shared by authoring tools: unassigned → correct → partial → wrong → unassigned.
// Works on either { zones } (zone-click) or { targets } (spot-mistake) bucket sets.
export function cycleBucket(buckets, key) {
  const b = buckets || { correct: [], partial: [], wrong: [] };
  const inC = (b.correct || []).includes(key);
  const inP = (b.partial || []).includes(key);
  const inW = (b.wrong || []).includes(key);
  const without = {
    correct: (b.correct || []).filter(k => k !== key),
    partial: (b.partial || []).filter(k => k !== key),
    wrong:   (b.wrong   || []).filter(k => k !== key),
  };
  if (!inC && !inP && !inW) return { ...without, correct: [...without.correct, key] };
  if (inC)                  return { ...without, partial: [...without.partial, key] };
  if (inP)                  return { ...without, wrong:   [...without.wrong,   key] };
  return without;
}

// Lookup used by renderers to style an item/zone based on its assigned verdict.
// Returns 'correct' | 'partial' | 'wrong' | null.
export function bucketVerdict(buckets, key) {
  if (!buckets) return null;
  if ((buckets.correct || []).includes(key)) return 'correct';
  if ((buckets.partial || []).includes(key)) return 'partial';
  if ((buckets.wrong   || []).includes(key)) return 'wrong';
  return null;
}
