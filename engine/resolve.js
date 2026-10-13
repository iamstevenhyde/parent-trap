// resolveRound: bots decide, auctions clear, actions apply, shocks land, cash and values update.
// Order follows spec/04 A.2. Every change in enterprise value is posted to exactly one score term
// (T1 inherited, T2 allocation, T3 M&A, T4 synergy, T5 capability, T6 complexity, T7 wasted, T8 financing).

import {
  CO, saOf, valueOf, heldUnits, pairEffect, relatedPair, kappa, budgetOf, feeRate, requestsOf, rhoFor, applyInsurance,
  defendM, makeUnit, integrateCost, turnCost, buildCostOf, hedgePct, matrixSigma, pairAsset, clamp, lineCap,
} from './model.js';
import { chainById } from './schedule.js';
import { keyedNormal } from './rng.js';
import { emit, post, money, openSpell, openSpellOf, closeSpell, evOf, normalizeDecision, useCap } from './core.js';
import { applyDeepDivesFor, botDecide } from './bots.js';

const allTeams = state => [...state.teamIds, ...state.botIds];

function addFlow(state, teamId, unitId, key, amt) {
  const sp = openSpellOf(state, teamId, unitId);
  if (!sp) return;
  const f = sp.flows[state.round] || (sp.flows[state.round] = { E: 0, C: 0, act: 0, V: 0, s: 1 });
  f[key] += amt;
}

// ---------- step 2: auctions and listings ----------
function clearAuctions(state, ctx) {
  const t = state.round, cfg = state.cfg, decs = state.decisions[t];
  const raw = {};
  for (const id of allTeams(state)) for (const b of decs[id].bids) if (state.lotsByKey[b.lot]) (raw[b.lot] = raw[b.lot] || []).push({ ...b, team: id, lockSeq: decs[id].lockSeq });
  const lots = state.lots.filter(l => raw[l.key]).map(l => {
    const entries = [], used = new Set();
    for (const r of raw[l.key]) {
      if (used.has(r.team)) continue;
      const partner = r.ally ? raw[l.key].find(x => x.team === r.ally && x.ally === r.team) : null;
      const amt = l.kind === 'team' ? l.price : r.amount;
      if (partner) {
        used.add(r.team); used.add(partner.team);
        entries.push({ teams: [r.team, partner.team].sort(), amount: l.kind === 'team' ? l.price : (r.amount + partner.amount) / 2, lockSeq: Math.min(r.lockSeq, partner.lockSeq) });
      } else {
        used.add(r.team);
        entries.push({ teams: [r.team], amount: amt, lockSeq: r.lockSeq, unmatchedAlly: !!r.ally });
      }
    }
    entries.sort((a, b) => b.amount - a.amount || a.lockSeq - b.lockSeq || (a.teams[0] < b.teams[0] ? -1 : 1));
    return { lot: l, entries, n: raw[l.key].length };
  }).sort((a, b) => b.entries[0].amount - a.entries[0].amount || (a.lot.key < b.lot.key ? -1 : 1));
  const committed = {}, wins = {};
  for (const { lot, entries, n } of lots) {
    const u = state.units[lot.unitId], trueNow = saOf(state, u);
    let winner = null;
    for (const e of entries) {
      const share = 1 / e.teams.length;
      const ok = e.teams.every(id => {
        const tm = state.teams[id];
        if (tm.isBot && (wins[id] || 0) >= (state.opts.liveAuction && cfg.AI_FLOOR ? cfg.BOT_MAX_WINS_LIVE : 1)) return false;   // live market: an AI seat may win a few lots (it is the price floor)
        if (lot.kind === 'team' && id === lot.seller) return false;
        // liveAuction (default off): cash is already reduced after each win, so subtracting `committed` again counted every earlier win twice
        return e.amount * share * (1 + feeRate(state, id)) <= budgetOf(state, id) - (state.opts.liveAuction ? 0 : (committed[id] || 0)) + 1e-9;
      });
      if (ok) { winner = e; break; }
    }
    const rec = { round: t, lot: lot.key, unit: lot.unitId, kind: lot.kind, bidders: n, trueValue: trueNow, catalog: lot.catalog, price: null, winners: [], bids: entries.map(e => ({ teams: e.teams, amount: e.amount })) };
    state.auctions.push(rec);
    if (!winner) continue;
    rec.price = winner.amount; rec.winners = winner.teams;
    const owners = [];
    for (const id of winner.teams) {
      const w = 1 / winner.teams.length, pay = winner.amount * w, tm = state.teams[id];
      const feeBase = cfg.DEAL_FEE * pay, feeAct = feeRate(state, id) * pay;
      tm.cash -= pay + feeAct; committed[id] = (committed[id] || 0) + pay + feeAct;
      post(state, id, 'T3', -(pay + feeBase)); post(state, id, 'T5', feeBase - feeAct);
      wins[id] = (wins[id] || 0) + 1; ctx.winners.add(id);
      owners.push({ team: id, w });
      const co = CO[u.co].name, paid = winner.amount;
      emit(state, { type: 'auction_won', team: id, unit: u.id, price: paid, paidShare: pay, trueValue: trueNow, text: 'You won ' + co + '. You paid ' + money(pay) + (winner.teams.length > 1 ? ' as your half of the joint bid' : '') + '. Its real value under your ownership is ' + money(trueNow * w) + '.' });
      if (paid > trueNow) emit(state, { type: 'winners_curse', team: id, unit: u.id, price: paid, trueValue: trueNow, text: 'Winner\'s curse: you overpaid. You paid ' + money(paid) + ' for ' + co + '. After the reveal, it is worth ' + money(trueNow) + '. You lost ' + money(paid - trueNow) + ' on this deal. The team with the highest guess usually wins, and the highest guess is usually too high.' });
      else emit(state, { type: 'good_buy', team: id, unit: u.id, price: paid, trueValue: trueNow, text: 'Good buy. You paid ' + money(paid) + ' for something worth ' + money(trueNow) + '.' });
      if (paid <= trueNow * 1.0001) useCap(state, id, 'acquirer');
    }
    if (winner.unmatchedAlly) emit(state, { type: 'ally_unmatched', team: winner.teams[0], text: 'Your partner did not match the co-bid, so it went in as your own bid.' });
    if (lot.kind === 'team') {
      const sellerId = lot.seller, sa = saOf(state, u);
      state.teams[sellerId].cash += winner.amount;
      post(state, sellerId, 'T3', winner.amount - sa); post(state, sellerId, 'T4', -u.Z);
      closeSpell(state, sellerId, u, t - 1, { type: 'sold', proceeds: winner.amount });
      dropProjects(state, sellerId, u.id);
      u.owners = []; ctx.removed.add(u.id);
      emit(state, { type: 'unit_acquired_by_team', team: sellerId, buyer: winner.teams.join('+'), unit: u.id, price: winner.amount, text: winner.teams.join(' and ') + ' bought ' + CO[u.co].name + ' from your listing for ' + money(winner.amount) + '.' });
    }
    ctx.joins.push({ unit: u, owners, rec });
    for (const e of entries) if (e !== winner) for (const id of e.teams) if (!state.teams[id].isBot) {
      emit(state, { type: 'auction_lost', team: id, unit: u.id, bid: e.amount, price: winner.amount, text: 'You did not win ' + CO[u.co].name + '. Your ' + money(e.amount) + ' bid is released. The winner paid ' + money(winner.amount) + '.' });
    }
  }
  // Teams that bid and won nothing get one lost-bid card per lot already above. Unsold lots stay in the pool.
}

