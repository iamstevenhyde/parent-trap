// Turns engine state into the plain JSON that the pages read. Runs only in the admin's browser (the host of the engine).
// Team pages and the projector never import the engine's hidden state; they read what this file publishes.
// Nothing here changes the engine state.

import { score, leaderboard } from '../engine/engine.js';
import { evOf, CAPABILITIES, CAP_LABEL, attLimit } from '../engine/core.js';
import {
  CO, valueOf, saOf, heldUnits, lineAvail, budgetOf, feeRate, integrateCost, turnCost, buildCostOf, hedgePct,
} from '../engine/model.js';
import { chainById } from '../engine/engine.js';
import { obligations } from '../engine/model.js';
import { exportLog } from '../engine/replay.js';

export const ROUND_NAMES = ['Setup', 'Build', 'Operate', 'Adapt', 'Restructure', 'Commit'];
const r5 = x => Math.round(x / 5) * 5;
const unitName = (state, id) => CO[state.units[id].co].name;
const teamName = (state, id) => state.teams[id].name;

function prevUnitValue(state, tid, unitId) {
  const snap = state.snapshots[Math.max(0, state.round - 1)];
  const rec = snap && snap.teams[tid] && snap.teams[tid].units.find(u => u.id === unitId);
  return rec ? rec.v : null;
}

export function buildTeamView(state, tid, wins = []) {
  const cfg = state.cfg, t = state.teams[tid], round = state.round;
  const held = heldUnits(state, tid);
  const units = held.map(({ u, w }) => {
    const co = CO[u.co], V = valueOf(state, u), pv = prevUnitValue(state, tid, u.id);
    const struggling = (round > 1 && state.world.M[u.co][round - 1] < cfg.STRUGGLE_M) || (u.Vprev !== null && V < cfg.STRUGGLE_V * u.Vprev);
    return {
      id: u.id, co: u.co, name: co.name, ind: u.ind, w, value: V * w, trend: pv ? V / pv - 1 : 0, hook: co.hook, scarce: !!u.scarce,
      requests: co.capital_requests.map(r => ({ name: r.name, cost: r.cost_musd, effect: r.effect, kind: r.kind })),
      stress: struggling, turnCost: turnCost(state, tid, u).actual, canTurn: w === 1 && round - u.lastTurn >= 2,
    };
  });
  const full = units.filter(u => u.w === 1);
  const integrate = {}, pairs = [];
  for (let i = 0; i < full.length; i++) for (let j = i + 1; j < full.length; j++) {
    const a = full[i], b = full[j], key = [a.id, b.id].sort().join('+');
    const exists = t.projects.some(p => (p.a === a.id && p.b === b.id) || (p.a === b.id && p.b === a.id));
    integrate[key] = integrateCost(state, tid, state.units[a.id], state.units[b.id]).actual;
    const k = t.known[key];
    pairs.push({ key, a: a.id, b: b.id, aName: a.name, bName: b.name, cost: integrate[key], exists, known: k ? { related: k.related, round: k.round } : null });
  }
  const costs = { integrate, turnaround: {}, devcap: cfg.DEVCAP_COST, hedge: {} };
  for (const u of units) costs.turnaround[u.id] = u.turnCost;
  const hedges = [];
  for (const c of state.schedule.chains) {
    if (round < c.start + 1 || round > c.start + 2) continue;
    const ch = chainById[c.id];
    const entry = { chain: c.id, title: ch.name, label: ch.stage2.actions[0].label, units: [] };
    for (const u of units) { const cost = Math.max(1, hedgePct(c.id) * saOf(state, state.units[u.id])); costs.hedge[c.id + '|' + u.id] = cost; entry.units.push({ unit: u.id, cost }); }
    hedges.push(entry);
  }
  const lots = state.lots.map(l => {
    const u = state.units[l.unitId], co = CO[u.co], sig = t.signals[l.key] || { value: l.catalog, sd: 0.2 };
    const canBuild = l.kind === 'auction' && !l.scarce && round <= cfg.BUILD_LAST_ORDER_ROUND;
    return {
      key: l.key, unitId: l.unitId, name: co.name, ind: u.ind, hook: co.hook, catalog: l.catalog, claim: co.auction_note.listing_claims,
      kind: l.kind, price: l.price || null, seller: l.seller || null, sellerName: l.seller ? teamName(state, l.seller) : null, own: l.seller === tid,
      scarce: !!l.scarce, buildCost: canBuild ? buildCostOf(state, tid, l.unitId).actual : null,
      signal: { lo: r5(sig.value * Math.exp(-sig.sd)), hi: r5(sig.value * Math.exp(sig.sd)), mid: r5(sig.value) },
      deep: !!t.deep[l.unitId],
    };
  });
  const divest = full.map(u => {
    const sa = saOf(state, state.units[u.id]);
    return { unit: u.id, sa, market: cfg.SALE_MARKET * sa, list: round >= 2 && round <= cfg.LIST_LAST_ROUND ? cfg.LIST_FRACTIONS.map(f => ({ f, price: f * sa })) : [] };
  });
  const prev = state.snapshots[Math.max(0, round - 1)];
  return {
    v: 1, teamId: tid, name: t.name, round, seed: state.seed, liveAuction: !!state.opts.liveAuction,
    obl: state.opts.liveAuction ? obligations(state, tid, { bids: wins }) : { cc: 0, fin: 0, total: 0 },
    hostGrant: t.grants || 0, cash: t.cash, drawn: t.drawn, line: lineAvail(state, t), budget: budgetOf(state, tid), feeRate: feeRate(state, tid), recLoan: t.recLoan,
    receivership: !!t.receivership, attMax: attLimit(state, t), ev: evOf(state, tid), prevRank: prev && prev.teams[tid] ? prev.teams[tid].rank : null,
    ofTeams: state.teamIds.length + state.botIds.length,
    capabilities: { ...t.capabilities }, uses: { ...t.uses }, capLabels: CAP_LABEL, capList: CAPABILITIES,
    units, pairs, lots, costs, hedges, divest, builds: t.cip.map(c => ({ name: CO[c.co] ? CO[c.co].name : c.co, cost: c.cost })),
    teams: state.teamIds.map(id => ({ id, name: teamName(state, id) })),
  };
}

