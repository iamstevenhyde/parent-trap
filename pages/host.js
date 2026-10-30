// The engine host. Runs in the admin's browser: holds the engine state, takes the teams' saved plans from the store,
// resolves rounds, and writes snapshots and events back. The engine files are used as they are; nothing here edits them.
//
// The engine is deterministic, so the whole game can be rebuilt from seed + team count + bot count + the stored plans
// (rebuild()). That is how an admin reload, or a second admin laptop, picks the game up where it was.

import { createGame, openRound, submitDecisions, validateDecisions, resolveRound, clearOpeningAuction, grantCash, GRANT_MAX } from '../engine/engine.js';
import { applyDeepDives, attLimit } from '../engine/core.js';
import { estimate } from '../engine/model.js';
import { buildTeamView, buildPublic, buildResult, buildFinal, exportLog } from './views.js';
import { planFromRow, attentionUsed } from './roles.js';
import { makeCode, makeGameId } from './util.js';
import { buildCostOf, feeRate, budgetOf, obligations } from '../engine/model.js';
import { chainById } from '../engine/engine.js';
import { hash01 } from '../engine/rng.js';
import { MARKET_SECONDS, SNIPE_MS, openMarket, restoreMarket, placeBid, proposeCoBid, joinCoBid, botTick as marketBotTick, closeMarket, marketSnapshot } from './market.js';

export const RESULT_STEP_SECONDS = 17;   // auto-advance only: how long each results reveal stays up
export const DECIDE_SECONDS = { 1: 360, 2: 360, 3: 360, 4: 330, 5: 300 };   // round 4 market is 30 s longer, so its whole clock matches rounds 2-3 (8:30)
export const OPENING_SECONDS = 240;   // the starting auction: only the auction is open, then round 1 opens with the lots nobody won on the side
export const OPENING_MIN_MS = 5000;   // the opening auction cannot be closed in its first five seconds
export const DEFAULT_NAMES = ['Alpine Holdings', 'Frontier Capital', 'Summit Partners', 'Rangeview Group', 'Bitterroot Capital', 'Sawtooth Holdings', 'Teton Ventures', 'Wasatch Partners', 'Sagebrush Capital', 'Bighorn Group'];

export function newGameRow({ seed, teams, bots }, opts = {}) {
  const id = makeGameId();
  return {
    id, seed: seed || Math.floor(10000 + Math.random() * 89999), team_count: teams, bot_count: bots, phase: 'lobby', round: 0,
    clock: null, reveal: null, rev: 0, status: 'active', admin_key: makeCode(8),
    settings: { autoResolve: true, liveAuction: opts.liveAuction !== false, requireWhy: opts.requireWhy === true, autoAdvance: true, openingAuction: opts.liveAuction !== false && opts.openingAuction !== false },
  };
}

const pctWords = (x, up, down) => (x > 1 ? up + ' ' : down + ' ') + Math.round(Math.abs(x - 1) * 100) + '%';
function effectWords(x) {
  const out = [];
  if (x.d) out.push(pctWords(x.d, 'demand up', 'demand down'));
  if (x.p) out.push(pctWords(x.p, 'prices up', 'prices down'));
  if (x.c) out.push(pctWords(x.c, 'input costs up', 'input costs down'));
  if (x.v) out.push(pctWords(x.v, 'valuation up', 'valuation down'));
  return out.join(', ');
}

// ---- who is reporting (Steven, 2026-10-11: small differences in the chyron that reward close reading) ----
// Every headline carries a source. Grade A (wire services) prints the exact odds, grade B (trade press) rounds them to the nearest 10
// and says "about", grade C (chatter) gives only a word for the odds. The odds are never changed, only how finely they are printed, so
// a reader who tracks the sources loses nothing by it and one who skims has less to go on. Chain headlines also say when the effect
// would land, how long it would last and the biggest swing it could cause. None of this says whether the event happens.
const SOURCES = {
  A: ['Plains Wire Service', 'Mountain West Press', 'Federal Data Desk', 'Exchange Newswire'],
  B: ['Western Trade Journal', 'Intermountain Business Daily', 'Ag and Energy Weekly', 'Resort and Retail Review'],
  C: ['Overheard at the diner', 'A blogger who is sometimes right', 'Unsigned market note', 'Chat board tip'],
};
const GRADE_WORD = { A: 'Wire', B: 'Trade press', C: 'Chatter' };
function oddsWords(p) { return p >= 0.7 ? 'A strong chance' : p >= 0.55 ? 'A better-than-even chance' : p > 0.45 ? 'An even chance' : p > 0.3 ? 'A less-than-even chance' : 'A slim chance'; }
export function degradeOdds(text, grade) {
  const m = /(\d+)% chance/.exec(text);
  if (!m || grade === 'A') return text;
  const p = Number(m[1]) / 100;
  return text.replace(m[0], grade === 'B' ? 'About ' + (Math.round(p * 10) * 10) + '% chance' : oddsWords(p));
}
const biggestSwing = eff => {
  let best = null;
  for (const [ind, x] of Object.entries(eff)) for (const k of ['d', 'p', 'c', 'v']) if (x[k]) { const mag = Math.abs(x[k] - 1); if (!best || mag > best.mag) best = { ind, mag, words: effectWords({ [k]: x[k] }) }; }
  return best ? { ind: best.ind, words: best.words } : null;
};

