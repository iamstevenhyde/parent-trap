// The Parent Trap engine: create a game, open a round, take decisions. resolveRound and score live in
// resolve.js and scoring.js and are re-exported here, so pages import everything from this one file.
// Functions change the state object they are given and return it. Use structuredClone(state) to branch.

import { CONFIG } from './config.js';
import { COMPANIES, INHERITANCE, BOT_ROSTER } from './data/companies.js';
import { rosterFor, MAX_TABLES } from './roster.js';
import { NOISE_TICKER } from './data/shocks.js';
import { hash01, keyedShuffle } from './rng.js';
import { buildSchedule, chainById } from './schedule.js';
import {
  CO, buildWorld, trueTheta, makeUnit, valueOf, saOf, estimate, heldUnits, reservedFor, budgetOf,
} from './model.js';
import { CAPABILITIES, emit, emptyLedger, openSpell, evOf, normalizeDecision, applyDeepDives, post, money, attLimit } from './core.js';

function newTeam(id, isBot, name, cfg, seat) {
  return {
    id, isBot, name, seat, cash: isBot ? cfg.BOT_CASH : cfg.CASH0, drawn: 0, recLoan: 0, receivership: null,
    capabilities: { acquirer: false, integrator: false, operator: false, analyst: false },
    uses: { acquirer: 0, integrator: 0, operator: 0, analyst: 0 }, devSpend: { acquirer: 0, integrator: 0, operator: 0, analyst: 0 },
    deep: {}, known: {}, projects: [], cip: [], ledger: emptyLedger(), spells: [], hist: {}, ev1: 0, signals: {}, saved: {}, anergySeen: {},
  };
}

// Calibration: nudge the hidden truth of each seat's two inherited units by one common factor so every seat starts
// with about the same true enterprise value. Catalog (public) is untouched. Factor limits and strength are in config.js.
function equalizeInheritance(state, teamCount) {
  const cfg = state.cfg, INH = state.inheritance;
  if (!cfg.INHERIT_EQUALIZE) return;
  const cat = i => INHERITANCE[i].companies.reduce((s, id) => s + CO[id].value_musd, 0);
  const target = INHERITANCE.reduce((s, _, i) => s + cat(i), 0) / INHERITANCE.length;
  for (let k = 0; k < teamCount; k++) {
    const ids = INH[k].companies, trueSum = ids.reduce((s, id) => s + state.units[id].B, 0);
    const c = Math.pow(Math.min(cfg.INHERIT_EQ_RANGE[1], Math.max(cfg.INHERIT_EQ_RANGE[0], target / trueSum)), cfg.INHERIT_EQUALIZE);
    for (const id of ids) { state.units[id].B *= c; state.theta[id] *= c; }
  }
}

