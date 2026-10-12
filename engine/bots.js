// Bot conglomerates B1 to B4 (spec/04 section B) and the five archetype policies used by the gates (section E).
// A policy is a function (state, teamId) -> decisions. Policies read only what that table could see,
// plus the pair matrix where the spec's archetype text says "sigma" (the gates test the game, not the students).

import {
  CO, saOf, heldUnits, estimate, matrixSigma, requestsOf, cheaperIdx, costlierIdx, reservedFor, budgetOf, feeRate,
  valueOf, hooksReal,
} from './model.js';
import { applyDeepDives, evOf } from './core.js';

export function applyDeepDivesFor(state, id, d) { applyDeepDives(state, id, d, estimate); }

const solo = (state, id) => heldUnits(state, id).filter(h => h.w === 1).map(h => h.u);
const lotsOf = state => state.lots;
const unitOfLot = (state, lot) => state.units[lot.unitId];
const sig = (state, id, lot) => state.teams[id].signals[lot.key].value;

function struggling(state, u) {
  const t = state.round, cfg = state.cfg;
  const V = valueOf(state, u);
  return (t > 1 && state.world.M[u.co][t - 1] < cfg.STRUGGLE_M) || (u.Vprev !== null && V < cfg.STRUGGLE_V * u.Vprev);
}
function industryCaused(state, u) { return state.round > 1 && state.world.indMean[u.ind][state.round - 1] < state.cfg.INDUSTRY_M; }
export const turnaroundNeeded = (state, u) => u.lastTurn + 2 <= state.round && struggling(state, u) && !industryCaused(state, u);

// Signal after one deep dive, without leaving the dive on the team's record.
export function signalAfterDeep(state, id, lot) {
  const tm = state.teams[id], had = tm.deep[lot.unitId];
  tm.deep[lot.unitId] = state.round;
  const v = estimate(state, id, lot.unitId).value;
  if (!had) delete tm.deep[lot.unitId];
  return v;
}

function newDec(why) { return { bids: [], builds: [], capital: {}, actions: [], why, predicted: null }; }

// Capital request rule: pick by kind for each solo unit, in unit-id order, while cash after stays above the floor.
function capitalRule(state, id, dec, floor, pickFn) {
  let cash = state.teams[id].cash;
  for (const u of solo(state, id).sort((a, b) => (a.id < b.id ? -1 : 1))) {
    const idx = pickFn(u);
    if (idx === null || idx === undefined) continue;
    const c = requestsOf(u)[idx].cost_musd;
    if (cash - c >= floor) { dec.capital[u.id] = idx; cash -= c; }
  }
}

// Trim a decision until the cash meter accepts it: capital first, then action costs, then bids shrink or drop.
export function fitToMeter(state, id, dec) {
  const budget = () => budgetOf(state, id);
  const over = () => reservedFor(state, id, dec).total > budget() + 1e-9;
  const keys = Object.keys(dec.capital).sort().reverse();
  while (over() && keys.length) delete dec.capital[keys.pop()];
  while (over() && dec.actions.some(a => ['integrate', 'turnaround', 'devcap', 'hedge'].includes(a.type))) {
    const i = dec.actions.map(a => a.type).lastIndexOf(dec.actions.filter(a => ['integrate', 'turnaround', 'devcap', 'hedge'].includes(a.type)).slice(-1)[0].type);
    dec.actions.splice(i, 1);
  }
  while (over() && dec.builds.length) dec.builds.pop();
  if (over() && dec.bids.length) {
    const rest = reservedFor(state, id, { ...dec, bids: [] }).total;
    const room = budget() - rest;
    dec.bids = dec.bids.map(b => {
      const lot = state.lotsByKey[b.lot], fee = 1 + feeRate(state, id), sh = b.ally ? 0.5 : 1;
      if (lot.kind === 'team') return room >= lot.price * sh * fee ? b : null;
      const cap = room / (sh * fee);
      return { ...b, amount: Math.min(b.amount, cap) };
    }).filter(b => b && (state.lotsByKey[b.lot].kind === 'team' || b.amount >= 0.5 * state.lotsByKey[b.lot].catalog));
  }
  return dec;
}