// ---- public snapshot: everything the projector draws for one round ----
function unitRows(state, snapTeam) {
  return snapTeam.units.map(x => ({ id: x.id, name: unitName(state, x.id), ind: state.units[x.id].ind, v: x.v * x.w }));
}
function activeChains(state, round) {
  return state.schedule.chains.filter(c => c.yes && round >= c.activeFrom && round <= c.activeTo);
}
function industryCards(state, round) {
  const out = [];
  const prev = state.snapshots[round - 1], cur = state.snapshots[round];
  const active = activeChains(state, round);
  for (const ind of ['ranching', 'grocery', 'cannabis', 'ski', 'energy', 'ai']) {
    let d = 1, p = 1, c = 1;
    const why = [];
    for (const ch of active) {
      const c3 = chainById[ch.id].stage3, e = c3.effects[ind];
      if (!e) continue;
      d *= e.d || 1; p *= e.p || 1; c *= e.c || 1;
      why.push(chainById[ch.id].name + ': ' + c3.breaking.replace(/^BREAKING:\s*/, '') + '.');
    }
    const earn = state.world.indMean[ind][round];
    const dir = (x, up, down) => (x > 1.005 ? up : x < 0.995 ? down : 'steady');
    const demandWord = dir(d, 'demand up', 'demand down'), marginWord = dir(earn, 'margins up', 'margins down');
    const label = { ranching: 'Ranching', grocery: 'Grocery', cannabis: 'Cannabis', ski: 'Ski', energy: 'Energy', ai: 'AI / Models' }[ind];
    const headline = !why.length && Math.abs(earn - 1) < 0.005 ? label + ': a quiet round. Nothing moved this industry.'
      : label + ': ' + (d !== 1 ? demandWord : 'demand steady') + ' but ' + (earn !== 1 ? marginWord : 'margins steady') + '.';
    const exposed = [];
    if (prev && cur) {
      for (const id of [...state.teamIds, ...state.botIds]) {
        let now = 0, before = 0, any = false;
        for (const u of cur.teams[id].units) {
          if (state.units[u.id].ind !== ind) continue;
          const pu = prev.teams[id].units.find(x => x.id === u.id);
          if (pu) { any = true; now += u.v * u.w; before += pu.v * pu.w; }
        }
        if (any) exposed.push({ team: id, name: teamName(state, id), isBot: state.teams[id].isBot, delta: now - before });
      }
    }
    out.push({
      ind, label, headline, nums: { demand: d - 1, price: p - 1, input: c - 1, profit: earn - 1 }, why: why.slice(0, 3),
      powerNote: ind === 'ai' && c > 1.005 ? 'Power costs up ' + Math.round((c - 1) * 100) + '%.' : null, exposed,
    });
  }
  return out;
}

