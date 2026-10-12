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
//
// Alliance (co-bid, 2026-10-12): two human teams can lead a lot together. One team sends an invitation (proposeCoBid), the other
// accepts it (joinCoBid), and only then does the pair lead, at the invited price, each paying half. Until it is accepted nothing is
// bid and no cash is held. A joint leader is stored as high = { team: inviter, ally: partner, name: 'A and B' }, so every place that
// asks "who leads" must use leadsLot (flow.js). At close both partners get the engine's own co-bid: { lot, amount, ally: other }.

import { CO, feeRate, budgetOf, obligations } from '../engine/model.js';
import { botDecide } from '../engine/bots.js';
import { hash01 } from '../engine/rng.js';
import { leadsLot, shareOfLot } from './flow.js';

export const MARKET_SECONDS = { 1: 240, 2: 150, 3: 150, 4: 180, 5: 150 };
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
    if ((state.openingWinners || []).includes(id)) { bots[id] = { targets: [] }; continue; }   // an AI seat that won in the starting auction sits out the rest of round 1
    const dec = botDecide(state, id);
    const targets = (dec.bids || []).filter(b => lots[b.lot] && b.amount > 0).map(b => ({ lot: b.lot, max: b.amount }))
      .sort((a, b) => b.max / lots[b.lot].catalog - a.max / lots[a.lot].catalog || (a.lot < b.lot ? -1 : 1));
    bots[id] = { targets };
  }
  return { round: state.round, open: true, lots, order, bots, acks: {}, seen: {}, tick: 0, proposals: [], rests: {} };
}

// What the team already owes if it keeps every lot it leads, including the deal fee.
export function ledBy(m, tid) { return m.order.map(k => m.lots[k]).filter(l => leadsLot(l, tid)); }
// The bids a team would have if the market closed now, in the shape obligations() reads (a joint lead is a co-bid: half of the company).
export function bidsOf(m, tid, exceptLot) {
  return ledBy(m, tid).filter(l => l.key !== exceptLot).map(l => ({ lot: l.key, amount: l.price, ...(l.high.ally ? { ally: l.high.team === tid ? l.high.ally : l.high.team } : {}) }));
}
export function committedBy(m, state, tid, exceptLot) {
  const fee = 1 + feeRate(state, tid);
  return ledBy(m, tid).filter(l => l.key !== exceptLot).reduce((s, l) => s + l.price * shareOfLot(l) * fee, 0);
}

// The cash rule behind placeBid, in one place so the team page can show the same limit the market enforces (2026-10-12).
// The team must also be able to pay the end-of-round obligations (complexity cost of the portfolio it would then hold, interest on
// its credit line) from what is left, or the game would force it to sell a business, possibly the one it is bidding for.
// share is 1 for a bid of the team's own and 0.5 for its half of a co-bid (the team then holds half the company and pays half the price).
export function affordParts(m, state, tid, lotKey, amount, rest = 0, share = 1) {
  const fee = 1 + feeRate(state, tid), have = committedBy(m, state, tid, lotKey), budget = budgetOf(state, tid);
  const bids = bidsOf(m, tid, lotKey).concat([share < 1 ? { lot: lotKey, amount, ally: 'partner' } : { lot: lotKey, amount }]);
  const obl = obligations(state, tid, { bids }).total, after = have + amount * share * fee + rest + obl;
  return { fee, have, budget, obl, after };
}
function cantAffordText(budget, have, thisBid, rest, obl, after) {
  return 'You cannot safely afford this bid. Your cash plus credit line is $' + Math.round(budget) + 'M. Your winning bids come to $' + Math.round(have) + 'M, this bid adds $' + Math.round(thisBid) + 'M' + (rest ? ', build orders take $' + Math.round(rest) + 'M' : '') + ', and about $' + Math.round(obl) + 'M must be paid at the end of the round for interest and the cost of running your businesses. That is $' + Math.ceil(after - budget * CUSHION) + 'M too much, and the game would have to sell one of your businesses.';
}
// The largest bid on this lot the cash rule accepts right now, before build orders (pass them as `rest` to take them off). The end-of-round
// obligations do not depend on the bid amount (they use the listed value of the lot), so the limit is a straight subtraction. Not rounded.
// For a co-bid (share 0.5) the answer is the largest total price at which this team's half is affordable.
export function affordLimit(m, state, tid, lotKey, rest = 0, share = 1) {
  const p = affordParts(m, state, tid, lotKey, 0, rest, share);
  return (p.budget * CUSHION - p.have - rest - p.obl) / (p.fee * share);
}

