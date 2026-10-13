// Results overlay, history, capabilities and the final autopsy for the team page (spec 05 sections 1.9, 1.11, 2.5).

import { h, fmtM, fmtSigned } from './util.js';
import { gl } from './glossary.js';
import { SCENE } from './art.js';

// Card order from the spec: auctions, shocks, synergy and anergy, complexity, capabilities, forced sale or receivership.
const ORDER = [
  ['auction', ['auction_won', 'winners_curse', 'good_buy', 'auction_lost', 'ally_unmatched', 'auto_build', 'build_ordered', 'build_completed', 'unit_acquired_by_team', 'listing_posted', 'divest_market']],
  ['shock', ['shock_resolved', 'shock_dud', 'shock_team_impact', 'hedge_bought']],
  ['synergy', ['synergy_fired', 'synergy_not_earned', 'anergy_fired', 'turnaround_worked', 'turnaround_failed', 'deep_dive']],
  ['complexity', ['complexity_charged']],
  ['capability', ['capability_earned', 'capability_progress']],
  ['trouble', ['forced_sale', 'receivership']],
];
const GLOSS = { winners_curse: 'winners_curse', synergy_fired: 'synergy', anergy_fired: 'anergy', synergy_not_earned: 'integrate', complexity_charged: 'complexity', capability_earned: 'capability', capability_progress: 'capability', receivership: 'receivership', turnaround_worked: 'turnaround', turnaround_failed: 'turnaround', deep_dive: 'deepdive' };
const BAD = new Set(['winners_curse', 'auction_lost', 'anergy_fired', 'complexity_charged', 'forced_sale', 'receivership', 'turnaround_failed', 'synergy_not_earned']);
const GOOD = new Set(['auction_won', 'good_buy', 'synergy_fired', 'capability_earned', 'turnaround_worked']);

function headBody(e) {
  const text = e.text || '';
  if (e.type === 'shock_resolved') return [e.title || 'Big news', text.replace(/^BREAKING:\s*/, '')];
  if (e.type === 'shock_team_impact') return [text.split(':')[0], text];
  if (e.type === 'shock_dud') return ['The rumor was nothing', text];
  const i = text.search(/[.!?]\s/);
  return i < 0 ? [text.replace(/\.$/, ''), ''] : [text.slice(0, i + 1), text.slice(i + 2)];
}
function numberFor(e) {
  switch (e.type) {
    case 'auction_won': case 'good_buy': case 'winners_curse': return e.price !== undefined ? 'paid ' + fmtM(e.price) : '';
    case 'complexity_charged': case 'synergy_fired': case 'anergy_fired': return e.amount !== undefined ? fmtM(Math.abs(e.amount)) : '';
    case 'shock_team_impact': return e.amount !== undefined ? fmtSigned(e.amount) : '';
    case 'divest_market': return e.proceeds !== undefined ? fmtM(e.proceeds) : '';
    default: return '';
  }
}
export function eventCard(e) {
  const [head, body] = headBody(e), n = numberFor(e);
  const cls = BAD.has(e.type) ? 'bad' : GOOD.has(e.type) ? 'good' : '';
  return h('article.evcard.' + cls, { dataset: { type: e.type } }, [
    h('div.ev-head', [h('b', head), n ? h('span.ev-num', n) : null]),
    body ? h('p', body) : null,
    GLOSS[e.type] ? h('div.sub', gl(GLOSS[e.type], 'What is this?')) : null,
  ]);
}
export function eventStack(events) {
  const out = [];
  let curse = false;   // the winner's-curse picture shows once per report, on the first overpaid purchase
  for (const [, types] of ORDER) for (const e of events) if (types.includes(e.type) && e.type !== 'round_summary') {
    const card = eventCard(e);
    if (e.type === 'winners_curse' && !curse) { curse = true; card.append(h('img.curse-card', { src: SCENE.curse, alt: '' })); }
    out.push(card);
  }
  return out;
}