function dropProjects(state, teamId, unitId) {
  const t = state.teams[teamId];
  t.projects = t.projects.filter(p => p.a !== unitId && p.b !== unitId);
}

// Round 1: a table with no win and no build order gets an automatic build on the cheapest non-scarce lot.
function autoBuild(state, ctx) {
  if (state.round !== 1) return;
  const cands = state.lots.filter(l => l.kind === 'auction' && !l.scarce).sort((a, b) => a.catalog - b.catalog || (a.key < b.key ? -1 : 1));
  if (!cands.length) return;
  for (const id of state.teamIds) {
    const d = state.decisions[1][id];
    if (ctx.winners.has(id) || (state.openingWinners || []).includes(id) || d.builds.length || (state.opts.skipMandate || []).includes(id)) continue;
    // cheapest non-scarce lot, preferring one that does not clash with what the team already holds (spec 14.5 says cheapest)
    const held = heldUnits(state, id).filter(h => h.w === 1).map(h => h.u);
    const pick = cands.find(l => held.every(h => matrixSigma(state.units[l.unitId].ind, h.ind) >= 0)) || cands[0];
    d.builds.push({ lot: pick.key, auto: true });
    emit(state, { type: 'auto_build', team: id, unit: pick.unitId, text: 'You won no company in round 1, so we ordered a build of ' + CO[state.units[pick.unitId].co].name + ' for you. It arrives in round ' + (1 + state.cfg.BUILD_DELAY) + ' at ' + Math.round(state.cfg.BUILD_STRENGTH * 100) + ' percent strength.' });
  }
}

