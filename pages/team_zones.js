// The three zones of the team page, the lock panel and the cash meter (spec 05 sections 1.1 to 1.7).
// Pure rendering: every function takes the context built in team.js and returns DOM. Edits go back through ctx.write().

import { h, fmtM, mmss, wordCount, pct } from './util.js';
import { gl } from './glossary.js';
import { icon, IND, artUrl } from './art.js';
import { meter, attentionUsed, lockReason, describeAction, OWNER_LABEL, can, ROLES_ON } from './roles.js';

import { renderLiveMarket } from './team_market.js';
export { renderSteps } from './team_market.js';

const FIRST = (txt) => txt;

// ---------- grey-out helpers ----------
function greyTip(ctx, perm) {
  if (ctx.locked) return 'Your plan is locked. Changes are off.';
  if (ctx.phase === 'market') return perm === 'market' ? 'Only the Head of Deals can bid. Tap Suggest to leave a note.' : 'This opens after the market closes.';
  if (ctx.phase !== 'decide') return 'Decisions open when the clock turns green.';
  return 'Only the ' + OWNER_LABEL[perm] + ' can change this. Tap Suggest to leave a note.';
}
function suggestBar(ctx, perm) {
  if (ctx.editable(perm) || (ctx.phase !== 'decide' && ctx.phase !== 'market') || ctx.locked) return null;
  return h('button.suggest', { type: 'button', title: 'Leave a one-line note for the ' + OWNER_LABEL[perm], onclick: () => ctx.suggest(perm) }, 'Suggest');
}
function noteDot(ctx, perm) {
  const n = ctx.notesFor(perm);
  return n.length && ctx.editable(perm) ? h('span.dot', { title: n.map(x => x.from + ': ' + x.text).join('\n') }, n.length) : null;
}

// ---------- top bar ----------
export function renderTopBar(ctx) {
  const { view, game, role } = ctx, m = ctx.meter;
  const roundName = ['Setup', 'Build', 'Operate', 'Adapt', 'Restructure', 'Commit'][game.round] || '';
  const phaseWord = { lobby: 'Waiting to start', news: 'Read the news', market: 'Market open', decide: ctx.locked ? 'Locked' : 'Decide', resolving: 'Resolving', results: 'Results', final: 'Game over' }[game.phase];
  const left = ctx.clockLeft;
  const tcls = game.phase === 'decide' || game.phase === 'news' || game.phase === 'market' ? (left <= 20000 ? 'red' : left <= 60000 ? 'amber' : '') : '';
  const cash = view ? view.cash : 0, line = view ? view.line : 0;
  const total = view ? view.budget : 1;
  const resPct = view ? Math.min(100, (m.total / total) * 100) : 0;
  const attLeft = view ? Math.max(0, view.attMax - attentionUsed(ctx.plan, view.liveAuction)) : 3;
  const dots = []; for (let i = 0; i < (view ? view.attMax : 3); i++) dots.push(h('i.adot' + (i < attLeft ? '.on' : '')));
  return h('header.topbar', [
    h('div.tb-name', [h('b', ctx.teamName), h('span.sub', 'Enterprise value ' + (view ? fmtM(view.ev) : '--'))]),
    h('div.tb-round', [h('b', game.round ? 'Round ' + game.round + ' of 5: ' + roundName : 'Lobby'), h('span.sub', phaseWord)]),
    h('div.tb-timer.' + tcls + (game.clock && game.clock.paused ? '.paused' : ''), [h('b#timer', game.clock ? (game.clock.paused ? 'PAUSED ' : '') + mmss(left) + ' left' : '--:--'), h('span.sub', phaseWord)]),
    h('div.tb-cash', [
      h('div.meterbar', { title: 'Cash plus credit line, with what your plan reserves' }, [h('i.res', { style: 'width:' + resPct + '%' })]),
      h('span.sub', view ? ['Cash ' + fmtM(cash) + ' plus ' + fmtM(line) + ' credit line, ', gl('reserved'), ' ' + fmtM(m.total) + ', free ' + fmtM(m.free)] : '')]),
    h('div.tb-att', [h('div.adots', dots), h('span.sub', [gl('attention'), ': ' + attLeft + ' of ' + (view ? view.attMax : 3) + ' attention left'])]),
    h('div.tb-role', [ROLES_ON ? h('span.badge', { title: role ? role.hint : '' }, role ? role.label : 'No seat') : null, h('span.sub', ctx.seatName + ' (you)')]),
  ]);
}

