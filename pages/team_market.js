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

function liveCard(ctx, l, sl) {
  const { view, ui } = ctx, ok = ctx.editable('market') && ctx.market.open, tid = view.teamId;
  const lead = l.high && l.high.team === tid, own = l.seller === tid;
  const art = artUrl(l.ind, l.key);
  const vl = view.lots.find(x => x.key === l.key) || {};
  const sig = vl.signal ? [gl('signal', 'Your team\'s estimate'), ': ', h('b', fmtM(vl.signal.lo) + ' to ' + fmtM(vl.signal.hi))] : null;
  const buttons = [];
  if (own) buttons.push(h('span.sub', 'Your own listing.'));
  else if (l.fixed) buttons.push(h('button.bid', { type: 'button', disabled: !ok || !!l.high, onclick: () => ctx.liveBid(l.key, l.opening) }, l.high ? 'Taken' : 'Take it at ' + fmtM(l.opening)));
  else {
    const f = ui['lb' + l.key] || '', need = l.next * (1 + view.feeRate), poor = need > ctx.meter.free + 1e-9;
    if (ok && !lead && poor) buttons.push(h('p.ack.bad.cashwarn', 'Not enough free cash for the next bid: it needs ' + fmtM(Math.ceil(need)) + ' with the deal fee and you have ' + fmtM(Math.max(0, Math.floor(ctx.meter.free))) + ' free.'));
    buttons.push(h('button.bid.go', { type: 'button', disabled: !ok || lead || poor, title: lead ? 'You already lead.' : poor ? 'Not enough free cash.' : '', onclick: () => ctx.liveBid(l.key, l.next) }, lead ? 'You lead' : 'Bid ' + fmtM(l.next)));
    buttons.push(h('input.bidamt', { type: 'number', min: l.next, step: l.step, placeholder: 'Other amount', value: f, disabled: !ok || lead, 'aria-label': 'Bid amount in millions for ' + l.name, oninput: e => { ui['lb' + l.key] = e.target.value; } }));
    buttons.push(h('button.bid', { type: 'button', disabled: !ok || lead, onclick: () => { const a = Number(ui['lb' + l.key]); if (!(a > 0)) { ctx.toast('Type an amount first.'); return; } ctx.liveBid(l.key, a); ui['lb' + l.key] = ''; } }, 'Bid this'));
  }
  if (!own && vl.buildCost !== null && vl.buildCost !== undefined && !l.fixed) {
    const build = ctx.plan.builds.find(b => b.lot === l.key);
    const poorBuild = !build && vl.buildCost > ctx.meter.free + 1e-9;
    buttons.push(h('button', { type: 'button', title: poorBuild ? 'Not enough free cash for this build.' : 'Build your own for ' + fmtM(vl.buildCost) + ' instead of bidding. It opens in two rounds at 70% strength.', disabled: !ok || !!build || poorBuild || attentionUsed(ctx.plan, true) >= view.attMax, onclick: () => { const m = ctx.row.market || {}; ctx.write({ market: { bids: m.bids || [], builds: [...(m.builds || []), { lot: l.key }], live: m.live || {}, closed: false } }); } }, build ? 'Build ordered ' + fmtM(vl.buildCost) : 'Build ' + fmtM(vl.buildCost)));
    if (build && ok) buttons.push(h('button.x', { type: 'button', title: 'Cancel the build order', onclick: () => { const m = ctx.row.market || {}; ctx.write({ market: { bids: m.bids || [], builds: (m.builds || []).filter(b => b.lot !== l.key), live: m.live || {}, closed: false } }); } }, 'x'));
    if (poorBuild && ok) buttons.push(h('p.ack.bad.cashwarn', 'Not enough free cash to build this: it costs ' + fmtM(vl.buildCost) + ' and you have ' + fmtM(Math.max(0, Math.floor(ctx.meter.free))) + ' free.'));
  }
  if (!own && vl && !vl.deep) buttons.push(h('button', { type: 'button', title: 'Spend 1 attention to see this company\'s real value band.', disabled: !ok || ctx.plan.actions.some(a => a.lot === l.key) || attentionUsed(ctx.plan, true) >= view.attMax, onclick: () => ctx.write({ actions: [...ctx.plan.actions, { type: 'deepdive', lot: l.key }] }) }, gl('deepdive', 'Deep dive')));
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
    priceBox, ackLine(ctx, l, sl),
    h('div.btns', buttons),
    hist.length ? h('ul.hist', hist) : null,
  ]);
}

export function renderLiveMarket(ctx) {
  const { view, game, market } = ctx, ok = ctx.editable('market');
  const zone = h('section.zone.zone-mkt' + (ok ? '' : '.grey'), { dataset: { zone: 'mkt' } });
  zone.append(h('h2', 'Market ' + (game.phase === 'market' ? '(live)' : '(closed)')));
  if (!market) { zone.append(h('p.empty', game.phase === 'market' ? 'Loading the market...' : 'Nothing is for sale right now.')); return zone; }
  if (game.phase === 'market') {
    const led = ctx.led || [];
    zone.append(h('p.banner.leadsum', led.length ? 'You lead on ' + led.map(l => l.name + ' ' + fmtM(l.price)).join(', ') + '. Free cash now ' + fmtM(ctx.meter.free) + '.' : 'You lead on nothing yet. Free cash ' + fmtM(ctx.meter.free) + '.'));
    if (game.round === 1) zone.append(h('p.sub', 'Round 1: if you win no company, you get one automatic build on the cheapest company, so every team ends with three businesses.'));
    if (view.drawn > 0.5) zone.append(h('p.warnline', 'You already owe ' + fmtM(view.drawn) + ' on your credit line. If cash runs out at the end of the round, the game sells your weakest business, even one you just won.'));
    zone.append(h('p.sub', 'Each lot shows its price and who leads it. Beat the price by one step to take the lead. A bid in the last 8 seconds adds 8 seconds. When the market closes, the leader pays the price.'));
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