const AI_POLICIES = ['FOCUSED_TWO', 'RELATED_THREE', 'ACQUIRER_HEAVY', 'UNRELATED_FOUR', 'PASSIVE'];
export function createGame(seed, teamCount = 8, opts = {}) {
  if (!(teamCount >= 1 && teamCount <= MAX_TABLES)) throw new Error('The Parent Trap supports 1 to ' + MAX_TABLES + ' tables (asked for ' + teamCount + ').');
  const cfg = { ...CONFIG, ...(opts.cfg || {}) };
  if (opts.liveAuction && cfg.AI_FLOOR) cfg.BOT_CASH = cfg.FLOOR_BOT_CASH;
  const roster = rosterFor(teamCount, cfg);          // the base roster for 8 tables or fewer; sister companies and more lots above that
  if (teamCount > 8) { cfg.ROUND1_LOTS = roster.round1Lots; cfg.LOTS_R2 = roster.lotsR2; cfg.LOTS_R3 = roster.lotsR3; cfg.LOTS_R4_MAX = roster.lotsR4; }
  const inheritedSet = new Set(roster.inheritance.slice(0, teamCount).flatMap(r => r.companies));
  const sched = buildSchedule(seed, cfg);
  const world = buildWorld(sched, cfg, roster.companies);
  const state = {
    seed, cfg, opts: { botCount: 4, ...opts, cfg: undefined }, teamCount, round: 0, phase: 'created', vmIdx: 1,
    schedule: sched, world, units: {}, unitIds: [], teams: {}, teamIds: [], botIds: [], lots: [], lotsByKey: {},
    inheritance: roster.inheritance, decisions: {}, events: [], log: [], auctions: [], snapshots: [], listings: [], poolQueue: [], lockCounter: 0, theta: {}, result: null,
  };
  for (const co of roster.companies) {
    const th = trueTheta(seed, co, cfg, teamCount > 8 ? inheritedSet : undefined);
    state.theta[co.id] = th;
    state.units[co.id] = makeUnit(cfg, co.id, co, co.value_musd * th);
    state.unitIds.push(co.id);
  }
  state.unitIds.sort();
  equalizeInheritance(state, teamCount);
  const aiSet = new Set(opts.aiTeams || []);
  state.aiPolicy = {};
  for (let k = 1; k <= teamCount; k++) {
    // opts.aiTeams (default none): seats nobody claimed. They are played by the engine like a bot, using one of the five table
    // policies, so a class of any size from 1 to 20 fills every seat.
    const id = 'T' + k, ai = aiSet.has(id), team = newTeam(id, ai, 'Table ' + k, cfg, k);
    state.teams[id] = team;
    if (ai) { state.botIds.push(id); state.aiPolicy[id] = AI_POLICIES[(k - 1) % AI_POLICIES.length]; } else state.teamIds.push(id);
    for (const cid of state.inheritance[k - 1].companies) state.units[cid].owners.push({ team: id, w: 1 });
  }
  const bots = BOT_ROSTER.slice(0, state.opts.botCount);
  for (const b of bots) {
    state.teams[b.id] = newTeam(b.id, true, b.name, cfg, 0);
    state.botIds.push(b.id);
    for (const cid of b.portfolio) state.units[cid].owners.push({ team: b.id, w: 1 });
  }
  for (const id of [...state.teamIds, ...state.botIds]) {
    const t = state.teams[id];
    for (const { u, w } of heldUnits(state, id)) openSpell(state, id, u, w, 1);
    t.ev1 = evOf(state, id);
  }
  // Pool queue for rounds 2 and 3 (and leftovers for round 4): every unit nobody owns that is not a round-1 lot.
  const free = state.unitIds.filter(id => !state.units[id].owners.length && !cfg.ROUND1_LOTS.includes(id));
  state.poolQueue = keyedShuffle(free, seed, 'pool_order');
  snapshot(state, 0);
  return state;
}

// ---------- opening a round ----------
function lotFor(state, unitId, kind = 'auction', extra = {}) {
  const u = state.units[unitId];
  return { key: 'L:' + unitId + (kind === 'team' ? ':team' : ''), unitId, kind, catalog: CO[u.co].value_musd, scarce: u.scarce, ...extra };
}

export function openRound(state, round) {
  const cfg = state.cfg;
  state.round = round; state.phase = 'open'; state.vmIdx = round;
  state.lockCounter = 0;
  const ids = [];
  if (round === 1) ids.push(...cfg.ROUND1_LOTS.filter(id => !state.units[id].owners.length));
  else if (round === 2 || round === 3) {
    const n = round === 2 ? cfg.LOTS_R2 : cfg.LOTS_R3;
    ids.push(...state.poolQueue.splice(0, n));
  } else if (round === 4) {
    // round 4 lists whatever nobody owns (unsold lots, units sold to the market). Round 5 lists no auction lots: only team listings (below).
    const left = state.unitIds.filter(id => !state.units[id].owners.length && !state.units[id].built);
    ids.push(...keyedShuffle(left, state.seed, 'r4_lots').slice(0, cfg.LOTS_R4_MAX));
  }
  state.lots = ids.map(id => lotFor(state, id));
  // team-to-team listings that become visible this round
  for (const l of state.listings) {
    if (l.visible !== round) continue;
    const u = state.units[l.unit];
    if (!u.owners.some(o => o.team === l.seller)) continue;
    const sa = l.sa;
    state.lots.push({ key: 'L:' + l.unit + ':team', unitId: l.unit, kind: 'team', catalog: sa, price: l.price, seller: l.seller, f: l.f, scarce: u.scarce });
  }
  state.lotsByKey = Object.fromEntries(state.lots.map(l => [l.key, l]));
  // private signals for every team and lot
  for (const tid of [...state.teamIds, ...state.botIds]) {
    const t = state.teams[tid];
    t.signals = {};
    for (const l of state.lots) t.signals[l.key] = estimate(state, tid, l.unitId);
  }
  // tickers: stage 1, stage 2 forecasts and a few noise lines
  for (const c of state.schedule.chains) {
    const ch = chainById[c.id];
    if (c.start === round) emit(state, { type: 'ticker', stage: 1, chain: c.id, tag: ch.stage1.tag, text: ch.stage1.ticker + '. ' + forecastText(ch.stage1.forecast, c.stage1P, ch.stage1.p) });
    if (c.start + 1 === round) {
      const br = c.path === 'up' ? ch.stage2.up : ch.stage2.down;
      emit(state, { type: 'ticker', stage: 2, chain: c.id, tag: ch.stage2.tag, text: br.ticker + '. ' + br.forecast, actions: ch.stage2.actions.map(a => a.label) });
    }
  }
  const tags = Object.keys(NOISE_TICKER.tags);
  for (let i = 0; i < 3; i++) {
    const tag = tags[Math.floor(hash01(state.seed, 'noise_tag', round, i) * tags.length)];
    const lines = NOISE_TICKER.tags[tag];
    emit(state, { type: 'ticker', stage: 0, tag, text: lines[Math.floor(hash01(state.seed, 'noise_line', round, i) * lines.length)].text, noise: true });
  }
  emit(state, { type: 'round_open', text: 'Round ' + round + ' is open with ' + state.lots.length + ' listed companies.', lots: state.lots.map(l => l.key) });
  state.decisions[round] = state.decisions[round] || {};
  return state;
}
function forecastText(printed, adj, base) {
  return adj !== base ? printed.replace(/\d+%/, Math.round(adj * 100) + '%') : printed;
}