// ---------- news band ----------
export function renderNews(ctx) {
  const items = (ctx.view && ctx.view.news) || [];
  const big = ctx.game.phase === 'news';
  const body = items.length ? items.map(n => h('div.news-item', [h('span.chip.' + (n.tag || '').toLowerCase(), n.tag || 'News'), ' ' + n.text])) : [h('div.news-item', 'No news yet.')];
  return h('section.newsband' + (big ? '.big' : ''), [
    big ? h('div.news-banner', 'Read the news first. Decisions open when the clock turns green.') : null,
    h('div.news-list', big ? body : body.slice(0, 1)),
    !big && items.length > 1 ? h('span.sub', '+' + (items.length - 1) + ' more on the big screen') : null,
  ]);
}

// ---------- what a business is, and how this round's news bears on it (Steven's asks 2 and 7) ----------
function bizInfo(ctx, u) {
  const { view } = ctx, news = (view.news || []).filter(n => (n.inds || []).includes(u.ind));
  const hedgeable = (view.hedges || []).filter(hd => news.some(n => n.chain === hd.chain));
  const kids = [];
  if (u.hook) kids.push(h('p.hook', u.hook));
  if (news.length) {
    kids.push(h('p.newshead', 'In the news for ' + IND[u.ind].label + ' (' + news.length + '):'));
    kids.push(h('ul.bznews', news.map(n => h('li', [h('span.chip.' + (n.tag || '').toLowerCase(), n.tag || 'News'), ' ' + n.text, n.hits && n.hits[u.ind] ? h('span.hit', ' If it happens: ' + n.hits[u.ind] + '.') : null]))));
    if (hedgeable.length) kids.push(h('p.sub.cando', 'You can use Protect on this business against: ' + hedgeable.map(hd => hd.title).join(', ') + '.'));
    else kids.push(h('p.sub.cando', 'A capital request below is your main way to prepare for this.'));
  } else kids.push(h('p.sub', 'No headline this round names ' + IND[u.ind].label + '. The business moves with the economy and its own results.'));
  return h('div.bizinfo', kids);
}

// ---------- My Businesses ----------
export function renderBusinesses(ctx) {
  const { view, plan } = ctx, ok = ctx.editable('capital');
  const zone = h('section.zone.zone-biz' + (ok ? '' : '.grey'), { dataset: { zone: 'biz' }, title: ok ? '' : greyTip(ctx, 'capital') });
  zone.append(h('h2', ['My businesses ', noteDot(ctx, 'capital'), suggestBar(ctx, 'capital')]));
  for (const u of view.units) {
    const sel = plan.capital[u.id] === 0 || plan.capital[u.id] === 1 ? plan.capital[u.id] : null;
    const art = artUrl(u.ind, u.id);
    const trend = Math.abs(u.trend) < 0.005 ? 'flat since the start' : u.trend >= 0 ? 'up ' + Math.round(u.trend * 100) + '% last round' : 'down ' + Math.round(-u.trend * 100) + '% last round';
    const opts = [];
    const mk = (idx, label, cost, effect) => {
      const trial = { ...plan, capital: { ...plan.capital, [u.id]: idx } }, short = meter(view, trial).short;
      const blocked = sel !== idx && short > 0.5 && idx !== null;
      const id = 'cap-' + u.id + '-' + idx;
      return h('label.opt' + (blocked ? '.dim' : '') + (sel === idx ? '.sel' : ''), { for: id }, [
        h('input', { type: 'radio', name: 'cap-' + u.id, id, checked: sel === idx, disabled: !ok || blocked, onchange: () => ctx.write({ capital: { ...plan.capital, [u.id]: idx } }) }),
        h('span', [h('b', label), cost ? ' ' + fmtM(cost) + '. ' : ' ', effect]),
        blocked ? h('div.why', 'Not enough free cash. You are ' + fmtM(Math.ceil(short)) + ' short.') : null,
      ]);
    };
    u.requests.forEach((r, i) => opts.push(mk(i, r.name, r.cost * u.w, r.effect + '.')));
    opts.push(mk(null, 'Hold.', 0, 'Keep spending as it is.'));
    zone.append(h('article.card.biz' + (u.stress ? '.stress' : ''), [
      h('div.card-head', [art ? h('img.art', { src: art, alt: '' }) : h('div.arttile', { style: 'border-color:' + IND[u.ind].color }, icon(u.ind, 34)),
        h('div', [h('b', u.name), h('span.tag', { style: 'background:' + IND[u.ind].color }, IND[u.ind].label), u.w < 1 ? h('span.sub', ' (shared, half is yours)') : null])]),
      h('div.valrow', [gl('worth'), ' ' + fmtM(u.value), h('span.' + (u.trend >= 0 ? 'up' : 'down'), ' ' + (u.trend >= 0 ? '▲ ' : '▼ ') + trend)]),
      u.stress ? h('p.stressline', 'This business is losing money. A Turnaround may help, if the problem is the business and not the whole industry.') : null,
      bizInfo(ctx, u),
      h('div.opts', opts),
    ]));
  }
  for (const b of view.builds) zone.append(h('article.card.biz.building', [h('b', b.name), h('span.sub', ' is being built (' + fmtM(b.cost) + ' paid)')]));
  if (view.units.length < 3 && ctx.game.round === 1) zone.append(h('article.card.empty', 'You need a third business. Go to the Market column and bid on one, or invite another team to co-bid.'));
  return zone;
}

