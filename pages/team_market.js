// Team page pieces for the live market and the step bar (2026-10-09). Pure rendering from the team context.
// The price, the leader and every "your bid" status come from the market snapshot the admin publishes, never from the local click,
// so a bid that was too low or too late says so.

import { h, fmtM, mmss } from './util.js';
import { gl } from './glossary.js';
import { icon, IND, artUrl } from './art.js';
import { attentionUsed } from './roles.js';
import { STEPS } from './flow.js';

// ---------- step bar ----------
export function renderSteps(ctx) {
  if (!ctx.view || ctx.game.phase === 'lobby') return h('div');
  const f = ctx.flow, steps = STEPS.filter(s => s.key !== 'market' || ctx.hasMarket);
  return h('section.stepbar' + (f.mine ? '.mine' : ''), { dataset: { step: f.step } }, [
    h('ol.steps', steps.map((s, i) => h('li' + (f.step === s.n ? '.on' : '') + (f.done.includes(s.n) ? '.done' : ''), { dataset: { n: s.n } }, [h('span.sn', f.done.includes(s.n) ? '✓' : i + 1), ' ' + s.label]))),
    h('div.stepnow', [h('b', f.title), h('span', ' ' + f.text)]),
  ]);
}

// ---------- live market ----------
function ackLine(ctx, l, sl) {
  const tid = ctx.view.teamId, mine = (ctx.row.market || {}).live || {};
  const bid = mine[l.key], ack = ((ctx.market.acks || {})[tid] || {})[l.key];
  if (bid && (!ack || ack.t !== bid.t)) return h('p.ack.wait', 'Sending your bid of ' + fmtM(bid.amount) + '...');
  if (ack && !ack.ok) return h('p.ack.bad', ['Not placed: ', ack.reason]);
  if (ack && ack.ok && l.high && l.high.team === tid) return h('p.ack.good', 'Your bid of ' + fmtM(l.price) + ' is the highest.');
  if (ack && ack.ok && l.high && l.high.team !== tid) return h('p.ack.out', 'You were outbid. ' + l.high.name + ' now leads at ' + fmtM(l.price) + '.');
  return null;
}

// The most this team may bid on a lot under the same cash rule the market uses to refuse a bid (market.js affordLimit, published in the
// snapshot as `cap`), less the build orders in the team's own plan, which the market also counts. Whole dollars, rounded down. Null if the
// snapshot has no number for this lot (an older snapshot); the card then falls back to the free-cash check.
export function bidLimit(ctx, l) {
  const cap = ((ctx.market || {}).cap || {})[ctx.view.teamId];
  if (!cap || typeof cap[l.key] !== 'number') return null;
  const rest = (ctx.plan.builds || []).reduce((s, b) => { const x = ctx.view.lots.find(v => v.key === b.lot); return s + ((x && x.buildCost) || 0); }, 0);
  return Math.max(0, Math.floor(cap[l.key] - rest / (1 + ctx.view.feeRate) + 1e-9));
}
const CANT = 'You cannot safely afford this bid.';
const cantText = lim => CANT + ' The most you can bid on this company right now is ' + fmtM(lim) + '.';

function maxLine(ctx, l, lead, own) {
  if (own || lead || !ctx.market.open) return null;
  const lim = bidLimit(ctx, l);
  if (lim === null) return null;
  return h('p.maxbid', ['Most you can bid right now: ', h('b', fmtM(lim)), l.fixed || lim >= l.next ? '' : ', which is below the smallest bid']);
}

