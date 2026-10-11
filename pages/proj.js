// Projector controller (spec 05 section 2). Read-only. It renders what the admin publishes: public snapshots per round,
// news per round, the final snapshot, plus the game row for phase, clock and the reveal queue.
// Admin shortcuts (page opened with ?k=ADMINKEY): P pauses the clock, Space steps the reveal.

import { $, h, friendlyError, fmtM, fmtBig, fmtSigned, mmss, params, setParam, pageMode, debounce } from './util.js';
import { installGlossary } from './glossary.js';
import { openStore } from './supa.js';
import { PieBoard } from './pies.js';
import { IND, IND_ORDER, icon, AUCTIONEER } from './art.js';
import { autopsy, AUTOPSY_ROWS } from './team_overlays.js';

const app = document.getElementById('app');
const mode = pageMode();
const P = {
  store: null, gid: null, game: null, teams: [], seats: [], decisions: [], publics: {}, news: {}, newsAt: {}, final: null, rev: -1,
  shown: -1, board: null, revealKey: '', timers: [], breaking: null, breakQ: [], seenBreak: new Set(), replay: null, view: 'world', autopsy: null, adminKey: params().get('k'),
};
const SVGEL = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); SVGEL.setAttribute('id', 'pies');
const ROUND_NAMES = ['Setup', 'Build', 'Operate', 'Adapt', 'Restructure', 'Commit'];

async function boot() {
  installGlossary();
  P.store = await openStore();
  P.gid = params().get('g');
  if (!P.gid) {
    const list = await P.store.listGames(10);
    if (list.length === 1 || (mode === 'local' && list.length)) { P.gid = list[0].id; setParam('g', P.gid); } else {
      app.replaceChildren(h('div.pj-center', [h('h1', 'THE PARENT TRAP'), h('p.big', 'Open this page with the game id in the address, like projector.html?g=PT-7K2M.'), ...list.map(g => h('p', h('a', { href: '?g=' + g.id }, g.id + ' (' + g.phase + ')')))]));
      return;
    }
  }
  P.store.subscribe(P.gid, debounce(refresh, 100));
  await refresh();
  setInterval(tick, 200);
}

async function refresh() {
  const st = P.store, g = await st.getGame(P.gid);
  if (!g) { app.replaceChildren(h('div.pj-center', h('h1', 'That game was not found.'))); return; }
  P.game = g;
  const [teams, seats] = await Promise.all([st.getTeams(P.gid), st.getSeats(P.gid)]);
  P.teams = teams; P.seats = seats;
  P.decisions = g.round > 0 ? await st.getDecisions(P.gid, g.round) : [];
  if (P.rev !== g.rev) {
    P.rev = g.rev;
    const pubs = await st.getSnapshots(P.gid, { kind: 'public' });
    P.publics = Object.fromEntries(pubs.map(x => [x.round, x.data])); P.pubAt = Object.fromEntries(pubs.map(x => [x.round, x.updated_at]));
    const nws = await st.getSnapshots(P.gid, { kind: 'news' });
    P.news = Object.fromEntries(nws.map(x => [x.round, x.data.ticker])); P.newsAt = Object.fromEntries(nws.map(x => [x.round, x.updated_at]));
    if (g.phase === 'final') { const f = await st.getSnapshots(P.gid, { kind: 'final' }); P.final = f[0] ? f[0].data : null; }
  }
  if (P.mkRev !== g.rev && g.round > 0 && ['market', 'decide'].includes(g.phase)) {
    P.mkRev = g.rev;
    const mk = await st.getSnapshots(P.gid, { kind: 'market', round: g.round });
    P.market = mk[0] ? mk[0].data : null;
  }
  // Seat heartbeats and the like change nothing on screen, so only redraw when something visible changed.
  if (g.phase === 'final') resetBreaking();
  const key = [g.phase, g.round, g.reveal ? g.reveal.idx : 'x', g.rev, P.teams.map(t => t.name).join(), P.seats.filter(x => !x.removed).length, g.clock && g.clock.paused].join('|');
  if (key !== P.lastKey) { P.lastKey = key; render(); }
}