// ---------- Corporate actions ----------
const ACTION_ROWS = [
  { key: 'integrate', perm: 'ops', title: 'Integrate', gloss: 'integrate', line: 'Make two of your businesses work together. Pays off only if they truly share something.' },
  { key: 'deepdive', perm: 'ops', title: 'Deep dive', gloss: 'deepdive', line: 'Pay to see the real value of one company, or to learn whether two of your businesses really fit.' },
  { key: 'turnaround', perm: 'ops', title: 'Turnaround', gloss: 'turnaround', line: 'Step in and fix a struggling business.' },
  { key: 'devcap', perm: 'ops', title: 'Develop capability', gloss: 'capability', line: 'Invest in getting better at one kind of move. Two good uses earns you a skill.' },
  { key: 'divest', perm: 'market', title: 'Divest', line: 'Sell a business. Sell it to the market for 85% of its stand-alone value, or list it for other teams at 80%, 100% or 120%.' },
  { key: 'hedge', perm: 'ops', title: 'Protect', line: 'Pay to cut the damage a risk in the news could do to one business.' },
];

// Why an action is not on the table right now, or null when it is (Steven's ask 5). The reason shows on the row so a player always knows why.
function notRelevant(ctx, key) {
  const { view } = ctx;
  switch (key) {
    case 'integrate': return view.pairs.some(x => !x.exists) ? null : 'You need two businesses you fully own with no Integrate project yet.';
    case 'turnaround': return view.units.some(u => u.canTurn && u.stress) ? null : (view.units.some(u => u.stress) ? 'The business that is losing money had a Turnaround too recently.' : 'None of your businesses is losing money, so a Turnaround has nothing to fix.');
    case 'devcap': return view.capList.some(c => !view.capabilities[c]) ? null : 'You already have every capability.';
    case 'divest': return ctx.game.round < 2 ? 'Divest opens in round 2.' : (view.divest.length ? null : 'You have no business to sell.');
    case 'hedge': return view.hedges.length ? null : 'No risk in the news right now can be protected against.';
    case 'deepdive': return (view.lots.some(l => !l.own && !l.deep) || view.pairs.some(x => !x.known)) ? null : 'Everything you could look into is already checked.';
    default: return null;
  }
}
function whyHere(ctx, key) {
  const { view } = ctx;
  if (key === 'turnaround') { const n = view.units.filter(u => u.stress).map(u => u.name); return n.length ? 'On the table because ' + n.join(' and ') + (n.length > 1 ? ' are' : ' is') + ' losing money.' : ''; }
  if (key === 'hedge') return view.hedges.length ? 'On the table because of: ' + view.hedges.map(hd => hd.title).join(', ') + '.' : '';
  if (key === 'integrate') { const n = view.pairs.filter(x => !x.exists).length; return n ? n + (n === 1 ? ' pair' : ' pairs') + ' of your businesses could be combined.' : ''; }
  return '';
}

