import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  progressiveTax,
  computeIRS,
  salaryNet,
  freelanceNet,
  grossSalaryForNet,
  billingForNet,
  mortgage,
  mortgagePayment,
  compound,
  PARAMS,
} from '../src/assets/js/engine.js';

const close = (a, b, tol = 0.02) => assert.ok(Math.abs(a - b) <= tol, `${a} != ${b}`);

test('progressive tax across brackets', () => {
  close(progressiveTax(0), 0);
  close(progressiveTax(8059), 8059 * 0.125);
  close(progressiveTax(10000), 8059 * 0.125 + (10000 - 8059) * 0.16);
});

test('minimum wage pays no IRS (mínimo de existência)', () => {
  const r = salaryNet({ monthlyGross: 870 });
  assert.equal(r.irs.tax, 0);
  close(r.ss, 12180 * 0.11);
});

test('1500 EUR gross salary, single, no dependents', () => {
  const r = salaryNet({ monthlyGross: 1500 });
  close(r.ss, 2310);
  close(r.irs.coletavel, 21000 - PARAMS.specificDeductionA);
  close(r.irs.tax, 2354.78);
  close(r.netMonthly, (21000 - 2310 - 2354.78) / 14);
});

test('dependents reduce IRS, never below zero', () => {
  const a = salaryNet({ monthlyGross: 2000 });
  const b = salaryNet({ monthlyGross: 2000, dependents: 2 });
  close(a.irs.tax - b.irs.tax, 1200);
  assert.equal(salaryNet({ monthlyGross: 1000, dependents: 10 }).irs.tax, 0);
});

test('IRS Jovem first year exempts income up to the cap', () => {
  assert.equal(salaryNet({ monthlyGross: 1800, jovemYear: 1 }).irs.tax, 0);
  const capped = computeIRS({ catA: 70000, jovemYear: 1 });
  close(capped.exempt, PARAMS.irsJovemCap);
});

test('meal allowance above the exempt limit is taxed', () => {
  const r = salaryNet({ monthlyGross: 1200, mealPerDay: 12, mealType: 'card' });
  close(r.mealTaxable, (12 - 10.2) * 22 * 11);
  const cash = salaryNet({ monthlyGross: 1200, mealPerDay: 6, mealType: 'cash' });
  assert.equal(cash.mealTaxable, 0);
});

test('solidarity surcharge applies to high incomes', () => {
  const r = computeIRS({ catA: 300000 });
  assert.ok(r.grossTax > progressiveTax(r.coletavel));
});

test('freelancer social security and IRS', () => {
  const r = freelanceNet({ monthlyBilling: 2000 });
  close(r.ssMonthly, 2000 * 0.7 * 0.214);
  close(r.catBTaxable, 24000 * 0.75);
  const exempt = freelanceNet({ monthlyBilling: 2000, ssExempt: true });
  assert.equal(exempt.ss, 0);
  assert.equal(r.mustChargeIVA, true);
  assert.equal(freelanceNet({ monthlyBilling: 1000 }).mustChargeIVA, false);
});

test('inverse solvers round-trip', () => {
  const net = salaryNet({ monthlyGross: 2100 }).netAnnualSalary;
  close(grossSalaryForNet(net), 2100, 0.05);
  const fnet = freelanceNet({ monthlyBilling: 3000 }).netAnnual;
  close(billingForNet(fnet), 3000, 0.05);
});

test('mortgage payment matches the annuity formula', () => {
  close(mortgagePayment(150000, 3, 360), 632.41);
  close(mortgagePayment(120000, 0, 240), 500);
  const m = mortgage({ principal: 150000, years: 30, euribor: 2.2, spread: 0.8 });
  assert.equal(m.base.months, 360);
  close(m.base.yearly.at(-1).balance, 0);
  close(m.stampDutyOpening, 900);
});

test('extra repayments save interest and shorten the term', () => {
  const m = mortgage({ principal: 200000, years: 35, euribor: 2.5, spread: 1, extraMonthly: 200 });
  assert.ok(m.interestSaved > 0);
  assert.ok(m.monthsSaved > 0);
});

test('compound interest', () => {
  const zero = compound({ initial: 1000, monthly: 100, annualRate: 0, years: 10 });
  close(zero.value, 1000 + 100 * 120);
  assert.equal(zero.tax, 0);
  const c = compound({ initial: 10000, monthly: 0, annualRate: 12, years: 1, applyTax: true });
  close(c.value, 10000 * Math.pow(1.01, 12));
  close(c.tax, c.gains * 0.28);
});