function liveCard(ctx, l, sl) {
  const { view, ui } = ctx, ok = ctx.editable('market') && ctx.market.open, tid = view.teamId;
  const lead = l.high && l.high.team === tid, own = l.seller === tid;
  const art = artUrl(l.ind, l.key);
  const vl = view.lots.find(x => x.key === l.key) || {};
  const sig = vl.signal ? [gl('signal', 'Your team\'s estimate'), ': ', h('b', fmtM(vl.signal.lo) + ' to ' + fmtM(vl.signal.hi))] : null;
  const buttons = [];
  if (own) buttons.push(h('span.sub', 'Your own listing.'));
  else if (l.fixed) {
    const lim = bidLimit(ctx, l), over = lim !== null && l.opening > lim + 1e-9;
    if (ok && !l.high && over) buttons.push(h('p.ack.bad.cashwarn', cantText(lim)));
    buttons.push(h('button.bid', { type: 'button', disabled: !ok || !!l.high || over, title: over ? CANT : '', onclick: () => ctx.liveBid(l.key, l.opening) }, l.high ? 'Taken' : 'Take it at ' + fmtM(l.opening)));
  }
  else {
    const f = ui['lb' + l.key] || '', need = l.next * (1 + view.feeRate), lim = bidLimit(ctx, l);
    // with the market's own number the button follows the market's rule; without it, fall back to the free-cash check
    const poor = lim !== null ? l.next > lim + 1e-9 : need > ctx.meter.free + 1e-9;
    if (ok && !lead && poor) buttons.push(h('p.ack.bad.cashwarn', lim !== null ? cantText(lim) : 'Not enough free cash for the next bid: it needs ' + fmtM(Math.ceil(need)) + ' with the deal fee and you have ' + fmtM(Math.max(0, Math.floor(ctx.meter.free))) + ' free.'));
    buttons.push(h('button.bid.go', { type: 'button', disabled: !ok || lead || poor, title: lead ? 'You already lead.' : poor ? CANT : '', onclick: () => ctx.liveBid(l.key, l.next) }, lead ? 'You lead' : 'Bid ' + fmtM(l.next)));
    const warn = h('p.ack.bad.cashwarn.customwarn', { style: 'display:none' });
    const check = a => lim !== null && a > lim + 1e-9 ? cantText(lim) : a > l.catalog * 3 + 1e-9 ? 'That is more than three times the listed value. Check the number.' : '';
    buttons.push(h('input.bidamt', { type: 'number', min: l.next, max: lim !== null ? lim : undefined, step: l.step, placeholder: 'Other amount', value: f, disabled: !ok || lead, 'aria-label': 'Bid amount in millions for ' + l.name, oninput: e => { ui['lb' + l.key] = e.target.value; const t = check(Number(e.target.value)); warn.textContent = t; warn.style.display = t ? '' : 'none'; } }));
    buttons.push(h('button.bid', { type: 'button', disabled: !ok || lead, onclick: () => { const a = Number(ui['lb' + l.key]); if (!(a > 0)) { ctx.toast('Type an amount first.'); return; } const t = check(a); if (t) { warn.textContent = t; warn.style.display = ''; ctx.toast(t); return; } ctx.liveBid(l.key, a); ui['lb' + l.key] = ''; } }, 'Bid this'));
    buttons.push(warn);
  }
  if (!own && vl.buildCost !== null && vl.buildCost !== undefined && !l.fixed) {
    const build = ctx.plan.builds.find(b => b.lot === l.key);
    const poorBuild = !build && vl.buildCost > ctx.meter.free + 1e-9;
    buttons.push(h('button', { type: 'button', title: poorBuild ? 'Not enough free cash for this build.' : 'Build your own for ' + fmtM(vl.buildCost) + ' instead of bidding. It opens in two rounds at 70% strength.', disabled: !ok || !!build || poorBuild || attentionUsed(ctx.plan, true) >= view.attMax, onclick: () => { const m = ctx.row.market || {}; ctx.write({ market: { bids: m.bids || [], builds: [...(m.builds || []), { lot: l.key }], live: m.live || {}, closed: false } }); } }, build ? 'Build ordered ' + fmtM(vl.buildCost) : 'Build ' + fmtM(vl.buildCost)));
    if (build && ok) buttons.push(h('button.x', { type: 'button', title: 'Cancel the build order', onclick: () => { const m = ctx.row.market || {}; ctx.write({ market: { bids: m.bids || [], builds: (m.builds || []).filter(b => b.lot !== l.key), live: m.live || {}, closed: false } }); } }, 'x'));
    if (poorBuild && ok) buttons.push(h('p.ack.bad.cashwarn', 'Not enough free cash to build this: it costs ' + fmtM(vl.buildCost) + ' and you have ' + fmtM(Math.max(0, Math.floor(ctx.meter.free))) + ' free.'));
  }
  if (!own && vl && !vl.deep) buttons.push(h('button', { type: 'button', title: 'Spend 1 attention to narrow the estimate range for this company. The answer is final.', disabled: !ok || ctx.plan.actions.some(a => a.lot === l.key) || attentionUsed(ctx.plan, true) >= view.attMax, onclick: () => ctx.write({ actions: [...ctx.plan.actions, { type: 'deepdive', lot: l.key }] }) }, gl('deepdive', 'Deep dive')));
  const priceBox = l.fixed
    ? h('div.pricebox', [h('b.price', fmtM(l.opening)), h('span.sub', ' fixed price, listed by ' + l.sellerName + '. ' + (l.high ? l.high.name + ' took it.' : 'First team to take it gets it.'))])
    : h('div.pricebox', [l.price === null ? [h('b.price.none', 'No bids'), h('span.sub', ' opening price ' + fmtM(l.opening))] : [h('b.price', fmtM(l.price)), h('span.sub', ' led by '), h('b.leader' + (lead ? '.me' : ''), lead ? 'YOU' : l.high.name), l.high.bot ? h('em.ai', 'AI') : null]]);
  const hist = l.hist.slice(-3).reverse().map(x => h('li', [h('b', x.name), x.bot ? h('em.ai', 'AI') : null, ' ' + fmtM(x.amount)]));
  return h('article.card.lot.live' + (lead ? '.leading' : '') + (l.high && !lead ? '.rival' : ''), { dataset: { lot: l.key } }, [
    h('div.card-head', [art ? h('img.art.sm', { src: art, alt: '' }) : h('div.arttile.sm', { style: 'border-color:' + IND[l.ind].color }, icon(l.ind, 26)),
      h('div', [h('b', l.name), h('span.tag', { style: 'background:' + IND[l.ind].color }, IND[l.ind].label), l.scarce ? h('span.tag.scarce', 'scarce') : null])]),
    h('div.facts', [h('span', [gl('catalog'), ' ', h('b', fmtM(l.catalog))])]),
    vl.claim ? h('p.claim', '"Seller says: ' + vl.claim + '"') : null,
    sig ? h('p.sig', sig) : null,
    priceBox, maxLine(ctx, l, lead, own), ackLine(ctx, l, sl),
    h('div.btns', buttons),
    hist.length ? h('ul.hist', hist) : null,
  ]);
}