function select(items, onChange, val) {
  const s = h('select', { onchange: e => onChange(e.target.value) }, items.map(([v, l]) => h('option', { value: v, selected: v === val }, l)));
  return s;
}

function pickerFor(ctx, key) {
  const { view, plan, ui } = ctx, p = ui.picker || {};
  const add = a => { ctx.write({ actions: [...plan.actions, a] }); ui.picker = null; ctx.rerender(); };
  const cancel = h('button.ghost', { type: 'button', onclick: () => { ui.picker = null; ctx.rerender(); } }, 'Cancel');
  const form = h('div.picker');
  if (key === 'integrate') {
    const pairs = view.pairs.filter(x => !x.exists && !plan.actions.some(a => a.type === 'integrate' && [a.a, a.b].sort().join('+') === x.key));
    if (!pairs.length) return h('div.picker', 'You need two businesses you fully own, with no Integrate project yet.');
    p.pair = p.pair || pairs[0].key;
    const cur = pairs.find(x => x.key === p.pair) || pairs[0];
    form.append(select(pairs.map(x => [x.key, x.aName + ' and ' + x.bName]), v => { p.pair = v; ctx.rerender(); }, cur.key),
      h('p.sub', 'Cost ' + fmtM(cur.cost) + '. ' + (cur.known ? (cur.known.related ? 'Your deep dive says they really share something.' : 'Your deep dive says they do not really share anything.') : 'Not checked yet. A Deep dive tells you if they really fit.')),
      h('button.go', { type: 'button', onclick: () => add({ type: 'integrate', a: cur.a, b: cur.b }) }, 'Add Integrate'), cancel);
  } else if (key === 'turnaround') {
    const us = view.units.filter(u => u.canTurn && u.stress && !plan.actions.some(a => a.type === 'turnaround' && a.unit === u.id));
    if (!us.length) return h('div.picker', 'No business that is losing money can take a Turnaround right now (one per business every two rounds).');
    p.unit = p.unit && us.some(u => u.id === p.unit) ? p.unit : us[0].id;
    const cur = us.find(u => u.id === p.unit);
    form.append(select(us.map(u => [u.id, u.name + (u.stress ? ' (losing money)' : '')]), v => { p.unit = v; ctx.rerender(); }, cur.id),
      h('p.sub', 'Cost ' + fmtM(cur.turnCost) + '. It works only if the problem is the business and not the whole industry.'),
      h('button.go', { type: 'button', onclick: () => add({ type: 'turnaround', unit: cur.id }) }, 'Add Turnaround'), cancel);
  } else if (key === 'devcap') {
    const caps = view.capList.filter(c => !view.capabilities[c] && !plan.actions.some(a => a.type === 'devcap' && a.cap === c));
    if (!caps.length) return h('div.picker', 'Nothing left to develop.');
    p.cap = p.cap && caps.includes(p.cap) ? p.cap : caps[0];
    form.append(select(caps.map(c => [c, view.capLabels[c] + ' (' + view.uses[c] + ' of 2 uses)']), v => { p.cap = v; }, p.cap),
      h('p.sub', 'Cost ' + fmtM(view.costs.devcap) + '. Counts as one use.'),
      h('button.go', { type: 'button', onclick: () => add({ type: 'devcap', cap: p.cap }) }, 'Add Develop capability'), cancel);
  } else if (key === 'deepdive') {
    const opts = [];
    if (ctx.editable('market')) for (const l of view.lots) if (!l.own && !l.deep && !plan.actions.some(a => a.lot === l.key)) opts.push(['lot:' + l.key, 'Company for sale: ' + l.name]);
    if (ctx.editable('ops')) for (const x of view.pairs) if (!x.known && !plan.actions.some(a => a.pair && [...a.pair].sort().join('+') === x.key)) opts.push(['pair:' + x.key, 'Your pair: ' + x.aName + ' and ' + x.bName]);
    if (!opts.length) return h('div.picker', 'Nothing to look into. Either everything is already checked, or your role cannot pick the rest.');
    p.dd = p.dd && opts.some(o => o[0] === p.dd) ? p.dd : opts[0][0];
    form.append(select(opts, v => { p.dd = v; }, p.dd), h('p.sub', 'Costs 1 attention. You see the result right away, and it cannot be undone.'),
      h('button.go', { type: 'button', onclick: () => { const [k, v] = [p.dd.slice(0, p.dd.indexOf(':')), p.dd.slice(p.dd.indexOf(':') + 1)]; add(k === 'lot' ? { type: 'deepdive', lot: v } : { type: 'deepdive', pair: v.split('+') }); } }, 'Add Deep dive'), cancel);
  } else if (key === 'divest') {
    const us = view.divest.filter(d => !plan.actions.some(a => a.type === 'divest' && a.unit === d.unit));
    if (ctx.game.round < 2) return h('div.picker', 'Divest opens in round 2.');
    if (!us.length) return h('div.picker', 'No business to sell.');
    p.unit = p.unit && us.some(d => d.unit === p.unit) ? p.unit : us[0].unit;
    const cur = us.find(d => d.unit === p.unit), nm = id => view.units.find(u => u.id === id).name;
    const modes = [['market', 'Sell to the market for ' + fmtM(cur.market)], ...cur.list.map(l => ['list:' + l.f, 'List for other teams at ' + Math.round(l.f * 100) + '% (' + fmtM(l.price) + ')'])];
    p.mode = p.mode && modes.some(m => m[0] === p.mode) ? p.mode : 'market';
    form.append(select(us.map(d => [d.unit, nm(d.unit)]), v => { p.unit = v; ctx.rerender(); }, cur.unit), select(modes, v => { p.mode = v; }, p.mode),
      h('button.go', { type: 'button', onclick: () => add(p.mode === 'market' ? { type: 'divest', unit: cur.unit, mode: 'market' } : { type: 'divest', unit: cur.unit, mode: 'list', f: Number(p.mode.split(':')[1]) }) }, 'Add Divest'), cancel);
  } else if (key === 'hedge') {
    if (!view.hedges.length) return h('div.picker', 'No risk in the news can be protected against right now.');
    const opts = [];
    for (const hd of view.hedges) for (const u of hd.units) opts.push([hd.chain + '|' + u.unit, hd.title + ': protect ' + view.units.find(x => x.id === u.unit).name + ' (' + fmtM(u.cost) + ')']);
    p.hg = p.hg || opts[0][0];
    form.append(select(opts, v => { p.hg = v; }, p.hg), h('p.sub', 'Cuts the damage if the risk happens. If it does not happen, the money is lost.'),
      h('button.go', { type: 'button', onclick: () => { const [c, u] = p.hg.split('|'); add({ type: 'hedge', chain: c, unit: u }); } }, 'Add Protect'), cancel);
  }
  return form;
}

