// Admin controller (spec 05 section 3). Hosts the engine, drives the phase machine, shows join codes, lock status,
// seat controls, the event log and the export. The game id lives in the URL (?g=PT-7K2M); the whole game state is in
// the store, so a reload (or a second laptop) resumes the same game.

import { $, h, friendlyError, params, setParam, pageMode, safeSessionGet, safeSessionSet, download, debounce, mmss, toast, uid } from './util.js';
import { openStore } from './supa.js';
import { Host, RESULT_STEP_SECONDS } from './host.js';
import { ROLE_DEFS, ROLE_KEYS, ROLES_ON, roleFor, activeSeats, planFromRow, attentionUsed } from './roles.js';
import { exportLog } from './views.js';

const app = document.getElementById('app');
const mode = pageMode();
const A = { store: null, host: null, gid: null, teams: [], seats: [], decisions: [], pub: null, pubRev: -1, events: [], seen: {}, filter: '', locksAt: 0, rendered: '' };

async function boot() {
  A.store = await openStore();
  A.gid = params().get('g');
  if (A.gid) {
    A.host = new Host(A.store, A.gid);
    const g = await A.host.load();
    if (!g) { A.gid = null; A.host = null; A.msg = 'That game was not found. Pick one from Open games.'; }
    else if (mode === 'live') {
      const k = params().get('k') || safeSessionGet('pt_admin_' + A.gid);
      if (k !== g.admin_key) { A.host = null; A.needKey = true; }
      else { safeSessionSet('pt_admin_' + A.gid, k); setParam('k', null); }
    }
  }
  if (A.needKey) {
    app.replaceChildren(h('div.admin', [h('h1', 'Admin key needed'), h('input#akey', { type: 'text', placeholder: 'Admin key' }), h('button.go', { type: 'button', onclick: () => { location.search = '?g=' + A.gid + '&k=' + $('#akey').value.trim(); } }, 'Open')]));
    return;
  }
  if (A.gid) A.store.subscribe(A.gid, debounce(refresh, 80));
  A.open = A.gid ? [] : await A.store.listGames(10);
  await refresh();
  setInterval(tick, 500);
  window.__pt = { A, get host() { return A.host; } };
}

async function refresh() {
  if (!A.host) return render();
  const st = A.store, host = A.host;
  const g = await st.getGame(A.gid);
  if (g) { host.game = { ...g }; }
  [A.teams, A.seats] = await Promise.all([st.getTeams(A.gid), st.getSeats(A.gid)]);
  host.teams = A.teams;
  A.decisions = g && g.round > 0 ? await st.getDecisions(A.gid, g.round) : [];
  if (g && (g.phase === 'decide' || g.phase === 'market')) for (const d of A.decisions) { const k = d.team_id + '|' + d.round; if (A.seen[k] !== d.updated_at) { A.seen[k] = d.updated_at; host.ingest(d); } }
  if (g && A.pubRev !== g.rev && g.round > 0 && (g.phase === 'results' || g.phase === 'final')) { const p = await st.getSnapshots(A.gid, { kind: 'public', round: g.round }); A.pub = p[0] ? p[0].data : null; A.pubRev = g.rev; }
  if (g && A.scoreRev !== g.rev && host.state && g.round > 0 && (g.phase === 'results' || g.phase === 'final')) { A.scoreRev = g.rev; A.scoreOK = exportLog(host.state).scoreCheck.allDecompositionsSum; }
  A.events = host.state ? host.state.events.slice(-200) : [];
  const dg = JSON.stringify([g && g.phase, g && g.round, g && g.rev, g && g.reveal, g && g.clock && g.clock.paused, A.teams, A.seats.map(({ last_seen, connected_at, ...r }) => r), A.decisions.map(d => [d.team_id, d.locked, d.engine_error, (d.actions || []).length]), A.events.length, A.filter, A.msg, A.scoreOK]);
  const a = document.activeElement;
  if (dg === A.digest || (a && a.matches && a.matches('select,input[type=text],input[type=number]') && app.contains(a))) { return; }
  A.digest = dg;
  render();
}

