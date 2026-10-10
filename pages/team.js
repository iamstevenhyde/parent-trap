// Team page controller: join and rejoin, live sync, role gating, autosave, lock, overlays.
// The page never touches the engine. It reads the team view, results and final snapshots the admin publishes,
// and writes only its own saved plan (pt_decisions) back.

import { $, h, friendlyError, fmtM, mmss, params, setParam, pageMode, safeGet, safeSet, safeSessionGet, safeSessionSet, toast, debounce } from './util.js';
import { installGlossary } from './glossary.js';
import { openStore, savedSeat, saveSeat, forgetSeat, resumeSeat, lookupCode, takeNewSeat, takeOverSeat, heartbeat } from './supa.js';
import { roleFor, can, planFromRow, attentionUsed, meter, lockReason, activeSeats } from './roles.js';
import { renderTopBar, renderNews, renderBusinesses, renderActions, renderMarket, renderLock, renderSteps } from './team_zones.js';
import { flowFor, liveBidPatch } from './flow.js';
import { resultsOverlay, resolvingOverlay, capabilitiesPanel, historyPanel, autopsy } from './team_overlays.js';

const app = document.getElementById('app');
const S = {
  store: null, gid: null, info: null, game: null, teams: [], seats: [], decisions: [], view: null, results: {}, final: null,
  rev: -1, round: -1, market: null, phaseSeen: '', pending: {}, ui: {}, tab: 'biz', drawer: null, dirty: false, offline: false, savedAt: '', msg: '', unsub: null,
};
const mode = pageMode();

// ---------- small screens ----------
function screen(...kids) { app.replaceChildren(devBar(), h('div.center', kids)); }
function devBar() {
  if (mode !== 'local') return h('div');
  const sel = h('select', { id: 'seatSwitch', onchange: async e => { const [gid, seatId] = e.target.value.split('|'); if (!seatId) return; const seats = await S.store.getSeats(gid); const st = seats.find(x => x.id === seatId); if (!st) return; saveSeat({ gameId: gid, teamId: st.team_id, seatId: st.id, secret: st.secret }); location.search = '?g=' + gid; } },
    [h('option', { value: '' }, 'Switch seat...'), ...(S.allSeats || []).map(x => h('option', { value: x.game_id + '|' + x.id, selected: S.info && x.id === S.info.seatId }, x.team_id + ' / ' + x.name + (x.roleLabel ? ' / ' + x.roleLabel : '')))]);
  const g = S.gid ? '?g=' + S.gid : '';
  return h('div.devbar', [h('b', 'LOCAL MODE'), ' one browser, no Supabase. ', sel,
    h('a', { href: 'admin.html' + g, target: '_blank' }, 'admin'), h('a', { href: 'projector.html' + g, target: '_blank' }, 'projector'), h('a', { href: 'team.html' + g, target: '_blank' }, 'new team tab')]);
}

function joinScreen(note) {
  const hint = params().get('g');
  const code = h('input#code', { type: 'text', maxLength: 4, placeholder: 'ABCD', autocomplete: 'off', value: (params().get('code') || '').toUpperCase(), oninput: e => { e.target.value = e.target.value.toUpperCase(); } });
  const name = h('input#myname', { type: 'text', placeholder: 'Your name' });
  const out = h('div#joinout');
  const go = async () => {
    out.replaceChildren();
    const r = await lookupCode(S.store, code.value, hint);
    if (r.error) { out.append(h('p.warnline', r.error)); return; }
    S.gid = r.game.id;
    const seats = (await S.store.getSeats(r.game.id)).filter(x => x.team_id === r.team.team_id && !x.removed);
    const list = h('div.seatlist', [h('p', [h('b', 'Team ' + r.team.name + '.'), ' Which one is you?'])]);
    for (const st of seats) {
      const live = Date.now() - new Date(st.last_seen || 0).getTime() < 60000;
      list.append(h('button.seatbtn', { type: 'button', onclick: async () => {
        if (live && !confirm(st.name + ' looks connected on another laptop. Take over?')) return;
        const res = await takeOverSeat(S.store, r.game, st); begin(res.info);
      } }, st.name));
    }
    list.append(h('button.seatbtn.new', { type: 'button', onclick: async () => {
      const res = await takeNewSeat(S.store, r.game, r.team, name.value);
      if (res.error) { out.append(h('p.warnline', res.error)); return; }
      begin(res.info);
    } }, 'New seat' + (name.value ? ' as ' + name.value : '')));
    out.append(list);
  };
  screen(h('h1', 'The Parent Trap'), note ? h('p.banner', note) : null, h('p', 'Enter your team code.'), h('div.row', [code, name, h('button.go#joinbtn', { type: 'button', onclick: go }, 'Join')]), out);
}

