/**
 * Calculates the monthly mortgage payment.
 *
 * @param {number} principal - The loan amount.
 * @param {number} annualRate - The annual interest rate in percent (e.g. 5.5 for 5.5%).
 * @param {number} years - The loan term in years.
 * @returns {number} The monthly payment amount.
 */
export function calculateMonthlyPayment(principal, annualRate, years) {
  const p = Number(principal) || 0;
  const rate = Number(annualRate) || 0;
  const y = Number(years) || 0;

  if (p <= 0 || y <= 0) return 0;
  const numberOfPayments = y * 12;

  // Zero interest: straightforward division over payments
  if (rate <= 0) {
    return p / numberOfPayments;
  }

  const monthlyRate = rate / 12 / 100;
  const factor = Math.pow(1 + monthlyRate, numberOfPayments);
  const payment = (p * monthlyRate * factor) / (factor - 1);

  return Number.isFinite(payment) ? payment : 0;
}

/**
 * Calculates compound interest.
 *
 * @param {number} principal - Initial principal balance.
 * @param {number} rate - Annual interest rate (decimal, e.g. 0.05).
 * @param {number} timesCompounded - Number of times interest is compounded per year.
 * @param {number} years - Number of years.
 * @returns {number} The future value of the investment.
 */
export function calculateCompoundInterest(principal, rate, timesCompounded = 1, years = 0) {
  const p = Number(principal) || 0;
  const r = Number(rate) || 0;
  const n = Math.max(1, Number(timesCompounded) || 1);
  const t = Math.max(0, Number(years) || 0);

  if (p <= 0) return 0;
  if (r <= 0 || t <= 0) return p;

  const result = p * Math.pow(1 + (r / n), n * t);
  return Number.isFinite(result) ? result : p;
}
