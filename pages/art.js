// Industry colors, six flat single-color SVG icons (cow, cart, leaf, mountain, tower, chip), and the reused art files.
// Every icon is one flat fill, no gradients. Grocery, energy and AI are drawn here; ranch, ski and cannabis also
// have art files copied into pages/art/ from the earlier games (see README).
import { s } from './util.js';

export const IND = {
  ranching: { label: 'Ranching', color: '#ce9452' },
  grocery: { label: 'Grocery', color: '#ed7054' },
  cannabis: { label: 'Cannabis', color: '#85bb62' },
  ski: { label: 'Ski', color: '#6baedd' },
  energy: { label: 'Energy', color: '#e6bc5c' },
  ai: { label: 'AI / Models', color: '#ae94de' },
};
export const IND_ORDER = ['ranching', 'grocery', 'cannabis', 'ski', 'energy', 'ai'];

// 24x24 icon paths, one fill.
const PATHS = {
  ranching: 'M3 8h3l1-2h4l1 2h5a3 3 0 0 1 3 3v2h-2v5h-2v-4H9v4H7v-5H5v-1H3zM4 6l1-2 1 2z',
  grocery: 'M2 4h3l1 3h15l-2 8H8L6 6 5 6H2zm6 13a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm9 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4z',
  cannabis: 'M12 2c1 3 1 5 0 7 2-2 4-3 7-3-1 3-2 4-4 5 2 0 4 0 6 1-2 2-4 3-6 3 2 1 3 2 4 4-3 0-5-1-7-3v6h-2v-6c-2 2-4 3-7 3 1-2 2-3 4-4-2 0-4-1-6-3 2-1 4-1 6-1-2-1-3-2-4-5 3 0 5 1 7 3-1-2-1-4 0-7z',
  ski: 'M1 20 9 6l4 7 3-4 8 11zM15 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4z',
  energy: 'M13 2 4 14h6l-1 8 9-12h-6z',
  ai: 'M8 2h2v3h4V2h2v3h2a2 2 0 0 1 2 2v2h3v2h-3v4h3v2h-3v2a2 2 0 0 1-2 2h-2v3h-2v-3h-4v3H8v-3H6a2 2 0 0 1-2-2v-2H1v-2h3v-4H1V9h3V7a2 2 0 0 1 2-2h2zm-1 5v10h10V7zm3 3h4v4h-4z',
};
export function icon(ind, size = 24, color) {
  const el = s('svg', { viewBox: '0 0 24 24', width: size, height: size, 'aria-hidden': 'true', class: 'ico' });
  el.append(s('path', { d: PATHS[ind] || PATHS.ai, fill: color || (IND[ind] ? IND[ind].color : '#ccc'), 'fill-rule': 'evenodd' }));
  return el;
}
export function iconSvgString(ind, size = 24, color) {
  return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" class="ico" aria-hidden="true"><path d="' + (PATHS[ind] || PATHS.ai) + '" fill="' + (color || IND[ind].color) + '" fill-rule="evenodd"/></svg>';
}

// Art by industry. Ranch, ski and cannabis reuse earlier games; grocery, energy and AI get a flat icon tile instead.
const ART_ROOT = new URL('./art/', import.meta.url).href;
const FILES = {
  ranching: 'ranch-herd-manager.webp',
  ski: 'ski-lodge.webp',
  cannabis: ['cannabis-grower.webp', 'cannabis-retail.webp'],
  grocery: 'parent-trap-grocery.webp',
  energy: 'parent-trap-energy.webp',
  ai: 'parent-trap-ai.webp',
};
const BY_CO = Object.fromEntries('R1 R2 R3 R4 R5 R6 G1 G2 G3 G4 G5 G6 C1 C2 C3 C4 C5 C6 S1 S2 S3 S4 S5 S6 E1 E2 E3 E4 E5 E6 A1 A2 A3 A4 A5 A6'.split(' ').map(id => [id, 'co-' + id + '.webp']));   // one picture per company (2026-10-12); sister companies (R3b) use their base company's
export function artUrl(ind, key = '') {
  const id = String(key).replace(/^L:/, '').replace(/^MG:/, '').replace(/:team$/, '').split(/[+&@]/)[0], own = BY_CO[id] || BY_CO[id.replace(/[a-z]+$/, '')];
  if (own) return ART_ROOT + own;
  const f = FILES[ind];
  if (!f) return null;
  if (Array.isArray(f)) return ART_ROOT + f[(id.charCodeAt(id.length - 1) || 0) % f.length];
  return ART_ROOT + f;
}
export const AUCTIONEER = ART_ROOT + 'auctioneer.webp';
// Scene art (Midjourney, 2026-10-12). Each has one job: alliance box, last-call banner, final winner, projector lobby. (The winner's curse picture, parent-trap-curse.webp, is unwired 10/13 at Steven's ask; the file stays on disk.)
export const SCENE = { alliance: ART_ROOT + 'parent-trap-alliance.webp', lastcall: ART_ROOT + 'parent-trap-lastcall.webp', winner: ART_ROOT + 'parent-trap-winner.webp', lobby: ART_ROOT + 'parent-trap-lobby.webp' };
// The round that carries the last-call banner: the last round with an auction (4 since 2026-10-12 evening, when round 5 lost its auction).
export const LAST_CALL_ROUND = 4;