// ---------- step 3: corporate actions ----------
function applyActions(state, ctx) {
  const t = state.round, cfg = state.cfg;
  for (const id of allTeams(state)) {
    const tm = state.teams[id], d = state.decisions[t][id];
    ctx.W[id] = 0;
    for (const a of d.actions) {
      const u = a.unit ? state.units[a.unit] : null;
      if (a.type === 'divest') {
        if (!u || !u.owners.length || ctx.removed.has(u.id) || !u.owners.some(o => o.team === id && o.w === 1)) continue;
        const sa = saOf(state, u);
        if (a.mode === 'list') {
          const price = a.f * sa;
          state.listings.push({ unit: u.id, seller: id, f: a.f, sa, price, created: t, visible: t + 1 });
          emit(state, { type: 'listing_posted', team: id, unit: u.id, price, text: 'You listed ' + CO[u.co].name + ' for ' + money(price) + ' (' + Math.round(a.f * 100) + ' percent of its stand-alone value). It shows to other tables next round.' });
        } else {
          const proceeds = cfg.SALE_MARKET * sa;
          tm.cash += proceeds; post(state, id, 'T3', proceeds - sa); post(state, id, 'T4', -u.Z);
          closeSpell(state, id, u, t - 1, { type: 'sold', proceeds });
          dropProjects(state, id, u.id);
          u.owners = []; ctx.removed.add(u.id);
          emit(state, { type: 'divest_market', team: id, unit: u.id, proceeds, text: 'You sold ' + CO[u.co].name + ' to the market for ' + money(proceeds) + ', which is 85 percent of its value on its own (' + money(sa) + ').' });
        }
      }
    }
    for (const b of d.builds) {
      const lot = state.lotsByKey[b.lot];
      if (!lot) continue;
      const c = buildCostOf(state, id, lot.unitId);
      tm.cash -= c.actual;
      tm.cip.push({ co: state.units[lot.unitId].co, cost: c.actual, costBase: c.base, order: t, completeAfter: t + cfg.BUILD_DELAY - 1 });
      emit(state, { type: 'build_ordered', team: id, unit: lot.unitId, cost: c.actual, text: 'You ordered a new ' + CO[state.units[lot.unitId].co].name + ' for ' + money(c.actual) + '. It arrives in round ' + (t + cfg.BUILD_DELAY) + ' at ' + Math.round(cfg.BUILD_STRENGTH * 100) + ' percent strength.' });
    }
    for (const a of d.actions) {
      if (a.type === 'integrate') {
        const A = state.units[a.a], B = state.units[a.b];
        if (!A.owners.some(o => o.team === id) || !B.owners.some(o => o.team === id)) continue;
        const c = integrateCost(state, id, A, B), pays = pairEffect(cfg, A, B, true).active;
        tm.cash -= c.actual; ctx.W[id]++;
        tm.projects.push({ a: A.id, b: B.id, start: t, pays });
        addFlow(state, id, A.id, 'act', c.actual / 2); addFlow(state, id, B.id, 'act', c.actual / 2);
        if (pays) { post(state, id, 'T4', -c.base); post(state, id, 'T5', c.base - c.actual); useCap(state, id, 'integrator'); }
        else {
          post(state, id, 'T7', -c.actual);
          emit(state, { type: 'synergy_not_earned', team: id, units: [A.id, B.id], cost: c.actual, text: 'You ran an Integrate project on ' + CO[A.co].name + ' and ' + CO[B.co].name + ', but they do not really share anything. Nothing was gained. Use a Deep dive next time to check.' });
        }
      } else if (a.type === 'turnaround') {
        const u = state.units[a.unit];
        if (!u.owners.some(o => o.team === id && o.w === 1) || ctx.removed.has(u.id)) continue;
        const c = turnCost(state, id, u), V = valueOf(state, u);
        const struggling = (t > 1 && state.world.M[u.co][t - 1] < cfg.STRUGGLE_M) || (u.Vprev !== null && V < cfg.STRUGGLE_V * u.Vprev);
        const industryCaused = t > 1 && state.world.indMean[u.ind][t - 1] < cfg.INDUSTRY_M;
        const ok = struggling && !industryCaused, op = tm.capabilities.operator;
        tm.cash -= c.actual; ctx.W[id]++; u.lastTurn = t;
        addFlow(state, id, u.id, 'act', c.actual);
        if (ok) {
          const base = cfg.TURN_GAIN * V, gain = (op ? cfg.TURN_GAIN_OP : cfg.TURN_GAIN) * V;
          u.tn = { gain, base };
          post(state, id, 'T2', -c.base); post(state, id, 'T5', c.base - c.actual);
          useCap(state, id, 'operator');
        } else post(state, id, 'T7', -c.actual);
        emit(state, { type: ok ? 'turnaround_worked' : 'turnaround_failed', team: id, unit: u.id, cost: c.actual, text: ok ? 'Turnaround at ' + CO[u.co].name + ' worked. Its problem was the firm, not the industry. Value rises next round.' : 'Turnaround at ' + CO[u.co].name + ' did nothing because ' + (struggling ? 'the whole industry is hurting' : 'the unit was not struggling') + '. The ' + money(c.actual) + ' is gone.' });
      } else if (a.type === 'devcap') {
        tm.cash -= cfg.DEVCAP_COST; tm.devSpend[a.cap] += cfg.DEVCAP_COST; ctx.W[id]++;
        post(state, id, 'T5', -cfg.DEVCAP_COST);
        tm.hist[t] = tm.hist[t] || { cc: 0, fin: 0, act: 0, sumV: 0 };
        tm.hist[t].act += cfg.DEVCAP_COST;
        useCap(state, id, a.cap);
      } else if (a.type === 'deepdive') {
        useCap(state, id, 'analyst');
        if (a.pair) ctx.W[id]++;
        emit(state, { type: 'deep_dive', team: id, text: a.lot ? 'Deep dive on ' + CO[state.units[state.lotsByKey[a.lot].unitId].co].name + ': your estimate is tighter now.' : 'Deep dive on your pair: ' + (state.teams[id].known[[...a.pair].sort().join('+')].related ? 'they really share an asset.' : 'they do not really share anything.') });
      } else if (a.type === 'hedge') {
        const u = state.units[a.unit];
        if (!u.owners.some(o => o.team === id)) continue;
        const cost = Math.max(1, hedgePct(a.chain) * saOf(state, u)), c = state.schedule.chains.find(x => x.id === a.chain);
        tm.cash -= cost; ctx.W[id]++; u.hedges.push(a.chain); addFlow(state, id, u.id, 'act', cost);
        post(state, id, c.yes ? 'T2' : 'T7', -cost);
        emit(state, { type: 'hedge_bought', team: id, unit: u.id, chain: a.chain, cost, text: 'You paid ' + money(cost) + ' to protect ' + CO[u.co].name + ' against ' + chainById[a.chain].name.toLowerCase() + '.' });
      }
    }
  }
}

