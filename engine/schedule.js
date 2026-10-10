// Shock schedule: which 11 chains run, when they start, and whether each one resolves yes (hidden).
// Follows spec 02 section 6 and 04 E.8. Outcomes are keyed draws made once at game creation.

import { CHAINS, SCHEDULE_RULE } from './data/shocks.js';
import { hash01, keyedShuffle } from './rng.js';

const chainById = Object.fromEntries(CHAINS.map(c => [c.id, c]));

function overlaps(a, b, startA, startB) {
  const bad = SCHEDULE_RULE.bad_overlap.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  return bad && Math.abs(startA - startB) <= 1;
}

// Pick 11 chains and give each a start round. Returns null when this keyed try cannot satisfy the rules.
function constructSchedule(seed, attempt, tryNo, cfg) {
  const order = keyedShuffle(CHAINS, seed, 'sched_pick', attempt, tryNo);
  const perInd = {};
  const picked = [];
  for (const c of order) {
    if (picked.length >= cfg.CHAINS_PER_GAME) break;
    if (c.primary_industries.some(i => (perInd[i] || 0) >= SCHEDULE_RULE.max_scheduled_per_primary_industry)) continue;
    picked.push(c);
    c.primary_industries.forEach(i => { perInd[i] = (perInd[i] || 0) + 1; });
  }
  if (picked.length < cfg.CHAINS_PER_GAME) return null;
  if (!picked.some(c => c.category === 'macro')) return null;
  // Assign start rounds 4 / 3 / 4 by keyed order with a small backtracking search.
  const slots = { 1: SCHEDULE_RULE.start_round_counts['1'], 2: SCHEDULE_RULE.start_round_counts['2'], 3: SCHEDULE_RULE.start_round_counts['3'] };
  const starts = {};
  const seq = keyedShuffle(picked, seed, 'sched_start', attempt, tryNo);
  function place(k) {
    if (k === seq.length) return true;
    const c = seq[k];
    const rounds = keyedShuffle([1, 2, 3], seed, 'sched_round', attempt, tryNo, c.id);
    for (const r of rounds) {
      if (!slots[r] || r < c.earliest_start_round || r > c.latest_start_round) continue;
      if (Object.entries(starts).some(([id, s]) => overlaps(c.id, id, r, s))) continue;
      slots[r]--; starts[c.id] = r;
      if (place(k + 1)) return true;
      slots[r]++; delete starts[c.id];
    }
    return false;
  }
  return place(0) ? picked.map(c => ({ id: c.id, start: starts[c.id] })) : null;
}

// Draw outcomes in start-round order, applying lifts from earlier yes outcomes.
function drawOutcomes(seed, attempt, items) {
  const sorted = [...items].sort((a, b) => a.start - b.start || (a.id < b.id ? -1 : 1));
  const done = [];
  for (const it of sorted) {
    const c = chainById[it.id];
    let delta = 0;
    for (const l of SCHEDULE_RULE.lifts) {
      if (l.to !== it.id) continue;
      const src = done.find(d => d.id === l.from);
      if (src && src.yes && it.start >= src.start + 2) delta += l.delta;
    }
    const q = c.stage2.q_up_path;
    const path = hash01(seed, 'chain_path', it.id, attempt) < q ? 'up' : 'down';
    const base = path === 'up' ? c.stage2.up.p : c.stage2.down.p;
    const p = Math.min(0.98, Math.max(0.02, base + delta));
    const yes = hash01(seed, 'chain_outcome', it.id, attempt) < p;
    done.push({
      id: it.id, start: it.start, path, yes, stage1P: Math.min(0.98, Math.max(0.02, c.stage1.p + delta)),
      p, duration: c.stage3.duration_rounds, activeFrom: it.start + 2, activeTo: it.start + 1 + c.stage3.duration_rounds,
    });
  }
  return done;
}

function passesGate(done, cfg) {
  const yes = done.filter(d => d.yes);
  if (yes.length < cfg.RESOLVED_RANGE[0] || yes.length > cfg.RESOLVED_RANGE[1]) return false;
  const perInd = {};
  for (const d of yes) for (const i of chainById[d.id].primary_industries) {
    perInd[i] = (perInd[i] || 0) + 1;
    if (perInd[i] > SCHEDULE_RULE.max_resolved_per_primary_industry) return false;
  }
  return true;
}

// Returns { chains, attempts, resolved }. attempts counts whole-game redraws (gate failures).
export function buildSchedule(seed, cfg) {
  for (let attempt = 1; attempt <= cfg.MAX_SCHEDULE_ATTEMPTS; attempt++) {
    let items = null;
    for (let tryNo = 0; tryNo < 200 && !items; tryNo++) items = constructSchedule(seed, attempt, tryNo, cfg);
    if (!items) continue;
    const done = drawOutcomes(seed, attempt, items);
    if (passesGate(done, cfg)) return { chains: done, attempts: attempt, resolved: done.filter(d => d.yes).length, accepted: true };
    if (attempt === cfg.MAX_SCHEDULE_ATTEMPTS) return { chains: done, attempts: attempt, resolved: done.filter(d => d.yes).length, accepted: false };
  }
  throw new Error('no schedule could be constructed');
}

export { chainById };
