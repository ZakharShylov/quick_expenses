import { getDbAsync } from './db';
import { initDatabaseAsync } from './schema';

type CategoryTotalRow = {
  category: string;
  total: number;
};

type TotalRow = {
  total: number;
};

export type TopSpendingDayRow = {
  date: string;
  total: number;
};

export async function getCategoryTotals(fromISO: string, toISO: string) {
  await initDatabaseAsync();
  const db = await getDbAsync();

  const rows = await db.getAllAsync<CategoryTotalRow>(
    `SELECT category, COALESCE(SUM(amount), 0) as total
     FROM transactions
     WHERE date >= ? AND date < ?
     GROUP BY category
     ORDER BY total DESC`,
    fromISO,
    toISO
  );

  return rows;
}

export async function getTotal(fromISO: string, toISO: string) {
  await initDatabaseAsync();
  const db = await getDbAsync();

  const row = await db.getFirstAsync<TotalRow>(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM transactions
     WHERE date >= ? AND date < ?`,
    fromISO,
    toISO
  );

  return row?.total ?? 0;
}

export async function getTopSpendingDays(fromISO: string, toISO: string, limit = 10) {
  await initDatabaseAsync();
  const db = await getDbAsync();

  const rows = await db.getAllAsync<TopSpendingDayRow>(
    `SELECT date, COALESCE(SUM(amount), 0) as total
     FROM transactions
     WHERE date >= ? AND date < ?
     GROUP BY date
     ORDER BY total DESC
     LIMIT ?`,
    fromISO,
    toISO,
    limit
  );

  return rows;
}