export class Host {
  constructor(store, gameId) { this.store = store; this.gid = gameId; this.state = null; this.game = null; this.queue = Promise.resolve(); this.sentSeq = 0; this.checked = {}; this.committed = {}; this.market = null; this.winBids = {}; }
  get live() { return !!(this.game && this.game.settings && this.game.settings.liveAuction); }
  // The starting auction (Steven, 2026-10-11): the game opens with an auction for each team's third company, then round 1 runs with the unsold lots on the side.
  get openingOn() { return this.live && !!(this.game && this.game.settings && this.game.settings.openingAuction); }
  get inOpening() { return !!(this.game && this.game.phase === 'market' && this.game.reveal && this.game.reveal.opening); }

  // Run one thing at a time, so realtime callbacks and button clicks never overlap.
  run(fn) { const p = this.queue.then(fn); this.queue = p.catch(e => console.error(e)); return p; }

  async createNew({ seed, teams = 20, bots = 0, liveAuction = true, requireWhy = false, openingAuction = true }) {
    const row = newGameRow({ seed, teams, bots }, { liveAuction, requireWhy, openingAuction });
    const used = new Set();
    await this.store.createGame(row);
    this.gid = row.id;
    for (let i = 1; i <= teams; i++) {
      let code; do { code = makeCode(4); } while (used.has(code)); used.add(code);
      await this.store.upsertTeam({ game_id: row.id, team_id: 'T' + i, name: DEFAULT_NAMES[(i - 1) % DEFAULT_NAMES.length] + (i > DEFAULT_NAMES.length ? ' ' + (Math.floor((i - 1) / DEFAULT_NAMES.length) + 1) : ''), join_code: code });
    }
    return this.load();
  }

  async load() {
    this.game = await this.store.getGame(this.gid);
    if (!this.game) return null;
    await this.rebuild();
    return this.game;
  }

  async applyNames() {
    const teams = await this.store.getTeams(this.gid);
    this.teams = teams;
    for (const t of teams) if (this.state.teams[t.team_id]) this.state.teams[t.team_id].name = t.name;
  }

  async rebuild() {
    const g = this.game;
    this.state = createGame(g.seed, g.team_count, { botCount: g.bot_count, liveAuction: this.live, aiTeams: (g.settings || {}).aiTeams || [] });
    await this.applyNames();
    const decs = await this.store.getDecisions(this.gid);
    const mks = this.live ? Object.fromEntries((await this.store.getSnapshots(this.gid, { kind: 'market' })).map(x => [x.round, x.data])) : {};
    this.committed = {}; this.market = null;
    for (let r = 1; r <= g.round; r++) {
      openRound(this.state, r);
      if (r === 1 && this.openingOn && !(g.round === 1 && this.inOpening)) {   // the starting auction already closed: apply its stored result
        const m0 = mks[0];
        if (m0 && m0.final) clearOpeningAuction(this.state, { humanBids: m0.final.humanBids || {}, botBids: m0.final.botBids || {} });
      }
      const done = r < g.round || g.phase === 'results' || g.phase === 'final';
      const rows = decs.filter(d => d.round === r);
      if (this.live) {
        const mk = mks[r];
        this.state.liveBotBids = mk && mk.final ? mk.final.botBids : {};
        if (r === g.round && g.phase === 'market') { this.market = mk ? restoreMarket(this.state, mk) : openMarket(this.state); this.state.liveBotBids = undefined; }
      }
      if (done) {
        this._submitAll(r, rows); resolveRound(this.state);
        // host cash grants given after this round was worked out replay here, in the order they were given
        for (const gr of ((g.settings || {}).grants || [])) if (gr.after === r) grantCash(this.state, gr.amount);
      } else this._reapplyDives(r, rows);
    }
    if (this.live && g.phase === 'decide') this.winBids = Object.fromEntries(decs.filter(d => d.round === g.round).map(d => [d.team_id, (d.market || {}).bids || []]));
    this.sentSeq = this.state.events.length;
  }