const clockLeft = () => { const c = P.game && P.game.clock; if (!c) return 0; return c.paused ? c.remaining : Math.max(0, (c.endsAt || 0) - Date.now()); };
const shownRound = () => (P.game.phase === 'results' || P.game.phase === 'final' ? P.game.round : Math.max(0, P.game.round - 1));
const pubOf = r => P.publics[r] || P.publics[Math.max(0, r - 1)] || P.publics[0];

function phaseLabel() {
  const g = P.game, seated = seatedTeams(), lockedN = P.decisions.filter(d => d.locked).length;
  if (g.clock && g.clock.paused) return 'PAUSED';
  switch (g.phase) {
    case 'lobby': return 'WAITING';
    case 'news': return 'READ THE NEWS';
    case 'market': return 'ROUND OPEN';
    case 'decide': return seated && lockedN >= seated ? 'LOCKED IN' : 'DECIDE';
    case 'resolving': return 'WORKING IT OUT';
    case 'results': return 'RESULTS';
    case 'final': return 'FINAL';
    default: return '';
  }
}
const seatedTeams = () => P.teams.filter(t => P.seats.some(x => x.team_id === t.team_id && !x.removed)).length;

function tick() {
  if (!P.game) return;
  const t = $('#bigtimer'), left = clockLeft();
  if (t) {
    const live = P.game.clock && (P.game.phase === 'news' || P.game.phase === 'market' || P.game.phase === 'decide');
    t.textContent = live || (P.game.clock && P.game.clock.paused) ? mmss(left) : '--:--';
    t.classList.toggle('dim', !(live || (P.game.clock && P.game.clock.paused)));
    t.parentElement.className = 'pj-timer' + (live && left <= 20000 ? ' red' : live && left <= 60000 ? ' amber' : '') + (P.game.clock && P.game.clock.paused ? ' paused' : '');
  }
  const ph = $('#phaselabel'); if (ph) ph.textContent = phaseLabel();
  const lc = $('#lockcount'); if (lc) lc.textContent = lockText();
  const bk = $('#breaking'); if (bk) { bk.style.display = P.breaking ? 'block' : 'none'; bk.textContent = P.breaking || ''; }
  if (!P.breaking && P.breakQ.length) { P.breaking = P.breakQ.shift(); clearTimeout(P.breakTimer); P.breakTimer = setTimeout(() => { P.breaking = null; }, 10000); }
}
const lockText = () => (P.game.phase === 'decide' || P.game.phase === 'market') ? P.decisions.filter(d => d.locked).length + ' of ' + (seatedTeams() || P.teams.length) + ' teams locked' : '';

function queueBreaking(text) { if (!P.seenBreak.has(text)) { P.seenBreak.add(text); P.breakQ.push(text); } }
// Moving to a new reveal step drops banners that belong to the previous step, so a banner never describes a lot that is gone.
function resetBreaking() { P.breakQ = []; P.breaking = null; clearTimeout(P.breakTimer); }