// ---------- step 4: capital requests ----------
function applyCapital(state, ctx) {
  const t = state.round, cfg = state.cfg;
  for (const id of state.unitIds) {
    const u = state.units[id];
    if (!u.owners.length || ctx.removed.has(id)) continue;
    let idx = null;
    if (u.owners.length === 1) idx = state.decisions[t][u.owners[0].team].capital[id];
    else {
      const picks = u.owners.map(o => state.decisions[t][o.team].capital[id]);
      if (picks.every(p => p !== null && p !== undefined && p === picks[0])) idx = picks[0];
    }
    if (idx === null || idx === undefined) continue;
    const req = requestsOf(u)[idx], C = req.cost_musd;
    const op = u.owners.length === 1 && state.teams[u.owners[0].team].capabilities.operator;
    const rhoBase = rhoFor(cfg, req.kind, u.nGrowth, false), rho = rhoFor(cfg, req.kind, u.nGrowth, op);
    u.cap = { C, kind: req.kind, K: rho * C, Kbase: rhoBase * C };
    if (req.kind === 'growth') u.nGrowth++; else u.ins = { kind: req.kind, from: t + 1, until: t + 2 };
    for (const o of u.owners) {
      state.teams[o.team].cash -= C * o.w; post(state, o.team, 'T2', -C * o.w);
      addFlow(state, o.team, id, 'C', C * o.w);
    }
  }
}

// ---------- steps 5 to 7: earnings, synergy, complexity, financing ----------
function hedgedM(state, u, t) {
  const list = state.world.Mc[u.co][t];
  if (!u.hedges.length) return state.world.M[u.co][t];
  return clamp(list.reduce((p, c) => p * (u.hedges.includes(c.id) ? defendM(c.m) : c.m), 1), state.cfg.M_CLAMP[0], state.cfg.M_CLAMP[1]);
}

