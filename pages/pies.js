// World pies, inline SVG, no chart library. One pie per conglomerate, area proportional to value,
// one wedge per industry held (with its icon) plus a grey wedge for cash. Pies tween to new sizes over 3 seconds.

import { s, fmtBig, fmtSigned } from './util.js';
import { IND, IND_ORDER, icon } from './art.js';

const CASH_COLOR = '#6b7686', BUILD_COLOR = '#4a5361';
const ROBOT = 'M-9 -4h18v12h-18zM-2 -9h4v5h-4zM-5 0h3v3h-3zM2 0h3v3h-3z';

function wedgesOf(team) {
  const w = {};
  for (const ind of IND_ORDER) w[ind] = 0;
  for (const u of team.units) w[u.ind] += Math.max(0, u.v);
  w.cash = Math.max(0, team.cash - team.loan);
  w.building = Math.max(0, team.building || 0);
  return w;
}
const KEYS = [...IND_ORDER, 'cash', 'building'];

export class PieBoard {
  constructor(svg, { width = 1500, height = 640 } = {}) {
    this.svg = svg; this.W = width; this.H = height;
    svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
    this.cur = {}; this.from = {}; this.to = {}; this.t0 = 0; this.dur = 0; this.ref = 1; this.order = []; this.names = {}; this.bots = {}; this.floats = {};
  }
  // teams: [{id,name,isBot,ev,delta,units,cash,loan,building}], ref: the EV that fills the biggest radius
  set(teams, { animate = true, ref, showDelta = true } = {}) {
    cancelAnimationFrame(this.raf);
    // Steven's ask 12: pies run in leaderboard order, biggest firm top-left, smallest bottom-right (the grid fills row by row)
    teams = [...teams].sort((a, b) => b.ev - a.ev || (a.id < b.id ? -1 : 1));
    this.order = teams.map(t => t.id);
    const maxEv = Math.max(...teams.map(t => t.ev), 1);
    this.ref = ref || maxEv;
    this.from = {}; this.to = {};
    for (const t of teams) {
      this.names[t.id] = t.name; this.bots[t.id] = t.isBot;
      const target = { ev: Math.max(t.ev, 0), w: wedgesOf(t), delta: t.delta };
      this.to[t.id] = target;
      this.from[t.id] = this.cur[t.id] ? structuredClone(this.cur[t.id]) : structuredClone(target);
      this.floats[t.id] = showDelta ? t.delta : 0;
    }
    this.t0 = performance.now(); this.dur = animate ? 3000 : 0;
    if (!animate) { for (const id of this.order) this.cur[id] = structuredClone(this.to[id]); this.draw(1); return; }
    cancelAnimationFrame(this.raf);
    const step = now => {
      const k = Math.min(1, (now - this.t0) / this.dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      this.draw(e);
      if (k < 1) this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }
  draw(e) {
    const ids = this.order, n = ids.length;
    // choose the grid that gives the biggest pies (names and values need about 70px above each pie, the +/- label 40px below)
    let cols = 1, maxR = 0;
    for (let c = 1; c <= n; c++) { const r = Math.min(this.W / c / 2, (this.H / Math.ceil(n / c) - 110) / 2); if (r > maxR) { maxR = r; cols = c; } }
    const rows = Math.ceil(n / cols), cw = this.W / cols, ch = this.H / rows;
    const svg = this.svg; svg.replaceChildren();
    ids.forEach((id, i) => {
      const f = this.from[id], t = this.to[id];
      const ev = f.ev + (t.ev - f.ev) * e;
      const w = {}; let tot = 0;
      for (const k of KEYS) { w[k] = (f.w[k] || 0) + ((t.w[k] || 0) - (f.w[k] || 0)) * e; tot += w[k]; }
      this.cur[id] = { ev, w, delta: t.delta };
      const cx = (i % cols) * cw + cw / 2, cy = Math.floor(i / cols) * ch + ch / 2 + 10;
      const r = Math.max(14, maxR * Math.sqrt(ev / this.ref));
      const g = s('g', { 'data-pie': id });
      // with many conglomerates the cell is narrow: shrink the name to fit the cell and cut it short if it still does not
      let nm = this.names[id] + (n > 12 && this.bots[id] ? ' (AI)' : ''), fs = 0;
      if (n > 10) { fs = Math.max(11, Math.min(26, (cw - 8) / (nm.length * 0.56))); const maxCh = Math.floor((cw - 8) / (fs * 0.56)); if (nm.length > maxCh) nm = nm.slice(0, Math.max(3, maxCh - 1)) + '.'; }
      g.append(s('text', { x: cx, y: cy - r - 40, 'text-anchor': 'middle', class: 'pie-name', ...(fs ? { style: 'font-size:' + fs + 'px' } : {}) }, nm));
      g.append(s('text', { x: cx, y: cy - r - 8, 'text-anchor': 'middle', class: 'pie-val', ...(fs ? { style: 'font-size:' + Math.max(14, fs + 4) + 'px' } : {}) }, fmtBig(ev)));
      if (this.bots[id] && n <= 12) g.append(s('path', { d: ROBOT, transform: 'translate(' + (cx - this.names[id].length * 7.8 - 28) + ',' + (cy - r - 62) + ') scale(1.5)', fill: '#9aa5b5' }));
      let a0 = -Math.PI / 2;
      for (const k of KEYS) {
        const v = w[k]; if (v <= 0.01 || tot <= 0) continue;
        const a1 = a0 + (v / tot) * Math.PI * 2, color = k === 'cash' ? CASH_COLOR : k === 'building' ? BUILD_COLOR : IND[k].color;
        if (v / tot > 0.9999) g.append(s('circle', { cx, cy, r, fill: color, stroke: '#0b1118', 'stroke-width': 2 }));
        else {
          const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0), x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
          g.append(s('path', { d: 'M' + cx + ' ' + cy + 'L' + x0 + ' ' + y0 + 'A' + r + ' ' + r + ' 0 ' + (a1 - a0 > Math.PI ? 1 : 0) + ' 1 ' + x1 + ' ' + y1 + 'Z', fill: color, stroke: '#0b1118', 'stroke-width': 2 }));
        }
        if (IND[k] && (a1 - a0) > 0.7 && r > 40) {
          const am = (a0 + a1) / 2, ic = icon(k, Math.min(40, r * 0.38), '#0b1118');
          ic.setAttribute('x', cx + r * 0.62 * Math.cos(am) - Math.min(40, r * 0.38) / 2); ic.setAttribute('y', cy + r * 0.62 * Math.sin(am) - Math.min(40, r * 0.38) / 2);
          g.append(ic);
        }
        a0 = a1;
      }
      const d = this.floats[id];
      if (d && Math.abs(d) >= 0.5) g.append(s('text', { x: cx, y: cy + r + 30, 'text-anchor': 'middle', class: 'pie-delta ' + (d >= 0 ? 'up' : 'down'), ...(n > 10 ? { style: 'font-size:20px' } : {}) }, fmtSigned(d)));
      svg.append(g);
    });
  }
}
