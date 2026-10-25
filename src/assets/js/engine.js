// Pure calculation engine (runs in the browser and in Node tests).
// All fiscal parameters live in PARAMS - update them once per year (see README).

const IAS = 522.5;

export const PARAMS = {
  year: 2025,
  ias: IAS,
  // Art. 68.º CIRS (Continente), after Lei n.º 55-A/2025. [upper limit, marginal rate]
  brackets: [
    [8059, 0.125],
    [12160, 0.16],
    [17233, 0.215],
    [22306, 0.244],
    [28400, 0.314],
    [41629, 0.349],
    [44987, 0.431],
    [83696, 0.446],
    [Infinity, 0.48],
  ],
  // Taxa adicional de solidariedade: [from, to, rate]
  solidarity: [
    [80000, 250000, 0.025],
    [250000, Infinity, 0.05],
  ],
  specificDeductionA: 8.54 * IAS,
  minimoExistencia: 12180,
  generalFamilyExpenses: 250,
  dependentDeduction: 600,
  ssEmployee: 0.11,
  ssEmployer: 0.2375,
  ssIndependentRate: 0.214,
  ssIndependentIncomeShare: 0.7,
  ssIndependentIncomeShareSales: 0.2,
  ssIndependentMinMonthly: 20,
  ssIndependentMaxBaseMonthly: 12 * IAS,
  catBServicesCoef: 0.75,
  catBSalesCoef: 0.15,
  mealCashExemptPerDay: 6.0,
  mealCardExemptPerDay: 10.2,
  irsJovemRates: [1, 0.75, 0.75, 0.75, 0.5, 0.5, 0.5, 0.25, 0.25, 0.25],
  irsJovemCap: 55 * IAS,
  ivaExemptionLimit: 15000,
  ivaRate: 0.23,
  stampDutyCredit: 0.006,
  stampDutyInterest: 0.04,
  capitalGainsTax: 0.28,
};

const round2 = (v) => Math.round(v * 100) / 100;

export function progressiveTax(income, brackets = PARAMS.brackets) {
  let tax = 0;
  let lower = 0;
  for (const [upper, rate] of brackets) {
    if (income <= lower) break;
    tax += (Math.min(income, upper) - lower) * rate;
    lower = upper;
  }
  return tax;
}

export function solidarityTax(income, tiers = PARAMS.solidarity) {
  let tax = 0;
  for (const [from, to, rate] of tiers) {
    if (income > from) tax += (Math.min(income, to) - from) * rate;
  }
  return tax;
}

export function marginalRate(income, brackets = PARAMS.brackets) {
  for (const [upper, rate] of brackets) if (income <= upper) return rate;
  return brackets[brackets.length - 1][1];
}

/**
 * Annual IRS for one taxpayer (Continente, tributação separada).
 * catA: gross employment income; catBTaxable: category B income after the simplified-regime coefficient.
 */
export function computeIRS({
  catA = 0,
  catBTaxable = 0,
  ssCatA = 0,
  dependents = 0,
  jovemYear = 0,
  grossIncome = catA + catBTaxable,
  p = PARAMS,
} = {}) {
  let exemptA = 0;
  let exemptB = 0;
  if (jovemYear >= 1 && jovemYear <= p.irsJovemRates.length) {
    const rate = p.irsJovemRates[jovemYear - 1];
    const wanted = (catA + catBTaxable) * rate;
    const allowed = Math.min(wanted, p.irsJovemCap);
    const scale = wanted > 0 ? allowed / wanted : 0;
    exemptA = catA * rate * scale;
    exemptB = catBTaxable * rate * scale;
  }

  const taxableA = catA - exemptA;
  const specificDeduction = taxableA > 0 ? Math.min(taxableA, Math.max(p.specificDeductionA, ssCatA)) : 0;
  const coletavel = Math.max(0, taxableA - specificDeduction) + Math.max(0, catBTaxable - exemptB);

  const grossTax = progressiveTax(coletavel, p.brackets) + solidarityTax(coletavel, p.solidarity);
  const deductions = Math.min(grossTax, p.generalFamilyExpenses + p.dependentDeduction * dependents);
  let tax = grossTax - deductions;

  // Mínimo de existência: net income after IRS can't fall below the reference value.
  const minimoCap = Math.max(0, grossIncome - p.minimoExistencia);
  const minimoApplied = tax > minimoCap;
  if (minimoApplied) tax = minimoCap;

  return {
    exempt: round2(exemptA + exemptB),
    specificDeduction: round2(specificDeduction),
    coletavel: round2(coletavel),
    grossTax: round2(grossTax),
    deductions: round2(deductions),
    minimoApplied,
    tax: round2(Math.max(0, tax)),
    marginalRate: coletavel > 0 ? marginalRate(coletavel, p.brackets) : 0,
  };
}