function finish(state, id, dec) {
  dec.predicted = Math.round(evOf(state, id));
  return fitToMeter(state, id, dec);
}

function sigmaAgainstHeld(state, id, lot) {
  const u = unitOfLot(state, lot);
  return solo(state, id).reduce((s, h) => s + matrixSigma(u.ind, h.ind), 0);
}
function bestRatio(state, id, lots) {
  return [...lots].sort((a, b) => sig(state, id, b) / b.catalog - sig(state, id, a) / a.catalog || (a.key < b.key ? -1 : 1))[0];
}
function bidOn(state, id, lot, mult) {
  const s = sig(state, id, lot);
  return lot.kind === 'team' ? (s * mult >= lot.price ? { lot: lot.key, amount: lot.price } : null) : { lot: lot.key, amount: mult * s };
}

// ---------------- bots ----------------
function integratePairs(state, id, dec, pred, max) {
  const t = state.teams[id], hs = solo(state, id).sort((a, b) => (a.id < b.id ? -1 : 1));
  let n = 0;
  for (let i = 0; i < hs.length && n < max; i++) for (let j = i + 1; j < hs.length && n < max; j++) {
    if (!pred(hs[i], hs[j])) continue;
    if (t.projects.some(p => (p.a === hs[i].id && p.b === hs[j].id) || (p.a === hs[j].id && p.b === hs[i].id))) continue;
    dec.actions.push({ type: 'integrate', a: hs[i].id, b: hs[j].id }); n++;
  }
}
function turnaroundIfNeeded(state, id, dec) {
  for (const u of solo(state, id).sort((a, b) => (a.id < b.id ? -1 : 1))) if (turnaroundNeeded(state, u)) { dec.actions.push({ type: 'turnaround', unit: u.id }); return; }
}
function cashAvail(state, id) { return budgetOf(state, id); }

