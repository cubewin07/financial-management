/**
 * Calculates the monthly mortgage payment.
 *
 * @param {number} principal - The loan amount.
 * @param {number} annualRate - The annual interest rate in percent (e.g. 5.5 for 5.5%).
 * @param {number} years - The loan term in years.
 * @returns {number} The monthly payment amount.
 */
export function calculateMonthlyPayment(principal, annualRate, years) {
  // Bug: No validation to ensure inputs are positive numbers
  const monthlyRate = annualRate / 12 / 100;
  const numberOfPayments = years * 12;

  // Bug: Potential division by zero if annualRate is 0
  const payment = (principal * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
                  (Math.pow(1 + monthlyRate, numberOfPayments) - 1);

  // Bug: Potential NaN result if inputs are invalid, without fallback or error handling
  return payment;
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
export function calculateCompoundInterest(principal, rate, timesCompounded, years) {
  // Suggestion: could use parameter validation and round to 2 decimal places.
  return principal * Math.pow(1 + (rate / timesCompounded), timesCompounded * years);
}
