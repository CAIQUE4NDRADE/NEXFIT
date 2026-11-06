// Card do treino para o Status do WhatsApp (imagem 1080×1920)
import { volumeSessao, duracaoSessao } from './stats.js';
import { fmtDate, fmtDuration, fmtInt } from './util.js';
import { state } from './store.js';
import { toast } from './ui.js';

function desenhar(s) {
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1920;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 1920); g.addColorStop(0, '#111827'); g.addColorStop(1, '#0B111C');
  x.fillStyle = g; x.fillRect(0, 0, 1080, 1920);
  const rg = x.createRadialGradient(900, 180, 20, 900, 180, 520); rg.addColorStop(0, 'rgba(163,230,53,.30)'); rg.addColorStop(1, 'rgba(163,230,53,0)');
  x.fillStyle = rg; x.fillRect(0, 0, 1080, 900);
  // marca
  x.fillStyle = '#202938'; roundRect(x, 80, 110, 110, 110, 28); x.fill();
  x.fillStyle = '#A3E635'; x.beginPath();
  const N = [[107, 197], [107, 133], [122, 133], [149, 173], [149, 133], [164, 133], [164, 197], [149, 197], [122, 157], [122, 197]].map(([a, b]) => [a + 0, b + 0]);
  N.forEach(([a, b], k) => k ? x.lineTo(a, b) : x.moveTo(a, b)); x.closePath(); x.fill();
  x.font = '800 64px Inter, Arial, sans-serif'; x.fillStyle = '#fff'; x.fillText('NEX', 220, 180); const w = x.measureText('NEX').width;
  x.fillStyle = '#A3E635'; x.fillText('FIT', 220 + w, 180);
  x.font = '700 26px Arial'; x.fillStyle = '#94A3B8'; x.fillText('TREINE · ACOMPANHE · EVOLUA', 222, 216);
  // título
  x.fillStyle = '#A3E635'; x.font = '800 40px Arial'; x.fillText('TREINO CONCLUÍDO ✓', 80, 420);
  x.fillStyle = '#fff'; x.font = '800 86px Inter, Arial, sans-serif'; wrap(x, s.nome, 80, 520, 920, 96, 2);
  x.fillStyle = '#CBD5E1'; x.font = '500 40px Arial'; x.fillText(fmtDate(s.data, { weekday: 'long', day: '2-digit', month: 'long' }), 80, 730);
  // números
  const dur = duracaoSessao(s);
  const cards = [['TEMPO', dur ? fmtDuration(dur) : '—'], ['SÉRIES', String(s.sets.length)], ['VOLUME', fmtInt(volumeSessao(s)) + ' kg']];
  cards.forEach(([l, v], k) => {
    const cx = 80 + k * 315; x.fillStyle = '#202938'; roundRect(x, cx, 800, 290, 200, 32); x.fill();
    x.fillStyle = '#94A3B8'; x.font = '700 28px Arial'; x.fillText(l, cx + 30, 860);
    x.fillStyle = '#fff'; x.font = '800 56px Inter, Arial'; x.fillText(v, cx + 30, 945, 240);
  });
  // exercícios
  x.fillStyle = '#fff'; x.font = '800 40px Arial'; x.fillText('Exercícios', 80, 1110);
  const nomes = [...new Set(s.sets.map(z => z.nome))];
  nomes.slice(0, 7).forEach((n, k) => {
    const y = 1180 + k * 82, ss = s.sets.filter(z => z.nome === n), best = Math.max(...ss.map(z => Number(z.kg) || 0));
    x.fillStyle = '#A3E635'; x.beginPath(); x.arc(96, y - 12, 9, 0, 7); x.fill();
    x.fillStyle = '#E5E7EB'; x.font = '600 36px Arial'; x.fillText(n.length > 30 ? n.slice(0, 29) + '…' : n, 124, y, 640);
    x.fillStyle = '#94A3B8'; x.font = '600 32px Inter, Arial'; x.textAlign = 'right'; x.fillText(`${ss.length}× ${best ? best + ' kg' : ''}`, 1000, y); x.textAlign = 'left';
  });
  if (nomes.length > 7) { x.fillStyle = '#94A3B8'; x.font = '600 32px Arial'; x.fillText(`+ ${nomes.length - 7} exercícios`, 124, 1180 + 7 * 82); }
  x.fillStyle = '#A3E635'; x.fillRect(0, 1880, 1080, 40);
  x.fillStyle = '#64748B'; x.font = '600 30px Arial'; x.textAlign = 'center';
  x.fillText(state.perfil.nome ? `${state.perfil.nome} · NEXFIT` : 'NEXFIT', 540, 1830); x.textAlign = 'left';
  return c;
}
function roundRect(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
function wrap(x, t, a, b, max, lh, lines) {
  const ws = String(t).split(' '); let line = '', n = 0;
  for (const w of ws) { const test = line ? line + ' ' + w : w; if (x.measureText(test).width > max && line) { x.fillText(line, a, b + n * lh); line = w; if (++n >= lines - 1) break; } else line = test; }
  x.fillText(line, a, b + n * lh, max);
}

export async function compartilharCard(s) {
  if (!s) return;
  const c = desenhar(s);
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  const file = new File([blob], `nexfit-treino-${s.data}.png`, { type: 'image/png' });
  try {
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'Meu treino · NEXFIT' }); return; }
  } catch (e) { if (e.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast('Imagem salva. Abra o WhatsApp e publique no Status.', { ic: 'download' });
}
