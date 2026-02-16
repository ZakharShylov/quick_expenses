export const SUPPORTED_CURRENCIES = ['EUR', 'USD', 'GBP', 'RUB'] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  RUB: '₽',
};

export function getCurrencySymbol(code: CurrencyCode) {
  return CURRENCY_SYMBOLS[code];
}

function toCurrencyCode(code: string | null | undefined): CurrencyCode {
  if (code && SUPPORTED_CURRENCIES.includes(code as CurrencyCode)) {
    return code as CurrencyCode;
  }

  return 'EUR';
}

export function formatMoney(amount: number, currencyCode: CurrencyCode) {
  const normalizedAmount = Number.isFinite(amount) ? amount : 0;
  const safeCode = toCurrencyCode(currencyCode);
  const symbol = getCurrencySymbol(safeCode);
  const formattedNumber = normalizedAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${symbol}${formattedNumber}`;
}

export function parseCurrencyCode(value: string | null | undefined): CurrencyCode {
  return toCurrencyCode(value);
}
