import { compound } from './engine.js';
import { bindForm, initShare, setText, fillTable, drawChart, eur, eur0, $ } from './ui.js';

bindForm($('form'), (v) => {
  const years = Math.min(60, Math.max(1, Math.round(v.years)));
  const c = compound({
    initial: v.initial,
    monthly: v.monthly,
    annualRate: v.annualRate,
    years,
    inflation: v.inflation,
    applyTax: v.applyTax,
  });

  setText('outNet', eur0(c.netValue));
  setText('outNetSub', `Ao fim de ${years} ${years === 1 ? 'ano' : 'anos'}, investindo ${eur(v.monthly)} por mês`);
  setText('outInvested', eur(c.invested));
  setText('outGains', eur(c.gains));
  setText('outValue', eur(c.value));
  setText('outTax', '- ' + eur(c.tax));
  setText('outNet2', eur(c.netValue));
  setText('outReal', eur0(c.realValue));
  setText('outMultiple', c.invested > 0 ? `${(c.netValue / c.invested).toLocaleString('pt-PT', { maximumFractionDigits: 2 })}x` : '-');

  const share = c.value > 0 ? c.gains / c.value : 0;
  const insight = [`${Math.round(share * 100)}% do valor final vem de juros.`];
  if (years > 5) {
    const late = compound({ ...v, years: years - 5 });
    insight.push(
      ' Se começasses 5 anos mais tarde, terias ',
      Object.assign(document.createElement('strong'), { textContent: `${eur0(c.netValue - late.netValue)} a menos` }),
      '.',
    );
  }
  $('outInsight').replaceChildren(...insight);

  fillTable(
    $('table'),
    c.rows.slice(1).map((r) => [String(r.year), eur(r.invested), eur(r.gains), eur(r.value)]),
  );

  drawChart($('chart'), {
    labels: c.rows.map((r) => String(r.year)),
    series: [
      { label: 'Investido', color: '#0f766e', values: c.rows.map((r) => r.invested) },
      { label: 'Juros', color: '#f59e0b', values: c.rows.map((r) => Math.max(0, r.gains)) },
    ],
    mode: 'stacked',
  });
});

initShare();