export function renderActions(ctx) {
  const { view, plan } = ctx, used = attentionUsed(plan, view.liveAuction), full = used >= view.attMax;
  const anyOk = ctx.editable('ops') || ctx.editable('market');
  const zone = h('section.zone.zone-act' + (anyOk ? '' : '.grey'), { dataset: { zone: 'act' } });
  zone.append(h('h2', ['Corporate actions ', noteDot(ctx, 'ops'), suggestBar(ctx, 'ops')]));
  zone.append(h('p.sub', 'Pick up to 3. Each costs 1 attention (' + Math.max(0, view.attMax - used) + ' left).' + (view.liveAuction ? ' Bids do not count; cash limits them.' : ' Bids and builds count too.')));
  if (full) zone.append(h('p.warnline', 'You have used all ' + view.attMax + ' attention points.'));
  for (const r of ACTION_ROWS) {
    const ok = ctx.editable(r.perm), open = ctx.ui.picker && ctx.ui.picker.key === r.key, irrelevant = notRelevant(ctx, r.key), here = irrelevant ? '' : whyHere(ctx, r.key);
    const row = h('div.arow' + (ok && !full && !irrelevant ? '' : '.dim'), { title: ok ? '' : greyTip(ctx, r.perm) }, [
      h('div.arow-main', [h('b', r.gloss ? gl(r.gloss, r.title) : r.title), h('span.cost', '1 attention')]),
      h('p.sub', r.line),
      irrelevant ? h('p.sub.notnow', 'Not on the table now: ' + irrelevant) : (here ? h('p.sub.here', here) : null),
      h('button.add', { type: 'button', disabled: !ok || full || ctx.locked || !!irrelevant, onclick: () => { ctx.ui.picker = open ? null : { key: r.key }; ctx.rerender(); } }, open ? 'Close' : 'Choose'),
    ]);
    zone.append(row);
    if (open) zone.append(pickerFor(ctx, r.key));
  }
  if (!view.liveAuction) zone.append(h('div.arow.info', [h('b', gl('cobid', 'Ally')), h('p.sub', 'Co-bid with one other team. You split the price and the result 50/50. Start it from a company in the Market column.')]));
  // picks
  if (plan.actions.length) {
    zone.append(h('h3', 'Your picks'));
    for (const a of plan.actions) {
      const committed = a.type === 'deepdive' && (view.committed || []).some(c => JSON.stringify(c) === JSON.stringify(a));
      const perm = a.type === 'divest' || (a.type === 'deepdive' && a.lot) ? 'market' : 'ops';
      zone.append(h('div.pick', [describeAction(view, a), committed ? h('span.sub', ' (done, cannot be undone)') : (ctx.editable(perm) ? h('button.x', { type: 'button', title: 'Remove', onclick: () => ctx.write({ actions: plan.actions.filter(x => x !== a) }) }, '×') : null)]));
    }
  }
  return zone;
}