  // ---- committed deep dives: the reading is immediate and cannot be taken back by removing the action ----
  _diveKey(a) { return a.lot ? 'lot:' + a.lot : 'pair:' + [...a.pair].sort().join('+'); }
  _reapplyDives(round, rows) {
    for (const row of rows) {
      const plan = planFromRow(row);
      for (const a of plan.actions) if (a.type === 'deepdive') this._commitDive(row.team_id, round, a);
    }
  }
  _commitDive(tid, round, a) {
    const k = round + '|' + tid, list = (this.committed[k] = this.committed[k] || {});
    const key = this._diveKey(a);
    if (list[key]) return false;
    applyDeepDives(this.state, tid, { actions: [a] }, estimate);
    list[key] = a; return true;
  }
  committedFor(tid) { return Object.values(this.committed[this.state.round + '|' + tid] || {}); }

  // A team saved a plan: reveal any new deep dives (if the plan still fits the attention limit) and refresh that team's view.
  ingest(row) {
    return this.run(async () => {
      if (!this.state || this.game.round < 1 || (this.game.phase !== 'decide' && this.game.phase !== 'market') || row.round !== this.game.round) return;
      const tid = row.team_id, plan = planFromRow(row);
      if (this.game.phase === 'market' && this.market && this.market.open) await this._marketIngest(tid, row);
      let changed = false;
      const dives = plan.actions.filter(a => a.type === 'deepdive');
      const withCommitted = { ...plan, actions: [...this.committedFor(tid).filter(c => !dives.some(d => this._diveKey(d) === this._diveKey(c))), ...plan.actions] };
      if (attentionUsed(withCommitted, this.live) <= attLimit(this.state, this.state.teams[tid])) {
        for (const a of dives) {
          const valid = a.lot ? !!this.state.lotsByKey[a.lot] : (a.pair && a.pair.length === 2);
          if (valid && this._commitDive(tid, row.round, a)) changed = true;
        }
      }
      if (this.game.phase === 'decide' && row.locked && this.checked[tid + '|' + row.round] !== row.locked_at) {
        this.checked[tid + '|' + row.round] = row.locked_at;
        const v = this._validateRow(tid, row);
        if (!v.ok) {
          await this.store.patchDecision(this.gid, tid, row.round, { locked: false, locked_by: null, locked_at: null, engine_error: v.errors.join(' ') });
        }
      }
      if (changed) await this.publishView(tid);
    });
  }
  _decisionFor(tid, row) {
    const plan = planFromRow(row), have = new Set(plan.actions.filter(a => a.type === 'deepdive').map(a => this._diveKey(a)));
    const extra = this.committedFor(tid).filter(a => !have.has(this._diveKey(a)));
    return { bids: plan.bids, builds: plan.builds, capital: plan.capital, actions: [...extra, ...plan.actions], why: row.why || '', predicted: row.predicted === null || row.predicted === undefined || row.predicted === '' ? null : Number(row.predicted) };
  }
  _validateRow(tid, row) { return validateDecisions(this.state, tid, this._decisionFor(tid, row)); }

  // Timeout rule (spec 05 section 1.8): keep the last saved plan, drop only what no longer fits.
  _prune(tid, dec) {
    const items = [
      ...dec.bids.map(v => ['bids', v]), ...dec.builds.map(v => ['builds', v]), ...dec.actions.map(v => ['actions', v]),
      ...Object.entries(dec.capital).filter(([, v]) => v !== null && v !== undefined).map(([k, v]) => ['capital', [k, v]]),
    ];
    const make = list => {
      const d = { bids: [], builds: [], actions: [], capital: {}, why: dec.why, predicted: dec.predicted };
      for (const [kind, v] of list) { if (kind === 'capital') d.capital[v[0]] = v[1]; else d[kind].push(v); }
      return d;
    };
    let list = items.filter(it => validateDecisions(this.state, tid, make([it])).ok);
    while (list.length && !validateDecisions(this.state, tid, make(list)).ok) list.pop();
    return { dec: make(list), dropped: items.length - list.length };
  }

