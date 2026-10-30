// The numeric model: world precompute, unit values, relatedness, signals, complexity.
// Formulas follow spec/04-bots-and-calibration.md section A. All money is in $M.

import { COMPANIES, INHERITANCE } from './data/companies.js';
const inheritedIds = new Set(INHERITANCE.flatMap(i => i.companies));
import { SYNERGY_MATRIX } from './data/synergy.js';
import { chainById } from './schedule.js';
import { hash01, keyedNormal } from './rng.js';
import { RISK_PREMIUM } from './data/premium.js';

export const CO = Object.fromEntries(COMPANIES.map(c => [c.id, c]));
export const indOf = id => CO[id.split(/[#+]/)[0]].industry.toLowerCase();
const MATRIX = {};
for (const a of Object.keys(SYNERGY_MATRIX)) {
  MATRIX[a.toLowerCase()] = {};
  for (const b of Object.keys(SYNERGY_MATRIX[a])) MATRIX[a.toLowerCase()][b.toLowerCase()] = SYNERGY_MATRIX[a][b].pct / 100;
}
export const matrixSigma = (ia, ib) => MATRIX[ia][ib];
export const pairAsset = (ia, ib) => SYNERGY_MATRIX[Object.keys(SYNERGY_MATRIX).find(k => k.toLowerCase() === ia)][Object.keys(SYNERGY_MATRIX).find(k => k.toLowerCase() === ib)].asset;
export const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

// ---------- world: shock multipliers for every company and round ----------
export function buildWorld(schedule, cfg, roster = COMPANIES) {
  const M = {}, Mc = {}, Vm = {}, phi = {}, indMean = {}, ratesUp = {};
  const inds = Object.keys(MATRIX);
  const yes = schedule.chains.filter(c => c.yes);
  for (const ind of inds) { Vm[ind] = []; indMean[ind] = []; }
  for (const co of roster) { M[co.id] = []; Mc[co.id] = []; phi[co.id] = []; }
  for (let t = 1; t <= 6; t++) {
    const tt = Math.min(t, 5);                       // round 6 valuation uses round-5 multiples
    const active = yes.filter(c => tt >= c.activeFrom && tt <= c.activeTo);
    ratesUp[t] = active.some(c => c.id === cfg.RATES_UP.chain);
    for (const ind of inds) Vm[ind][t] = active.reduce((p, c) => p * ((chainById[c.id].stage3.effects[ind] || {}).v || 1), 1);
    for (const co of roster) {
      const ind = co.industry.toLowerCase();
      let prod = 1, young = false;
      const list = [];
      for (const c of active) {
        const ch = chainById[c.id], col = cfg.CHAIN_COLUMN[c.id];
        let m;
        if (col) m = co.shock_multipliers[col];
        else {
          const e = ch.stage3.effects[ind] || {};
          m = clamp((e.d || 1) * (e.p || 1) - cfg.K_IND[ind] * ((e.c || 1) - 1), cfg.M_CLAMP[0], cfg.M_CLAMP[1]);
        }
        m = 1 + cfg.SHOCK_SCALE * (m - 1);
        if (m !== 1 && tt - c.activeFrom + 1 <= 2) young = true;
        prod *= m;
        list.push({ id: c.id, m });
      }
      Mc[co.id][t] = list;
      M[co.id][t] = clamp(prod, cfg.M_CLAMP[0], cfg.M_CLAMP[1]);
      phi[co.id][t] = young ? cfg.PHI : 0;
    }
    for (const ind of inds) {
      const cos = roster.filter(c => c.industry.toLowerCase() === ind);
      indMean[ind][t] = cos.reduce((s, c) => s + M[c.id][t], 0) / cos.length;
    }
  }
  return { M, Mc, Vm, phi, indMean, ratesUp };
}

// ---------- units ----------
export function trueTheta(seed, co, cfg, inheritedSet = inheritedIds) {
  const z = keyedNormal(seed, 'theta', co.id), inh = inheritedSet.has(co.id) ? cfg.INHERIT_LN_SCALE : 1;
  const shrink = th => (inh === 1 ? th : Math.exp(inh * Math.log(th)));
  if (co.id === 'E3') return shrink(hash01(seed, 'theta_e3', co.id) < cfg.E3_P_LOW ? cfg.E3_LOW : cfg.E3_HIGH);
  if (cfg.THETA_FIXED[co.id] !== undefined) {
    let th = cfg.THETA_FIXED[co.id] * Math.exp(cfg.THETA_FIXED_SD * z);
    const ln = Math.log(th), floor = cfg.THETA_FIXED_MIN_LN || 0;       // keep flagged lots at least this far from 1.0
    if (Math.abs(ln) < floor) th = Math.exp(Math.sign(ln) * (floor + 1e-9));
    return shrink(th);
  }
  return shrink(clamp(Math.exp(cfg.S_CLASS[co.growth] * z), cfg.THETA_CLAMP[0], cfg.THETA_CLAMP[1]));
}

// Growth drift per round. 'class' is the spec (steady 3%, cyclical 2%, lottery 2%). 'equalize' makes yield plus growth
// roughly the same for every company, so a 6 percent yielder does not beat a 1 percent yielder by construction.
export function growthOf(cfg, y, cls) {
  if (cfg.GROWTH_MODE === 'class') return cfg.GROWTH[cls];
  return Math.min(cfg.GROWTH_MAX, Math.max(cfg.GROWTH_MIN, cfg.TOTAL_RETURN - y));
}
export const premiumOf = (cfg, coId) => (cfg.PREMIUM_ON ? (RISK_PREMIUM[coId.replace(/[a-z]+$/, '')] || 0) * cfg.PREMIUM_SCALE : 0);
export function makeUnit(cfg, id, co, B, extra = {}) {
  return {
    id, co: co.id, ind: co.industry.toLowerCase(), y: co.cash_yield_pct / 100, growthClass: co.growth, g: growthOf(cfg, co.cash_yield_pct / 100, co.growth) + premiumOf(cfg, co.id),
    B, s: 1, Z: 0, Zb: 0, owners: [], ins: null, nGrowth: 0, lastTurn: -9, Vprev: null, scarce: !!co.scarce,
    built: false, hedges: [], ...extra,
  };
}

export const holders = u => u.owners;
export const vmIdx = state => state.vmIdx;
export const saOf = (state, u) => u.B * u.s * state.world.Vm[u.ind][state.vmIdx];
export const valueOf = (state, u) => Math.max(0, saOf(state, u) + u.Z);

// ---------- relatedness ----------
export function hooksReal(cfg, coA, coB) {
  const a = CO[coA].relatedness_hooks, b = CO[coB].relatedness_hooks;
  for (const k of Object.keys(a)) if (b[k] !== undefined && Math.min(a[k], b[k]) >= cfg.RELATED_HOOK_MIN) return true;
  return false;
}
export const isRanchGrocery = (ia, ib) => (ia === 'ranching' && ib === 'grocery') || (ia === 'grocery' && ib === 'ranching');

// What a pair can earn. sigma is the effective synergy rate; real says the shared asset exists.
export function pairEffect(cfg, uA, uB, integrated) {
  const s0 = MATRIX[uA.ind][uB.ind], cap = cfg.SIGMA_CAP;
  if (s0 < 0) return { sigma: Math.max(s0, -cap), active: true, real: true };
  if (isRanchGrocery(uA.ind, uB.ind)) return { sigma: integrated ? Math.min(cap, cfg.RANCH_GROCERY_SIGMA) : 0, active: integrated, real: true };
  const real = s0 > 0 && hooksReal(cfg, uA.co, uB.co);
  return { sigma: real && integrated ? Math.min(cap, s0) : 0, active: real && integrated, real };
}
// Pair counted as "related" for complexity (04 A.5): positive synergy and a hook of strength 2 or more on both.
export function relatedPair(cfg, uA, uB) {
  return MATRIX[uA.ind][uB.ind] > 0 && hooksReal(cfg, uA.co, uB.co);
}

// ---------- complexity ----------
export function kappa(cfg, n, u, s) {
  const k = cfg.KAPPA_A * Math.max(0, n - 2) + cfg.KAPPA_B * u * Math.min(1, (n - 1) / 3) + cfg.KAPPA_C * s;
  return Math.min(k, cfg.KAPPA_CAP);
}

// ---------- signals (04 section C) ----------
export function sigmaFor(state, teamId) { return state.teams[teamId].isBot ? state.cfg.BOT_SIGMA : state.cfg.SIGMA_SIGNAL; }

function lnEpsPrior(state, teamId, unitId) {
  const sg = sigmaFor(state, teamId) * (state.teams[teamId].capabilities.acquirer ? state.cfg.ACQ_SIGMA_MULT : 1);   // Acquirer: estimates twice as tight
  return { ln: -sg * sg / 2 + sg * keyedNormal(state.seed, 'signal', teamId, unitId), sd: sg };
}
// Team's effective log-error for a unit after any deep dive (precision weighted).
export function lnEpsTeam(state, teamId, unitId) {
  const t = state.teams[teamId], p = lnEpsPrior(state, teamId, unitId);
  if (!t.deep[unitId]) return p;
  const sd = state.cfg.SIGMA_DEEP;
  const dl = -sd * sd / 2 + sd * keyedNormal(state.seed, 'deepdive', teamId, unitId);
  const wp = (1 / (p.sd * p.sd)) / ((1 / (p.sd * p.sd)) + (1 / (sd * sd)));
  const comb = 1 / Math.sqrt(1 / (p.sd * p.sd) + 1 / (sd * sd));
  return { ln: wp * p.ln + (1 - wp) * dl, sd: comb };
}
// Joint signal for a co-bid: average of the two logs, sd divided by root 2.
export function lnEpsJoint(state, a, b, unitId) {
  const x = lnEpsTeam(state, a, unitId), y = lnEpsTeam(state, b, unitId);
  return { ln: 0.5 * (x.ln + y.ln), sd: Math.sqrt(x.sd * x.sd + y.sd * y.sd) / 2 };
}
export function estimate(state, teamId, unitId, partnerId = null) {
  const u = state.units[unitId];
  const e = partnerId ? lnEpsJoint(state, teamId, partnerId, unitId) : lnEpsTeam(state, teamId, unitId);
  return { value: saOf(state, u) * Math.exp(e.ln), sd: e.sd };
}

// ---------- merged companies (batch 2) ----------
// Two same-industry units become one unit whose company record is built here. The record depends only on the two parts, so it is the same in every game
// (like the sister companies in roster.js). Its shocks are the value-weighted blend of the two parts, registered per game in state.world.
export const isMerged = u => !!(u && u.parts);
export function mergedCompany(id, cA, cB, requestsA, requestsB) {
  if (CO[id]) return CO[id];
  const avg = (x, y) => (x + y) / 2, mul = {};
  for (const k of Object.keys(cA.shock_multipliers)) mul[k] = avg(cA.shock_multipliers[k], cB.shock_multipliers[k]);
  const hooks = { ...cA.relatedness_hooks };
  for (const [k, v] of Object.entries(cB.relatedness_hooks)) hooks[k] = Math.max(hooks[k] || 0, v);
  const reqs = requestsA.map((r, i) => {
    const o = requestsB.find(x => x.kind === r.kind) || requestsB[i];
    return { ...r, name: r.name + ' (both businesses)', cost_musd: r.cost_musd + o.cost_musd };
  });
  CO[id] = {
    id, name: cA.name + ' + ' + cB.name, industry: cA.industry, hook: cA.hook, value_musd: cA.value_musd + cB.value_musd,
    cash_yield_pct: avg(cA.cash_yield_pct, cB.cash_yield_pct), growth: cA.growth, capital_requests: reqs, shock_multipliers: mul, relatedness_hooks: hooks,
    auction_note: { verdict: 'fair', listing_claims: 'Two ' + cA.industry.toLowerCase() + ' businesses run as one company.', truth: 'Worth the sum of its parts plus a small scale bonus.' },
    scarce: false, start_home: 'merged', source_flavor: '', merged: true,
  };
  return CO[id];
}
// Blend the two parts' shock series into one series for the merged company, for every round, in this game's world.
export function registerMergedWorld(state, id, uA, uB, wA) {
  const w = state.world, wB = 1 - wA;
  w.M[id] = []; w.Mc[id] = []; w.phi[id] = [];
  for (let t = 1; t <= 6; t++) {
    w.M[id][t] = clamp(wA * w.M[uA.co][t] + wB * w.M[uB.co][t], state.cfg.M_CLAMP[0], state.cfg.M_CLAMP[1]);
    w.phi[id][t] = Math.max(w.phi[uA.co][t], w.phi[uB.co][t]);
    const byId = {};
    for (const c of w.Mc[uA.co][t]) byId[c.id] = { id: c.id, a: c.m, b: 1 };
    for (const c of w.Mc[uB.co][t]) (byId[c.id] = byId[c.id] || { id: c.id, a: 1, b: 1 }).b = c.m;
    w.Mc[id][t] = Object.values(byId).map(c => ({ id: c.id, m: wA * c.a + wB * c.b }));
  }
}

// ---------- capital requests ----------
export function requestsOf(unit) { return CO[unit.co].capital_requests; }
export function cheaperIdx(unit) { const r = requestsOf(unit); return r[0].cost_musd <= r[1].cost_musd ? 0 : 1; }
export function costlierIdx(unit) { return 1 - cheaperIdx(unit); }
export function rhoFor(cfg, kind, nGrowth, operator) {
  if (kind === 'growth') return cfg.RHO_GROWTH * Math.pow(cfg.RHO_DECAY, nGrowth) + (operator ? cfg.OPERATOR_RHO_MULT * cfg.RHO_GROWTH * Math.pow(cfg.RHO_DECAY, nGrowth) : 0);
  return kind === 'defend' ? cfg.RHO_DEFEND : cfg.RHO_LOCK;
}
export function applyInsurance(ins, t, m) {
  if (!ins || t < ins.from || t > ins.until) return m;
  if (ins.kind === 'defend') return m >= 1 ? m : 1 - 0.5 * (1 - m);
  if (ins.kind === 'lock') return 1 + 0.5 * (m - 1);
  return m;
}
export function defendM(m, block = 0.5) { return m >= 1 ? m : 1 - block * (1 - m); }

// ---------- holdings and the bid meter ----------
export function heldUnits(state, teamId) {
  const out = [];
  for (const id of state.unitIds) {
    const u = state.units[id];
    for (const o of u.owners) if (o.team === teamId) out.push({ u, w: o.w });
  }
  return out;
}
export const lineCap = state => (state.world.ratesUp[Math.min(state.round || 1, 5)] ? state.cfg.RATES_UP.LINE : state.cfg.LINE);
// Round 5 (batch 2): every team may borrow against its biggest business, up to BORROW_SHARE of that business's value on top of the normal line, at the normal rate.
export function borrowExtra(state, teamId) {
  if (state.round !== state.cfg.BORROW_ROUND) return 0;
  let best = 0;
  for (const { u, w } of heldUnits(state, teamId)) best = Math.max(best, w * valueOf(state, u));
  return state.cfg.BORROW_SHARE * best;
}
export const lineCapFor = (state, teamId) => lineCap(state) + borrowExtra(state, teamId);
export const lineAvail = (state, team) => Math.max(0, lineCapFor(state, team.id) - team.drawn);
export const budgetOf = (state, teamId) => { const t = state.teams[teamId]; return t.cash + lineAvail(state, t); };
export const feeRate = (state, teamId) => (state.teams[teamId].capabilities.acquirer ? 0 : state.cfg.DEAL_FEE);

export function integrateCost(state, teamId, uA, uB) {
  const cfg = state.cfg;
  const base = Math.max(cfg.INT_COST_MIN, cfg.INT_COST_PCT * (saOf(state, uA) + saOf(state, uB)));
  return { base, actual: state.teams[teamId].capabilities.integrator ? base * (1 - cfg.INT_COST_SAVE) : base };
}
export function turnCost(state, teamId, u) {
  const cfg = state.cfg, op = state.teams[teamId].capabilities.operator;
  const base = Math.max(cfg.TURN_COST_MIN, cfg.TURN_COST_PCT * saOf(state, u));
  return { base, actual: op ? Math.max(cfg.TURN_COST_MIN, cfg.TURN_COST_PCT_OP * saOf(state, u)) : base };
}
// Skills (rules change 2026-10-29). A team that holds a skill gets its effect; every effect also writes an event line (core.js skillNote).
export const hasSkill = (state, teamId, cap) => !!state.teams[teamId].capabilities[cap];
export const buildTerms = (state, teamId) => (hasSkill(state, teamId, 'builder')
  ? { delay: state.cfg.BUILDER_DELAY, strength: state.cfg.BUILDER_STRENGTH }
  : { delay: state.cfg.BUILD_DELAY, strength: state.cfg.BUILD_STRENGTH });
export const saleShare = (state, teamId) => (hasSkill(state, teamId, 'portfolio') ? state.cfg.PORTFOLIO_SALE : state.cfg.SALE_MARKET);
export const hedgeBase = (chainId, sa) => Math.max(1, hedgePct(chainId) * sa);
export const hedgeCost = (state, teamId, chainId, sa) => hedgeBase(chainId, sa) * (hasSkill(state, teamId, 'risk') ? state.cfg.RISK_COST_MULT : 1);
export function hedgePct(chainId) {
  const m = /([\d.]+)% of/.exec(chainById[chainId].stage2.actions[0].cost);
  return m ? parseFloat(m[1]) / 100 : 0.03;
}
export function buildCostOf(state, teamId, unitId) {
  const cfg = state.cfg, cat = CO[state.units[unitId].co].value_musd;
  return { base: cfg.BUILD_COST * cat, actual: cfg.BUILD_COST * cat };
}
export function actionCash(state, teamId, a) {
  const cfg = state.cfg;
  switch (a.type) {
    case 'integrate': return integrateCost(state, teamId, state.units[a.a], state.units[a.b]).actual;
    case 'turnaround': return turnCost(state, teamId, state.units[a.unit]).actual;
    case 'devcap': return cfg.DEVCAP_COST;
    case 'merge': return cfg.MERGE_COST_PCT * (saOf(state, state.units[a.a]) + saOf(state, state.units[a.b]));
    case 'hedge': return hedgeCost(state, teamId, a.chain, saOf(state, state.units[a.unit]));
    default: return 0;
  }
}
// Cash the meter holds back at lock-in: highest single bid (own share) plus capital, builds and action costs.
export function reservedFor(state, teamId, dec) {
  let maxBid = 0, rest = 0;
  for (const b of dec.bids || []) {
    const lot = state.lotsByKey[b.lot];
    if (!lot) continue;
    const amt = lot.kind === 'team' ? lot.price : b.amount;
    const one = amt * (b.ally ? 0.5 : 1) * (1 + feeRate(state, teamId));
    // liveAuction (2026-10-09, default off): every won lot is paid, so the meter sums bids instead of taking the largest
    maxBid = state.opts && state.opts.liveAuction ? maxBid + one : Math.max(maxBid, one);
  }
  for (const b of dec.builds || []) rest += buildCostOf(state, teamId, state.lotsByKey[b.lot].unitId).actual;
  for (const [uid, idx] of Object.entries(dec.capital || {})) {
    if (idx === null || idx === undefined) continue;
    const u = state.units[uid], me = u && u.owners.find(o => o.team === teamId);
    if (u && me) rest += requestsOf(u)[idx].cost_musd * me.w;
  }
  for (const a of dec.actions || []) rest += actionCash(state, teamId, a);
  const obl = state.opts && state.opts.liveAuction ? obligations(state, teamId, dec) : { cc: 0, fin: 0, total: 0 };
  return { maxBid, rest, obl: obl.total, total: maxBid + rest + obl.total };
}

// What the team must pay at the end of the round whatever it does: the complexity cost of the portfolio it will hold (the
// worst case, counting only paid actions as oversight) plus interest on the credit line and any recovery loan. Earnings are not
// counted, so this is a safe upper bound. liveAuction only: the market and the lock refuse any plan that leaves cash plus
// credit line short of the payments plus this, so a team is never forced to sell a business it just bought.
export function obligations(state, teamId, dec = {}) {
  const cfg = state.cfg, t = state.teams[teamId], round = state.round;
  const units = new Map();
  for (const { u, w } of heldUnits(state, teamId)) units.set(u.id, { u, w, v: w * valueOf(state, u) });
  for (const b of dec.bids || []) {
    const lot = state.lotsByKey[b.lot]; if (!lot) continue;
    const w = b.ally ? 0.5 : 1, u = state.units[lot.unitId], cur = units.get(u.id);
    units.set(u.id, { u, w: (cur ? cur.w : 0) + w, v: (cur ? cur.v : 0) + w * lot.catalog });
  }
  const list = [...units.values()], n = list.reduce((s, x) => s + x.w, 0), sumV = list.reduce((s, x) => s + x.v, 0);
  let cc = 0;
  if (n > 0) {
    let pairs = 0, unrel = 0;
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) { pairs++; if (!relatedPair(cfg, list[i].u, list[j].u)) unrel++; }
    const paid = (dec.actions || []).filter(a => ['integrate', 'turnaround', 'devcap', 'hedge'].includes(a.type)).length;
    const s = Math.min(3, Math.max(0, cfg.OVERSIGHT_PER_UNIT * (n - 1) - paid));
    cc = kappa(cfg, n, pairs ? unrel / pairs : 0, s) * sumV;
  }
  const up = state.world.ratesUp[round], lr = up ? cfg.RATES_UP.LINE_RATE : cfg.LINE_RATE, ir = up ? cfg.RATES_UP.IDLE_RATE : cfg.IDLE_RATE;
  const fin = lr * t.drawn + cfg.REC_RATE * t.recLoan + ir * Math.max(0, t.cash);
  return { cc, fin, total: cc + fin };
}