// ---------- Market ----------
function bidForm(ctx, l, mode) {
  const { view, ui } = ctx, f = ui.bidform || {};
  const amt = Number(f.amount) || 0;
  const share = mode === 'co' ? 0.5 : 1;
  const reserve = amt * share * (1 + view.feeRate);
  const free = view.budget - meter(view, ctx.plan).total;
  const others = view.teams.filter(t => t.id !== view.teamId);
  const partner = mode === 'co' ? h('label', ['Partner team ', select(others.map(t => [t.id, t.name]), v => { f.partner = v; }, f.partner || (others[0] && others[0].id))]) : null;
  if (mode === 'co' && !f.partner && others[0]) f.partner = others[0].id;
  const input = h('input', { type: 'number', min: 0, step: 5, value: f.amount || '', placeholder: 'Amount in $M', oninput: e => { f.amount = e.target.value; const r = e.target.closest('.bidform').querySelector('.reserve'); const a = Number(f.amount) || 0; r.textContent = 'This would reserve ' + fmtM(a * share * (1 + view.feeRate)) + ' (includes a ' + (view.feeRate * 100).toFixed(1) + '% deal fee).'; } });
  return h('div.bidform', [
    h('p.sub', mode === 'co'
      ? ['Co-bid with a partner. You each pay half. Your estimates are averaged, so you are less likely to overpay (about a third less noise). ', gl('cobid', 'What is a co-bid?')]
      : 'Sealed bid. Highest bid wins and pays what it bid. Other teams cannot see your number.'),
    partner, h('label', ['Bid ($M) ', input]),
    h('p.reserve.sub', 'This would reserve ' + fmtM(reserve) + ' (includes a ' + (view.feeRate * 100).toFixed(1) + '% deal fee). Free cash now: ' + fmtM(free) + '.'),
    h('button.go', { type: 'button', onclick: () => {
      const a = Number(f.amount);
      if (!(a > 0)) { ctx.toast('Enter a bid above zero.'); return; }
      const bid = mode === 'co' ? { lot: l.key, amount: a, ally: f.partner } : { lot: l.key, amount: a };
      ctx.write({ market: { bids: [...ctx.plan.bids.filter(b => b.lot !== l.key), bid], builds: ctx.plan.builds } });
      ui.open = null; ui.bidform = {}; ctx.rerender();
    } }, mode === 'co' ? 'Send co-bid invite' : 'Place bid'),
    h('button.ghost', { type: 'button', onclick: () => { ui.open = null; ctx.rerender(); } }, 'Cancel'),
  ]);
}

