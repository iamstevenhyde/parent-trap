// The live market (2026-10-09). Pure logic, no DOM and no storage, so the admin host, the team page and the headless
// class simulation all use the same rules. The engine is not changed by anything here except through two default-off
// switches: state.opts.liveAuction (bids do not use attention, the meter sums them) and state.liveBotBids (the bots'
// final live bids replace the sealed ones they would have made).
//
// How a market works: every listed company has a live price. The first bid must reach the opening price (half the
// catalog value), each later bid must beat the current price by one step, and the high bidder holds the lot until
// someone beats them. A company another team listed has a fixed price: the first team to take it gets it. The AI
// conglomerates bid in the same market, one lot at a time, up to the most their own rule would pay. When the
// market closes, the high bidders' final prices become ordinary bids and the engine clears them unchanged.

import { CO, feeRate, budgetOf, obligations } from '../engine/model.js';
import { botDecide } from '../engine/bots.js';
import { hash01 } from '../engine/rng.js';

export const MARKET_SECONDS = { 1: 240, 2: 150, 3: 150, 4: 180, 5: 0 };
export const SNIPE_MS = 8000;      // a bid in the last 8 seconds puts 8 seconds back on the clock
export const CUSHION = 1;          // share of cash plus credit line a team may promise in the market (the end-of-round obligations are counted exactly)
export const MAX_MULT = 3;         // typo guard: no bid above three times the catalog value

export const stepFor = catalog => Math.max(5, Math.round(catalog * 0.025 / 5) * 5);
export const openingFor = catalog => Math.max(5, Math.round(catalog * 0.5 / 5) * 5);
export const minNext = lot => (lot.fixed ? lot.opening : lot.high ? lot.price + lot.step : lot.opening);

export function openMarket(state) {
  const lots = {}, order = [];
  for (const l of state.lots) {
    const u = state.units[l.unitId], fixed = l.kind === 'team';
    lots[l.key] = {
      key: l.key, unitId: l.unitId, kind: l.kind, name: CO[u.co].name, ind: u.ind, catalog: l.catalog, scarce: !!l.scarce, seller: l.seller || null,
      sellerName: l.seller ? state.teams[l.seller].name : null, fixed, opening: fixed ? l.price : openingFor(l.catalog), step: fixed ? 0 : stepFor(l.catalog),
      price: null, high: null, hist: [], bids: 0,
    };
    order.push(l.key);
  }
  const bots = {};
  for (const id of state.botIds) {
    const dec = botDecide(state, id);
    const targets = (dec.bids || []).filter(b => lots[b.lot] && b.amount > 0).map(b => ({ lot: b.lot, max: b.amount }))
      .sort((a, b) => b.max / lots[b.lot].catalog - a.max / lots[a.lot].catalog || (a.lot < b.lot ? -1 : 1));
    bots[id] = { targets };
  }
  return { round: state.round, open: true, lots, order, bots, acks: {}, seen: {}, tick: 0 };
}

// What the team already owes if it keeps every lot it leads, including the deal fee.
export function ledBy(m, tid) { return m.order.map(k => m.lots[k]).filter(l => l.high && l.high.team === tid); }
export function committedBy(m, state, tid, exceptLot) {
  const fee = 1 + feeRate(state, tid);
  return ledBy(m, tid).filter(l => l.key !== exceptLot).reduce((s, l) => s + l.price * fee, 0);
}