// ---------- ticker ----------
function tickerItems() {
  const g = P.game, items = [];
  const age = ts => { const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000); return m < 1 ? 'just now' : m + 'm ago'; };
  for (let r = g.round; r >= 1; r--) {
    if (r <= shownRound()) {
      const pub = P.publics[r];
      if (pub) for (const a of pub.auctions) if (a.winners.length) items.push({ tag: 'Deal', tier: 'Hard data', text: a.winners.join(' and ') + ' bought ' + a.name + ' for ' + fmtM(a.price) + '.', ts: P.pubAt[r] });
    }
    for (const n of P.news[r] || []) items.push({ tag: n.tag || 'Markets', tier: n.stage === 0 ? 'Chatter' : 'Forecast', text: n.text, ts: P.newsAt[r] });
  }
  return items.slice(0, 24).map(i => ({ ...i, age: age(i.ts) }));
}
// The chyron lives outside the page frame so a redraw never restarts it.
const CH = { key: '', x: 0, last: 0, half: 0, widths: [], items: [], rot: 0, rotAt: 0 };
const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const chSpeed = () => Math.max(70, Math.round(window.innerWidth * 0.09));   // px per second: about 173 at 1920 wide
function chItemEl(i) { return h('span.tk', [h('span.chip.' + i.tag.toLowerCase(), i.tag), h('span.tier.' + i.tier.toLowerCase().replace(' ', ''), i.tier), ' ' + i.text]); }
function updateChyron() {
  const box = document.getElementById('chyron'); if (!box || !P.game) return;
  const items = tickerItems(), key = JSON.stringify(items.map(i => [i.tag, i.text]));
  if (key === CH.key && box.firstChild) return;
  CH.key = key; CH.items = items;
  if (!items.length) { box.replaceChildren(h('span.tk-empty', 'Markets are quiet.')); CH.half = 0; return; }
  const track = h('div.tk-track', [...items.map(chItemEl), ...items.map(chItemEl)]);
  track.style.cssText = 'display:inline-flex;gap:80px;white-space:nowrap;will-change:transform';
  box.replaceChildren(track);
  CH.track = track; CH.rot = 0;
  queueMicrotask(() => {
    const kids = [...track.children], n = items.length;
    CH.widths = kids.slice(0, n).map(k => k.getBoundingClientRect().width);
    CH.half = kids[n] ? kids[n].offsetLeft : track.scrollWidth / 2;
    if (CH.x < -CH.half) CH.x = 0;
  });
}
function chyronFrame(ts) {
  requestAnimationFrame(chyronFrame);
  const box = document.getElementById('chyron'); if (!box || !CH.track || !CH.half) return;
  const dt = CH.last ? Math.min(0.25, (ts - CH.last) / 1000) : 0; CH.last = ts;
  if (reduced()) {
    if (ts - CH.rotAt > 8000) { CH.rotAt = ts; CH.rot = (CH.rot + 1) % CH.items.length; CH.track.style.transform = 'translateX(' + (-CH.track.children[CH.rot].offsetLeft) + 'px)'; }
    return;
  }
  CH.x -= chSpeed() * dt;
  if (CH.x <= -CH.half) CH.x += CH.half;
  CH.track.style.transform = 'translateX(' + CH.x.toFixed(1) + 'px)';
}
// Seconds each headline is on screen at the current speed, for the test: from first pixel in to last pixel out, and fully visible.
function chyronStats() {
  const W = window.innerWidth, v = chSpeed();
  return { speed: v, screen: W, items: CH.items.map((i, k) => ({ text: i.text, width: CH.widths[k] || 0, onScreenSec: ((W + (CH.widths[k] || 0)) / v), fullyVisibleSec: Math.max(0, (W - (CH.widths[k] || 0)) / v), words: i.text.split(/\s+/).length })) };
}

// ---------- frame ----------
function frame(body) {
  const g = P.game, pub = pubOf(shownRound()), tot = pub ? pub.totalValue : 0, start = pub ? pub.startTotal : 0;
  const chg = start ? (tot / start - 1) * 100 : 0;
  return h('div.pj', [
    h('header.pj-head', [
      h('div.pj-title', [h('b', 'THE PARENT TRAP'), h('span', g.round ? 'Round ' + g.round + ': ' + ROUND_NAMES[g.round] : 'Lobby')]),
      h('div.pj-timer', [h('div#bigtimer.big', '--:--'), h('div#phaselabel.phase', phaseLabel()), h('div#lockcount.lockc', lockText())]),
      h('div.pj-total', [h('span', 'Total market value'), h('b', fmtBig(tot)), h('span', (chg >= 0 ? '+' : '') + chg.toFixed(0) + '% since start')]),
    ]),
    h('div#breaking.pj-breaking', { style: 'display:none' }),
    h('main.pj-body', body),
    h('div.pj-ticker-spacer'),
  ]);
}

// ---------- screens ----------
function lobbyBody() {
  const joined = P.teams.filter(t => P.seats.some(x => x.team_id === t.team_id && !x.removed)).length;
  const base = location.href.split('?')[0].replace('projector.html', 'team.html');
  return h('div.pj-lobby', [
    h('h1', 'Waiting for teams.'),
    h('p.big', ['Join at ', h('b', base), ' with your team code.']),
    h('p.big', joined + ' of ' + P.teams.length + ' seats claimed. Seats nobody claims are played by AI.'),
    h('div.codes', P.teams.map(t => h('div.codecard', [h('b', t.name), h('span.code', t.join_code), h('span', P.seats.filter(x => x.team_id === t.team_id && !x.removed).length + ' seated')]))),
  ]);
}