export function renderMarket(ctx) {
  if (ctx.live && ctx.hasMarket) return renderLiveMarket(ctx);
  const { view, plan, ui } = ctx, ok = ctx.editable('market');
  const zone = h('section.zone.zone-mkt' + (ok ? '' : '.grey'), { dataset: { zone: 'mkt' }, title: ok ? '' : greyTip(ctx, 'market') });
  zone.append(h('h2', ['Market ', noteDot(ctx, 'market'), suggestBar(ctx, 'market')]));
  if (ctx.game.round === 1) zone.append(h('p.banner', 'Every team must win one company this round. A co-bid counts.'));
  if (ctx.game.round === 5 || !view.lots.length) zone.append(h('p.empty', ctx.game.round === 5 ? 'The market is closed. Portfolios are frozen. Make your final choices.' : 'Nothing is for sale this round.'));
  // co-bid invitations
  for (const inv of ctx.invites) {
    const lot = view.lots.find(l => l.key === inv.lot);
    zone.append(h('div.invite', [h('b', inv.fromName), ' invites you to co-bid on ', h('b', lot.name), '. You each pay half. ',
      ok ? [h('input', { type: 'number', min: 0, step: 5, placeholder: 'Your bid $M', value: ui['inv' + inv.lot] || lot.signal.mid, oninput: e => { ui['inv' + inv.lot] = e.target.value; } }),
        h('button.go', { type: 'button', onclick: () => { const a = Number(ui['inv' + inv.lot] || lot.signal.mid); ctx.write({ market: { bids: [...plan.bids.filter(b => b.lot !== inv.lot), { lot: inv.lot, amount: a, ally: inv.from }], builds: plan.builds } }); ctx.rerender(); } }, 'Accept'),
        h('button.ghost', { type: 'button', onclick: () => { (ui.declined = ui.declined || {})[inv.from + inv.lot] = true; ctx.rerender(); } }, 'Decline')] : h('span.sub', ' The Head of Deals can accept.')]));
  }
  for (const l of view.lots) {
    if ((ui.skipped || {})[l.key]) { zone.append(h('div.lot.skipped', [l.name, h('button.ghost', { type: 'button', onclick: () => { delete ui.skipped[l.key]; ctx.rerender(); } }, 'Show again')])); continue; }
    const bid = plan.bids.find(b => b.lot === l.key), build = plan.builds.find(b => b.lot === l.key);
    const art = artUrl(l.ind, l.key);
    const sig = l.deep ? ['True value: ', h('b', fmtM(l.signal.lo) + ' to ' + fmtM(l.signal.hi))] : [gl('signal', 'Your team\'s estimate'), ': ', h('b', fmtM(l.signal.lo) + ' to ' + fmtM(l.signal.hi))];
    const buttons = [];
    if (!l.own) {
      if (l.kind === 'team') buttons.push(h('button', { type: 'button', disabled: !ok || !!bid, onclick: () => { ctx.write({ market: { bids: [...plan.bids, { lot: l.key, amount: l.price }], builds: plan.builds } }); } }, 'Accept at ' + fmtM(l.price)));
      else {
        buttons.push(h('button', { type: 'button', disabled: !ok || !!bid, onclick: () => { ui.open = { key: l.key, mode: 'bid' }; ui.bidform = { amount: '' }; ctx.rerender(); } }, 'Bid'));
        buttons.push(h('button', { type: 'button', disabled: !ok || !!bid || !view.teams.filter(t => t.id !== view.teamId).length, onclick: () => { ui.open = { key: l.key, mode: 'co' }; ui.bidform = { amount: '' }; ctx.rerender(); } }, 'Co-bid'));
        if (l.buildCost !== null) buttons.push(h('button', { type: 'button', title: 'Build your own for ' + fmtM(l.buildCost) + '. It opens in two rounds at 70% strength.', disabled: !ok || !!build, onclick: () => ctx.write({ market: { bids: plan.bids, builds: [...plan.builds, { lot: l.key }] } }) }, 'Build ' + fmtM(l.buildCost)));
      }
      if (!l.deep) buttons.push(h('button', { type: 'button', title: 'Spend 1 attention to see this company\'s real value band.', disabled: !ok || plan.actions.some(a => a.lot === l.key) || attentionUsed(plan, view.liveAuction) >= view.attMax, onclick: () => ctx.write({ actions: [...plan.actions, { type: 'deepdive', lot: l.key }] }) }, 'Deep dive'));
      buttons.push(h('button.ghost', { type: 'button', onclick: () => { (ui.skipped = ui.skipped || {})[l.key] = true; ctx.rerender(); } }, 'Skip'));
    }
    const placed = [];
    if (bid) placed.push(h('div.placed', [bid.ally ? 'Co-bid with ' + (view.teams.find(t => t.id === bid.ally) || {}).name + ': ' : 'Your bid: ', h('b', l.kind === 'team' ? fmtM(l.price) : fmtM(bid.amount)), ok ? h('button.x', { type: 'button', title: 'Remove', onclick: () => ctx.write({ market: { bids: plan.bids.filter(b => b !== bid), builds: plan.builds } }) }, '×') : null]));
    if (build) placed.push(h('div.placed', ['Build order: ', h('b', fmtM(l.buildCost)), ok ? h('button.x', { type: 'button', onclick: () => ctx.write({ market: { bids: plan.bids, builds: plan.builds.filter(b => b !== build) } }) }, '×') : null]));
    zone.append(h('article.card.lot' + (bid || build ? '.picked' : ''), { dataset: { lot: l.key } }, [
      h('div.card-head', [art ? h('img.art.sm', { src: art, alt: '' }) : h('div.arttile.sm', { style: 'border-color:' + IND[l.ind].color }, icon(l.ind, 26)),
        h('div', [h('b', l.name), h('span.tag', { style: 'background:' + IND[l.ind].color }, IND[l.ind].label), l.scarce ? h('span.tag.scarce', 'scarce') : null])]),
      h('div.facts', [h('span', [gl('catalog'), ' ', h('b', fmtM(l.catalog))]), l.kind === 'team' ? h('span', ' Listed by ' + l.sellerName + ' at a fixed price.') : null]),
      h('p.claim', '"Seller says: ' + l.claim + '"'),
      h('p.sig', sig),
      placed, h('div.btns', buttons),
      ui.open && ui.open.key === l.key ? bidForm(ctx, l, ui.open.mode) : null,
    ]));
  }
  return zone;
}

