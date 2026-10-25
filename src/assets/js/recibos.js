import { freelanceNet, salaryNet, grossSalaryForNet, billingForNet, PARAMS } from './engine.js';
import { bindForm, initShare, setText, setBar, eur, pct, $ } from './ui.js';

bindForm($('form'), (v) => {
  const common = { dependents: Math.floor(v.dependents), jovemYear: Number(v.jovemYear) };
  const coef = Number(v.coef) || PARAMS.catBServicesCoef;
  const r = freelanceNet({ ...common, monthlyBilling: v.monthlyBilling, ssExempt: v.ssExempt, coef });

  setText('outNet', eur(r.netMonthly12));
  setText('outNetSub', `x12 meses. Equivale a ${eur(r.netMonthly14)} se dividires por 14.`);
  setText('outBilling', eur(v.monthlyBilling));
  setText('outSS', '- ' + eur(r.ssMonthly));
  setText('outIRS', '- ' + eur(r.irs.tax / 12));
  setText('outNet2', eur(r.netMonthly12));
  setText('outNetAnnual', eur(r.netAnnual));
  setText('outRate', pct(r.effectiveRate));
  setText('outIRSAnnual', eur(r.irs.tax));
  setText('outTaxable', eur(r.catBTaxable));

  setBar('bar', [
    { value: r.netAnnual, color: '#0f766e' },
    { value: r.irs.tax, color: '#f59e0b' },
    { value: r.ss, color: '#64748b' },
  ]);

  const equivalent = grossSalaryForNet(r.netAnnual, common);
  $('outEquivalent').replaceChildren(
    'O mesmo líquido anual equivale a um contrato de ',
    Object.assign(document.createElement('strong'), { textContent: `${eur(equivalent)} brutos/mês (x14)` }),
    '.',
  );

  const contractNet = salaryNet({ ...common, monthlyGross: v.compareGross }).netAnnualSalary;
  const needed = billingForNet(contractNet, { ...common, ssExempt: v.ssExempt, coef });
  const hourly = v.hours > 0 ? needed / v.hours : 0;
  $('outTarget').replaceChildren(
    `Para igualar um contrato de ${eur(v.compareGross)} brutos precisas de faturar `,
    Object.assign(document.createElement('strong'), { textContent: `${eur(needed)}/mês` }),
    ` (${eur(hourly)}/hora com ${v.hours} h faturáveis), sem contar férias pagas e outras proteções do contrato.`,
  );

  const iva = $('noteIVA');
  iva.hidden = !r.mustChargeIVA;
  if (r.mustChargeIVA) {
    iva.textContent = `Faturas mais de ${eur(PARAMS.ivaExemptionLimit)} por ano: tens de cobrar IVA (23%) aos clientes. Cada recibo de ${eur(v.monthlyBilling)} passa a ${eur(v.monthlyBilling * (1 + PARAMS.ivaRate))}, mas o IVA é entregue ao Estado.`;
  }
});

initShare();
