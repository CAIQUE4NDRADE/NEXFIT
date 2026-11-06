// Gráficos em SVG puro (leves, acessíveis, seguem o tema)
import { esc, fmt } from './util.js';

/** Linha: pts = [{label, y}] */
export function lineChart(pts, { h = 220, unit = '', title = 'Gráfico' } = {}) {
  if (!pts.length) return '';
  const W = 420, H = h, ml = 40, mr = 14, mt = 26, mb = 30;
  const ys = pts.map(p => p.y), lo0 = Math.min(...ys), hi0 = Math.max(...ys);
  const pad = Math.max(1, (hi0 - lo0) * 0.15), lo = Math.floor(lo0 - pad), hi = Math.ceil(hi0 + pad);
  const x = i => ml + (pts.length === 1 ? (W - ml - mr) / 2 : i * (W - ml - mr) / (pts.length - 1));
  const y = v => mt + (hi - v) / (hi - lo || 1) * (H - mt - mb);
  const ticks = [lo, (lo + hi) / 2, hi];
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.y).toFixed(1)}`).join('');
  const area = `${path}L${x(pts.length - 1)},${H - mb}L${x(0)},${H - mb}Z`;
  const every = Math.ceil(pts.length / 4);
  const desc = pts.map(p => `${p.label}: ${fmt(p.y)} ${unit}`).join('; ');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}. ${esc(desc)}">
    ${ticks.map(t => `<line class="grid" x1="${ml}" x2="${W - mr}" y1="${y(t)}" y2="${y(t)}"/><text x="${ml - 8}" y="${y(t) + 4}" text-anchor="end">${fmt(t)}</text>`).join('')}
    <path class="area" d="${area}"/><path class="line" d="${path}"/>
    ${pts.map((p, i) => `<circle class="dot" cx="${x(i)}" cy="${y(p.y)}" r="${pts.length > 20 ? 3 : 4.5}"/>`).join('')}
    ${pts.map((p, i) => (i % every === 0 || i === pts.length - 1) ? `<text x="${x(i)}" y="${H - 10}" text-anchor="${pts.length > 1 && i === 0 ? 'start' : i === pts.length - 1 && pts.length > 1 ? 'end' : 'middle'}">${esc(p.label)}</text>` : '').join('')}
    <text class="lbl-strong" x="${x(pts.length - 1)}" y="${y(pts.at(-1).y) - 12}" text-anchor="end">${fmt(pts.at(-1).y)} ${unit}</text>
  </svg>`;
}

/** Barras: pts = [{label, y, off?}] */
export function barChart(pts, { h = 180, title = 'Gráfico', max } = {}) {
  const W = 420, H = h, mt = 26, mb = 30, gap = 8;
  const m = max ?? Math.max(1, ...pts.map(p => p.y));
  const bw = (W - gap * (pts.length + 1)) / pts.length;
  const desc = pts.map(p => `${p.label}: ${fmt(p.y)}`).join('; ');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}. ${esc(desc)}">
    ${pts.map((p, i) => {
      const bh = Math.max(p.y ? 6 : 3, (p.y / m) * (H - mt - mb)), bx = gap + i * (bw + gap), by = H - mb - bh;
      return `<rect class="barr ${p.y ? '' : 'off'}" x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="8"/>
        ${p.y ? `<text class="lbl-strong" x="${bx + bw / 2}" y="${by - 6}" text-anchor="middle">${fmt(p.y)}</text>` : ''}
        <text x="${bx + bw / 2}" y="${H - 10}" text-anchor="middle">${esc(p.label)}</text>`;
    }).join('')}
  </svg>`;
}

/** Anel de progresso (calorias) */
export function ring(pct, { size = 132, stroke = 14, color = 'var(--accent)', center = '', label = '' } = {}) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, p = Math.min(100, Math.max(0, pct));
  return `<div style="position:relative;width:${size}px;height:${size}px;flex:0 0 auto" role="img" aria-label="${esc(label)}">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:rotate(-90deg)">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--surface-3)" stroke-width="${stroke}"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round"
        stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p / 100)}" style="transition:stroke-dashoffset .5s"/>
    </svg>
    <div style="position:absolute;inset:0;display:grid;place-items:center;text-align:center">${center}</div>
  </div>`;
}