export function salaryNet({
  monthlyGross = 0,
  dependents = 0,
  jovemYear = 0,
  mealPerDay = 0,
  mealType = 'card',
  mealDays = 22,
  mealMonths = 11,
  p = PARAMS,
} = {}) {
  const annualGross = monthlyGross * 14;
  const mealLimit = mealType === 'cash' ? p.mealCashExemptPerDay : p.mealCardExemptPerDay;
  const mealAnnual = mealPerDay * mealDays * mealMonths;
  const mealTaxable = Math.max(0, mealPerDay - mealLimit) * mealDays * mealMonths;

  const catA = annualGross + mealTaxable;
  const ss = catA * p.ssEmployee;
  const irs = computeIRS({ catA, ssCatA: ss, dependents, jovemYear, grossIncome: catA, p });

  const netAnnualSalary = annualGross - ss - irs.tax;
  const netAnnual = netAnnualSalary + mealAnnual;
  const employerCost = catA * (1 + p.ssEmployer) + (mealAnnual - mealTaxable);

  return {
    annualGross: round2(annualGross),
    mealAnnual: round2(mealAnnual),
    mealTaxable: round2(mealTaxable),
    mealMonthly: round2(mealPerDay * mealDays),
    ss: round2(ss),
    irs,
    netAnnualSalary: round2(netAnnualSalary),
    netAnnual: round2(netAnnual),
    netMonthly: round2(netAnnualSalary / 14),
    netMonthly12: round2(netAnnualSalary / 12),
    employerCost: round2(employerCost),
    employerCostMonthly: round2(employerCost / 14),
    effectiveRate: annualGross > 0 ? (ss + irs.tax) / catA : 0,
  };
}

export function freelanceNet({
  monthlyBilling = 0,
  ssExempt = false,
  dependents = 0,
  jovemYear = 0,
  coef = PARAMS.catBServicesCoef,
  p = PARAMS,
} = {}) {
  const annual = monthlyBilling * 12;
  const catBTaxable = annual * coef;

  let ssMonthly = 0;
  if (!ssExempt && monthlyBilling > 0) {
    const share = coef <= p.catBSalesCoef ? p.ssIndependentIncomeShareSales : p.ssIndependentIncomeShare;
    const base = Math.min(monthlyBilling * share, p.ssIndependentMaxBaseMonthly);
    ssMonthly = Math.max(p.ssIndependentMinMonthly, base * p.ssIndependentRate);
  }
  const ss = ssMonthly * 12;
  const irs = computeIRS({ catBTaxable, dependents, jovemYear, grossIncome: annual, p });
  const netAnnual = annual - ss - irs.tax;

  return {
    annual: round2(annual),
    catBTaxable: round2(catBTaxable),
    ss: round2(ss),
    ssMonthly: round2(ssMonthly),
    irs,
    netAnnual: round2(netAnnual),
    netMonthly12: round2(netAnnual / 12),
    netMonthly14: round2(netAnnual / 14),
    effectiveRate: annual > 0 ? (ss + irs.tax) / annual : 0,
    mustChargeIVA: annual > p.ivaExemptionLimit,
  };
}

// Finds x in [lo, hi] such that fn(x) ~= target, assuming fn is non-decreasing overall.
function solve(fn, target, lo = 0, hi = 100000) {
  if (target <= fn(lo)) return lo;
  while (fn(hi) < target && hi < 1e8) hi *= 2;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (fn(mid) < target) lo = mid;
    else hi = mid;
  }
  return round2(hi);
}