// ---------- decisions ----------
export function validateDecisions(state, teamId, dec) {
  const cfg = state.cfg, t = state.teams[teamId], errors = [], round = state.round;
  if (!t) return { ok: false, errors: ['Unknown table.'] };
  if (state.phase !== 'open') errors.push('This round is not open.');
  const d = normalizeDecision(dec);
  // liveAuction (default off): bids are won in the live market and limited by cash, so they do not use attention
  const attention = (state.opts.liveAuction ? 0 : d.bids.length) + d.builds.length + d.actions.length;
  if (!t.isBot && attention > attLimit(state, t)) errors.push('You can take at most ' + attLimit(state, t) + ' corporate actions. You picked ' + attention + '.');
  for (const b of d.bids) {
    const lot = state.lotsByKey[b.lot];
    if (!lot) errors.push('Lot ' + b.lot + ' is not listed this round.');
    else if (lot.seller === teamId) errors.push('You cannot bid on your own listing.');
    else if (lot.kind === 'auction' && !(b.amount > 0)) errors.push('A bid needs an amount above zero.');
    if (b.ally && (b.ally === teamId || !state.teams[b.ally] || state.teams[b.ally].isBot)) errors.push('A co-bid needs another table.');
  }
  for (const b of d.builds) {
    const lot = state.lotsByKey[b.lot];
    if (!lot || lot.kind !== 'auction') errors.push('You can only build a listed company.');
    else if (lot.scarce) errors.push(CO[state.units[lot.unitId].co].name + ' is a scarce asset and cannot be built.');
    if (round > cfg.BUILD_LAST_ORDER_ROUND) errors.push('Build orders close after round ' + cfg.BUILD_LAST_ORDER_ROUND + '.');
  }
  const held = Object.fromEntries(heldUnits(state, teamId).map(h => [h.u.id, h]));
  for (const [uid, idx] of Object.entries(d.capital)) {
    if (idx === null || idx === undefined) continue;
    if (!held[uid]) errors.push('You do not hold ' + uid + '.');
    else if (idx !== 0 && idx !== 1) errors.push('A capital request is option 0 or 1.');
  }
  const seen = new Set();
  for (const a of d.actions) {
    const solo = id => held[id] && held[id].w === 1;
    if (a.type === 'integrate') {
      if (!solo(a.a) || !solo(a.b) || a.a === a.b) errors.push('Integrate needs two units you fully own.');
      else if (t.projects.some(p => (p.a === a.a && p.b === a.b) || (p.a === a.b && p.b === a.a))) errors.push('That pair already has an Integrate project.');
    } else if (a.type === 'turnaround') {
      if (!solo(a.unit)) errors.push('Turnaround needs a unit you fully own.');
      else if (round - state.units[a.unit].lastTurn < 2) errors.push('One Turnaround per unit every two rounds.');
    } else if (a.type === 'devcap') {
      if (!CAPABILITIES.includes(a.cap)) errors.push('Pick a capability to develop.');
    } else if (a.type === 'deepdive') {
      if (a.lot) { if (!state.lotsByKey[a.lot]) errors.push('Deep dive needs a listed company.'); }
      else if (a.pair) { if (!held[a.pair[0]] || !held[a.pair[1]]) errors.push('Deep dive on a pair needs two units you hold.'); }
      else errors.push('Deep dive needs a target.');
    } else if (a.type === 'divest') {
      if (!solo(a.unit)) errors.push('Divest needs a unit you fully own.');
      else if (round < 2) errors.push('Divest opens in round 2.');
      else if (a.mode === 'list' && (round > cfg.LIST_LAST_ROUND || !cfg.LIST_FRACTIONS.includes(a.f))) errors.push('Listings are made in rounds 2 to ' + cfg.LIST_LAST_ROUND + ' at 80, 100 or 120 percent.');
      else if (a.mode !== 'list' && a.mode !== 'market') errors.push('Divest is a market sale or a listing.');
    } else if (a.type === 'hedge') {
      const c = state.schedule.chains.find(x => x.id === a.chain);
      if (!c || round < c.start + 1 || round > c.start + 2) errors.push('That protection is not on offer now.');
      else if (!held[a.unit]) errors.push('Protection needs a unit you hold.');
    } else errors.push('Unknown action ' + a.type + '.');
    const key = JSON.stringify(a);
    if (seen.has(key)) errors.push('Duplicate action.');
    seen.add(key);
  }
  const r = reservedFor(state, teamId, d), bud = budgetOf(state, teamId);
  if (r.total - r.obl > 0 && r.total > bud + 1e-9) errors.push('Cash meter: you reserve $' + r.total.toFixed(0) + 'M but have $' + bud.toFixed(0) + 'M including the credit line.');
  if (state.opts.requireWhy && !t.isBot && (!d.why || d.predicted === null)) errors.push('Lock-in needs one sentence of why and a predicted value.');
  return { ok: errors.length === 0, errors, reserved: r.total, budget: bud };
}

