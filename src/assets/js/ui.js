// Shared UI helpers for the calculators.

const eurFmt = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
const eur0Fmt = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

export const eur = (v) => eurFmt.format(Number.isFinite(v) ? v : 0);
export const eur0 = (v) => eur0Fmt.format(Number.isFinite(v) ? v : 0);
export const pct = (v, digits = 1) =>
  (Number.isFinite(v) ? v * 100 : 0).toLocaleString('pt-PT', { maximumFractionDigits: digits }) + '%';

export function compactEur(v) {
  const abs = Math.abs(v);
  if (abs >= 1e6) return (v / 1e6).toLocaleString('pt-PT', { maximumFractionDigits: 1 }) + ' M€';
  if (abs >= 1e3) return (v / 1e3).toLocaleString('pt-PT', { maximumFractionDigits: 0 }) + ' mil €';
  return Math.round(v) + ' €';
}

export function months(n) {
  const y = Math.floor(n / 12);
  const m = n % 12;
  const parts = [];
  if (y) parts.push(`${y} ${y === 1 ? 'ano' : 'anos'}`);
  if (m) parts.push(`${m} ${m === 1 ? 'mês' : 'meses'}`);
  return parts.join(' e ') || '0 meses';
}

export const $ = (id) => document.getElementById(id);
export function setText(id, text) {
  const el = $(id);
  if (el) el.textContent = text;
}

const num = (v) => {
  const n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

/** Reads form values (restoring them from the URL first), re-runs `compute` on every change and keeps the URL shareable. */
export function bindForm(form, compute) {
  const params = new URLSearchParams(location.search);
  for (const el of form.elements) {
    if (!el.name || !params.has(el.name)) continue;
    if (el.type === 'checkbox') el.checked = params.get(el.name) === '1';
    else el.value = params.get(el.name);
  }

  const read = () => {
    const values = {};
    for (const el of form.elements) {
      if (!el.name) continue;
      if (el.type === 'checkbox') values[el.name] = el.checked;
      else if (el.type === 'number' || el.dataset.num !== undefined) values[el.name] = Math.max(0, num(el.value));
      else values[el.name] = el.value;
    }
    return values;
  };

  let timer;
  const run = () => {
    compute(read());
    clearTimeout(timer);
    timer = setTimeout(() => {
      const q = new URLSearchParams();
      for (const el of form.elements) {
        if (!el.name) continue;
        q.set(el.name, el.type === 'checkbox' ? (el.checked ? '1' : '0') : el.value);
      }
      history.replaceState(null, '', `${location.pathname}?${q}`);
    }, 400);
  };

  form.addEventListener('input', run);
  form.addEventListener('change', run);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    run();
  });
  run();
}

export function initShare() {
  for (const btn of document.querySelectorAll('[data-share]')) {
    btn.addEventListener('click', async () => {
      const original = btn.textContent;
      try {
        if (navigator.share && matchMedia('(pointer: coarse)').matches) {
          await navigator.share({ title: document.title, url: location.href });
          return;
        }
        await navigator.clipboard.writeText(location.href);
        btn.textContent = 'Link copiado';
      } catch {
        btn.textContent = 'Não foi possível copiar';
      }
      setTimeout(() => (btn.textContent = original), 2000);
    });
  }
  for (const btn of document.querySelectorAll('[data-print]')) btn.addEventListener('click', () => window.print());
}

/** Horizontal stacked bar: parts = [{ value, color }] */
export function setBar(id, parts) {
  const el = $(id);
  if (!el) return;
  const total = parts.reduce((s, p) => s + Math.max(0, p.value), 0) || 1;
  el.replaceChildren(
    ...parts.map((p) => {
      const span = document.createElement('span');
      span.style.width = `${(Math.max(0, p.value) / total) * 100}%`;
      span.style.background = p.color;
      return span;
    }),
  );
}

/** Fills a <tbody> with rows of already-formatted strings. */
export function fillTable(tbody, rows) {
  tbody.replaceChildren(
    ...rows.map((cells) => {
      const tr = document.createElement('tr');
      for (const c of cells) {
        const td = document.createElement('td');
        td.textContent = c;
        tr.appendChild(td);
      }
      return tr;
    }),
  );
}

/**
 * Lightweight canvas chart.
 * series: [{ label, color, values }] ; mode: 'stacked' (filled areas) or 'lines'
 */
export function drawChart(canvas, { labels, series, mode = 'stacked' }) {
  const draw = () => {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const pad = { l: 64, r: 12, t: 12, b: 28 };
    const n = labels.length;
    const stackTotals = labels.map((_, i) =>
      mode === 'stacked' ? series.reduce((s, se) => s + (se.values[i] || 0), 0) : Math.max(...series.map((se) => se.values[i] || 0)),
    );
    const maxV = Math.max(1, ...stackTotals) * 1.05;
    const x = (i) => pad.l + (n <= 1 ? 0 : (i / (n - 1)) * (w - pad.l - pad.r));
    const y = (v) => h - pad.b - (v / maxV) * (h - pad.t - pad.b);

    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = '#5b6b6d';
    ctx.strokeStyle = '#e3e8e9';
    ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const v = (maxV / 4) * g;
      const yy = Math.round(y(v)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(pad.l, yy);
      ctx.lineTo(w - pad.r, yy);
      ctx.stroke();
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(compactEur(v), pad.l - 8, yy);
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const step = Math.max(1, Math.ceil(n / 10));
    for (let i = 0; i < n; i += step) ctx.fillText(labels[i], x(i), h - pad.b + 8);

    const base = new Array(n).fill(0);
    for (const se of series) {
      const top = se.values.map((v, i) => (mode === 'stacked' ? base[i] + (v || 0) : v || 0));
      ctx.beginPath();
      top.forEach((v, i) => (i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v))));
      if (mode === 'stacked') {
        for (let i = n - 1; i >= 0; i--) ctx.lineTo(x(i), y(base[i]));
        ctx.closePath();
        ctx.fillStyle = se.color;
        ctx.globalAlpha = 0.85;
        ctx.fill();
        ctx.globalAlpha = 1;
        top.forEach((v, i) => (base[i] = v));
      } else {
        ctx.strokeStyle = se.color;
        ctx.lineWidth = 2.5;
        ctx.setLineDash(se.dashed ? [6, 5] : []);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  };

  draw();
  if (!canvas._observer) {
    canvas._observer = new ResizeObserver(() => canvas._draw());
    canvas._observer.observe(canvas);
  }
  canvas._draw = draw;
}