// Try one bid. `rest` is the cash the team has set aside for other things (build orders). Returns {ok, reason}.
export function placeBid(m, state, tid, lotKey, amount, rest = 0, now = Date.now()) {
  const lot = m.lots[lotKey], isBot = state.teams[tid].isBot;
  if (!m.open) return { ok: false, reason: 'The market is closed.' };
  if (!lot) return { ok: false, reason: 'That company is not listed this round.' };
  if (lot.seller === tid) return { ok: false, reason: 'This is your own listing.' };
  if (lot.high && lot.high.team === tid) return { ok: false, reason: 'You already lead on ' + lot.name + '.' };
  if (lot.fixed) {
    if (lot.high) return { ok: false, reason: lot.name + ' was already taken by ' + lot.high.name + '.' };
    amount = lot.opening;
  } else {
    amount = Number(amount);
    const need = minNext(lot);
    if (!(amount >= need - 1e-9)) {
      return { ok: false, reason: 'Too low. ' + lot.name + ' is at $' + (lot.price === null ? 'no bid yet' : Math.round(lot.price) + 'M, led by ' + lot.high.name) + '. The smallest bid now is $' + Math.round(need) + 'M.' };
    }
    if (amount > lot.catalog * MAX_MULT) return { ok: false, reason: 'That is more than three times the listed value. Check the number.' };
  }
  if (!isBot) {
    const fee = 1 + feeRate(state, tid), have = committedBy(m, state, tid, lotKey), budget = budgetOf(state, tid);
    // The team must also be able to pay the end-of-round obligations (complexity cost of the portfolio it would then hold, interest on
    // its credit line) from what is left, or the game would force it to sell a business, possibly the one it is bidding for.
    const bids = ledBy(m, tid).filter(l => l.key !== lotKey).map(l => ({ lot: l.key, amount: l.price })).concat([{ lot: lotKey, amount }]);
    const obl = obligations(state, tid, { bids }).total, after = have + amount * fee + rest + obl;
    if (after > budget * CUSHION + 1e-9) {
      return { ok: false, reason: 'You cannot safely afford this bid. Your cash plus credit line is $' + Math.round(budget) + 'M. Your winning bids come to $' + Math.round(have) + 'M, this bid adds $' + Math.round(amount * fee) + 'M' + (rest ? ', build orders take $' + Math.round(rest) + 'M' : '') + ', and about $' + Math.round(obl) + 'M must be paid at the end of the round for interest and the cost of running your businesses. That is $' + Math.ceil(after - budget * CUSHION) + 'M too much, and the game would have to sell one of your businesses.' };
    }
  }
  lot.price = amount; lot.bids++;
  lot.high = { team: tid, name: state.teams[tid].name, bot: isBot };
  lot.hist.push({ team: tid, name: state.teams[tid].name, bot: isBot, amount, t: now });
  if (lot.hist.length > 12) lot.hist.shift();
  return { ok: true, amount };
}

// One beat of the AI bidders. A bot that leads a lot holds it; a bot with no lead raises on its first target it can still afford.
export function botTick(m, state, now = Date.now()) {
  m.tick++;
  const moves = [];
  for (const id of state.botIds) {
    if (ledBy(m, id).length) continue;
    if (hash01(state.seed, 'bot_tick', m.round, id, m.tick) > 0.55) continue;
    for (const tg of (m.bots[id] || { targets: [] }).targets) {
      const lot = m.lots[tg.lot];
      if (!lot || (lot.high && lot.high.team === id)) continue;
      const need = minNext(lot);
      if (need > tg.max + 1e-9) continue;
      const r = placeBid(m, state, id, tg.lot, need, 0, now);
      if (r.ok) { moves.push({ bot: id, lot: tg.lot, amount: r.amount }); break; }
    }
  }
  return moves;
}

// Close the market. Returns the bids the engine will clear and a plain result list.
export function closeMarket(m) {
  m.open = false;
  const humanBids = {}, botBids = {}, results = [];
  for (const k of m.order) {
    const l = m.lots[k];
    if (!l.high) { results.push({ lot: k, name: l.name, winner: null, price: null }); continue; }
    results.push({ lot: k, name: l.name, winner: l.high.team, winnerName: l.high.name, bot: l.high.bot, price: l.price });
    const bucket = l.high.bot ? botBids : humanBids;
    (bucket[l.high.team] = bucket[l.high.team] || []).push({ lot: k, amount: l.price });
  }
  return { humanBids, botBids, results };
}

// The public picture. Safe to show to everyone; it holds no private estimates and no bot maximums.
export function marketSnapshot(m, state) {
  return {
    round: m.round, open: m.open, seen: m.seen, acks: m.acks,
    obl: Object.fromEntries(state.teamIds.map(id => [id, Math.round(obligations(state, id, { bids: ledBy(m, id).map(l => ({ lot: l.key, amount: l.price })) }).total * 10) / 10])),
    lots: m.order.map(k => {
      const l = m.lots[k];
      return {
        key: l.key, unitId: l.unitId, name: l.name, ind: l.ind, catalog: l.catalog, scarce: l.scarce, kind: l.kind, fixed: l.fixed, seller: l.seller, sellerName: l.sellerName,
        opening: l.opening, step: l.step, price: l.price, next: minNext(l), high: l.high ? { ...l.high } : null, bids: l.bids,
        hist: l.hist.slice(-6).map(x => ({ team: x.team, name: x.name, bot: x.bot, amount: x.amount, t: x.t })),
      };
    }),
  };
}

// Put a published snapshot back (an admin reload during the market). Bot targets come from botDecide again.
export function restoreMarket(state, snap) {
  const m = openMarket(state);
  m.open = snap.open; m.seen = snap.seen || {}; m.acks = snap.acks || {};
  for (const s of snap.lots) {
    const l = m.lots[s.key]; if (!l) continue;
    l.price = s.price; l.high = s.high; l.bids = s.bids; l.hist = s.hist || [];
  }
  return m;
}