/** Monthly gross salary (x14) that yields the given annual net salary (excluding meal allowance). */
export function grossSalaryForNet(netAnnual, opts = {}) {
  return solve((g) => salaryNet({ ...opts, monthlyGross: g, mealPerDay: 0 }).netAnnualSalary, netAnnual);
}

/** Monthly billing (x12) needed as a freelancer to reach the given annual net. */
export function billingForNet(netAnnual, opts = {}) {
  return solve((b) => freelanceNet({ ...opts, monthlyBilling: b }).netAnnual, netAnnual);
}

export function mortgagePayment(principal, annualRatePct, months) {
  if (months <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

export function mortgage({
  principal = 0,
  years = 30,
  euribor = 0,
  spread = 0,
  extraMonthly = 0,
  netIncome = 0,
  p = PARAMS,
} = {}) {
  const months = Math.round(years * 12);
  const rate = euribor + spread;
  const r = rate / 100 / 12;
  const payment = mortgagePayment(principal, rate, months);

  const simulate = (extra) => {
    let balance = principal;
    let totalInterest = 0;
    let month = 0;
    const yearly = [];
    const balances = [principal];
    let yInterest = 0;
    let yPrincipal = 0;
    let yPaid = 0;
    while (balance > 0.005 && month < months) {
      month++;
      const interest = balance * r;
      let principalPart = Math.min(balance, payment - interest + extra);
      balance -= principalPart;
      totalInterest += interest;
      yInterest += interest;
      yPrincipal += principalPart;
      yPaid += interest + principalPart + interest * p.stampDutyInterest;
      if (month % 12 === 0 || balance <= 0.005 || month === months) {
        yearly.push({
          year: Math.ceil(month / 12),
          paid: round2(yPaid),
          interest: round2(yInterest),
          principal: round2(yPrincipal),
          balance: round2(Math.max(0, balance)),
        });
        balances.push(Math.max(0, balance));
        yInterest = yPrincipal = yPaid = 0;
      }
    }
    return { months: month, totalInterest, yearly, balances };
  };

  const base = simulate(0);
  const withExtra = extraMonthly > 0 ? simulate(extraMonthly) : base;
  const firstInterest = principal * r;
  const paymentWithStamp = payment + firstInterest * p.stampDutyInterest;

  return {
    rate,
    payment: round2(payment),
    paymentWithStamp: round2(paymentWithStamp),
    totalInterest: round2(base.totalInterest),
    totalInterestStamp: round2(base.totalInterest * p.stampDutyInterest),
    totalPaid: round2(principal + base.totalInterest * (1 + p.stampDutyInterest)),
    stampDutyOpening: round2(principal * p.stampDutyCredit),
    effortRate: netIncome > 0 ? paymentWithStamp / netIncome : null,
    base,
    withExtra,
    interestSaved: round2(base.totalInterest - withExtra.totalInterest),
    monthsSaved: base.months - withExtra.months,
  };
}

export function compound({
  initial = 0,
  monthly = 0,
  annualRate = 0,
  years = 10,
  inflation = 0,
  applyTax = true,
  p = PARAMS,
} = {}) {
  const r = annualRate / 100 / 12;
  let value = initial;
  let invested = initial;
  const rows = [{ year: 0, invested, value, gains: 0 }];
  const totalMonths = Math.round(years * 12);
  for (let m = 1; m <= totalMonths; m++) {
    value = value * (1 + r) + monthly;
    invested += monthly;
    if (m % 12 === 0 || m === totalMonths) {
      rows.push({ year: Math.ceil(m / 12), invested: round2(invested), value: round2(value), gains: round2(value - invested) });
    }
  }
  const gains = value - invested;
  const tax = applyTax ? Math.max(0, gains) * p.capitalGainsTax : 0;
  const netValue = value - tax;
  const realValue = netValue / Math.pow(1 + inflation / 100, years);
  return {
    invested: round2(invested),
    value: round2(value),
    gains: round2(gains),
    tax: round2(tax),
    netValue: round2(netValue),
    realValue: round2(realValue),
    rows,
  };
}