function leaderboardEl(pub, showDelta = true) {
  return h('aside.pj-board' + (pub.board.length > 18 ? '.dense2.dense3' : pub.board.length > 12 ? '.dense2' : pub.board.length > 8 ? '.dense' : ''), [h('h3', 'Leaderboard'), ...pub.board.map(r => h('div.lbrow' + (r.isBot ? '.bot' : ''), { dataset: { team: r.id, ev: r.ev } }, [
    h('span.rk', r.rank), h('span.nm', r.name, r.isBot ? h('em.ai', 'AI') : null), h('span.vl', fmtBig(r.ev)), showDelta ? h('span.dl.' + (r.delta >= 0 ? 'up' : 'down'), r.delta ? fmtSigned(r.delta) : '') : null]))]);
}

// Steven's asks 1, 2, 10 and 12: while a round is open the news sits under the pies, and the live auction takes the leaderboard's slot.
function newsPanel() {
  const items = P.news[P.game.round] || [];
  if (!items.length || !['market', 'decide'].includes(P.game.phase)) return null;
  return h('section.pj-newspanel', [h('div.np-grid' + (items.length > 4 ? '.many' : ''), items.map(n => h('div.nitem', [h('span.chip.' + (n.tag || '').toLowerCase(), n.tag), ' ' + n.text])))]);
}
// With a long list the sister companies ("... North", "... East") would all look the same once cut short, so keep the suffix and trim the front.
function shortLot(name) { const m = / (North|South|East|West)$/.exec(name), base = m ? name.slice(0, m.index) : name, lim = m ? 12 : 17, cut = base.length > lim + 1 ? base.slice(0, lim - 1).trim() + '…' : base; return cut + (m ? m[0] : ''); }
function auctionPanel() {
  const m = P.market;
  if (!m) return h('aside.pj-board', [h('h3', 'Live auction'), h('p', 'Opening...')]);
  const prev = P.prevPrices || {}, next = {}, n = m.lots.length;
  const rows = m.lots.map(l => {
    next[l.key] = l.price;
    const bumped = prev[l.key] !== undefined && prev[l.key] !== l.price;
    return h('div.aurow' + (bumped ? '.bump' : '') + (l.high ? '.held' : ''), { dataset: { lot: l.key, price: l.price === null ? '' : l.price } }, [
      icon(l.ind, 26), h('span.an', n > 12 ? shortLot(l.name) : l.name), h('b.ap', l.price === null ? fmtM(l.opening) : fmtM(l.price)),
      h('span.al', l.high ? [l.high.name, l.high.bot ? h('em.ai', 'AI') : null] : (l.fixed ? 'listed by ' + l.sellerName : 'no bids')),
    ]);
  });
  P.prevPrices = next;
  const led = m.lots.filter(l => l.high).length;
  return h('aside.pj-board.pj-auction-slot' + (n > 12 ? '.dense3' : n > 5 ? '.dense2' : ''), [h('h3', 'Live auction'), h('p.sub', led + ' of ' + n + ' have a leader. Highest price when the round closes takes the company.'), h('div.aulist', rows)]);
}
function worldBody() {
  const pub = pubOf(shownRound());
  if (!pub) return lobbyBody();
  const svg = h('div.pj-pies', SVGEL);
  const legend = h('div.pj-legend', IND_ORDER.map(k => h('span', [icon(k, 34), ' ' + IND[k].label])));
  const right = P.game.phase === 'market' ? auctionPanel() : leaderboardEl(pub);
  const wrap = h('div.pj-world', [h('div.pj-left', [svg, newsPanel(), legend]), right]);
  queueMicrotask(() => drawPies(pub, shownRound(), P.game.phase === 'results'));
  return wrap;
}
// One persistent SVG and one PieBoard, so a re-render of the page never restarts the 3 second tween.
function drawPies(pub, round, animateOk) {
  if (!P.board) P.board = new PieBoard(SVGEL, { width: 1300, height: 600 });
  const key = round + '|' + (P.pubAt[round] || '');
  if (P.boardKey === key) return;
  const first = P.boardKey === undefined;
  P.boardKey = key;
  const ref = Math.max(...Object.values(P.publics).flatMap(p => p.teams.map(t => t.ev)), 1);
  P.board.set(pub.teams, { animate: !first && animateOk, ref });
}

