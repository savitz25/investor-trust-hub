/**
 * Regulatory assets under management (Form ADV Item 5.F(2)(c)).
 * This is a regulatory measure, not performance, popularity, or quality.
 */

export interface FormattedRaum {
  exact: string;
  display: string;
  amount: number;
}

export function parseRaumAmount(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const amount = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.\-]/g, ''));
  if (!Number.isFinite(amount) || amount < 0) {
    return null;
  }
  return amount;
}

export function formatRaum(value: string | number | null | undefined): FormattedRaum | null {
  const amount = parseRaumAmount(value);
  if (amount === null) {
    return null;
  }
  const exact = amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  let display: string;
  if (amount >= 1_000_000_000) {
    display = `$${(amount / 1_000_000_000).toFixed(amount >= 10_000_000_000 ? 1 : 1)} billion`;
  } else if (amount >= 1_000_000) {
    display = `$${(amount / 1_000_000).toFixed(amount >= 100_000_000 ? 1 : 1)} million`;
  } else if (amount >= 1_000) {
    display = `$${Math.round(amount / 1000)} thousand`;
  } else {
    display = exact;
  }
  return { exact, display, amount };
}

export const RAUM_EXPLANATION =
  'Regulatory assets under management is a Form ADV regulatory measure and should not be interpreted as investment performance, firm quality, popularity, or an endorsement.';