export function renderLiveMarket(ctx) {
  const { view, game, market } = ctx, ok = ctx.editable('market');
  const zone = h('section.zone.zone-mkt' + (ok ? '' : '.grey'), { dataset: { zone: 'mkt' } });
  zone.append(h('h2', (ctx.opening ? 'Opening auction ' : 'Market ') + (game.phase === 'market' ? '(live)' : '(closed)')));
  if (!market) { zone.append(h('p.empty', game.phase === 'market' ? 'Loading the market...' : 'Nothing is for sale right now.')); return zone; }
  if (game.phase === 'market') {
    const led = ctx.led || [];
    zone.append(h('p.banner.leadsum', led.length ? 'You lead on ' + led.map(l => l.name + ' ' + fmtM(l.price)).join(', ') + '. Free cash now ' + fmtM(ctx.meter.free) + '.' : 'You lead on nothing yet. Free cash ' + fmtM(ctx.meter.free) + '.'));
    if (ctx.opening) zone.append(h('p.sub', 'You own 2 businesses and need a 3rd. Win a company here and it joins your portfolio at the price you pay. You may win more than one, but each extra business adds running cost. Win nothing and you can still bid in round 1. If you have no new company by the end of round 1, the game orders a build for you. It arrives in round 3 at 70% strength. Anything nobody wins is for sale again in round 1.'));
    else if (game.round === 1 && ctx.openingResult) zone.append(h('p.banner.openingres', ctx.openingResult.length ? 'Opening auction: you won ' + ctx.openingResult.map(r => r.name + ' for ' + fmtM(r.price)).join(' and ') + '. It is already one of your businesses. What nobody won is on the side below.' : 'Opening auction: you won nothing. You can still bid on what is left below, or order a build. If you do neither, round 1 gives you an automatic build.'));
    else if (game.round === 1) zone.append(h('p.sub', 'Round 1: if you have no new company by the end of the round, the game orders a build for you. It arrives in round 3 at 70% strength.'));
    if (view.drawn > 0.5) zone.append(h('p.warnline', 'You already owe ' + fmtM(view.drawn) + ' on your credit line. If cash runs out at the end of the round, the game sells your weakest business, even one you just won.'));
    if (game.round === 4) zone.append(h('p.sub', 'New builds can only be ordered in rounds 1 to 3.'));
    zone.append(h('p.sub', 'Each company starts at half its listed value. To lead, beat the current price by one step (about 2.5% of listed value, never under $5M). Bids above 3 times listed value are refused. A bid in the last 8 seconds adds 8 seconds. When the market closes, each leader pays its price plus the deal fee. Owning more businesses costs more to run each round, especially if they are unrelated. That running cost is counted when the game checks whether you can afford a bid.'));
  } else {
    const won = ctx.plan.bids.map(b => { const l = market.lots.find(x => x.key === b.lot); return (l ? l.name : b.lot) + ' for ' + fmtM(b.amount); });
    zone.append(h('p.banner.wonsum', won.length ? 'You won ' + won.join(', ') + '.' : 'You won nothing in the market.' + (game.round === 1 ? ' Round 1 gives every team an automatic build.' : '')));
    const res = (market.final && market.final.results) || [];
    if (res.length) zone.append(h('ul.mkres', res.map(r => h('li', r.winner ? [h('b', r.name), ' went to ', r.winnerName, r.bot ? ' (AI)' : '', ' at ' + fmtM(r.price)] : [h('b', r.name), ' got no bids and stays listed']))));
    return zone;
  }
  for (const l of market.lots) zone.append(liveCard(ctx, l));
  return zone;
}