function seatedTeamIds() { return A.teams.filter(t => A.seats.some(x => x.team_id === t.team_id && !x.removed)).map(t => t.team_id); }
function lockedIds() { return A.decisions.filter(d => d.locked).map(d => d.team_id); }
function clockLeft() { const c = A.host && A.host.game && A.host.game.clock; if (!c) return 0; return c.paused ? c.remaining : Math.max(0, (c.endsAt || 0) - Date.now()); }

let autoTimer = null, lastBot = 0, lastResultStep = 0;
// The results are one report now (Steven's ask 11), so there is no reveal queue to step through: pubLen is 0 and Advance goes straight on.
function pubLen() { return 0; }
function tick() {
  const host = A.host; if (!host || !host.game) return;
  const g = host.game, c = $('#clock'); if (c) c.textContent = g.clock ? (g.clock.paused ? 'PAUSED ' : '') + mmss(clockLeft()) : '--:--';
  const set = g.settings || {}, auto = set.autoAdvance === true;
  if (g.phase === 'market' && Date.now() - lastBot > 1200) { lastBot = Date.now(); host.botTick(); }
  // Advance on timers is opt-in. With it off the clock only counts; the instructor presses Advance.
  if (auto && g.clock && !g.clock.paused && g.clock.endsAt && Date.now() > g.clock.endsAt + 300 && ['news', 'market', 'decide'].includes(g.phase)) { host.advance(pubLen()).then(refresh); return; }
  if (auto && g.phase === 'results' && Date.now() - lastResultStep > RESULT_STEP_SECONDS * 1000) { lastResultStep = Date.now(); host.advance(pubLen()).then(refresh); }
  if ((set.autoResolve !== false) && (g.phase === 'decide' || g.phase === 'market')) {
    const seated = seatedTeamIds(), locked = lockedIds();
    if (seated.length && seated.every(t => locked.includes(t))) {
      if (!autoTimer) autoTimer = setTimeout(() => { autoTimer = null; if (host.game.phase === 'decide' || host.game.phase === 'market') host.advance(pubLen()).then(refresh); }, 2500);
    } else if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
  }
}

// ---------- pieces ----------
function createPanel() {
  const seed = h('input#seed', { type: 'number', placeholder: 'blank = random' }), teams = { value: 20 }, bots = { value: 0 }, live = h('input#livecb', { type: 'checkbox', checked: true }), why = h('input#whycb', { type: 'checkbox', checked: false });
  return h('section.panel', [h('h2', 'New game'),
    h('div.row', [h('label', ['Seed ', seed]), h('span.sub', 'Always 20 seats. Seats nobody claims by Start are played by AI.'), h('label', [live, ' Live auction (off = sealed bids)']), h('label', [why, ' Ask for a why sentence (off by default)']),
      h('button.go#create', { type: 'button', onclick: async () => {
        try {
          const host = new Host(A.store, null);
          const g = await host.createNew({ seed: seed.value ? Number(seed.value) : null, teams: 20, bots: 0, liveAuction: live.checked, requireWhy: why.checked });
          safeSessionSet('pt_admin_' + g.id, g.admin_key); setParam('g', g.id); A.gid = g.id; A.host = host; A.msg = 'Game ' + g.id + ' created. Seed ' + g.seed + '.';
          A.store.subscribe(A.gid, debounce(refresh, 80));
          await refresh();
        } catch (e) {
          A.msg = mode === 'live' ? 'LIVE MODE cannot create a game: ' + (e.message || e) + '. The Supabase tables are probably not set up yet (paste pages/schema.sql into the Supabase SQL editor). To test on this laptop with no Supabase, open admin.html?local=1 on localhost.' : 'Could not create the game: ' + (e.message || e);
          await refresh(); render();
        }
      } }, 'Create game')])]);
}
function openGames() {
  return h('section.panel', [h('h2', 'Open games'), !A.open || !A.open.length ? h('p', 'No games yet.') : h('table', A.open.map(g => h('tr', [h('td', g.id), h('td', g.phase + ' / round ' + g.round), h('td', 'seed ' + g.seed), h('td', h('button', { type: 'button', onclick: () => { location.search = '?g=' + g.id; } }, 'Resume'))])))]);
}