function endedScreen(game, info) {
  screen(h('h1', 'That game is over.'), h('p', 'Want to see your team\'s results?'),
    h('button.go', { type: 'button', onclick: () => begin(info) }, 'See results'), h('button.ghost', { type: 'button', onclick: () => { forgetSeat(info.gameId); setParam('g', null); S.gid = null; joinScreen(); } }, 'Join a new game'));
}

// ---------- start, sync ----------
async function boot() {
  installGlossary();
  S.store = await openStore();
  const hintG = params().get('g');
  const saved = savedSeat(hintG);
  if (saved && (!hintG || saved.gameId === hintG)) {
    const r = await resumeSeat(S.store, saved);
    if (r.status === 'ok' || r.status === 'replaced') { S.gid = saved.gameId; return begin(saved, r.status === 'ok'); }
    if (r.status === 'gameover') return endedScreen(r.game, saved);
    if (r.status === 'removed') return joinScreen('Your seat was removed. Enter a join code or ask your instructor.');
    if (r.status === 'nogame') return joinScreen('We could not find that game. Enter a join code.');
  }
  joinScreen(hintG ? null : null);
}

async function begin(info, welcome) {
  S.info = info; S.gid = info.gameId; setParam('g', info.gameId);
  if (S.unsub) S.unsub();
  S.rev = -1; S.round = -1;
  S.unsub = S.store.subscribe(S.gid, debounce(() => refresh(), 90));
  await refresh();
  if (welcome) toast('Welcome back.');
  setInterval(tick, 250);
  setInterval(() => { if (S.seat) heartbeat(S.store, S.seat).catch(() => {}); }, 30000);
  window.addEventListener('online', () => { S.offline = false; flush(); });
  window.addEventListener('offline', () => { S.offline = true; render(); });
}

async function refresh() {
  const st = S.store;
  const g = await st.getGame(S.gid);
  if (!g) { forgetSeat(S.gid); return joinScreen('We could not find that game. Enter a join code.'); }
  S.game = g;
  const [teams, seats] = await Promise.all([st.getTeams(S.gid), st.getSeats(S.gid)]);
  S.teams = teams; S.seats = seats;
  const me = seats.find(x => x.id === S.info.seatId);
  if (!me || me.removed) { forgetSeat(S.gid); return joinScreen('Your seat was removed. Enter a join code or ask your instructor.'); }
  if (me.secret !== S.info.secret) return screen(h('h1', 'Your seat moved to another laptop.'), h('button.go', { type: 'button', onclick: async () => { const r = await takeOverSeat(st, g, me); begin(r.info); } }, 'Take it back'));
  S.seat = me;
  if (S.phaseSeen !== g.phase) { S.phaseSeen = g.phase; if (g.phase === 'market') S.tab = 'mkt'; else if (g.phase === 'decide') S.tab = 'biz'; }
  S.decisions = g.round > 0 ? await st.getDecisions(S.gid, g.round) : [];
  if (S.rev !== g.rev || S.round !== g.round) {
    S.rev = g.rev; S.round = g.round;
    const myTeam = me.team_id;
    if (g.round > 0) { const v = await st.getSnapshots(S.gid, { kind: 'view', round: g.round, teamId: myTeam }); S.view = v[0] ? v[0].data : null; }
    if (g.round > 0 && S.view && S.view.liveAuction) { const mk = await st.getSnapshots(S.gid, { kind: 'market', round: g.round }); S.market = mk[0] ? mk[0].data : null; } else S.market = null;
    const rs = await st.getSnapshots(S.gid, { kind: 'result', teamId: myTeam });
    S.results = Object.fromEntries(rs.map(x => [x.round, x.data]));
    if (g.phase === 'final') { const f = await st.getSnapshots(S.gid, { kind: 'final' }); S.final = f[0] ? f[0].data : null; }
  }
  if (mode === 'local') S.allSeats = (await Promise.all((await st.listGames(5)).map(async gm => (await st.getSeats(gm.id)).map(x => ({ ...x, roleLabel: x.game_id === S.gid ? roleFor(seats, x, g.round).label : '' }))))).flat();
  render();
}

