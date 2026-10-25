import { mortgage } from './engine.js';
import { bindForm, initShare, setText, setBar, fillTable, drawChart, eur, eur0, pct, months, $ } from './ui.js';

bindForm($('form'), (v) => {
  const years = Math.min(50, Math.max(1, Math.round(v.years)));
  const m = mortgage({
    principal: v.principal,
    years,
    euribor: v.euribor,
    spread: v.spread,
    extraMonthly: v.extraMonthly,
    netIncome: v.netIncome,
  });

  setText('outPayment', eur(m.paymentWithStamp));
  setText('outPaymentSub', `${eur(m.payment)} de capital e juros + imposto do selo sobre juros (1.º mês)`);
  setText('outPrincipal', eur(v.principal));
  setText('outInterest', eur(m.totalInterest));
  setText('outInterestStamp', eur(m.totalInterestStamp));
  setText('outTotal', eur(m.totalPaid));
  setText('outStampOpening', eur(m.stampDutyOpening));
  setText('outRate', pct(m.rate / 100, 3));
  setText('outEffort', m.effortRate == null ? 'Indica o rendimento' : pct(m.effortRate));

  setBar('bar', [
    { value: v.principal, color: '#0f766e' },
    { value: m.totalInterest + m.totalInterestStamp, color: '#f59e0b' },
  ]);

  const extra = $('outExtra');
  extra.hidden = !(v.extraMonthly > 0);
  if (v.extraMonthly > 0) {
    extra.replaceChildren(
      `Com ${eur(v.extraMonthly)} extra por mês acabas de pagar em ${months(m.withExtra.months)} em vez de ${months(m.base.months)} e poupas `,
      Object.assign(document.createElement('strong'), { textContent: eur(m.interestSaved) }),
      ' em juros.',
    );
  }

  const effort = $('noteEffort');
  effort.hidden = !(m.effortRate > 0.35);
  if (m.effortRate > 0.5) effort.textContent = 'Taxa de esforço acima de 50%: acima do limite recomendado pelo Banco de Portugal para novos créditos. É provável que o banco recuse ou exija outras condições.';
  else if (m.effortRate > 0.35) effort.textContent = 'Taxa de esforço acima de 35%: dentro do limite, mas com pouca margem se a Euribor subir.';

  const schedule = m.withExtra.yearly;
  fillTable(
    $('table'),
    schedule.map((y) => [String(y.year), eur(y.paid), eur(y.interest), eur(y.principal), eur(y.balance)]),
  );

  const n = m.base.balances.length;
  const pad = (arr) => [...arr, ...new Array(Math.max(0, n - arr.length)).fill(0)];
  const series = [{ label: 'Sem amortização extra', color: '#94a3b8', values: m.base.balances, dashed: v.extraMonthly > 0 }];
  if (v.extraMonthly > 0) series.push({ label: 'Com amortização extra', color: '#0f766e', values: pad(m.withExtra.balances) });
  drawChart($('chart'), {
    labels: m.base.balances.map((_, i) => String(i)),
    series,
    mode: 'lines',
  });
  $('chart').setAttribute('aria-label', `Capital em dívida: começa em ${eur0(v.principal)} e termina em ${years} anos.`);
});

initShare();