  _submitAll(round, rows) {
    const humans = this.state.teamIds;
    const order = [...humans].sort((a, b) => {
      const ra = rows.find(r => r.team_id === a), rb = rows.find(r => r.team_id === b);
      const la = ra && ra.locked ? ra.locked_at : '9', lb = rb && rb.locked ? rb.locked_at : '9';
      return la < lb ? -1 : la > lb ? 1 : a < b ? -1 : 1;
    });
    const meta = {};
    for (const tid of order) {
      const row = rows.find(r => r.team_id === tid);
      if (!row) { meta[tid] = { why: '(not entered, timed out)', predicted: null, timeout: 'none' }; continue; }
      let dec = this._decisionFor(tid, row), timeout = null;
      const empty = !dec.bids.length && !dec.builds.length && !dec.actions.length && !Object.values(dec.capital).some(v => v !== null && v !== undefined);
      if (!row.locked) {
        timeout = empty && !row.why ? 'none' : 'saved';
        if (!dec.why) dec.why = '(not entered, timed out)';
      }
      const v = validateDecisions(this.state, tid, dec);
      if (!v.ok) { const p = this._prune(tid, dec); dec = p.dec; timeout = timeout || 'saved'; }
      submitDecisions(this.state, tid, dec);
      meta[tid] = { why: dec.why, predicted: dec.predicted, timeout };
    }
    return meta;
  }

  // ---- publishing ----
  async bumpRev(patch = {}) {
    this.game = await this.store.patchGame(this.gid, { rev: (this.game.rev || 0) + 1, ...patch });
  }
  async publishView(tid) {
    const view = buildTeamView(this.state, tid, (this.winBids || {})[tid] || []);
    view.committed = this.committedFor(tid);
    view.ts = Date.now(); view.news = this.newsItems();
    await this.store.putSnapshot(this.gid, this.state.round, 'view', tid, view);
    await this.bumpRev();
  }
  // Each headline also says which industries it could move and how, so a team page can show the news that matters to each business.
  newsItems() {
    const st = this.state;
    return st.events.filter(e => e.round === st.round && e.type === 'ticker').map((e, i) => {
      const eff = e.chain && chainById[e.chain] ? chainById[e.chain].stage3.effects : null;
      // the source and its grade are keyed draws, so a reload shows the same ones; a stage 2 report is more often a wire story, chatter is mostly noise
      const u = hash01(st.seed, 'news_src', st.round, i, e.chain || e.tag), w = e.stage === 2 ? [0.6, 0.9] : e.stage === 1 ? [0.3, 0.75] : [0.1, 0.35];
      const grade = u < w[0] ? 'A' : u < w[1] ? 'B' : 'C', pool = SOURCES[grade];
      const item = { tag: e.tag, text: degradeOdds(e.text, grade), stage: e.stage, grade, gradeWord: GRADE_WORD[grade], src: pool[Math.floor(hash01(st.seed, 'news_srcname', st.round, i, e.chain || e.tag) * pool.length)], ts: Date.now() };
      if (eff) {
        item.chain = e.chain; item.inds = Object.keys(eff); item.hits = Object.fromEntries(Object.entries(eff).map(([ind, x]) => [ind, effectWords(x)]));
        const sc = st.schedule.chains.find(c => c.id === e.chain);
        if (sc) { item.from = sc.activeFrom; item.to = Math.min(5, sc.activeTo); item.late = sc.activeFrom > 5; }
        item.swing = biggestSwing(eff);
      }
      return item;
    });
  }
  async publishViews() {
    for (const tid of this.state.teamIds) {
      const view = buildTeamView(this.state, tid, (this.winBids || {})[tid] || []);
      view.committed = this.committedFor(tid); view.ts = Date.now(); view.news = this.newsItems();
      await this.store.putSnapshot(this.gid, this.state.round, 'view', tid, view);
    }
  }
  async publishNews() { await this.store.putSnapshot(this.gid, this.state.round, 'news', '', { round: this.state.round, ticker: this.newsItems() }); }
  async publishEvents() {
    const rows = this.state.events.slice(this.sentSeq).map(e => {
      const { seq, round, type, team, text, ...rest } = e;
      return { seq, round, type, team_id: team || null, text, payload: rest };
    });
    if (rows.length) await this.store.addEvents(this.gid, rows);
    this.sentSeq = this.state.events.length;
  }