// ---------- writes ----------
const COLS = ['capital', 'actions', 'market', 'why', 'predicted', 'locked', 'locked_by', 'locked_at', 'lock_left', 'notes', 'engine_error'];
function myRow() {
  const srv = S.decisions.find(d => d.team_id === S.seat.team_id) || {};
  return { capital: {}, actions: [], market: { bids: [], builds: [] }, why: '', predicted: null, locked: false, notes: [], ...srv, ...S.pending };
}
let flushTimer = null;
function write(patch, quiet) {
  const view = S.view;
  if (patch.actions && view) {
    const have = patch.actions.map(a => JSON.stringify(a));
    patch = { ...patch, actions: [...(view.committed || []).filter(c => !have.includes(JSON.stringify(c))), ...patch.actions] };
  }
  S.pending = { ...S.pending, ...patch };
  S.savedAt = '';
  clearTimeout(flushTimer);
  flushTimer = setTimeout(flush, quiet ? 350 : 60);
  if (quiet) updateLockUI(); else render();
}
async function flush() {
  const send = S.pending;
  if (!Object.keys(send).length) return;
  try {
    await S.store.patchDecision(S.gid, S.seat.team_id, S.game.round, send);
    S.offline = false;
    // keep the sent values in the local copy of the server row until the next refresh, so the screen never flickers back
    let mine = S.decisions.find(d => d.team_id === S.seat.team_id);
    if (!mine) { mine = { team_id: S.seat.team_id, round: S.game.round }; S.decisions.push(mine); }
    Object.assign(mine, send);
    for (const k of Object.keys(send)) if (S.pending[k] === send[k]) delete S.pending[k];
    const d = new Date(); S.savedAt = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    updateLockUI();
  } catch (e) { S.offline = true; flushTimer = setTimeout(flush, 3000); render(); }
}
function lock() {
  const row = myRow();
  write({ locked: true, locked_by: S.seat.name, locked_at: new Date().toISOString(), lock_left: Math.round(clockLeft() / 1000), engine_error: null, capital: row.capital, actions: row.actions, market: row.market, why: row.why, predicted: row.predicted });
}

