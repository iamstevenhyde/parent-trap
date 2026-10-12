// Play whole games with policies. Used by the gates and the unit tests; the pages can use it for demos.

import { createGame, openRound, submitDecisions, resolveRound, clearOpeningAuction } from './engine.js';
import { botDecide, ARCHETYPES } from './bots.js';

// field: array of policy specs for T1..Tn, each a string name, a function, or {name, opts}.
export function playGame(seed, field, opts = {}) {
  const state = createGame(seed, field.length, opts);
  const pol = field.map(f => (typeof f === 'function' ? f : typeof f === 'string' ? ARCHETYPES[f] : (s, id) => ARCHETYPES[f.name](s, id, f.opts)));
  for (let r = 1; r <= 5; r++) {
    openRound(state, r);
    // opts.openingAuction (default off): round 1 starts with the starting auction. Every table's sealed bids are cleared first, then
    // each table plans the rest of the round knowing what it owns and which lots are left.
    if (r === 1 && opts.openingAuction) {
      const humanBids = {}, botBids = {};
      state.teamIds.forEach((id, i) => { humanBids[id] = (pol[i](state, id).bids || []); });
      state.botIds.forEach(id => { botBids[id] = (botDecide(state, id).bids || []); });
      clearOpeningAuction(state, { humanBids, botBids });
    }
    state.teamIds.forEach((id, i) => {
      const dec = pol[i](state, id);
      if (r === 1 && opts.openingAuction) dec.bids = (dec.bids || []).filter(b => state.lotsByKey[b.lot]);
      const res = submitDecisions(state, id, dec);
      if (!res.ok) { state.warnings = state.warnings || []; state.warnings.push({ round: r, id, errors: res.errors }); }
    });
    resolveRound(state);
  }
  return state;
}
export { botDecide };