  // ---- phases ----
  clockFor(seconds, extra = {}) { return { endsAt: Date.now() + seconds * 1000, paused: false, remaining: null, total: seconds, ...extra }; }

  startGame() {
    return this.run(async () => {
      if (this.game.phase !== 'lobby') return;
      // Every seat nobody has claimed is played by AI from now on. The list is saved in the game settings so a reload rebuilds the same game.
      const seats = (await this.store.getSeats(this.gid)).filter(s => !s.removed), teams = await this.store.getTeams(this.gid);
      const ai = teams.map(t => t.team_id).filter(id => !seats.some(s => s.team_id === id));
      this.game = await this.store.patchGame(this.gid, { settings: { ...(this.game.settings || {}), aiTeams: ai } });
      await this.rebuild();
      await this.applyNames();
      await this.store.putSnapshot(this.gid, 0, 'public', '', buildPublic(this.state, 0));
      openRound(this.state, 1);
      await this.publishViews();
      await this.publishEvents();
      await this.publishNews();
      await this._openPlay(1);
    });
  }
  // Steven's asks 1 and 10 (2026-10-10): no news-reading phase and no separate steps. When a round opens, the market, the businesses,
  // the corporate actions and the lock are all open at once and stay open until the instructor closes the round.
  async _openPlay(round) {
    this.winBids = {};
    if (round === 1 && this.openingOn && !this.state.openingDone && this.state.lots.length) {
      this.market = openMarket(this.state);
      await this.publishMarket({ phase: 'market', round, reveal: { opening: true }, clock: this.clockFor(OPENING_SECONDS) });
    } else if (this.hasMarket()) {
      this.market = openMarket(this.state);
      await this.publishMarket({ phase: 'market', round, reveal: null, clock: this.clockFor((MARKET_SECONDS[round] || 0) + (DECIDE_SECONDS[round] || 0)) });
    } else await this.bumpRev({ phase: 'decide', round, reveal: null, clock: this.clockFor(DECIDE_SECONDS[round]) });
  }
  toDecide() {
    return this.run(async () => {
      if (this.game.phase !== 'news') return;
      await this.bumpRev({ phase: 'decide', clock: this.clockFor(DECIDE_SECONDS[this.game.round]) });
    });
  }

