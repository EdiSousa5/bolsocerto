import { salaryNet, PARAMS } from './engine.js';
import { bindForm, initShare, setText, setBar, eur, pct, $ } from './ui.js';

bindForm($('form'), (v) => {
  const r = salaryNet({
    monthlyGross: v.monthlyGross,
    dependents: Math.floor(v.dependents),
    jovemYear: Number(v.jovemYear),
    mealPerDay: v.mealPerDay,
    mealType: v.mealType,
    mealDays: v.mealDays,
  });

  setText('outNet', eur(r.netMonthly));
  setText('outNetSub', `${eur(r.netMonthly12)} por mês com duodécimos (x12) + ${eur(r.mealMonthly)} de alimentação`);
  setText('outGross', eur(v.monthlyGross));
  setText('outSS', '- ' + eur(r.ss / 14));
  setText('outIRS', '- ' + eur(r.irs.tax / 14));
  setText('outNet2', eur(r.netMonthly));
  setText('outMeal', '+ ' + eur(r.mealMonthly));
  setText('outNetAnnual', eur(r.netAnnual));
  setText('outIRSAnnual', eur(r.irs.tax));
  setText('outRate', pct(r.effectiveRate));
  setText('outMarginal', pct(r.irs.marginalRate));
  setText('outEmployer', eur(r.employerCost));
  setText('outEmployerMonthly', eur(r.employerCostMonthly));

  setBar('bar', [
    { value: r.netAnnualSalary, color: '#0f766e' },
    { value: r.irs.tax, color: '#f59e0b' },
    { value: r.ss, color: '#64748b' },
  ]);

  $('noteMinimo').hidden = !r.irs.minimoApplied;
  const mealNote = $('noteMeal');
  mealNote.hidden = r.mealTaxable <= 0;
  if (r.mealTaxable > 0) {
    const limit = v.mealType === 'cash' ? PARAMS.mealCashExemptPerDay : PARAMS.mealCardExemptPerDay;
    mealNote.textContent = `O subsídio de alimentação acima de ${eur(limit)}/dia é tributado: ${eur(r.mealTaxable)} por ano entram no cálculo do IRS e da Segurança Social.`;
  }
});

initShare();