const BOTS = {
  B1(state, id) {
    const cfg = state.cfg, dec = newDec('Hype Capital chases AI platforms.'), t = state.round;
    if (t <= 5) {
      const lots = lotsOf(state), ai = lots.filter(l => unitOfLot(state, l).ind === 'ai'), rest = lots.filter(l => unitOfLot(state, l).ind !== 'ai');
      for (const l of ai) {
        const bid = Math.min(cfg.B1_AI_MULT * sig(state, id, l), cfg.BOT_MAX_BID_SHARE * l.catalog, cashAvail(state, id));
        if (bid >= cfg.BOT_MIN_BID_SHARE * l.catalog) dec.bids.push(l.kind === 'team' ? { lot: l.key, amount: l.price } : { lot: l.key, amount: bid });
      }
      const best = rest.filter(l => sig(state, id, l) / l.catalog >= 1.0).sort((a, b) => sig(state, id, b) / b.catalog - sig(state, id, a) / a.catalog)[0];
      if (best) {
        const bid = Math.min(cfg.B1_OTHER_MULT * sig(state, id, best), cfg.BOT_MAX_BID_SHARE * best.catalog, cashAvail(state, id));
        if (bid >= cfg.BOT_MIN_BID_SHARE * best.catalog) dec.bids.push(best.kind === 'team' ? { lot: best.key, amount: best.price } : { lot: best.key, amount: bid });
      }
    }
    capitalRule(state, id, dec, 60, u => (u.ind === 'ai' ? costlierIdx(u) : cheaperIdx(u)));
    integratePairs(state, id, dec, (a, b) => (a.ind === 'ai' && b.ind === 'energy') || (a.ind === 'energy' && b.ind === 'ai'), 1);
    if (!dec.actions.length) integratePairs(state, id, dec, (a, b) => a.ind === 'ai' && b.ind === 'ai', 1);
    return finish(state, id, dec);
  },
  B2(state, id) {
    const cfg = state.cfg, dec = newDec('Ledger and Sons wait with cash and buy in round 4 (round 5 if they missed).'), t = state.round;
    if (t === 4 || (t === 5 && !state.auctions.some(a => a.winners.includes(id)))) {   // waits for round 4; round 5 is its second chance if it bought nothing
      const top = [...lotsOf(state)].sort((a, b) => sig(state, id, b) / b.catalog - sig(state, id, a) / a.catalog).slice(0, 2);
      for (const l of top) {
        dec.actions.push({ type: 'deepdive', lot: l.key });
        const est = signalAfterDeep(state, id, l), bid = Math.min(cfg.B2_MULT * est, cashAvail(state, id));
        if (bid >= cfg.BOT_MIN_BID_SHARE * l.catalog) dec.bids.push(l.kind === 'team' ? { lot: l.key, amount: l.price } : { lot: l.key, amount: bid });
      }
      if (dec.bids.length === 2) { /* both bids stand; the engine keeps only one win */ }
    } else turnaroundIfNeeded(state, id, dec);
    capitalRule(state, id, dec, 100, u => (u.co === 'G2' ? cheaperIdx(u) : null));
    return finish(state, id, dec);
  },
  B3(state, id) {
    const dec = newDec('Plainsman Holdings plow cash into R4 and sell it at 120 percent.');
    const r4 = solo(state, id).find(u => u.co === 'R4');
    if (r4) {
      const hi = requestsOf(r4)[costlierIdx(r4)], lo = requestsOf(r4)[cheaperIdx(r4)], cash = state.teams[id].cash;
      if (cash - hi.cost_musd >= 50) dec.capital.R4 = costlierIdx(r4);
      else if (cash - lo.cost_musd >= 0) dec.capital.R4 = cheaperIdx(r4);
    }
    if (state.round === 3 && r4 && !state.listings.some(l => l.seller === id && l.unit === 'R4')) dec.actions.push({ type: 'divest', unit: 'R4', mode: 'list', f: 1.2 });
    else turnaroundIfNeeded(state, id, dec);
    return finish(state, id, dec);
  },
  B4(state, id) {
    const cfg = state.cfg, dec = newDec('Gemstone Roll-Up buys cannabis.'), t = state.round;
    if (t <= 5) {
      for (const l of lotsOf(state)) {
        const u = unitOfLot(state, l);
        if (u.ind === 'cannabis') {
          const bid = Math.min(cfg.B4_CANNABIS_MULT * sig(state, id, l), cfg.BOT_MAX_BID_SHARE * l.catalog, cashAvail(state, id));
          if (bid >= cfg.BOT_MIN_BID_SHARE * l.catalog) dec.bids.push(l.kind === 'team' ? { lot: l.key, amount: l.price } : { lot: l.key, amount: bid });
        } else if (u.ind === 'energy' || u.ind === 'ai') {
          const bid = Math.min(cfg.B4_OTHER_MULT * sig(state, id, l), cfg.BOT_MAX_BID_SHARE * l.catalog, cashAvail(state, id));
          if (bid >= cfg.BOT_MIN_BID_SHARE * l.catalog && bid < 0.5 * state.teams[id].cash) dec.bids.push(l.kind === 'team' ? { lot: l.key, amount: l.price } : { lot: l.key, amount: bid });
        }
      }
    }
    capitalRule(state, id, dec, 80, u => (u.ind === 'cannabis' ? cheaperIdx(u) : null));
    integratePairs(state, id, dec, (a, b) => a.ind === 'cannabis' && b.ind === 'cannabis', 2);
    if (dec.actions.length < 3) turnaroundIfNeeded(state, id, dec);
    return finish(state, id, dec);
  },
};
export function botDecide(state, id) {
  const fn = BOTS[id];
  if (fn) return fn(state, id);
  const pol = state.aiPolicy && state.aiPolicy[id];     // an unclaimed seat: played with one of the table policies
  return pol ? ARCHETYPES[pol](state, id) : newDec('idle');
}