export function resultsOverlay(ctx, res, onClose) {
  const timeout = res.timeout === 'saved' ? 'Time ran out. We used your last saved plan.' : res.timeout === 'none' ? 'Time ran out and nothing was saved. We kept everything steady.' : null;
  const sum = res.events.find(e => e.type === 'round_summary');
  return h('div.overlay', { dataset: { overlay: 'results' } }, h('div.sheet', [
    h('h2', 'Round ' + res.round + ' results'),
    timeout ? h('p.banner', timeout) : null,
    h('div.stack', eventStack(res.events)),
    h('footer.sumline', 'Your company: ' + fmtM(res.ev) + ', rank ' + res.rank + ' of ' + res.of + ' (AI conglomerates included). Change: ' + fmtSigned(res.delta) + '.'),
    h('button.go', { type: 'button', onclick: onClose }, 'Close'),
  ]));
}

export function resolvingOverlay() {
  return h('div.overlay.soft', { dataset: { overlay: 'resolving' } }, h('div.sheet', [h('div.spinner'), h('h2', 'The round is being worked out.'), h('p', 'Watch the big screen.')]));
}

export function capabilitiesPanel(view) {
  const benefits = {
    acquirer: 'your bids lose less to the winner\'s curse and builds cost less',
    integrator: 'your Integrate projects pay more and cost less',
    operator: 'your Turnarounds cost less and pay more',
    analyst: 'your Deep dives are cheaper and sharper',
  };
  return h('div.sheet', [h('h2', gl('capability', 'Capabilities')), h('p.sub', 'A skill your company earns by doing the same kind of move well twice.'),
    ...view.capList.map(c => h('div.capline' + (view.capabilities[c] ? '.on' : ''), [h('b', view.capLabels[c] + ' I'), ' ' + (view.capabilities[c] ? 'Earned. ' : view.uses[c] + ' of 2 uses. ') + 'When earned, ' + benefits[c] + '.']))]);
}

export function historyPanel(results, finalRow) {
  const rounds = Object.keys(results).map(Number).sort((a, b) => a - b);
  return h('div.sheet', [h('h2', 'History'),
    !rounds.length ? h('p', 'Nothing yet. Past rounds show up here after they resolve.') : null,
    ...rounds.map(r => {
      const res = results[r];
      const pred = res.predicted !== null && res.predicted !== undefined ? 'You predicted ' + fmtM(res.predicted) + '. Your company ended at ' + fmtM(res.ev) + '.' : 'No prediction was entered. Your company ended at ' + fmtM(res.ev) + '.';
      return h('section.hist', [h('h3', 'Round ' + r), h('p', [h('b', 'Why: '), res.why || '(none)']), h('p', pred), h('div.stack', eventStack(res.events))]);
    })]);
}

// ---------- autopsy (the same numbers as score(), from the final snapshot) ----------
export const AUTOPSY_ROWS = [
  ['inherited', 'Inherited businesses', 'inherited'], ['allocation', 'Capital allocation returns', 'allocation'], ['mna', 'Buying and selling companies (price paid vs real value)', 'mna'],
  ['synergy', 'Synergies', 'synergy'], ['capability', 'Skills you earned', 'skills'], ['financing', 'Financing', 'financing'], ['complexity', 'Complexity cost', 'complexity'], ['attentionWasted', 'Attention wasted', 'wasted'],
];
export function autopsy(row, opts = {}) {
  const pa = row.parentingAdvantage;
  const ok = Math.abs(row.residual) <= 1;
  return h('div.autopsy', { dataset: { team: row.id } }, [
    h('h2', row.name + ': how you created value'),
    h('div.pabig', [h('b', ['Your ', gl('parenting', 'parenting advantage'), ': ' + fmtSigned(pa) + '. ']),
      pa >= 0 ? 'Your businesses were worth ' + fmtM(pa) + ' more under your ownership than they would have been on their own.' : 'Your businesses would have been worth ' + fmtM(Math.abs(pa)) + ' more on their own.']),
    h('table.atable', [
      ...AUTOPSY_ROWS.map(([k, label, g]) => h('tr', [h('td', gl(g, label)), h('td.num', fmtSigned(row.decomposition[k]))])),
      h('tr.total', [h('td', 'Final value'), h('td.num', { dataset: { ev: row.ev } }, fmtM(row.ev))]),
    ]),
    ok ? h('p.sub.check', 'Rows add up to the final value. Source: game engine.') : (opts.admin ? h('p.mismatch', 'SCORE MISMATCH') : null),
  ]);
}