export function submitDecisions(state, teamId, dec) {
  const v = validateDecisions(state, teamId, dec);
  if (!v.ok) return v;
  const d = normalizeDecision(dec), t = state.teams[teamId];
  d.lockSeq = ++state.lockCounter + (t.isBot ? 2e6 : 0);
  state.decisions[state.round][teamId] = d;
  t.saved = d;
  applyDeepDives(state, teamId, d, estimate);
  return v;
}

export function lotSignal(state, teamId, lotKey) { return state.teams[teamId].signals[lotKey]; }
export { chainById, valueOf, saOf, CAPABILITIES, evOf, emit, normalizeDecision };
import { snapshot } from './resolve.js';
export { resolveRound, snapshot, clearOpeningAuction } from './resolve.js';
export { score, counterfactual, leaderboard } from './scoring.js';

// ---------- host cash grant (between rounds) ----------
// The instructor gives every human table the same cash after a round is worked out and before the next one opens. Seats played by the
// engine (AI seats and bots) are never touched. The grant is a logged event, and the host stores {after, amount} in the game settings so
// rebuilding the game from the saved plans replays it at the same point. It is posted to ledger term T1, so the score decomposition still sums.
export const GRANT_MAX = 500;
export function grantCash(state, amount) {
  if (state.phase !== 'resolved') throw new Error('A host grant can only be given between rounds, after a round is worked out.');
  if (!(Number.isFinite(amount) && amount > 0 && amount <= GRANT_MAX)) throw new Error('A host grant must be above 0 and at most ' + GRANT_MAX + '.');
  for (const id of state.teamIds) {
    const t = state.teams[id];
    if (t.isBot) continue;
    t.cash += amount; post(state, id, 'T1', amount);
    t.grants = (t.grants || 0) + amount;
    const snap = state.snapshots[state.round] && state.snapshots[state.round].teams[id];
    if (snap) { snap.cash += amount; snap.ev += amount; }
    emit(state, { type: 'host_grant', team: id, amount, text: 'Host grant: +' + money(amount) + '. Your instructor added cash to every team.' });
  }
  return state;
}
