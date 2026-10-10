// One score() for the leaderboard, the projector and the debrief, plus the parenting-advantage counterfactual.

import { evOf, CAPABILITIES } from './core.js';
import { valueOf, requestsOf, cheaperIdx, rhoFor, applyInsurance } from './model.js';

export function score(state, teamId, opts = {}) {
  const t = state.teams[teamId], L = t.ledger, ev = evOf(state, teamId);
  let earned = 0, wasted = 0;
  for (const c of CAPABILITIES) { if (t.capabilities[c]) earned += t.devSpend[c]; else wasted += t.devSpend[c]; }
  const decomposition = {
    inherited: t.ev1 + L.T1, allocation: L.T2, mna: L.T3, synergy: L.T4,
    capability: L.T5 + wasted, financing: L.T8, complexity: L.T6, attentionWasted: L.T7 - wasted,
  };
  const sum = Object.values(decomposition).reduce((a, b) => a + b, 0);
  const out = { team: teamId, ev, decomposition, decompositionSum: sum, residual: ev - sum, startingEV: t.ev1, receivership: !!t.receivership };
  if (opts.pa !== false) out.parentingAdvantage = counterfactual(state, teamId, opts).parentingAdvantage;
  return out;
}

// Rerun each ownership spell as an independent unit through the same shocks (spec 04 section D).
export function counterfactual(state, teamId, opts = {}) {
  const cfg = state.cfg, seed = opts.seedCash !== undefined ? opts.seedCash : cfg.CF_SEED_CASH, t = state.teams[teamId];
  const lastDone = state.vmIdx - 1;
  const spells = [];
  let total = 0;
  for (const sp of t.spells) {
    const u = state.units[sp.unit], b = sp.b === null ? lastDone : sp.b;
    // actual: exit value plus cash the team took out of the unit, less allocated team costs
    let actual = sp.exit ? sp.exit.proceeds : sp.w * valueOf(state, u);
    for (let r = sp.a; r <= b; r++) {
      const f = sp.flows[r];
      if (!f) continue;
      const h = t.hist[r], share = h && h.sumV > 0 ? f.V / h.sumV : 0;
      actual += f.E - f.C - f.act - share * (h ? h.cc + h.fin + h.act : 0);
    }
    // counterfactual: independent unit, cheaper request when its own cash allows
    let B = sp.entryB, cash = seed, nG = sp.nG0 || 0, ins = null, sNext = null;
    const reqs = requestsOf(u), req = reqs[cheaperIdx(u)];
    for (let r = sp.a; r <= b; r++) {
      const f = sp.flows[r];
      if (!f) continue;
      const Vm = state.world.Vm[u.ind][r], sa = B * f.s * Vm, M = state.world.M[u.co][r];
      let C = 0, K = 0;
      if (cash >= req.cost_musd) {
        C = req.cost_musd; K = rhoFor(cfg, req.kind, nG, false) * C;
        if (req.kind === 'growth') nG++; else ins = { kind: req.kind, from: r + 1, until: r + 2 };
      }
      const Mi = applyInsurance(ins, r, M), E = u.y * sa * Mi;
      cash += E - C;
      B = B * (1 + u.g) * (1 + state.world.phi[u.co][r] * (Mi - 1)) + K;
      sNext = f.sNext !== undefined ? f.sNext : f.s;
    }
    const endIdx = Math.min(6, b + 1);
    const sEnd = sNext !== null ? sNext : (sp.sEnd !== null ? sp.sEnd : u.s);
    const cf = sp.w * (B * sEnd * state.world.Vm[u.ind][endIdx] + cash - seed);
    spells.push({ unit: sp.unit, w: sp.w, from: sp.a, to: b, actual, counterfactual: cf, advantage: actual - cf });
    total += actual - cf;
  }
  return { parentingAdvantage: total, spells };
}

export function leaderboard(state, opts = {}) {
  const ids = opts.includeBots ? [...state.teamIds, ...state.botIds] : state.teamIds;
  const rows = ids.map(id => score(state, id, opts));
  rows.sort((a, b) => b.ev - a.ev || (a.team < b.team ? -1 : 1));
  rows.forEach((r, i) => { r.rankEV = i + 1; });
  if (opts.pa !== false) [...rows].sort((a, b) => b.parentingAdvantage - a.parentingAdvantage).forEach((r, i) => { r.rankPA = i + 1; });
  return rows;
}