// Try one bid. `rest` is the cash the team has set aside for other things (build orders). Returns {ok, reason}.
export function placeBid(m, state, tid, lotKey, amount, rest = 0, now = Date.now()) {
  const lot = m.lots[lotKey], isBot = state.teams[tid].isBot;
  if (!m.open) return { ok: false, reason: 'The market is closed.' };
  if (!lot) return { ok: false, reason: 'That company is not listed this round.' };
  if (lot.seller === tid) return { ok: false, reason: 'This is your own listing.' };
  if (leadsLot(lot, tid)) return { ok: false, reason: 'You already lead on ' + lot.name + (lot.high.ally ? ' together with ' + state.teams[lot.high.team === tid ? lot.high.ally : lot.high.team].name : '') + '.' };
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
  {   // the AI seats are held to the same cash rule, otherwise they would lead at a price the engine cannot charge them
    const { fee, have, budget, obl, after } = affordParts(m, state, tid, lotKey, amount, rest);
    if (after > budget * CUSHION + 1e-9) {
      return { ok: false, reason: cantAffordText(budget, have, amount * fee, rest, obl, after) };
    }
  }
  lot.price = amount; lot.bids++;
  lot.high = { team: tid, name: state.teams[tid].name, bot: isBot };
  lot.hist.push({ team: tid, name: state.teams[tid].name, bot: isBot, amount, t: now });
  if (lot.hist.length > 12) lot.hist.shift();
  return { ok: true, amount };
}

// ---- alliance: invite, accept ----
const coWho = (state, id) => (state.teams[id] ? state.teams[id].name : id);
function coPrice(lot, amount) {
  if (lot.fixed) return { ok: true, amount: lot.opening };
  amount = Number(amount);
  const need = minNext(lot);
  if (!(amount >= need - 1e-9)) return { ok: false, reason: 'Too low. ' + lot.name + ' is at $' + (lot.price === null ? 'no bid yet' : Math.round(lot.price) + 'M, led by ' + lot.high.name) + '. The smallest bid now is $' + Math.round(need) + 'M.' };
  if (amount > lot.catalog * MAX_MULT) return { ok: false, reason: 'That is more than three times the listed value. Check the number.' };
  return { ok: true, amount };
}
function coCheck(m, state, tid, lot, amount, rest) {
  const { fee, have, budget, obl, after } = affordParts(m, state, tid, lot.key, amount, rest, 0.5);
  if (after > budget * CUSHION + 1e-9) return { ok: false, reason: cantAffordText(budget, have, amount * 0.5 * fee, rest, obl, after) };
  return { ok: true };
}
// Team tid invites ally to bid together on a lot at `amount`. Nothing is bid and no cash is held until the partner accepts.
export function proposeCoBid(m, state, tid, lotKey, ally, amount, rest = 0, now = Date.now()) {
  const lot = m.lots[lotKey];
  if (!m.open) return { ok: false, reason: 'The market is closed.' };
  if (!lot) return { ok: false, reason: 'That company is not listed this round.' };
  if (lot.seller === tid) return { ok: false, reason: 'This is your own listing.' };
  if (!state.teams[ally] || state.teams[ally].isBot || !state.teamIds.includes(ally) || ally === tid) return { ok: false, reason: 'An alliance needs another team with players. The AI teams cannot be partners.' };
  if (lot.seller === ally) return { ok: false, reason: coWho(state, ally) + ' listed this company, so it cannot buy it.' };
  if (leadsLot(lot, tid)) return { ok: false, reason: 'You already lead on ' + lot.name + '.' };
  if (lot.fixed && lot.high) return { ok: false, reason: lot.name + ' was already taken by ' + lot.high.name + '.' };
  const pr = coPrice(lot, amount);
  if (!pr.ok) return pr;
  const c = coCheck(m, state, tid, lot, pr.amount, rest);
  if (!c.ok) return { ok: false, reason: c.reason };
  m.proposals = (m.proposals || []).filter(p => !(p.lot === lotKey && p.from === tid));
  m.proposals.push({ lot: lotKey, from: tid, fromName: coWho(state, tid), to: ally, toName: coWho(state, ally), amount: pr.amount, t: now });
  return { ok: true, amount: pr.amount, kind: 'invite', ally };
}
// Team tid accepts the invitation `from` sent it for this lot. Both halves must pass the cash rule, and the price must still be a valid bid.
export function joinCoBid(m, state, tid, lotKey, from, rest = 0, now = Date.now()) {
  const lot = m.lots[lotKey], p = (m.proposals || []).find(x => x.lot === lotKey && x.from === from && x.to === tid);
  if (!m.open) return { ok: false, reason: 'The market is closed.' };
  if (!lot) return { ok: false, reason: 'That company is not listed this round.' };
  if (!p) return { ok: false, reason: 'There is no invitation from ' + coWho(state, from) + ' for ' + lot.name + ' now.' };
  if (leadsLot(lot, tid) || leadsLot(lot, from)) return { ok: false, reason: 'One of you already leads on ' + lot.name + '.' };
  if (lot.fixed && lot.high) return { ok: false, reason: lot.name + ' was already taken by ' + lot.high.name + '.' };
  if (!lot.fixed && !(p.amount >= minNext(lot) - 1e-9)) return { ok: false, reason: 'The price moved on. ' + lot.name + ' is now at $' + Math.round(lot.price) + 'M and the smallest bid is $' + Math.round(minNext(lot)) + 'M. Ask ' + coWho(state, from) + ' to invite you again.' };
  const mine = coCheck(m, state, tid, lot, p.amount, rest);
  if (!mine.ok) return { ok: false, reason: mine.reason };
  const theirs = coCheck(m, state, from, lot, p.amount, (m.rests || {})[from] || 0);
  if (!theirs.ok) return { ok: false, reason: coWho(state, from) + ' can no longer afford their half of this bid. Ask them to invite you again at a lower price or after they free some cash.' };
  const name = coWho(state, from) + ' and ' + coWho(state, tid);
  lot.price = p.amount; lot.bids++;
  lot.high = { team: from, name, bot: false, ally: tid };
  lot.hist.push({ team: from, name, bot: false, amount: p.amount, t: now });
  if (lot.hist.length > 12) lot.hist.shift();
  m.proposals = m.proposals.filter(x => x !== p);
  return { ok: true, amount: p.amount, kind: 'joint', ally: from };
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
    results.push({ lot: k, name: l.name, winner: l.high.team, winnerName: l.high.name, bot: l.high.bot, price: l.price, ...(l.high.ally ? { partner: l.high.ally } : {}) });
    const bucket = l.high.bot ? botBids : humanBids;
    if (l.high.ally) {   // the engine's own co-bid: each partner submits the same price naming the other, and the engine splits it 50/50
      (bucket[l.high.team] = bucket[l.high.team] || []).push({ lot: k, amount: l.price, ally: l.high.ally });
      (bucket[l.high.ally] = bucket[l.high.ally] || []).push({ lot: k, amount: l.price, ally: l.high.team });
    } else (bucket[l.high.team] = bucket[l.high.team] || []).push({ lot: k, amount: l.price });
  }
  return { humanBids, botBids, results };
}