// ---------------- archetypes (student-slot tables for the gates) ----------------
const cheaper = u => cheaperIdx(u), costlier = u => costlierIdx(u);
const sortByHeld = (state, id, lots) => [...lots].sort((a, b) => sigmaAgainstHeld(state, id, b) - sigmaAgainstHeld(state, id, a) || sig(state, id, b) / b.catalog - sig(state, id, a) / a.catalog || (a.key < b.key ? -1 : 1));
export function cheapestBuildLot(state) {
  return state.lots.filter(l => l.kind === 'auction' && !l.scarce).sort((a, b) => a.catalog - b.catalog || (a.key < b.key ? -1 : 1))[0];
}
function integrateBest(state, id, dec, nth) {
  const t = state.teams[id], hs = solo(state, id).sort((a, b) => (a.id < b.id ? -1 : 1)), pairs = [];
  for (let i = 0; i < hs.length; i++) for (let j = i + 1; j < hs.length; j++) {
    const s = matrixSigma(hs[i].ind, hs[j].ind);
    if (s > 0 && !t.projects.some(p => (p.a === hs[i].id && p.b === hs[j].id) || (p.a === hs[j].id && p.b === hs[i].id))) pairs.push([s, hs[i].id, hs[j].id]);
  }
  pairs.sort((a, b) => b[0] - a[0]);
  if (pairs[nth]) dec.actions.push({ type: 'integrate', a: pairs[nth][1], b: pairs[nth][2] });
}
// Oversight filler: leftover attention goes to Deep dives of held pairs, which count as oversight (spec 04 A.5).
// The spec's archetype text does not say what a table does with spare attention; this stops them paying an
// avoidable unfunded-oversight charge and is logged in the README.
function oversight(state, id, dec, cap = 3) {
  if (!state.cfg.ARCH_OVERSIGHT) return dec;
  const hs = solo(state, id).sort((a, b) => (a.id < b.id ? -1 : 1)), n = hs.length;
  if (n < 2) return dec;
  const have = dec.actions.filter(a => ['integrate', 'turnaround', 'devcap'].includes(a.type)).length;
  let need = Math.min(cap, Math.ceil(state.cfg.OVERSIGHT_PER_UNIT * (n - 1))) - have;   // spec 04 A.5 table: four unrelated units leave a shortfall (15 percent range)
  const used = () => dec.bids.length + dec.builds.length + dec.actions.length;
  const pairs = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pairs.push([hs[i].id, hs[j].id]);
  let k = state.round;
  while (need > 0 && used() < state.cfg.ATT_PER_ROUND) { dec.actions.push({ type: 'deepdive', pair: pairs[k++ % pairs.length] }); need--; }
  return dec;
}
function inheritedIds(state, id) { return state.teams[id].spells.filter(s => s.a === 1).map(s => s.unit); }