  // ---- the live market (phase 'market', between news and decide) ----
  hasMarket() { return this.live && this.state && this.state.lots.length > 0 && this.state.round <= 5; }   // round 5 has a market too (Steven, 2026-10-12)
  toMarket() {
    return this.run(async () => {
      if (this.game.phase !== 'news') return;
      this.market = openMarket(this.state); this.winBids = {};
      await this.publishMarket({ phase: 'market', clock: this.clockFor(MARKET_SECONDS[this.game.round]) });
    });
  }
  async publishMarket(patch = {}) {
    const snap = marketSnapshot(this.market, this.state);
    if (this.finalMarket) snap.final = this.finalMarket;
    await this.store.putSnapshot(this.gid, this.state.round, 'market', '', snap);
    await this.bumpRev(patch);
  }
  _restFor(tid, row) {
    const builds = ((row && row.market) || {}).builds || [];
    return builds.reduce((s, b) => { const lot = this.state.lotsByKey[b.lot]; return lot ? s + buildCostOf(this.state, tid, lot.unitId).actual : s; }, 0);
  }
  // A team saved a plan during the market: try each new bid in it, in the order they were made.
  async _marketIngest(tid, row) {
    const live = ((row.market || {}).live) || {}, m = this.market;
    const fresh = Object.entries(live).filter(([lot, b]) => b && m.seen[tid + '|' + lot] !== b.t).sort((a, b) => a[1].t - b[1].t);
    if (!fresh.length) return;
    let accepted = false;
    for (const [lot, b] of fresh) {
      m.seen[tid + '|' + lot] = b.t;
      const rest = this._restFor(tid, row);
      m.rests = m.rests || {}; m.rests[tid] = rest;
      // an alliance move is an invitation to a partner or the partner's acceptance; anything else is an ordinary bid
      const r = b.co === 'invite' ? proposeCoBid(m, this.state, tid, lot, b.ally, b.amount, rest)
        : b.co === 'join' ? joinCoBid(m, this.state, tid, lot, b.ally, rest)
        : placeBid(m, this.state, tid, lot, b.amount, rest);
      (m.acks[tid] = m.acks[tid] || {})[lot] = { t: b.t, ok: r.ok, reason: r.reason || '', amount: r.ok ? r.amount : Number(b.amount), ...(b.co ? { co: b.co, ally: b.ally } : {}) };
      if (r.ok) accepted = true;
    }
    const c = this.game.clock, patch = {};
    if (accepted && c && !c.paused && c.endsAt && c.endsAt - Date.now() < SNIPE_MS) patch.clock = { ...c, endsAt: Date.now() + SNIPE_MS };
    await this.publishMarket(patch);
  }
  botTick() {
    return this.run(async () => {
      if (this.game.phase !== 'market' || !this.market || !this.market.open) return [];
      const moves = marketBotTick(this.market, this.state);
      if (moves.length) await this.publishMarket();
      return moves;
    });
  }
  // Close the starting auction: the winners' prices clear at once (they own the company from here), the lots nobody won open as the
  // round-1 market, and every other control (capital requests, corporate actions, the lock) opens with it.
  closeOpeningNow() {
    return this.run(async () => {
      if (!this.inOpening || !this.market) return;
      // Class 10/13: the opening auction closed about a second after it opened (the Start press and a second press of the same button). A press in the
      // first five seconds is ignored, whoever sent it (the instructor's button or the clock).
      const ck = this.game.clock;
      if (ck && ck.total && ck.endsAt && Date.now() - (ck.endsAt - ck.total * 1000) < OPENING_MIN_MS) return;
      await this._closeOpening();
    });
  }
  async _closeOpening() {
    const m = this.market, out = closeMarket(m), snap0 = marketSnapshot(m, this.state);
    snap0.final = { results: out.results, botBids: out.botBids, humanBids: out.humanBids };
    await this.store.putSnapshot(this.gid, 0, 'market', '', snap0);
    clearOpeningAuction(this.state, { humanBids: out.humanBids, botBids: out.botBids });
    const rows = await this.store.getDecisions(this.gid, 1);
    for (const tid of this.state.teamIds) {
      const row = rows.find(x => x.team_id === tid), prev = (row && row.market) || {};
      let builds = prev.builds || [], note = null;
      // a build ordered on a company somebody just won is no longer possible (the lot is gone), so it is dropped
      const gone = builds.filter(b => !this.state.lotsByKey[b.lot]);
      if (gone.length) { builds = builds.filter(b => this.state.lotsByKey[b.lot]); note = 'A company you had ordered a build of was won by another team in the opening auction, so that build order was dropped.'; }
      // a build ordered during the auction is kept only if the team can still pay for it after what it won
      if (builds.length && this._restFor(tid, { market: { builds } }) + obligations(this.state, tid, { bids: [] }).total > budgetOf(this.state, tid) + 1e-9) { builds = []; note = 'Your build order was cancelled because your winning bids in the opening auction already use your cash.'; }
      // a Deep dive on a lot that has just been sold has done its job (the reading was shown); drop it from the plan and give the attention back
      const stale = a => a.type === 'deepdive' && a.lot && !this.state.lotsByKey[a.lot];
      const list = this.committed['1|' + tid] || {};
      for (const [k, a] of Object.entries(list)) if (stale(a)) delete list[k];
      const actions = planFromRow(row).actions.filter(a => !stale(a));
      await this.store.patchDecision(this.gid, tid, 1, { market: { bids: [], builds, live: {}, closed: false }, actions, ...(note ? { engine_error: note } : {}) });
    }
    this.winBids = {};
    this.openingResults = out.results;
    await this.store.putSnapshot(this.gid, 0, 'public', '', buildPublic(this.state, 0));
    await this.publishViews();
    await this.publishEvents();
    if (this.hasMarket()) {
      this.market = openMarket(this.state);
      await this.publishMarket({ phase: 'market', reveal: null, clock: this.clockFor((MARKET_SECONDS[2] || 0) + (DECIDE_SECONDS[1] || 0)) });
    } else {
      this.market = null;
      await this.bumpRev({ phase: 'decide', reveal: null, clock: this.clockFor(DECIDE_SECONDS[1]) });
    }
  }
  // Close the market: winners' final prices become ordinary bids on their plan, the bots get theirs, and the decide phase opens.
  closeMarketNow() {
    return this.run(async () => {
      if (this.game.phase !== 'market' || !this.market) return;
      await this._closeMarket();
      await this.bumpRev({ phase: 'decide', clock: this.clockFor(DECIDE_SECONDS[this.game.round]) });
    });
  }
  async _closeMarket() {
    const r = this.state.round, out = closeMarket(this.market);
    this.winBids = out.humanBids;
    this.state.liveBotBids = Object.fromEntries(this.state.botIds.map(id => [id, out.botBids[id] || []]));
    const rows = await this.store.getDecisions(this.gid, r);
    for (const tid of this.state.teamIds) {
      const row = rows.find(x => x.team_id === tid), prev = (row && row.market) || {};
      let builds = prev.builds || [], note = null;
      // a build ordered at the same moment as a winning bid can push a team over its cash: the bid stands, the build is cancelled
      const fee = 1 + feeRate(this.state, tid), wins = (out.humanBids[tid] || []).reduce((s, b) => s + b.amount * (b.ally ? 0.5 : 1) * fee, 0);
      const oblWin = obligations(this.state, tid, { bids: out.humanBids[tid] || [] }).total;
      if (builds.length && wins + this._restFor(tid, { market: { builds } }) + oblWin > budgetOf(this.state, tid) + 1e-9) { builds = []; note = 'Your build order was cancelled because your winning bids, plus the interest and running costs due at the end of the round, already use your cash.'; }
      await this.store.patchDecision(this.gid, tid, r, { market: { bids: out.humanBids[tid] || [], builds, live: {}, closed: true }, ...(note ? { engine_error: note } : {}) });
    }
    this.finalMarket = { results: out.results, botBids: this.state.liveBotBids };
    await this.publishMarket();
    this.finalMarket = null;
    await this.publishViews();
  }
  resolveNow() {
    return this.run(async () => {
      if (this.game.phase !== 'decide' && this.game.phase !== 'resolving') return;
      await this.bumpRev({ phase: 'resolving', clock: { ...this.game.clock, endsAt: null, paused: false, remaining: 0 } });
      const r = this.state.round;
      const rows = await this.store.getDecisions(this.gid, r);
      const meta = this._submitAll(r, rows);
      resolveRound(this.state);
      const pub = buildPublic(this.state, r);
      pub.ticker = [...pub.ticker];
      await this.store.putSnapshot(this.gid, r, 'public', '', pub);
      for (const tid of this.state.teamIds) await this.store.putSnapshot(this.gid, r, 'result', tid, buildResult(this.state, tid, r, meta[tid] || { why: '', predicted: null }));
      if (r >= 5) await this.store.putSnapshot(this.gid, 5, 'final', '', buildFinal(this.state));
      await this.publishEvents();
      await this.bumpRev({ phase: 'results', clock: null, reveal: { round: r, idx: -1 } });
    });
  }
  nextRound() {
    return this.run(async () => {
      if (this.game.phase !== 'results') return;
      const r = this.state.round;
      if (r >= 5) { await this.bumpRev({ phase: 'final', reveal: { round: 5, idx: -1, mode: 'standings', t: Date.now() } }); return; }
      await this.applyNames();
      this.winBids = {};
      openRound(this.state, r + 1);
      await this.publishViews();
      await this.publishNews();
      await this.publishEvents();
      await this._openPlay(r + 1);
    });
  }
  // Admin "Next" button label and action for the current phase.
  nextLabel(revealLabel) {
    const p = this.game.phase, r = this.game.round;
    if (p === 'lobby') return 'Start game';
    if (p === 'news') return this.hasMarket() ? 'Open the market' : 'Open decisions';
    if (p === 'market') return this.inOpening ? 'Close the opening auction' : 'Close the round';
    if (p === 'decide') return 'Work out the round';
    if (p === 'results') return revealLabel ? 'Reveal: ' + revealLabel : r >= 5 ? 'Show final standings' : 'Start round ' + (r + 1);
    return null;
  }
  // The one Advance button. In results it steps the reveal first (pubLen = how many reveal steps the round has), then opens the next round.
  advance(pubLen = 0) {
    const p = this.game.phase;
    if (p === 'lobby') return this.startGame();
    if (p === 'news') return this.hasMarket() ? this.toMarket() : this.toDecide();
    if (p === 'market' && this.inOpening) return this.closeOpeningNow();   // the starting auction: one press closes it and opens round 1 proper
    if (p === 'market') return this.closeMarketNow().then(() => this.resolveNow());   // one press closes the market and works out the round
    if (p === 'decide') return this.resolveNow();
    if (p === 'results') {
      const rv = this.game.reveal || { idx: -1 };
      if (rv.idx < pubLen - 1) return this.setReveal({ idx: rv.idx + 1 });
      return this.nextRound();
    }
    return Promise.resolve();
  }
  // End the game now: finish whatever is open, work out the round, and show the final standings.
  endGame() {
    return this.run(async () => {
      let p = this.game.phase;
      if (p === 'final' || p === 'lobby') return;
      if (p === 'market' && this.inOpening) { await this._closeOpening(); p = this.game.phase; }
      if (p === 'market') { await this._closeMarket(); p = 'decide'; await this.bumpRev({ phase: 'decide' }); }
      if (p === 'news' || p === 'decide') {
        const r = this.state.round, rows = await this.store.getDecisions(this.gid, r);
        const meta = this._submitAll(r, rows);
        resolveRound(this.state);
        await this.store.putSnapshot(this.gid, r, 'public', '', buildPublic(this.state, r));
        for (const tid of this.state.teamIds) await this.store.putSnapshot(this.gid, r, 'result', tid, buildResult(this.state, tid, r, meta[tid] || { why: '', predicted: null }));
        await this.publishEvents();
      }
      await this.store.putSnapshot(this.gid, this.state.round, 'final', '', buildFinal(this.state));
      await this.bumpRev({ phase: 'final', clock: null, reveal: { round: this.state.round, idx: -1, mode: 'standings', t: Date.now() } });
    });
  }