function newsBody() {
  const items = P.news[P.game.round] || [];
  const pub = pubOf(shownRound());
  return h('div.pj-newsscreen', [h('section.pj-newsbig', [h('h2', 'The news'), ...(items.length ? items : [{ tag: 'Markets', text: 'Quiet morning.' }]).map(n => h('div.nitem', [h('span.chip.' + (n.tag || '').toLowerCase(), n.tag), ' ' + n.text]))]), pub ? leaderboardEl(pub, false) : null]);
}

// ---- the live market ----
function marketBody() {
  const m = P.market, g = P.game;
  if (!m) return h('div.pj-newsscreen', h('h2', 'The market is opening...'));
  const prev = P.prevPrices || {}, next = {};
  const cards = m.lots.map(l => {
    next[l.key] = l.price;
    const bumped = prev[l.key] !== undefined && prev[l.key] !== l.price;
    const lead = l.high ? [h('span.ml', l.fixed ? 'Taken by ' : 'Leader '), h('b.mn', l.high.name), l.high.bot ? h('em.ai', 'AI') : null] : [h('span.ml', l.fixed ? 'Listed by ' + l.sellerName + '. First to take it gets it.' : 'No bids yet')];
    return h('article.mk-card' + (bumped ? '.bump' : '') + (l.high ? '.held' : ''), { dataset: { lot: l.key, price: l.price === null ? '' : l.price } }, [
      h('div.mk-head', [icon(l.ind, 44), h('div', [h('b.mk-name', l.name), h('span.mk-ind', IND[l.ind].label + (l.scarce ? ', scarce' : ''))])]),
      h('div.mk-price', l.price === null ? [h('b.none', fmtM(l.opening)), h('span', l.fixed ? ' fixed price' : ' opens at')] : [h('b', fmtM(l.price)), h('span', ' now')]),
      h('div.mk-lead', lead),
      h('div.mk-list', 'Listed value ' + fmtM(l.catalog)),
      h('ul.mk-hist', l.hist.slice(-3).reverse().map(x => h('li', [x.name + (x.bot ? ' (AI)' : '') + ' ' + fmtM(x.amount)]))),
    ]);
  });
  P.prevPrices = next;
  const withBids = m.lots.filter(l => l.high).length;
  return h('div.pj-market', [
    h('div.mk-top', [h('h2', 'Live market: ' + m.lots.length + ' companies for sale'), h('span', withBids + ' have a leader. Highest price when time runs out takes the company.')]),
    h('div.mk-grid' + (m.lots.length > 22 ? '.dense.tiny.xl' : m.lots.length > 10 ? '.dense.tiny' : m.lots.length > 4 ? '.dense' : ''), cards),
  ]);
}