function earnings(state, ctx) {
  const t = state.round, cfg = state.cfg, vmT = state.world.Vm;
  for (const id of state.unitIds) {
    const u = state.units[id];
    u.calc = null;
    if (!u.owners.length) continue;
    const M = state.world.M[u.co][t], Mp = applyInsurance(u.ins, t, hedgedM(state, u, t));
    const sa = u.B * u.s * vmT[u.ind][t];
    u.calc = { M, Mp, sa, E0: u.y * sa * Mp, E0raw: u.y * sa * M, V: valueOf(state, u), esyn: 0, esynb: 0 };
    u.calc.base = cfg.SYN_BASIS === 'value' ? cfg.SYN_YIELD * sa * Mp : u.calc.E0;   // what a pair's synergy rate applies to
  }
  for (const id of allTeams(state)) {
    const tm = state.teams[id], held = heldUnits(state, id), openCash = tm.cash;
    tm.hist[t] = tm.hist[t] || { cc: 0, fin: 0, act: 0, sumV: 0 };
    let sumV = 0;
    for (const { u, w } of held) {
      sumV += w * u.calc.V;
      tm.cash += w * u.calc.E0;
      post(state, id, 'T1', w * u.calc.E0raw); post(state, id, 'T2', w * (u.calc.E0 - u.calc.E0raw));
    }
    const solo = held.filter(h => h.w === 1).map(h => h.u);
    for (let i = 0; i < solo.length; i++) for (let j = i + 1; j < solo.length; j++) {
      const A = solo[i], B = solo[j];
      const proj = tm.projects.find(p => (p.a === A.id && p.b === B.id) || (p.a === B.id && p.b === A.id));
      const integrated = !!proj && proj.start < t;
      const eff = pairEffect(cfg, A, B, integrated);
      if (eff.sigma === 0) continue;
      let r = 1, rb = 1;
      if (eff.sigma > 0) {
        const idx = t - proj.start - 1, ramp = cfg.INT_RAMP[Math.min(idx, cfg.INT_RAMP.length - 1)];
        r = (tm.capabilities.integrator ? cfg.INT_REAL_CAP : cfg.INT_REAL) * ramp; rb = cfg.INT_REAL * ramp;
        if (idx === 0) emit(state, { type: 'synergy_fired', team: id, units: [A.id, B.id], asset: pairAsset(A.ind, B.ind), amount: eff.sigma * r * (A.calc.base + B.calc.base), text: 'Synergy: ' + CO[A.co].name + ' and ' + CO[B.co].name + ' work better together. They share ' + pairAsset(A.ind, B.ind) + '. This adds ' + money(eff.sigma * r * (A.calc.base + B.calc.base)) + ' a round to your value, starting now.' });
      }
      if (eff.sigma < 0) {
        const key = [A.id, B.id].sort().join('+');
        if (!tm.anergySeen[key]) { tm.anergySeen[key] = t; emit(state, { type: 'anergy_fired', team: id, units: [A.id, B.id], asset: pairAsset(A.ind, B.ind), amount: eff.sigma * (A.calc.base + B.calc.base), text: 'Anergy: ' + CO[A.co].name + ' and ' + CO[B.co].name + ' hurt each other. They clash over ' + pairAsset(A.ind, B.ind) + '. This costs ' + money(-eff.sigma * (A.calc.base + B.calc.base)) + ' a round. It happens just from owning both.' }); }
      }
      const e = eff.sigma * r * (A.calc.base + B.calc.base), eb = eff.sigma * rb * (A.calc.base + B.calc.base);
      A.calc.esyn += e / 2; B.calc.esyn += e / 2; A.calc.esynb += eb / 2; B.calc.esynb += eb / 2;
      tm.cash += e; post(state, id, 'T4', eb); post(state, id, 'T5', e - eb);
    }
    // complexity cost on the portfolio held this round
    const n = held.reduce((s, h) => s + h.w, 0);
    let cc = 0;
    if (n > 0) {
      const units = held.map(h => h.u);
      let pairs = 0, unrel = 0;
      for (let i = 0; i < units.length; i++) for (let j = i + 1; j < units.length; j++) { pairs++; if (!relatedPair(cfg, units[i], units[j])) unrel++; }
      const uShare = pairs ? unrel / pairs : 0, O = cfg.OVERSIGHT_PER_UNIT * (n - 1);
      const s = Math.min(3, Math.max(0, O - (ctx.W[id] || 0)));
      const k = kappa(cfg, n, uShare, s);
      cc = k * sumV; tm.cash -= cc; post(state, id, 'T6', -cc);
      tm.hist[t].kappa = k; tm.hist[t].unfunded = s;
      let text = cc < 0.5 ? 'Complexity cost: none. Your portfolio is easy to run.' : 'Complexity cost: ' + money(cc) + '. Running ' + units.length + ' businesses that do not share much is hard. This round it cost ' + (k * 100).toFixed(1) + ' percent of your value. Related businesses and spare attention make it smaller.';
      if (s > 0.05 && cc >= 0.5) text += ' ' + s.toFixed(1) + ' attention points of oversight went unfunded.';
      emit(state, { type: 'complexity_charged', team: id, amount: cc, pct: k, text });
    }
    // financing
    const up = state.world.ratesUp[t], lr = up ? cfg.RATES_UP.LINE_RATE : cfg.LINE_RATE, ir = up ? cfg.RATES_UP.IDLE_RATE : cfg.IDLE_RATE;
    const fin = lr * tm.drawn + cfg.REC_RATE * tm.recLoan - ir * Math.max(0, openCash);
    tm.cash -= fin; post(state, id, 'T8', -fin);
    tm.hist[t].cc = cc; tm.hist[t].fin = fin; tm.hist[t].sumV = sumV;
    for (const { u, w } of held) {
      const f = openSpellOf(state, id, u.id);
      if (!f) continue;
      const fl = f.flows[t] || (f.flows[t] = { E: 0, C: 0, act: 0, V: 0, s: 1 });
      fl.E += w * (u.calc.E0 + u.calc.esyn); fl.V = w * u.calc.V; fl.s = u.s;
    }
  }
}