  // clock controls
  pause() { return this.run(async () => { const c = this.game.clock; if (!c || c.paused || !c.endsAt) return; await this.bumpRev({ clock: { ...c, paused: true, remaining: Math.max(0, c.endsAt - Date.now()), endsAt: null } }); }); }
  resume() { return this.run(async () => { const c = this.game.clock; if (!c || !c.paused) return; await this.bumpRev({ clock: { ...c, paused: false, endsAt: Date.now() + c.remaining, remaining: null } }); }); }
  addTime(sec) { return this.run(async () => { const c = this.game.clock; if (!c) return; await this.bumpRev({ clock: c.paused ? { ...c, remaining: c.remaining + sec * 1000 } : { ...c, endsAt: c.endsAt + sec * 1000 } }); }); }

  // Give every human table the same cash between rounds (results phase, rounds 1 to 4). AI seats and bots are untouched.
  // The grant is saved as {after, amount} in the game settings, so rebuild() replays it right after that round is worked out.
  grantAll(amount) {
    return this.run(async () => {
      amount = Number(amount);
      const r = this.state.round;
      if (this.game.phase !== 'results' || r < 1 || r >= 5) throw new Error('Cash can be given between rounds, while the results of rounds 1 to 4 are showing.');
      if (!(Number.isFinite(amount) && amount > 0 && amount <= GRANT_MAX)) throw new Error('Enter an amount from 1 to ' + GRANT_MAX + '.');
      grantCash(this.state, amount);
      const grants = [...((this.game.settings || {}).grants || []), { after: r, amount, at: new Date().toISOString() }];
      this.game = await this.store.patchGame(this.gid, { settings: { ...(this.game.settings || {}), grants } });
      await this.publishEvents();
      for (const tid of this.state.teamIds) {
        const old = (await this.store.getSnapshots(this.gid, { kind: 'result', round: r, teamId: tid }))[0];
        if (!old) continue;
        const data = { ...old.data, events: [...old.data.events, { type: 'host_grant', team: tid, amount, text: 'Host grant: +$' + amount + 'M. Your instructor added cash to every team.' }] };
        await this.store.putSnapshot(this.gid, r, 'result', tid, data);
      }
      await this.publishViews();
      await this.bumpRev();
    });
  }
  grantsGiven() { return ((this.game && this.game.settings) || {}).grants || []; }

  unlockTeam(tid, who = 'Admin') {
    return this.run(async () => {
      await this.store.patchDecision(this.gid, tid, this.game.round, { locked: false, locked_by: null, locked_at: null, engine_error: 'Your instructor unlocked the plan (' + who + ').' });
      delete this.checked[tid + '|' + this.game.round];
    });
  }

  // reveal queue for the round in "results": auctions, then six industries, then the economic summary
  revealLength(pub) { return (pub ? pub.auctions.length : 0) + 6 + 1; }
  setReveal(patch) { return this.run(async () => { await this.bumpRev({ reveal: { ...(this.game.reveal || {}), ...patch } }); }); }

  async exportAll(seats, decisions) {
    const log = exportLog(this.state);
    return { ...log, gameRow: this.game, seats: seats.map(({ secret, ...rest }) => rest), savedPlans: decisions, exportedAt: new Date().toISOString() };
  }
}