// ---- auction reveal ----
function auctionReveal(pub, i) {
  if (P.lastRevealIdx !== i) { P.lastRevealIdx = i; resetBreaking(); }
  const a = pub.auctions[i], n = pub.auctions.length;
  const max = Math.max(a.catalog, a.trueValue, a.price || 0, ...a.bids.map(b => b.amount)) * 1.12;
  const pct = v => (v / max * 100).toFixed(1) + '%';
  const beat = k => 'beat b' + k;
  const winnersKey = (a.winnerIds || []).join('+');
  const joint = a.winners.length > 1;
  const diff = a.price !== null ? a.price - a.trueValue : 0;
  const el = h('div.pj-auction', { dataset: { lot: a.key } }, [
    h('div.lotcount', 'Lot ' + (i + 1) + ' of ' + n),
    h('h2.' + beat(0), a.name + '. Listed at ' + fmtM(a.catalog) + '.'),
    h('div.' + beat(1), [
      h('h3', a.bids.length ? a.bids.length + ' team' + (a.bids.length > 1 ? 's' : '') + ' bid.' : 'No bids. ' + a.name + ' stays listed.'),
      h('div.bars', a.bids.map(b => {
        const win = a.winnerIds && b.teams.join('+') === a.winnerIds.join('+') && a.price === b.amount;
        return h('div.bar' + (win ? '.win' : ''), { dataset: { win: win ? '1' : '' } }, [h('span.bl', b.names.join(' and ')), h('div.bt', h('i', { style: 'width:' + pct(b.amount) })), h('span.bv', fmtM(b.amount))]);
      }),
      ),
    ]),
    a.price !== null ? h('h3.' + beat(2), joint ? a.winners.join(' and ') + ' won together at ' + fmtM(a.price) + '.' : 'Winner: ' + a.winners[0] + ', ' + fmtM(a.price) + '.')
      : (a.bids.length ? h('h3.' + beat(2), 'Nobody could take it. ' + a.name + ' stays listed.') : null),
    h('div.' + beat(3), [h('div.truth', { style: 'left:' + pct(a.trueValue) }, [h('span', 'Real value: ' + fmtM(a.trueValue))])]),
    a.price !== null ? h('h3.' + beat(4) + (diff > 0 ? '.curse' : '.good'), diff > 0 ? 'Winner\'s curse: ' + a.winners.join(' and ') + ' overpaid by ' + fmtM(diff) + '.' : 'Good buy: ' + a.winners.join(' and ') + ' paid ' + fmtM(-diff) + ' under.') : null,
    h('img.auc-art', { src: AUCTIONEER, alt: '' }),
  ]);
  const base = P.timers; base.forEach(clearTimeout); P.timers = [];
  [0, 1, 2, 3, 4].forEach(k => { const t = setTimeout(() => { el.classList.add('s' + k); if (k === 2 && a.price !== null) queueBreaking('BREAKING: ' + a.winners.join(' and ') + (joint ? ' take over ' : ' takes over ') + a.name + ' for ' + fmtM(a.price)); }, k * 1200); P.timers.push(t); });
  return el;
}

function numCell(label, v, note) {
  const cls = v > 0.005 ? 'up' : v < -0.005 ? 'down' : 'flat';
  return h('div.ncell', [h('span.nl', label), h('b.nv.' + cls, Math.abs(v) < 0.005 ? 'no change' : (v > 0 ? 'up ' : 'down ') + Math.abs(Math.round(v * 100)) + '%'), note ? h('span.nn', note) : null]);
}
function industryReveal(pub, k, revealedTo) {
  const c = pub.industries[k];
  return h('div.pj-industry', { dataset: { ind: c.ind } }, [
    h('div.rail', [...pub.industries.map((x, j) => h('div.rl' + (j === k ? '.on' : '') + (j > revealedTo ? '.dim' : ''), [j > revealedTo ? '?' : icon(x.ind, 34), ' ' + (j > revealedTo ? '' : x.label)])), h('div.rl' + (revealedTo >= 6 ? '' : '.dim'), 'Economic summary')]),
    h('section.main', [
      h('h2', c.headline),
      h('div.nums', [numCell('Market demand', c.nums.demand), numCell('Average price', c.nums.price), numCell('Input costs', c.nums.input, c.powerNote), numCell('Industry profitability', c.nums.profit)]),
      c.why.length ? h('ul.why', c.why.map(w => h('li', w))) : h('p.sub', 'No news moved this industry this round.'),
      c.exposed.length ? h('div.exposed', [h('span', 'Who is exposed: '), ...c.exposed.map(e => h('span.chip2.' + (e.delta >= 0 ? 'up' : 'down'), e.name + ' ' + fmtSigned(e.delta)))]) : null,
    ]),
  ]);
}
function summaryReveal(pub) {
  const pr = P.publics[pub.round - 1], prevTot = pr ? pr.totalValue : pub.startTotal, d = (pub.totalValue / prevTot - 1) * 100;
  return h('div.pj-summary', [h('h2', 'Economic summary'), h('p.huge', 'Total market value ' + fmtBig(pub.totalValue) + ', ' + (d >= 0 ? '+' : '') + d.toFixed(1) + '% this round.'), leaderboardEl(pub)]);
}