// ---------- step 8: update base value, valuation multiple and synergy stock ----------
function updateValues(state, ctx) {
  const t = state.round, cfg = state.cfg, Vm = state.world.Vm;
  for (const id of state.unitIds) {
    const u = state.units[id];
    const M = state.world.M[u.co][t], phi = state.world.phi[u.co][t];
    const c = u.calc, owned = u.owners.length > 0;
    const Mp = c ? c.Mp : M, drift = u.B * (1 + u.g);
    const Bbase = drift * (1 + phi * (M - 1)), BnoCap = drift * (1 + phi * (Mp - 1));
    const K = u.cap ? u.cap.K : 0, Kb = u.cap ? u.cap.Kbase : 0, Tn = u.tn ? u.tn.gain : 0, Tnb = u.tn ? u.tn.base : 0;
    const Bn = BnoCap + K + Tn;
    const sN = u.built ? Math.min(1, cfg.BUILD_STRENGTH + cfg.BUILD_STEP * (t + 1 - u.born)) : 1;
    const vmT = Vm[u.ind][t], vmN = Vm[u.ind][t + 1];
    let Zn = 0, Zbn = 0;
    if (owned && u.owners.length === 1) { Zn = cfg.SYN_CAP * c.esyn; Zbn = cfg.SYN_CAP * c.esynb; }
    const saN = Bn * sN * vmN;
    Zn = Math.max(Zn, -saN); Zbn = Math.max(Zbn, -saN);
    if (owned) for (const o of u.owners) {
      const w = o.w, tid = o.team;
      post(state, tid, 'T1', w * (Bbase * u.s * vmN - u.B * u.s * vmT));
      post(state, tid, 'T3', w * Bbase * (sN - u.s) * vmN);
      post(state, tid, 'T2', w * ((BnoCap - Bbase) + Kb + Tnb) * sN * vmN);
      post(state, tid, 'T5', w * ((K - Kb) + (Tn - Tnb)) * sN * vmN);
      post(state, tid, 'T4', w * (Zbn - u.Zb));
      post(state, tid, 'T5', w * ((Zn - Zbn) - (u.Z - u.Zb)));
      const sp = openSpellOf(state, tid, id);
      if (sp && sp.flows[t]) sp.flows[t].sNext = sN;
    }
    u.Vprev = c ? c.V : valueOf(state, u);
    u.B = Bn; u.s = sN; u.Z = Zn; u.Zb = Zbn; u.cap = null; u.tn = null; u.calc = null;
  }
  state.vmIdx = t + 1;
}

function joinsAndBuilds(state, ctx) {
  const t = state.round, cfg = state.cfg;
  for (const j of ctx.joins) {
    const u = j.unit;
    u.owners = j.owners; u.Z = 0; u.Zb = 0; u.ins = null; u.hedges = []; u.cap = null; u.tn = null;
    const v = valueOf(state, u);
    j.rec.valueAtJoin = v;
    for (const o of u.owners) { post(state, o.team, 'T3', o.w * v); openSpell(state, o.team, u, o.w, t + 1); }
  }
  for (const id of allTeams(state)) {
    const tm = state.teams[id], done = tm.cip.filter(c => c.completeAfter === t);
    tm.cip = tm.cip.filter(c => c.completeAfter !== t);
    for (const c of done) {
      const co = CO[c.co], uid = c.co + '+' + id + 'r' + c.order;
      const th = clamp(Math.exp(cfg.S_CLASS[co.growth] * keyedNormal(state.seed, 'build_theta', id, c.co, c.order)), cfg.THETA_CLAMP[0], cfg.THETA_CLAMP[1]);
      const u = makeUnit(cfg, uid, co, co.value_musd * th, { built: true, born: t + 1, s: cfg.BUILD_STRENGTH, owners: [{ team: id, w: 1 }], srcCo: c.co });
      state.units[uid] = u; state.unitIds.push(uid); state.unitIds.sort();
      const v = valueOf(state, u);
      post(state, id, 'T3', v - c.costBase); post(state, id, 'T5', c.costBase - c.cost);
      openSpell(state, id, u, 1, t + 1);
      useCap(state, id, 'acquirer');
      emit(state, { type: 'build_completed', team: id, unit: uid, value: v, text: 'Your new ' + co.name + ' is open at ' + Math.round(cfg.BUILD_STRENGTH * 100) + ' percent strength and is worth ' + money(v) + ' today. It reaches full strength in two more rounds.' });
    }
  }
}