function codesPanel() {
  const g = A.host.game, mates = id => activeSeats(A.seats, id);
  const rows = A.teams.map(t => {
    const seats = mates(t.team_id), live = A.seats.filter(x => x.team_id === t.team_id && !x.removed);
    return h('div.teamrow', { dataset: { team: t.team_id } }, [
      h('div.trhead', [h('b', t.team_id + ' ' + t.name), ' code ', h('span.code', t.join_code), ' (' + live.length + ' seated)',
        h('button', { type: 'button', onclick: async () => { let c; do { c = Math.random().toString(36).slice(2, 6).toUpperCase().replace(/[01OI]/g, 'X'); } while (c.length < 4); await A.store.upsertTeam({ game_id: A.gid, team_id: t.team_id, join_code: c }); toast('New code for ' + t.name + ': ' + c); } }, 'Reissue code'),
        mode === 'local' ? h('a', { href: 'team.html?g=' + A.gid + '&code=' + t.join_code, target: '_blank' }, 'open team page') : null]),
      ...seats.map(st => {
        const r = roleFor(A.seats, st, g.round), ago = st.last_seen ? Math.round((Date.now() - new Date(st.last_seen).getTime()) / 1000) : null;
        return h('div.seatrow', [st.name, h('span.sub', ' ' + r.label + (ago !== null ? ', seen ' + (ago < 90 ? ago + 's' : Math.round(ago / 60) + 'm') + ' ago' : '')),
          !ROLES_ON ? null : h('select', { title: 'Reassign role', onchange: async e => { await A.store.upsertSeat({ id: st.id, game_id: A.gid, team_id: st.team_id, slot: st.slot, role_override: e.target.value || null }); } },
            [h('option', { value: '' }, 'Auto role'), ...ROLE_KEYS.map(k => h('option', { value: k, selected: st.role_override === k }, ROLE_DEFS[k].label))]),
          h('button', { type: 'button', onclick: async () => { await A.store.upsertSeat({ id: st.id, game_id: A.gid, team_id: st.team_id, slot: st.slot, removed: true }); } }, 'Remove seat')]);
      }),
    ]);
  });
  return h('section.panel', [h('h2', 'Join codes'), h('div.row', [h('button', { type: 'button', onclick: () => { const txt = A.teams.map(t => t.name + ': ' + t.join_code).join('\n'); navigator.clipboard && navigator.clipboard.writeText(txt); toast('Codes copied.'); } }, 'Copy all'),
    h('a', { href: 'projector.html?g=' + A.gid + '&k=' + A.host.game.admin_key, target: '_blank' }, 'Show on projector')]), ...rows]);
}