// ---- one report per round (Steven's ask 11): the auctions, the six industries and the standings on a single screen ----
function reportBody(pub) {
  const pr = P.publics[pub.round - 1], prevTot = pr ? pr.totalValue : pub.startTotal, d = (pub.totalValue / prevTot - 1) * 100;
  const auc = pub.auctions.map(a => {
    const diff = a.price !== null ? a.price - a.trueValue : 0;
    return h('div.rp-arow', [icon(a.ind, 24), h('span.an', a.name),
      a.price !== null ? [h('span.aw', a.winners.join(' and ')), h('b.ap', fmtM(a.price)), h('span.av' + (diff > 0 ? '.curse' : '.good'), 'real ' + fmtM(a.trueValue))] : [h('span.aw', a.bids.length ? 'could not close' : 'no bids'), h('b.ap', ''), h('span.av', '')]]);
  });
  const inds = pub.industries.map(c => h('div.rp-ind', [h('div.rp-ih', [icon(c.ind, 34), h('b', c.label)]), h('p.rp-head', c.headline),
    h('div.rp-nums', [['demand', 'Demand'], ['price', 'Price'], ['input', 'Costs'], ['profit', 'Profit']].map(([k, l]) => { const v = c.nums[k], cls = v > 0.005 ? 'up' : v < -0.005 ? 'down' : 'flat'; return h('span.' + cls, l + ' ' + (Math.abs(v) < 0.005 ? '0' : (v > 0 ? '+' : '-') + Math.abs(Math.round(v * 100)) + '%')); })),
    c.why.length ? h('p.rp-why', c.why[0]) : null]));
  return h('div.pj-report', [
    h('section.rp-auc', [h('h3', 'Market results'), auc.length ? h('div.rp-alist' + (auc.length > 14 ? '.dense' : ''), auc) : h('p', 'Nothing sold this round.')]),
    h('section.rp-ind', [h('h3', 'What moved'), h('div.rp-igrid', inds)]),
    h('div.rp-board', [h('p.rp-total', ['Total market value ', h('b', fmtBig(pub.totalValue)), ' (' + (d >= 0 ? '+' : '') + d.toFixed(1) + '% this round)']), leaderboardEl(pub)]),
  ]);
}

function revealBody() {
  const rv = P.game.reveal, pub = P.publics[P.game.round];
  const A = pub.auctions.length, idx = rv.idx;
  if (idx < A) return auctionReveal(pub, idx);
  if (idx < A + 6) return industryReveal(pub, idx - A, idx - A);
  return summaryReveal(pub);
}

// ---------- final: standings, replay, autopsy ----------
function finalRows() { return P.final ? P.final.rows : []; }
function standingsBody() {
  const rows = finalRows();
  if (!rows.length) return h('p.big', 'Working out the final standings...');
  const byEV = [...rows].sort((a, b) => a.rankEV - b.rankEV), byPA = [...rows].sort((a, b) => a.rankPA - b.rankPA);
  const col = (title, list, key) => h('section.stcol', [h('h2', title), ...list.map((r, i) => h('div.strow' + (r.isBot ? '.bot' : ''), { dataset: { team: r.id, ev: r.ev }, onclick: () => { P.autopsy = r.id; render(); } }, [
    h('span.rk', i + 1), h('span.nm', r.name, r.isBot ? h('em.ai', 'AI') : null), h('span.vl', key === 'ev' ? fmtBig(r.ev) : fmtSigned(r.parentingAdvantage))]))]);
  return h('div.pj-standings', [
    h('div.ctrl', [h('button.go', { type: 'button', onclick: startReplay }, '▶ Play replay'), h('span', 'Click a company for its autopsy.')]),
    h('p.lede', 'Who got biggest is not the same as who ran their businesses best.'),
    h('div.cols', [col('Biggest', byEV, 'ev'), col('Best parent', byPA, 'pa')]),
  ]);
}
function startReplay() { P.replay = { round: 0, speed: 1, playing: true }; P.view = 'replay'; stepReplay(); render(); }
function stepReplay() {
  clearTimeout(P.replayTimer);
  if (!P.replay || !P.replay.playing) return;
  P.replayTimer = setTimeout(() => {
    if (P.replay.round >= 5) { P.replay.playing = false; P.view = 'world'; P.replay = null; render(); return; }
    P.replay.round++; render(); stepReplay();
  }, 8000 / P.replay.speed);
}
function replayBody() {
  const r = P.replay.round, pub = P.publics[r];
  const body = h('div.pj-replay', [
    h('div.rctrl', [
      h('button', { type: 'button', onclick: () => { P.replay.playing = !P.replay.playing; stepReplay(); render(); } }, P.replay.playing ? 'Pause' : 'Play'),
      h('span.rounds', [0, 1, 2, 3, 4, 5].map(k => h('b' + (k === r ? '.on' : ''), { onclick: () => { P.replay.round = k; render(); stepReplay(); } }, 'Round ' + k))),
      h('span', 'Speed '), ...[1, 2].map(sp => h('button' + (P.replay.speed === sp ? '.on' : ''), { type: 'button', onclick: () => { P.replay.speed = sp; stepReplay(); render(); } }, sp + 'x')),
      h('button', { type: 'button', onclick: () => { P.replay = null; P.view = 'world'; clearTimeout(P.replayTimer); render(); } }, 'Skip to results'),
    ]),
    h('p.caption', pub.caption),
    h('div.pj-world', [h('div.pj-left', h('div.pj-pies', SVGEL)), leaderboardEl(pub)]),
  ]);
  queueMicrotask(() => drawPies(pub, r, true));
  return body;
}
function autopsyOverlay() {
  const rows = finalRows(), row = rows.find(r => r.id === P.autopsy);
  if (!row) return null;
  const admin = P.adminKey && P.game.admin_key === P.adminKey;
  return h('div.overlay.pj-aut', { onclick: e => { if (e.target.classList.contains('overlay')) { P.autopsy = null; render(); } } }, h('div.sheet', [autopsy(row, { admin }), h('p.sub', 'Esc closes. Arrow keys move between companies.')]));
}