// ---------- step 9: credit line, forced sale, receivership ----------
function sweep(state) {
  const t = state.round, cfg = state.cfg, cap = state.world.ratesUp[t] ? cfg.RATES_UP.LINE : cfg.LINE;
  for (const id of allTeams(state)) {
    const tm = state.teams[id];
    if (tm.cash < 0) {
      const draw = Math.min(-tm.cash, Math.max(0, cap - tm.drawn));
      tm.cash += draw; tm.drawn += draw;
    }
    while (tm.cash < 0) {
      const sellable = heldUnits(state, id).filter(h => h.w === 1).sort((a, b) => a.u.y * saOf(state, a.u) - b.u.y * saOf(state, b.u) || (a.u.id < b.u.id ? -1 : 1));
      if (!sellable.length) break;
      const u = sellable[0].u, sa = saOf(state, u), proceeds = cfg.SALE_FORCED * sa;
      tm.cash += proceeds; post(state, id, 'T3', proceeds - sa); post(state, id, 'T4', -u.Z);
      closeSpell(state, id, u, t, { type: 'forced', proceeds });
      dropProjects(state, id, u.id); u.owners = []; u.Z = 0; u.Zb = 0;
      emit(state, { type: 'forced_sale', team: id, unit: u.id, price: proceeds, text: 'Forced sale: ' + CO[u.co].name + ' was sold. Your cash went below zero, so we sold your weakest business for ' + money(proceeds) + '. That is 80 percent of what it was worth on its own. Your cash is now ' + money(tm.cash) + '.' });
    }
    if (tm.cash < 0 && tm.recLoan === 0) {
      tm.recLoan = cfg.REC_LOAN; tm.cash += cfg.REC_LOAN; tm.receivership = { round: t, evAtEntry: evOf(state, id) };
      emit(state, { type: 'receivership', team: id, loan: cfg.REC_LOAN, text: 'Receivership: your company is in trouble. Selling a business was not enough to cover your debts. You keep playing as a recovery team with a $100M loan, and whatever is outstanding comes off your final score. Nobody is out. Everyone keeps their seat and their role.' });
    }
    if (tm.cash > cfg.REPAY_KEEP) {
      let room = tm.cash - cfg.REPAY_KEEP;
      const a = Math.min(tm.drawn, room); tm.drawn -= a; tm.cash -= a; room -= a;
      const b = Math.min(tm.recLoan, room); tm.recLoan -= b; tm.cash -= b;
    }
  }
}

// ---------- shock resolution cards ----------
function shockEvents(state) {
  const t = state.round;
  for (const c of state.schedule.chains) {
    if (c.start + 1 !== t) continue;
    const ch = chainById[c.id];
    if (!c.yes) {
      emit(state, { type: 'shock_dud', chain: c.id, text: 'The rumor about ' + ch.name.toLowerCase() + ' turned out to be nothing. No change. ' + ch.dud.ticker + '.', learning: ch.dud.learning_note });
      continue;
    }
    emit(state, { type: 'shock_resolved', chain: c.id, title: ch.name, text: ch.stage3.breaking + '.', effectsFromRound: c.activeFrom, effectsToRound: c.activeTo, choices: ch.stage3.tradeoffs });
    for (const id of allTeams(state)) {
      if (state.teams[id].isBot) continue;
      let delta = 0; const names = [];
      for (const { u, w } of heldUnits(state, id)) {
        const m = state.world.M[u.co][Math.min(5, c.activeFrom)], v = (ch.stage3.effects[u.ind] || {}).v || 1;
        const col = state.cfg.CHAIN_COLUMN[c.id];
        const mc = col ? CO[u.co].shock_multipliers[col] : null;
        if ((mc !== null && mc !== 1) || (mc === null && ch.stage3.effects[u.ind])) {
          const mm = mc !== null ? mc : clamp(((ch.stage3.effects[u.ind].d || 1) * (ch.stage3.effects[u.ind].p || 1)), 0.3, 2);
          delta += w * (u.y * saOf(state, u) * (mm - 1) + saOf(state, u) * (v - 1)); names.push(CO[u.co].name);
        }
      }
      emit(state, { type: 'shock_team_impact', team: id, chain: c.id, units: names, amount: delta, text: names.length ? ch.name + ': for your ' + names.join(' and ') + ', earnings and value move by about ' + (delta >= 0 ? '+' : '-') + money(Math.abs(delta)) + ' in the first round.' : ch.name + ': this did not touch your businesses.' });
    }
  }
}

