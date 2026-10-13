// Bigger classes (2026-10-09). The base roster has 36 companies and 8 inheritance pairs, which is exactly enough for
// 8 tables plus 4 bots plus the lots. That is the root cause of the crash above 8 tables: INHERITANCE[8] does not exist,
// and even with it there would be no companies left to auction. For more than 8 tables the game gets "sister" companies:
// a copy of a base company with a new id (base id plus a lowercase letter, R1 -> R1b -> R1c), the same numbers and
// the same hidden-value rules (each has its own seeded hidden value), a distinguishing name, and never scarce.
// With 8 tables or fewer this file returns the base roster untouched, so every earlier result stays identical.

import { COMPANIES, INHERITANCE } from './data/companies.js';
import { CO } from './model.js';

export const MAX_TABLES = 20;
const SUFFIX = ['', ' North', ' South', ' East', ' West', ' Valley', ' Ridge'];
const baseOf = id => id.replace(/[a-z]+$/, '');

function register(baseId, copy) {
  const id = baseId + String.fromCharCode(96 + copy + 1);       // copy 1 -> 'b'
  if (!CO[id]) {
    const b = CO[baseId];
    CO[id] = { ...b, id, name: b.name + (SUFFIX[copy] || ' ' + (copy + 1)), scarce: false, clone: true, start_home: 'sister of ' + baseId };
  }
  return CO[id];
}

// What a game with n tables needs. cfgBase is the engine CONFIG (for the base lot lists).
export function rosterFor(n, cfgBase) {
  const base = COMPANIES;
  const out = { companies: [...base], inheritance: INHERITANCE.map(r => ({ ...r })), round1Lots: [...cfgBase.ROUND1_LOTS], lotsR2: cfgBase.LOTS_R2, lotsR3: cfgBase.LOTS_R3, lotsR4: cfgBase.LOTS_R4_MAX, inheritedClones: [] };
  if (n <= 8) return out;
  const used = {};                                  // base id -> copies made so far
  const make = baseId => { used[baseId] = (used[baseId] || 0) + 1; const co = register(baseId, used[baseId]); out.companies.push(co); return co.id; };
  // one pair per extra table, copied from row (k-1) mod 8, with copy number floor((k-1)/8)
  for (let k = 9; k <= n; k++) {
    const row = INHERITANCE[(k - 1) % 8], copy = Math.floor((k - 1) / 8);
    const ids = row.companies.map(b => { used[b] = Math.max(used[b] || 0, copy - 1); return make(b); });
    out.inheritance.push({ ...row, team: 'T' + k, companies: ids, rationale: row.rationale + ' (sister companies)' });
    out.inheritedClones.push(...ids);
  }
  // round 1: about 1.25 lots per table, so every table can win something; scarce lots stay single
  const wantLots = Math.round(1.25 * n), plain = cfgBase.ROUND1_LOTS.filter(id => !CO[id].scarce);
  for (let i = 0; out.round1Lots.length < wantLots; i++) out.round1Lots.push(make(plain[i % plain.length]));
  // later rounds: lots per round scale with the table count, and the pool has to be big enough to supply them
  const scale = n / 8;
  out.lotsR2 = Math.round(cfgBase.LOTS_R2 * scale); out.lotsR3 = Math.round(cfgBase.LOTS_R3 * scale); out.lotsR4 = Math.round(cfgBase.LOTS_R4_MAX * scale);
  const poolBase = base.filter(c => !c.scarce && !INHERITANCE.some(r => r.companies.includes(c.id))).map(c => c.id);
  const poolNow = base.length - 16 - 4 - cfgBase.ROUND1_LOTS.length;          // base companies free for the pool when 8 tables play
  const need = out.lotsR2 + out.lotsR3 + out.lotsR4 - poolNow + 2;
  for (let i = 0; i < need; i++) make(poolBase[i % poolBase.length]);
  return out;
}
export { baseOf };