// ---------- derived state ----------
function clockLeft() { const c = S.game && S.game.clock; if (!c) return 0; return c.paused ? c.remaining : Math.max(0, (c.endsAt || 0) - Date.now()); }
function buildCtx() {
  const g = S.game, view = S.view, row = myRow();
  const role = roleFor(S.seats, S.seat, g.round);
  const plan = planFromRow(row);
  if (view) { const have = plan.actions.map(a => JSON.stringify(a)); plan.actions = [...(view.committed || []).filter(c => !have.includes(JSON.stringify(c))), ...plan.actions]; }
  const locked = !!row.locked;
  const mates = activeSeats(S.seats, S.seat.team_id);
  const ceo = mates.find(x => can(roleFor(S.seats, x, g.round), 'lock'));
  const seatedTeams = S.teams.filter(t => S.seats.some(x => x.team_id === t.team_id && !x.removed)).length;
  const invites = [];
  if (view) for (const d of S.decisions) {
    if (d.team_id === S.seat.team_id) continue;
    for (const b of ((d.market || {}).bids || [])) {
      if (b.ally !== S.seat.team_id || !view.lots.some(l => l.key === b.lot) || plan.bids.some(x => x.lot === b.lot) || (S.ui.declined || {})[d.team_id + b.lot]) continue;
      invites.push({ lot: b.lot, from: d.team_id, fromName: (S.teams.find(t => t.team_id === d.team_id) || {}).name || d.team_id });
    }
  }
  const ctx = {
    game: g, view, row, plan, role, locked, phase: g.phase, ui: S.ui, teamName: (S.teams.find(t => t.team_id === S.seat.team_id) || {}).name || '', seatName: S.seat.name,
    clockLeft: clockLeft(), seats: S.seats, invites, ceoName: ceo ? ceo.name : 'the CEO', savedAt: S.savedAt,
    lockedCount: S.decisions.filter(d => d.locked).length, seatedTeams,
    editable: perm => !locked && can(role, perm) && !S.offline && (g.phase === 'decide' || (g.phase === 'market' && perm === 'market')),
    notesFor: perm => (row.notes || []).filter(n => n.perm === perm),
    write, lock, rerender: () => render(), toast,
    suggest: perm => { const t = prompt('One line for the ' + perm + ' owner:'); if (t) write({ notes: [...(row.notes || []), { perm, from: S.seat.name, text: t, ts: Date.now() }] }); },
    meter: view ? meter(view, plan) : { total: 0, free: 0, short: 0 },
    requireWhy: (g.settings || {}).requireWhy !== false,
    market: S.market, live: !!(view && view.liveAuction), hasMarket: !!(view && view.liveAuction && view.lots.length && g.round <= 4),
    liveBid: (lot, amount) => {
      const t = Date.now() * 1000 + (S.bidSeq = ((S.bidSeq || 0) + 1) % 1000);
      write(liveBidPatch(row.market, lot, amount, t));
    },
  };
  if (view && S.market && g.phase === 'market') {
    const led = S.market.lots.filter(l => l.high && l.high.team === S.seat.team_id), sum = led.reduce((s, l) => s + l.price * (1 + view.feeRate), 0);
    const oblNow = (S.market.obl || {})[view.teamId], base = ctx.meter.total - ctx.meter.obl + sum + (oblNow === undefined ? ctx.meter.obl : oblNow);
    ctx.led = led; ctx.meter = { ...ctx.meter, total: base, free: view.budget - base, short: Math.max(0, base - view.budget), obl: oblNow === undefined ? ctx.meter.obl : oblNow };
  } else ctx.led = [];
  const wins = plan.bids.length;
  const jobName = perm => { const m = mates.find(x => can(roleFor(S.seats, x, g.round), perm)); return m ? m.name : ''; };
  ctx.flow = flowFor({ names: { deals: jobName('market'), ceo: jobName('lock'), cfo: jobName('capital'), ops: jobName('ops') }, phase: g.phase, round: g.round, live: ctx.live, hasMarket: ctx.hasMarket, role, locked, ledCount: ctx.led.length, wonCount: wins, lockedCount: ctx.lockedCount, seatedTeams, requireWhy: ctx.requireWhy });
  return ctx;
}
function updateLockUI() {
  if (!S.view || !S.game) return;
  const ctx = buildCtx(), btn = $('.lockbtn'), rs = $('.reason');
  if (btn) { const r = lockReason(ctx.view, ctx.plan, ctx.row.why, ctx.row.predicted, ctx.game.round, { requireWhy: ctx.requireWhy }); btn.disabled = !!r || ctx.phase !== 'decide'; if (rs) rs.textContent = r || 'Ready to lock.'; }
  const sv = $('.saved'); if (sv && S.savedAt) sv.textContent = 'Saved ' + S.savedAt;
}

// ---------- render ----------
const typing = () => { const a = document.activeElement; return a && a.matches && a.matches('input[type=text],input[type=number],textarea,select') && app.contains(a); };
document.addEventListener('focusout', () => setTimeout(() => { if (S.dirty && !typing()) render(); }, 30));

function tick() {
  const t = $('#timer');
  if (t && S.game && S.game.clock) t.textContent = (S.game.clock.paused ? 'PAUSED ' : '') + mmss(clockLeft()) + ' left';
}

function lobbyPanel(ctx) {
  const team = S.teams.find(t => t.team_id === S.seat.team_id);
  const mates = activeSeats(S.seats, S.seat.team_id);
  const nameIn = h('input#teamname', { type: 'text', value: team.name, maxLength: 30, disabled: !!team.renamed });
  return h('section.lobby', [
    h('h2', 'Waiting for the instructor to start.'),
    h('p', ['Your team: ', nameIn, h('button', { type: 'button', disabled: !!team.renamed, onclick: async () => { await S.store.upsertTeam({ game_id: S.gid, team_id: team.team_id, name: nameIn.value.trim() || team.name, renamed: true }); toast('Team name saved.'); } }, team.renamed ? 'Name is set' : 'Save name')]),
    h('p.sub', 'You can change the team name once, here in the lobby.'),
    h('h3', 'Your team (' + mates.length + ' seats)'),
    ...mates.map(x => h('div.matesrow', [h('b', x.name), ' ' + roleFor(S.seats, x, 1).label + (x.id === S.seat.id ? ' (you)' : '')])),
    h('p.sub', 'Roles move one step each round, so everyone gets to be CEO at some point.'),
  ]);
}