// ---------- the starting auction (2026-10-11, Steven's round 2 feedback) ----------
// Used only when the host runs an opening auction before round 1 (default off in the engine, so every gate is unchanged).
// The round-1 lots are auctioned first; the winners own their company from the start of round 1 (it earns in round 1 like a
// company they inherited), and the lots nobody won stay listed for the rest of round 1. Reuses clearAuctions and the same join
// bookkeeping as joinsAndBuilds, so the ledger terms still sum to enterprise value. bids = { humanBids: {T1: [{lot, amount}]}, botBids: {...} }.
export function clearOpeningAuction(state, { humanBids = {}, botBids = {} } = {}) {
  if (state.round !== 1 || state.phase !== 'open') throw new Error('The opening auction runs once, at the start of round 1.');
  if (state.openingDone) return state;
  const t = 1, decs = state.decisions[t];
  let order = 0;
  for (const id of state.teamIds) decs[id] = { ...normalizeDecision({}), bids: (humanBids[id] || []).map(b => ({ ...b })), lockSeq: order++ };
  state.botIds.forEach((id, i) => { decs[id] = { ...normalizeDecision({}), bids: (botBids[id] || []).map(b => ({ ...b })), lockSeq: 2e6 + i }; });
  const ctx = { winners: new Set(), joins: [], removed: new Set(), W: {} };
  clearAuctions(state, ctx);
  const sold = new Set();
  for (const j of ctx.joins) {
    const u = j.unit;
    u.owners = j.owners; u.Z = 0; u.Zb = 0; u.ins = null; u.hedges = []; u.cap = null; u.tn = null;
    const v = valueOf(state, u);
    j.rec.valueAtJoin = v;
    for (const o of u.owners) { post(state, o.team, 'T3', o.w * v); openSpell(state, o.team, u, o.w, t); }
    sold.add(j.rec.lot);
  }
  for (const id of allTeams(state)) delete decs[id];
  state.lots = state.lots.filter(l => !sold.has(l.key));
  state.lotsByKey = Object.fromEntries(state.lots.map(l => [l.key, l]));
  state.openingWinners = [...ctx.winners];
  state.openingDone = true;
  snapshot(state, 0);
  return state;
}

// ---------- the round ----------
export function resolveRound(state) {
  const t = state.round, cfg = state.cfg;
  state.phase = 'resolving';
  state.auctions = state.auctions || [];
  const decs = state.decisions[t];
  let order = 0;
  for (const id of state.teamIds) { decs[id] = decs[id] || { ...normalizeDecision({}), lockSeq: 1e6 + (order++) }; }
  state.botIds.forEach((id, i) => {
    const d = normalizeDecision(botDecide(state, id));
    // liveAuction (default off): the host passes the bots' final live bids, which replace the sealed bids botDecide made
    if (state.liveBotBids) d.bids = (state.liveBotBids[id] || []).map(b => ({ ...b }));
    d.lockSeq = 2e6 + i; decs[id] = d;
    applyDeepDivesFor(state, id, d);
  });
  for (const id of allTeams(state)) state.log.push({ round: t, team: id, bids: decs[id].bids, builds: decs[id].builds, capital: decs[id].capital, actions: decs[id].actions, why: decs[id].why || '', predicted: decs[id].predicted, evBefore: evOf(state, id) });
  const ctx = { winners: new Set(), joins: [], removed: new Set(), W: {} };
  clearAuctions(state, ctx);
  autoBuild(state, ctx);
  shockEvents(state);
  applyActions(state, ctx);
  applyCapital(state, ctx);
  earnings(state, ctx);
  updateValues(state, ctx);
  joinsAndBuilds(state, ctx);
  sweep(state);
  snapshot(state, t);
  state.phase = t >= 5 ? 'done' : 'resolved';
  return state;
}

export function snapshot(state, t) {
  const rows = allTeams(state).map(id => ({ id, ev: evOf(state, id) })).sort((a, b) => b.ev - a.ev);
  const snap = { round: t, teams: {} };
  rows.forEach((r, i) => {
    const tm = state.teams[r.id];
    snap.teams[r.id] = { ev: r.ev, rank: i + 1, cash: tm.cash, drawn: tm.drawn, recLoan: tm.recLoan, units: heldUnits(state, r.id).map(h => ({ id: h.u.id, w: h.w, v: valueOf(state, h.u) })), cip: tm.cip.map(c => ({ co: c.co, cost: c.cost })) };
    if (t > 0 && !tm.isBot) {
      const prev = state.snapshots[t - 1] && state.snapshots[t - 1].teams[r.id];
      const d = prev ? r.ev - prev.ev : 0;
      emit(state, { type: 'round_summary', team: r.id, ev: r.ev, rank: i + 1, of: rows.length, delta: d, text: 'Your company: ' + money(r.ev) + ', rank ' + (i + 1) + ' of ' + rows.length + '. Change: ' + (d >= 0 ? '+' : '-') + money(Math.abs(d)) + '.' });
    }
  });
  state.snapshots[t] = snap;
}
