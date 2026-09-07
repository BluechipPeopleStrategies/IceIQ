// Branching scenario engine. A play is a graph of frames (nodes); each answer
// follows a route to the next node until a terminal node. Pure (no React) so it
// is unit-testable and importable by validators. Normalizes flat / steps[] /
// nodes scenarios into ONE canonical graph so nothing downstream special-cases.

// Canonical graph: { entry: string[], nodes: { [id]: { ...frame, routes:[{on,outcome,next}] } } }
export function toGraph(scenario) {
  if (scenario && scenario.nodes && scenario.entry) {
    return { entry: scenario.entry.slice(), nodes: scenario.nodes };
  }
  const steps = Array.isArray(scenario?.steps) && scenario.steps.length
    ? scenario.steps
    : [{ actors: scenario?.actors, interaction: scenario?.interaction, correct: scenario?.correct,
         feedback: scenario?.feedback, tip: scenario?.tip, why: scenario?.why }];
  const nodes = {};
  steps.forEach((st, i) => {
    const last = i === steps.length - 1;
    nodes[`s${i}`] = { ...st, routes: last ? [] : [{ on: "else", outcome: st.outcome, next: `s${i + 1}` }] };
  });
  return { entry: ["s0"], nodes };
}

// Synthetic flat scenario for one node: top-level fields (minus graph keys)
// overlaid with the node's own frame fields (minus routes). Reused by the
// player, the renderers, and per-frame validation.
export function flattenNode(scenario, nodeId) {
  const node = toGraph(scenario).nodes[nodeId];
  const { steps, nodes, entry, ...top } = scenario;
  const { routes, ...frame } = node;
  return { ...top, ...frame };
}

// Every frame of a scenario as a flat scenario (for validation/rendering).
export function framesOf(scenario) {
  return Object.keys(toGraph(scenario).nodes).map((id) => flattenNode(scenario, id));
}

// ---- progression state machine (immutable) ----
export function start(scenario, pickIndex = 0) {
  const graph = toGraph(scenario);
  const id = graph.entry[pickIndex % graph.entry.length];
  return { scenario, graph, nodeId: id, path: [id], results: {} };
}
export function frameFor(state) { return flattenNode(state.scenario, state.nodeId); }
export function currentNode(state) { return state.graph.nodes[state.nodeId]; }
export function record(state, result) {
  return { ...state, results: { ...state.results, [state.nodeId]: result } };
}
export function routeFor(state, result) {
  const routes = state.graph.nodes[state.nodeId].routes || [];
  return routes.find((r) => r.on === "correct" && result && result.ok)
      || routes.find((r) => r.on === "else")
      || null;
}
export function advance(state, route) {
  return { ...state, nodeId: route.next, path: [...state.path, route.next] };
}
export function isTerminal(state) { return (state.graph.nodes[state.nodeId].routes || []).length === 0; }
export function summary(state) {
  const perRead = state.path.map((id) => !!(state.results[id] && state.results[id].ok));
  return { total: state.path.length, correct: perRead.filter(Boolean).length, perRead };
}
