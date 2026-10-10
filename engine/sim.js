// Play whole games with policies. Used by the gates and the unit tests; the pages can use it for demos.

import { createGame, openRound, submitDecisions, resolveRound } from './engine.js';
import { botDecide, ARCHETYPES } from './bots.js';

// field: array of policy specs for T1..Tn, each a string name, a function, or {name, opts}.
export function playGame(seed, field, opts = {}) {
  const state = createGame(seed, field.length, opts);
  const pol = field.map(f => (typeof f === 'function' ? f : typeof f === 'string' ? ARCHETYPES[f] : (s, id) => ARCHETYPES[f.name](s, id, f.opts)));
  for (let r = 1; r <= 5; r++) {
    openRound(state, r);
    state.teamIds.forEach((id, i) => {
      const dec = pol[i](state, id);
      const res = submitDecisions(state, id, dec);
      if (!res.ok) { state.warnings = state.warnings || []; state.warnings.push({ round: r, id, errors: res.errors }); }
    });
    resolveRound(state);
  }
  return state;
}
export { botDecide };