// The public picture. Safe to show to everyone; it holds no private estimates and no bot maximums.
export function marketSnapshot(m, state) {
  return {
    round: m.round, open: m.open, seen: m.seen, acks: m.acks, proposals: (m.proposals || []).map(p => ({ ...p })),
    obl: Object.fromEntries(state.teamIds.map(id => [id, Math.round(obligations(state, id, { bids: bidsOf(m, id) }).total * 10) / 10])),
    // The most each team may bid on each lot under the cash rule (before its build orders), so the team page can show it. Whole dollars, rounded down.
    cap: Object.fromEntries(state.teamIds.map(id => [id, Object.fromEntries(m.order.filter(k => !leadsLot(m.lots[k], id) && m.lots[k].seller !== id).map(k => [k, Math.floor(affordLimit(m, state, id, k) * 100) / 100]))])),
    // the same for this team's half of a co-bid: the largest total price at which its half passes the cash rule
    capCo: Object.fromEntries(state.teamIds.map(id => [id, Object.fromEntries(m.order.filter(k => !leadsLot(m.lots[k], id) && m.lots[k].seller !== id).map(k => [k, Math.floor(affordLimit(m, state, id, k, 0, 0.5) * 100) / 100]))])),
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
  m.open = snap.open; m.seen = snap.seen || {}; m.acks = snap.acks || {}; m.proposals = (snap.proposals || []).map(p => ({ ...p }));
  for (const s of snap.lots) {
    const l = m.lots[s.key]; if (!l) continue;
    l.price = s.price; l.high = s.high; l.bids = s.bids; l.hist = s.hist || [];
  }
  return m;
}
