// The engine host. Runs in the admin's browser: holds the engine state, takes the teams' saved plans from the store,
// resolves rounds, and writes snapshots and events back. The engine files are used as they are; nothing here edits them.
//
// The engine is deterministic, so the whole game can be rebuilt from seed + team count + bot count + the stored plans
// (rebuild()). That is how an admin reload, or a second admin laptop, picks the game up where it was.

import { createGame, openRound, submitDecisions, validateDecisions, resolveRound } from '../engine/engine.js';
import { applyDeepDives } from '../engine/core.js';
import { estimate } from '../engine/model.js';
import { buildTeamView, buildPublic, buildResult, buildFinal, exportLog } from './views.js';
import { planFromRow, attentionUsed } from './roles.js';
import { makeCode, makeGameId } from './util.js';
import { buildCostOf, feeRate, budgetOf, obligations } from '../engine/model.js';
import { MARKET_SECONDS, SNIPE_MS, openMarket, restoreMarket, placeBid, botTick as marketBotTick, closeMarket, marketSnapshot } from './market.js';

export const NEWS_SECONDS = 60;
export const RESULT_STEP_SECONDS = 9;   // auto-advance only: how long each results reveal stays up
export const DECIDE_SECONDS = { 1: 360, 2: 360, 3: 360, 4: 480, 5: 300 };
export const DEFAULT_NAMES = ['Alpine Holdings', 'Frontier Capital', 'Summit Partners', 'Rangeview Group', 'Bitterroot Capital', 'Sawtooth Holdings', 'Teton Ventures', 'Wasatch Partners', 'Sagebrush Capital', 'Bighorn Group'];

export function newGameRow({ seed, teams, bots }, opts = {}) {
  const id = makeGameId();
  return {
    id, seed: seed || Math.floor(10000 + Math.random() * 89999), team_count: teams, bot_count: bots, phase: 'lobby', round: 0,
    clock: null, reveal: null, rev: 0, status: 'active', admin_key: makeCode(8),
    settings: { autoResolve: true, liveAuction: opts.liveAuction !== false, requireWhy: opts.requireWhy !== false, autoAdvance: false },
  };
}

export class Host {
  constructor(store, gameId) { this.store = store; this.gid = gameId; this.state = null; this.game = null; this.queue = Promise.resolve(); this.sentSeq = 0; this.checked = {}; this.committed = {}; this.market = null; this.winBids = {}; }
  get live() { return !!(this.game && this.game.settings && this.game.settings.liveAuction); }

  // Run one thing at a time, so realtime callbacks and button clicks never overlap.
  run(fn) { const p = this.queue.then(fn); this.queue = p.catch(e => console.error(e)); return p; }

  async createNew({ seed, teams, bots, liveAuction = true, requireWhy = true }) {
    const row = newGameRow({ seed, teams, bots }, { liveAuction, requireWhy });
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
    this.state = createGame(g.seed, g.team_count, { botCount: g.bot_count, liveAuction: this.live });
    await this.applyNames();
    const decs = await this.store.getDecisions(this.gid);
    const mks = this.live ? Object.fromEntries((await this.store.getSnapshots(this.gid, { kind: 'market' })).map(x => [x.round, x.data])) : {};
    this.committed = {}; this.market = null;
    for (let r = 1; r <= g.round; r++) {
      openRound(this.state, r);
      const done = r < g.round || g.phase === 'results' || g.phase === 'final';
      const rows = decs.filter(d => d.round === r);
      if (this.live) {
        const mk = mks[r];
        this.state.liveBotBids = mk && mk.final ? mk.final.botBids : {};
        if (r === g.round && g.phase === 'market') { this.market = mk ? restoreMarket(this.state, mk) : openMarket(this.state); this.state.liveBotBids = undefined; }
      }
      if (done) { this._submitAll(r, rows); resolveRound(this.state); } else this._reapplyDives(r, rows);
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
      if (attentionUsed(withCommitted, this.live) <= this.state.cfg.ATT_PER_ROUND) {
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
  newsItems() { return this.state.events.filter(e => e.round === this.state.round && e.type === 'ticker').map(e => ({ tag: e.tag, text: e.text, stage: e.stage, ts: Date.now() })); }
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
      await this.applyNames();
      await this.store.putSnapshot(this.gid, 0, 'public', '', buildPublic(this.state, 0));
      openRound(this.state, 1);
      await this.publishViews();
      await this.publishEvents();
      await this.publishNews();
      await this.bumpRev({ phase: 'news', round: 1, clock: this.clockFor(NEWS_SECONDS), reveal: null });
    });
  }
  toDecide() {
    return this.run(async () => {
      if (this.game.phase !== 'news') return;
      await this.bumpRev({ phase: 'decide', clock: this.clockFor(DECIDE_SECONDS[this.game.round]) });
    });
  }

  // ---- the live market (phase 'market', between news and decide) ----
  hasMarket() { return this.live && this.state && this.state.lots.length > 0 && this.state.round <= 4; }
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
      const r = placeBid(m, this.state, tid, lot, b.amount, this._restFor(tid, row));
      (m.acks[tid] = m.acks[tid] || {})[lot] = { t: b.t, ok: r.ok, reason: r.reason || '', amount: r.ok ? r.amount : Number(b.amount) };
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
      const fee = 1 + feeRate(this.state, tid), wins = (out.humanBids[tid] || []).reduce((s, b) => s + b.amount * fee, 0);
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
      await this.bumpRev({ phase: 'news', round: r + 1, clock: this.clockFor(NEWS_SECONDS), reveal: null });
    });
  }
  // Admin "Next" button label and action for the current phase.
  nextLabel(revealLabel) {
    const p = this.game.phase, r = this.game.round;
    if (p === 'lobby') return 'Start game';
    if (p === 'news') return this.hasMarket() ? 'Open the market' : 'Open decisions';
    if (p === 'market') return 'Close the market';
    if (p === 'decide') return 'Work out the round';
    if (p === 'results') return revealLabel ? 'Reveal: ' + revealLabel : r >= 5 ? 'Show final standings' : 'Start round ' + (r + 1);
    return null;
  }
  // The one Advance button. In results it steps the reveal first (pubLen = how many reveal steps the round has), then opens the next round.
  advance(pubLen = 0) {
    const p = this.game.phase;
    if (p === 'lobby') return this.startGame();
    if (p === 'news') return this.hasMarket() ? this.toMarket() : this.toDecide();
    if (p === 'market') return this.closeMarketNow();
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
