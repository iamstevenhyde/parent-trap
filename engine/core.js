// Small shared helpers used by engine.js, resolve.js and scoring.js (kept apart to avoid import cycles).

import { valueOf, heldUnits, hooksReal, pairEffect } from './model.js';

// Nine skills (rules change 2026-10-29), one per way a parent company adds value. One Develop capability earns a skill outright; a team holds at most cfg.MAX_SKILLS.
export const CAPABILITIES = ['acquirer', 'builder', 'ally', 'integrator', 'operator', 'analyst', 'leanhq', 'portfolio', 'risk'];
export const CAP_LABEL = { acquirer: 'Acquirer', builder: 'Builder', ally: 'Alliance partner', integrator: 'Integrator', operator: 'Operator', analyst: 'Analyst', leanhq: 'Lean headquarters', portfolio: 'Portfolio manager', risk: 'Risk manager' };
export const emptyCaps = v => Object.fromEntries(CAPABILITIES.map(c => [c, v]));
export const skillCount = t => CAPABILITIES.filter(c => t.capabilities[c]).length;
// One line in the results so the debrief can see a skill paid. amount is the dollars saved or gained, when there is one.
export function skillNote(state, teamId, cap, text, amount) {
  if (state.teams[teamId].isBot) return;
  emit(state, { type: 'skill_effect', team: teamId, capability: cap, amount, text: CAP_LABEL[cap] + ': ' + text });
}
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

// Corporate actions a team may take this round: the base limit plus any alliance-dividend action earned by a co-bid win last round.
export const attLimit = (state, t) => state.cfg.ATT_PER_ROUND + (t.attBonusRound === state.round ? state.cfg.COBID_ATT : 0);

export function normalizeDecision(d) {
  return { bids: [], builds: [], capital: {}, actions: [], why: '', predicted: null, ...d };
}

// Develop capability earns the skill outright (rules change 2026-10-29: the old "two uses" path is gone).
export function earnSkill(state, teamId, cap) {
  const t = state.teams[teamId];
  if (t.capabilities[cap]) return false;
  t.capabilities[cap] = true;
  emit(state, { type: 'capability_earned', team: teamId, capability: cap, text: 'New skill: ' + CAP_LABEL[cap] + '. ' + CAP_BENEFIT[cap] });
  return true;
}
export const CAP_BENEFIT = {
  acquirer: 'You pay no deal fee, and your estimate on every company for sale is twice as tight.',
  builder: 'A build arrives one round sooner and starts at 85 percent strength instead of 70.',
  ally: 'You get back 20 percent of your half of a joint win, and the alliance dividend doubles.',
  integrator: 'Integrate costs half, and a pair that fits keeps all its synergy from the first round.',
  operator: 'Money you put into businesses returns 15 percent more, and a Turnaround still works at half strength when the whole industry is down.',
  analyst: 'One Deep dive each round uses no attention.',
  leanhq: 'The cost of running many businesses is 30 percent lower.',
  portfolio: 'A market sale pays 95 percent of value instead of 85.',
  risk: 'Protect costs half and blocks 75 percent of the damage instead of 50.',
};

// Attention a decision uses: bids (not in live auctions), builds and actions, less the free Deep dives an Analyst gets each round.
export function attentionOf(state, t, d) {
  const free = t.capabilities.analyst ? Math.min(state.cfg.ANALYST_FREE_DEEP, d.actions.filter(a => a.type === 'deepdive').length) : 0;
  return (state.opts.liveAuction ? 0 : d.bids.length) + d.builds.length + d.actions.length - free;
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
      // 10/29 class: the reading used the shared-asset hook alone, so 6 pairs read "fit" and then paid nothing. It now asks the payoff's own question.
      t.known[key] = { related: pairEffect(state.cfg, state.units[x], state.units[y], true).sigma > 0, round: state.round };
    }
  }
}