export const ARCHETYPES = {
  FOCUSED_TWO(state, id) {
    const cfg = state.cfg, t = state.round, dec = newDec('Stay focused on the two inherited businesses.');
    if (t === 1) {
      const lots = state.lots.filter(l => l.kind === 'auction');
      const top = sortByHeld(state, id, lots)[0];
      if (top) dec.bids.push(bidOn(state, id, top, cfg.FOCUSED_BID));
    }
    const mine = inheritedIds(state, id);
    const third = solo(state, id).find(u => !mine.includes(u.id));
    if (third && t >= 2) {
      const listed = state.listings.some(l => l.unit === third.id && l.seller === id);
      if (!listed && t <= 3) dec.actions.push({ type: 'divest', unit: third.id, mode: 'list', f: 1.0 });
      else dec.actions.push({ type: 'divest', unit: third.id, mode: 'market' });
    }
    capitalRule(state, id, dec, 100, costlier);
    if (dec.actions.length < 3) integrateBest(state, id, dec, 0);
    if (dec.actions.length < 3) { const x = solo(state, id).find(u => mine.includes(u.id) && turnaroundNeeded(state, u)); if (x) dec.actions.push({ type: 'turnaround', unit: x.id }); }
    return finish(state, id, oversight(state, id, dec));
  },
  RELATED_THREE(state, id, opts = {}) {
    const cfg = state.cfg, t = state.round, dec = newDec('Build a related three-unit portfolio and integrate it.');
    if (t === 1) {
      if (opts.build) { const l = cheapestBuildLot(state); if (l) dec.builds.push({ lot: l.key }); }
      else if (opts.ally) {
        const lead = opts.ally < id ? opts.ally : id;   // the lower seat chooses the lot, both follow
        const lot = sortByHeld(state, lead, state.lots.filter(l => l.kind === 'auction'))[0];
        const joint = estimate(state, id, lot.unitId, opts.ally).value;
        dec.bids.push({ lot: lot.key, amount: cfg.RELATED_BID * joint, ally: opts.ally });
      } else {
        const lots = state.lots.filter(l => l.kind === 'auction');
        const top = sortByHeld(state, id, lots)[0];
        if (top) {
          dec.actions.push({ type: 'deepdive', lot: top.key });
          dec.bids.push({ lot: top.key, amount: cfg.RELATED_BID * signalAfterDeep(state, id, top) });
        }
      }
    }
    if (t === 2) integrateBest(state, id, dec, 0);
    if (t === 3) { integrateBest(state, id, dec, 0); dec.actions.push({ type: 'devcap', cap: 'integrator' }); }
    capitalRule(state, id, dec, 80, cheaper);
    return finish(state, id, oversight(state, id, dec));
  },
  UNRELATED_FOUR(state, id) {
    const cfg = state.cfg, t = state.round, dec = newDec('Roll up four unrelated businesses.');
    if (t === 1) { const top = bestRatio(state, id, state.lots.filter(l => l.kind === 'auction')); if (top) dec.bids.push(bidOn(state, id, top, cfg.UNRELATED_BID)); }
    if (t === 2 || t === 3) {
      const held = solo(state, id), pool = state.lots.filter(l => l.kind === 'auction' && held.every(h => matrixSigma(unitOfLot(state, l).ind, h.ind) <= 0));
      const top = pool.length ? bestRatio(state, id, pool) : null;
      if (top) dec.bids.push(bidOn(state, id, top, cfg.UNRELATED_BID));
    }
    capitalRule(state, id, dec, 60, cheaper);
    return finish(state, id, oversight(state, id, dec, 1));
  },
  ACQUIRER_HEAVY(state, id) {
    const cfg = state.cfg, t = state.round, dec = newDec('Buy something every round.');
    if (t <= 5) {
      const lots = state.lots.filter(l => !(l.seller === id));
      const top = lots.length ? bestRatio(state, id, lots.filter(l => l.kind === 'auction' || sig(state, id, l) * cfg.ACQUIRER_BID >= l.price).length ? lots.filter(l => l.kind === 'auction' || sig(state, id, l) * cfg.ACQUIRER_BID >= l.price) : lots) : null;
      if (top) {
        const b = bidOn(state, id, top, cfg.ACQUIRER_BID);
        if (b) {
          if (t === 1 && top.kind === 'auction') {
            const partner = 'T' + ((state.teams[id].seat % state.teamCount) + 1);
            if (partner !== id && state.teams[partner]) b.ally = partner;
          }
          dec.bids.push(b);
        }
      }
    }
    capitalRule(state, id, dec, 200, cheaper);
    return finish(state, id, oversight(state, id, dec));
  },
  PASSIVE(state, id) { return finish(state, id, newDec('Keep steady.')); },
};

export const ARCHETYPE_NAMES = Object.keys(ARCHETYPES);
export { hooksReal, saOf };
