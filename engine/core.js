// Small shared helpers used by engine.js, resolve.js and scoring.js (kept apart to avoid import cycles).

import { valueOf, heldUnits, hooksReal } from './model.js';

export const CAPABILITIES = ['acquirer', 'integrator', 'operator', 'analyst'];
export const CAP_LABEL = { acquirer: 'Acquirer', integrator: 'Integrator', operator: 'Operator', analyst: 'Analyst' };
export const emptyLedger = () => ({ T1: 0, T2: 0, T3: 0, T4: 0, T5: 0, T6: 0, T7: 0, T8: 0 });
export const money = n => '$' + Math.round(n) + 'M';

export function emit(state, ev) {
  const e = { seq: state.events.length, round: state.round, ...ev };
  state.events.push(e);
  return e;
}
export const post = (state, teamId, term, amt) => { state.teams[teamId].ledger[term] += amt; };

export function openSpell(state, teamId, unit, w, a) {
  state.teams[teamId].spells.push({ unit: unit.id, w, a, b: null, entryB: unit.B, nG0: unit.nGrowth, entryV: valueOf(state, unit) * w, flows: {}, exit: null, sEnd: null });
}
export function openSpellOf(state, teamId, unitId) {
  const sp = state.teams[teamId].spells;
  for (let i = sp.length - 1; i >= 0; i--) if (sp[i].unit === unitId && sp[i].b === null) return sp[i];
  return null;
}
// Close a team's spell on a unit. b is the last round it operated the unit.
export function closeSpell(state, teamId, unit, b, exit) {
  const sp = openSpellOf(state, teamId, unit.id);
  if (!sp) return;
  sp.b = b; sp.exit = exit; sp.sEnd = unit.s;
}

// Enterprise value now: held units at true value (weighted) + builds at cost + cash - debt.
export function evOf(state, teamId) {
  const t = state.teams[teamId];
  let ev = t.cash - t.drawn - t.recLoan;
  for (const { u, w } of heldUnits(state, teamId)) ev += w * valueOf(state, u);
  for (const c of t.cip) ev += c.cost;
  return ev;
}

export function normalizeDecision(d) {
  return { bids: [], builds: [], capital: {}, actions: [], why: '', predicted: null, ...d };
}

// A use of an action type counts toward the capability. Two uses earn Capability I.
export function useCap(state, teamId, cap) {
  const t = state.teams[teamId];
  t.uses[cap]++;
  if (t.uses[cap] >= 2 && !t.capabilities[cap]) {
    t.capabilities[cap] = true;
    const benefit = {
      acquirer: 'your bids lose less to the winner\'s curse and builds cost less',
      integrator: 'your Integrate projects pay more and cost less',
      operator: 'your Turnarounds cost less and pay more',
      analyst: 'your Deep dives are cheaper and sharper',
    }[cap];
    emit(state, { type: 'capability_earned', team: teamId, capability: cap, text: 'New skill: ' + CAP_LABEL[cap] + ' I. You have now done ' + cap + ' work well twice. From now on, ' + benefit + '.', uses: t.uses[cap] });
  } else if (!t.capabilities[cap]) {
    emit(state, { type: 'capability_progress', team: teamId, capability: cap, text: 'Develop capability: ' + t.uses[cap] + ' of 2 uses toward ' + CAP_LABEL[cap] + '.', uses: t.uses[cap] });
  }
}

// Deep dives are immediate: the reading is a keyed draw, so asking twice shows the same thing.
export function applyDeepDives(state, teamId, d, estimateFn) {
  const t = state.teams[teamId];
  for (const a of d.actions) {
    if (a.type !== 'deepdive') continue;
    if (a.lot) {
      const unitId = state.lotsByKey[a.lot].unitId;
      if (!t.deep[unitId]) { t.deep[unitId] = state.round; t.signals[a.lot] = estimateFn(state, teamId, unitId); }
    } else {
      const [x, y] = a.pair, key = [x, y].sort().join('+');
      t.known[key] = { related: hooksReal(state.cfg, state.units[x].co, state.units[y].co), round: state.round };
    }
  }
}