// The control booth: one primary button (Start, then Advance), one End button, two settings. Everything else is under More.
// A collapsible section that stays open or shut across redraws (the page redraws on every change).
function det(key, title, child, defOpen = false, cls = '') {
  A.det = A.det || {};
  const open = key in A.det ? A.det[key] : defOpen;
  return h('details' + cls, { open, ontoggle: e => { A.det[key] = e.target.open; } }, [h('summary', title), child]);
}
function recommended(g, seated, locked) {
  const host = A.host, r = g.round;
  switch (g.phase) {
    case 'lobby': return seated.length < 1 ? 'Waiting for the first student to join.' : seated.length + ' of 20 seats are claimed. Press Start when everyone is in; the other ' + (20 - seated.length) + ' seats will be played by AI.';
    case 'news': return 'Old-style news phase (a game started before the change). ' + (host.hasMarket() ? 'Advance opens the live market.' : 'Advance opens decisions.');
    case 'market': return locked.length + ' of ' + seated.length + ' teams have locked. The market, businesses and actions are all open. Advance closes the market and works out the round.';
    case 'decide': return locked.length + ' of ' + seated.length + ' teams have locked. ' + (locked.length >= seated.length && seated.length ? 'Everyone is in; the round works out by itself.' : 'Advance works out the round with the saved plans.');
    case 'resolving': return 'Working out the round.';
    case 'results': { const i = (g.reveal || { idx: -1 }).idx + 1; return i < pubLen() ? 'Advance steps through the results (' + i + ' of ' + pubLen() + ' shown).' : (r >= 5 ? 'Advance shows the final standings.' : 'Results are done. Advance starts round ' + (r + 1) + '.'); }
    case 'final': return 'The game is over. Open the replay on the projector.';
    default: return '';
  }
}
function controlsPanel() {
  const host = A.host, g = host.game, set = g.settings || {};
  const seated = seatedTeamIds(), locked = lockedIds();
  const waiting = g.phase === 'lobby' && seated.length < 1;
  const reveal = g.reveal || { idx: -1 };
  const revLabel = g.phase === 'results' && reveal.idx + 1 < pubLen() ? revealLabel(reveal.idx + 1) : '';
  const label = host.nextLabel(revLabel);
  const unlockedTeams = A.teams.filter(t => seated.includes(t.team_id) && !locked.includes(t.team_id));
  const unseated = A.teams.filter(t => !seated.includes(t.team_id));
  const unl = g.phase === 'decide' ? A.teams.filter(t => locked.includes(t.team_id)).map(t => h('button', { type: 'button', onclick: () => host.unlockTeam(t.team_id) }, 'Unlock ' + t.team_id)) : [];
  const setting = (key, text, def) => h('label.setting', [h('input', { type: 'checkbox', id: 'set_' + key, checked: key in set ? set[key] !== false : def, onchange: e => A.store.patchGame(A.gid, { settings: { ...(g.settings || {}), [key]: e.target.checked } }).then(refresh) }), ' ' + text]);
  return h('section.panel.booth', [
    h('div.boothrow', [
      h('div.boothstate', [h('span.smallcaps', g.round ? 'Round ' + g.round + ' of 5' : 'Lobby'), h('b#phasebig', g.phase.toUpperCase()), h('span#nextwhy.sub', recommended(g, seated, locked))]),
      g.phase === 'lobby' && mode === 'local' && unseated.length ? h('button#demoseat', { type: 'button', onclick: async () => { const now = new Date().toISOString(); for (const t of unseated) await A.store.upsertSeat({ id: uid(10), game_id: A.gid, team_id: t.team_id, name: 'Demo ' + t.team_id, slot: 0, role_override: 'solo', secret: uid(10), removed: false, connected_at: now, last_seen: now }); await refresh(); } }, 'Seat all teams (demo)') : null,
      label && g.phase !== 'final' ? h('button.go.big#next', { type: 'button', disabled: waiting, onclick: async () => {
        if ((g.phase === 'decide' || g.phase === 'market') && unlockedTeams.length && !confirm(unlockedTeams.length + ' teams have not locked. Their last saved plans will be used. Continue?')) return;
        await host.advance(pubLen()); await refresh();
      } }, waiting ? 'Waiting for teams to join' : (g.phase === 'lobby' ? label : 'Advance: ' + label)) : null,
      g.phase !== 'lobby' && g.phase !== 'final' ? h('button.danger#end', { type: 'button', onclick: async () => { if (confirm('End the game now? The current round is worked out and the final standings show on the projector.')) { await host.endGame(); await refresh(); } } }, 'End game') : null,
    ]),
    h('div.row.settings', [
      setting('autoAdvance', 'Advance on timers', false),
      setting('requireWhy', 'Ask for a why sentence (off by default)', false),
      h('span.sub', 'Live auction: ' + (host.live ? 'on' : 'off') + ' (set when the game was created)'),
    ]),
    h('p#lockstatus', g.phase === 'decide' || g.phase === 'market' ? 'Lock status: ' + locked.length + '/' + seated.length + '. ' + unlockedTeams.map(t => t.name + ' not locked (' + describeSaved(t.team_id) + ')').join('. ') : ''),
    A.decisions.some(d => d.engine_error) ? h('p.warnline', A.decisions.filter(d => d.engine_error).map(d => d.team_id + ': ' + d.engine_error).join(' ')) : null,
    det('more', 'More controls', h('div.row', [
      g.clock && !g.clock.paused ? h('button#pause', { type: 'button', onclick: () => host.pause().then(refresh) }, 'Pause clock') : (g.clock ? h('button#pause', { type: 'button', onclick: () => host.resume().then(refresh) }, 'Resume clock') : null),
      g.clock ? h('button', { type: 'button', onclick: () => host.addTime(60).then(refresh) }, '+1 min') : null,
      g.phase === 'decide' || g.phase === 'market' ? h('button#force', { type: 'button', onclick: async () => { if (confirm('This works out the round now with every saved plan.')) { await host.advance(pubLen()); await refresh(); } } }, 'Work out now') : null,
      ...unl,
      h('button#export', { type: 'button', onclick: async () => { const data = await host.exportAll(A.seats, A.decisions); const d = new Date(), p = n => String(n).padStart(2, '0'); const text = JSON.stringify(data, null, 1); download('parent-trap-' + A.gid + '-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + '.json', text); } }, 'Export game'),
      h('label', [h('input#autores', { type: 'checkbox', checked: set.autoResolve !== false, onchange: e => A.store.patchGame(A.gid, { settings: { ...(g.settings || {}), autoResolve: e.target.checked } }) }), ' Work out the round when every team has locked']),
    ]), false, '.more'),
  ]);
}
function describeSaved(tid) {
  const d = A.decisions.find(x => x.team_id === tid);
  if (!d) return 'nothing saved';
  const p = planFromRow(d); return 'saved plan, ' + attentionUsed(p) + ' action' + (attentionUsed(p) === 1 ? '' : 's');
}
function revealLabel(i) {
  if (!A.pub) return '';
  const n = A.pub.auctions.length;
  if (i < n) return 'auction ' + A.pub.auctions[i].name;
  if (i < n + 6) return A.pub.industries[i - n].label;
  if (i === n + 6) return 'Economic summary';
  return '';
}

function eventLog() {
  const evs = [...A.events].reverse().filter(e => !A.filter || e.team === A.filter).slice(0, 30);
  return h('section.panel', [h('h2', 'Event log (last 30)'),
    h('select#evfilter', { onchange: e => { A.filter = e.target.value; render(); } }, [h('option', { value: '' }, 'All teams'), ...A.teams.map(t => h('option', { value: t.team_id, selected: A.filter === t.team_id }, t.name))]),
    h('div.log', evs.map(e => h('div.logrow', [h('span.sub', 'R' + e.round + ' ' + (e.team || '') + ' '), e.text])))]);
}
function warnings() {
  const w = [], g = A.host.game;
  if (g.phase !== 'lobby') for (const t of A.teams) {
    const live = A.seats.filter(x => x.team_id === t.team_id && !x.removed);
    if (live.length && live.every(x => Date.now() - new Date(x.last_seen || 0).getTime() > 120000)) w.push(t.name + ' has no seat connected for 2 minutes.');
  }
  if (A.scoreOK === false) w.push('Score mismatch between leaderboard and debrief.');
  return w.length ? h('section.panel.warn', w.map(x => h('p', x))) : null;
}

function render() {
  const host = A.host;
  if (!host || !host.game) {
    app.replaceChildren(h('div.admin', [h('header.ahead', [h('b', 'ADMIN'), mode === 'local' ? h('span.local', ' LOCAL MODE') : null]), A.msg ? h('p.banner', A.msg) : null, mode === 'live' ? h('p.banner', 'LIVE MODE (Supabase). If Create game fails, the Supabase tables are not set up yet. For a test on this laptop with no Supabase, open this page from localhost (http://localhost:8080/pages/admin.html) or add ?local=1.') : h('p.banner', 'LOCAL TEST MODE: everything stays in this browser. Create a game, click Seat all teams (demo), then Start game.'), createPanel(), openGames()]));
    return;
  }
  const g = host.game, st = g.phase.toUpperCase() + (g.round ? ' (round ' + g.round + ')' : '');
  const link = (f, extra = '') => h('a', { href: f + '?g=' + A.gid + extra, target: '_blank' }, f.replace('.html', ''));
  app.replaceChildren(h('div.admin', [
    h('header.ahead', [h('b', 'ADMIN'), ' Game: ', h('b#gid', A.gid), h('span.sub', ' (url ?g=' + A.gid + ')'), ' Status: ', h('b#status', st), ' Clock ', h('b#clock', g.clock ? mmss(clockLeft()) : '--:--'),
      mode === 'local' ? h('span.local', ' LOCAL MODE ') : null, ' ', link('team.html'), ' ', link('projector.html', '&k=' + g.admin_key)]),
    A.msg ? h('p.banner', A.msg) : null,
    warnings(), controlsPanel(),
    det('codes', 'Join codes and seats', codesPanel(), g.phase === 'lobby'),
    det('log', 'Event log', eventLog()),
    det('new', 'New game', createPanel()),
  ]));
}

boot().catch(e => { console.error(e); app.replaceChildren(h('div.admin', h('h1', 'Something went wrong.'), h('p#fatal', friendlyError(e)))); });