// ---------- render ----------
function render() {
  const g = P.game;
  if (!g) return;
  let body;
  if (g.phase === 'lobby') body = lobbyBody();
  else if (g.phase === 'final') body = P.view === 'replay' && P.replay ? replayBody() : standingsBody();
  else if (g.phase === 'results' && P.publics[g.round]) body = reportBody(P.publics[g.round]);
  else if (g.phase === 'news') body = newsBody();
  else body = worldBody();   // the live market is the right-hand panel of the world screen now

  if (g.phase === 'results' && P.publics[g.round]) for (const b of P.publics[g.round].breaking) queueBreaking('BREAKING: ' + b.text.replace(/^BREAKING:\s*/, ''));
  const f = frame(body), ov = g.phase === 'final' ? autopsyOverlay() : null;
  if (ov) f.append(ov);
  app.replaceChildren(f);
  tick();
  updateChyron();
}

document.addEventListener('keydown', async e => {
  const g = P.game; if (!g) return;
  const admin = P.adminKey && g.admin_key === P.adminKey;
  if (e.key === 'Escape') { P.autopsy = null; render(); return; }
  if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && P.autopsy) {
    const rows = [...finalRows()].sort((a, b) => a.rankEV - b.rankEV), i = rows.findIndex(r => r.id === P.autopsy);
    P.autopsy = rows[(i + (e.key === 'ArrowRight' ? 1 : rows.length - 1)) % rows.length].id; render(); return;
  }
  if (!admin) return;
  if (e.key.toLowerCase() === 'p' && g.clock) {
    const c = g.clock;
    await P.store.patchGame(P.gid, c.paused ? { clock: { ...c, paused: false, endsAt: Date.now() + c.remaining, remaining: null }, rev: g.rev + 1 } : { clock: { ...c, paused: true, remaining: Math.max(0, c.endsAt - Date.now()), endsAt: null }, rev: g.rev + 1 });
  } else if (e.key === ' ' && g.phase === 'results' && g.reveal) {
    e.preventDefault();
    const pub = P.publics[g.round], len = pub.auctions.length + 7;
    if (g.reveal.idx < len - 1) await P.store.patchGame(P.gid, { reveal: { ...g.reveal, idx: g.reveal.idx + 1 }, rev: g.rev + 1 });
  }
});

// Built for 1920 by 1080. On a smaller screen the whole page is scaled down so nothing is cut off (the chyron stays full size).
function fit() { const z = Math.min(1, window.innerWidth / 1920, window.innerHeight / 1080); app.style.zoom = z; document.documentElement.style.setProperty('--pjz', z); }
fit(); window.addEventListener('resize', fit);
window.__pj = { P, render, chyronStats, fit };
requestAnimationFrame(chyronFrame);
boot().catch(e => { console.error(e); app.replaceChildren(h('div.pj-center', h('h1', 'Something went wrong.'), h('p#fatal', friendlyError(e)))); });