export function buildPublic(state, round, now = Date.now()) {
  const snap = state.snapshots[round], prev = state.snapshots[round - 1] || null;
  const ids = [...state.teamIds, ...state.botIds];
  const scores = Object.fromEntries(ids.map(id => [id, score(state, id, { pa: false })]));
  const teams = ids.map(id => {
    const st = snap.teams[id];
    return {
      id, name: teamName(state, id), isBot: state.teams[id].isBot, ev: scores[id].ev, rank: 0,
      delta: prev ? scores[id].ev - prev.teams[id].ev : 0, cash: st.cash, loan: st.drawn + st.recLoan,
      units: unitRows(state, st), building: st.cip.reduce((a, c) => a + c.cost, 0),
    };
  });
  [...teams].sort((a, b) => b.ev - a.ev || (a.id < b.id ? -1 : 1)).forEach((t, i) => { t.rank = i + 1; });
  const totalValue = teams.reduce((a, t) => a + t.ev, 0);
  const startTotal = state.snapshots[0] ? ids.reduce((a, id) => a + state.snapshots[0].teams[id].ev, 0) : totalValue;
  const auctions = (state.auctions || []).filter(a => a.round === round).map(a => {
    const u = state.units[a.unit], co = CO[u.co];
    return {
      key: a.lot, unit: a.unit, name: co.name, ind: u.ind, kind: a.kind, catalog: a.catalog, trueValue: a.trueValue, price: a.price,
      bids: a.bids.map(b => ({ names: b.teams.map(x => teamName(state, x)), teams: b.teams, amount: b.amount })).sort((x, y) => x.amount - y.amount),
      winners: (a.winners || []).map(x => teamName(state, x)), winnerIds: a.winners || [], seller: a.seller || null,
    };
  });
  const roundEvents = state.events.filter(e => e.round === round);
  const breaking = roundEvents.filter(e => e.type === 'shock_resolved').map(e => ({ text: e.text.replace(/\.$/, ''), title: e.title }));
  const ticker = roundEvents.filter(e => e.type === 'ticker').map(e => ({ tag: e.tag, text: e.text, stage: e.stage, ts: now }));
  // Caption for the replay: the biggest shock headline plus the biggest mover of the round.
  let mover = null;
  for (const t of teams) if (prev && (!mover || Math.abs(t.delta) > Math.abs(mover.delta))) mover = t;
  const shock = roundEvents.find(e => e.type === 'shock_resolved');
  const caption = round === 0 ? (state.openingDone ? 'Round 0: Setup. Every conglomerate started with two businesses and cash, then bid for a third in the opening auction.' : 'Round 0: Setup. Every conglomerate starts with two businesses and cash.')
    : 'Round ' + round + ': ' + ROUND_NAMES[round] + '. ' + (shock ? shock.title + ' hit the news. ' : 'No big news. ')
      + (mover ? mover.name + (mover.delta >= 0 ? ' jumped ' : ' fell ') + '$' + Math.round(Math.abs(mover.delta)) + 'M.' : '');
  return {
    v: 1, round, name: ROUND_NAMES[round], teams, totalValue, startTotal, auctions, breaking, ticker, caption,
    industries: round >= 1 ? industryCards(state, round) : [],
    board: [...teams].sort((a, b) => a.rank - b.rank).map(t => ({ id: t.id, name: t.name, isBot: t.isBot, ev: t.ev, delta: t.delta, rank: t.rank })),
  };
}

// ---- the team's private result for a round (results overlay + history) ----
export function buildResult(state, tid, round, meta) {
  const snap = state.snapshots[round], prev = state.snapshots[round - 1];
  const ev = snap.teams[tid].ev, rank = snap.teams[tid].rank;
  const mine = state.events.filter(e => e.round === round && (e.team === tid || (!e.team && (e.type === 'shock_resolved' || e.type === 'shock_dud'))));
  return {
    v: 1, teamId: tid, round, ev, rank, of: Object.keys(snap.teams).length, delta: prev ? ev - prev.teams[tid].ev : 0,
    events: mine.map(e => ({ type: e.type, text: e.text, team: e.team || null, price: e.price, trueValue: e.trueValue, amount: e.amount, cost: e.cost, proceeds: e.proceeds, title: e.title, bid: e.bid, units: e.units })),
    why: meta.why, predicted: meta.predicted, timeout: meta.timeout || null,
  };
}

// ---- final standings and the autopsy numbers (the same score() as everything else) ----
export function buildFinal(state) {
  const ids = [...state.teamIds, ...state.botIds];
  const rows = leaderboard(state, { includeBots: true });
  const log = exportLog(state);
  return {
    v: 1,
    rows: rows.map(r => ({
      id: r.team, name: teamName(state, r.team), isBot: state.teams[r.team].isBot, gift: state.teams[r.team].isBot ? Math.max(0, (state.cfg.BOT_CASH || 0) - (state.cfg.CASH0 || 0)) : 0, ev: r.ev, startingEV: r.startingEV,
      decomposition: r.decomposition, parentingAdvantage: r.parentingAdvantage, residual: r.residual, rankEV: r.rankEV, rankPA: r.rankPA, receivership: r.receivership,
    })),
    scoreCheck: log.scoreCheck, ids,
  };
}
export { exportLog };