function render() {
  if (!S.game || !S.seat) return;
  if (typing()) { S.dirty = true; return; }
  S.dirty = false;
  const ctx = buildCtx(), g = S.game, scroll = { y: window.scrollY };
  const root = h('div.teamapp');
  root.append(devBar());
  if (S.offline) root.append(h('div.offline', 'Offline. Your last choices are saved.'));
  if (g.phase === 'lobby' || !ctx.view) {
    root.append(renderTopBar({ ...ctx, view: null }), lobbyPanel(ctx));
    if (g.phase !== 'lobby') root.append(h('p', 'Waiting for the round to load...'));
    app.replaceChildren(root); return;
  }
  root.append(renderTopBar(ctx), renderSteps(ctx));
  if (ctx.live && ['news', 'market', 'decide'].includes(g.phase) && ctx.view.obl && ctx.view.obl.total > ctx.view.budget + 1e-9) root.append(h('p.banner.insolvent', 'Warning: about ' + fmtM(Math.ceil(ctx.view.obl.total)) + ' of interest and running costs come due at the end of this round, and your cash plus credit line is ' + fmtM(Math.floor(ctx.view.budget)) + '. Unless your businesses earn enough this round, the game will sell your weakest business. The market will not let you bid, and the lock will not accept new spending.'));
  // role rotation banner (spec 01 section 13): shown during the news phase when the job changed since last round
  const key = 'pt_role_' + S.gid + '_' + S.seat.id, last = safeGet(key);
  if (g.phase === 'news' && last) {
    const [lbl, rd] = last.split('|');
    if (Number(rd) < g.round && lbl !== ctx.role.label) root.append(h('p.banner.rot', 'New round, new job. You are now ' + ctx.role.label + '.'));
  }
  if (g.phase === 'decide') safeSet(key, ctx.role.label + '|' + g.round);
  if (ctx.phase !== 'final') root.append(renderNews(ctx));
  // tabs for narrow screens
  root.append(h('nav.tabs', [['biz', 'My Businesses'], ['act', 'Actions'], ['mkt', 'Market']].map(([k, l]) => h('button' + (S.tab === k ? '.on' : ''), { type: 'button', onclick: () => { S.tab = k; render(); } }, l))));
  const zones = h('main.zones', { dataset: { tab: S.tab, phase: g.phase } }, [renderBusinesses(ctx), renderActions(ctx), renderMarket(ctx)]);
  const reallyReadOnly = g.phase === 'news' || g.phase === 'results' || g.phase === 'resolving' || g.phase === 'final';
  if (reallyReadOnly) zones.classList.add('frozen');
  root.append(zones);
  if (g.phase !== 'final' && g.phase !== 'market') root.append(renderLock(ctx));
  root.append(h('footer.toolbar', [
    h('button', { type: 'button', onclick: () => { S.drawer = 'caps'; render(); } }, 'Capabilities'),
    h('button', { type: 'button', onclick: () => { S.drawer = 'hist'; render(); } }, 'History'),
    g.phase === 'results' ? h('button', { type: 'button', onclick: () => { safeSessionSet('pt_dismiss_' + S.gid + '_' + g.round, ''); render(); } }, 'Show round results') : null,
  ]));
  // overlays
  if (g.phase === 'resolving') root.append(resolvingOverlay());
  const res = S.results[g.phase === 'results' ? g.round : -1];
  if (res && safeSessionGet('pt_dismiss_' + S.gid + '_' + g.round) !== '1') root.append(resultsOverlay(ctx, res, () => { safeSessionSet('pt_dismiss_' + S.gid + '_' + g.round, '1'); render(); }));
  if (g.phase === 'final') {
    const row = S.final && S.final.rows.find(r => r.id === S.seat.team_id);
    root.append(h('section.finalbox', [h('h2', 'Game over. Watch the big screen for the replay.'), row ? autopsy(row) : h('p', 'Your team\'s autopsy is loading...')]));
  }
  if (S.drawer) root.append(h('div.overlay', { onclick: e => { if (e.target.classList.contains('overlay')) { S.drawer = null; render(); } } }, [S.drawer === 'caps' ? capabilitiesPanel(ctx.view) : historyPanel(S.results), h('button.go.closebtn', { type: 'button', onclick: () => { S.drawer = null; render(); } }, 'Close')]));
  app.replaceChildren(root);
  window.scrollTo(0, scroll.y);
}

window.__pt = { S, write, refresh, render };
boot().catch(e => { console.error(e); screen(h('h1', 'Something went wrong.'), h('p#fatal', friendlyError(e))); });