// ---------- Lock-in ----------
export function renderLock(ctx) {
  const { view, plan, row } = ctx;
  const why = row.why || '', predicted = row.predicted;
  const panel = h('section.lock' + (ctx.locked ? '.done' : ''));
  if (ctx.locked) {
    const who = row.locked_by || 'the CEO';
    panel.append(h('b', 'Locked at ' + mmss(row.lock_left || 0) + ' by ' + who + '. Your plan is saved. Changes are off.'),
      h('p.sub', 'Waiting for other teams (' + ctx.lockedCount + ' of ' + ctx.seatedTeams + ' locked).'));
    return panel;
  }
  const canLock = ctx.editable('lock');
  const reason = lockReason(view, plan, why, predicted, ctx.game.round, { requireWhy: ctx.requireWhy });
  const wc = wordCount(why);
  const parts = [
    h('div.lock-fields', ctx.requireWhy ? [
      h('label', ['In one sentence, why is this the right plan?',
        h('input.why', { type: 'text', value: why, disabled: !canLock, placeholder: 'Our reason in one sentence', oninput: e => { ctx.write({ why: e.target.value }, true); const c = panel.querySelector('.wc'); if (c) c.textContent = Math.min(wc2(e.target.value), 8) + ' of 8 words'; } }), h('span.wc.sub', Math.min(wc, 8) + ' of 8 words')]),
      h('label', ['What will your whole company be worth at the end of this round? $', h('input.pred', { type: 'number', min: 0, step: 10, value: predicted === null || predicted === undefined ? '' : predicted, disabled: !canLock, oninput: e => ctx.write({ predicted: e.target.value === '' ? null : Number(e.target.value) }, true) }), 'M']),
    ] : []),
    canLock
      ? [h('button.lockbtn', { type: 'button', disabled: !!reason || (ctx.phase !== 'decide' && ctx.phase !== 'market'), onclick: () => ctx.lock() }, 'Lock in our plan'), h('span.reason', reason || (row.engine_error ? '' : 'Ready to lock.'))]
      : [h('p.sub', can(ctx.role, 'lock') ? 'You lock the plan when decisions open.' : 'Only the CEO can lock. Waiting for ' + ctx.ceoName + '.'), suggestBar(ctx, 'lock')],
    row.engine_error ? h('p.warnline', row.engine_error) : null,
    ctx.savedAt ? h('span.sub.saved', 'Saved ' + ctx.savedAt) : null,
  ];
  for (const x of parts.flat(Infinity)) if (x) panel.append(x);
  return panel;
}
const wc2 = t => (String(t || '').trim().match(/\S+/g) || []).length;
