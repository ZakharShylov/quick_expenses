import { parseCurrencyCode, type CurrencyCode } from '@/src/utils/money';

import { getDbAsync } from './db';
import { initDatabaseAsync } from './schema';

export const CURRENCY_SETTING_KEY = 'currency';
const LEGACY_CURRENCY_SETTING_KEY = 'currencyCode';
export const MONTHLY_BUDGET_SETTING_KEY = 'monthlyBudget';
export const BUDGET_MONTH_SETTING_KEY = 'budgetMonth';

type SettingRow = {
  value: string;
};

export async function getSetting(key: string): Promise<string | null> {
  await initDatabaseAsync();
  const db = await getDbAsync();

  const row = await db.getFirstAsync<SettingRow>(`SELECT value FROM settings WHERE key = ?`, key);
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await initDatabaseAsync();
  const db = await getDbAsync();

  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    key,
    value
  );
}

export async function getCurrencySetting(): Promise<CurrencyCode> {
  const stored = await getSetting(CURRENCY_SETTING_KEY);
  if (stored) {
    return parseCurrencyCode(stored);
  }

  const legacyStored = await getSetting(LEGACY_CURRENCY_SETTING_KEY);
  if (legacyStored) {
    const parsedLegacy = parseCurrencyCode(legacyStored);
    await setSetting(CURRENCY_SETTING_KEY, parsedLegacy);
    return parsedLegacy;
  }

  return 'EUR';
}

export async function setCurrencySetting(currencyCode: CurrencyCode): Promise<void> {
  await setSetting(CURRENCY_SETTING_KEY, currencyCode);
}

export async function getMonthlyBudgetSetting(): Promise<number | null> {
  const stored = await getSetting(MONTHLY_BUDGET_SETTING_KEY);
  if (!stored) return null;

  const parsed = Number(stored);
  if (!Number.isFinite(parsed) || parsed < 0) return null;

  return parsed;
}

export async function setMonthlyBudgetSetting(amount: number | null): Promise<void> {
  if (amount === null) {
    await setSetting(MONTHLY_BUDGET_SETTING_KEY, '');
    return;
  }

  const safeAmount = Number.isFinite(amount) && amount >= 0 ? amount : 0;
  await setSetting(MONTHLY_BUDGET_SETTING_KEY, String(safeAmount));
}

export async function getBudgetMonthSetting(): Promise<string | null> {
  return getSetting(BUDGET_MONTH_SETTING_KEY);
}

export async function setBudgetMonthSetting(monthKey: string): Promise<void> {
  await setSetting(BUDGET_MONTH_SETTING_KEY, monthKey);
}
