import { getDbAsync } from './db';
import { initDatabaseAsync } from './schema';

export type Transaction = {
  id: string;
  amount: number;
  category: string;
  itemName?: string;
  note?: string;
  date: string;
  createdAt: string;
};

export type NewTransactionInput = {
  id: string;
  amount: number;
  category: string;
  itemName?: string;
  note?: string;
  date: string;
};

type TransactionRow = {
  id: string;
  amount: number;
  category: string;
  item: string | null;
  note: string | null;
  date: string;
  createdAt: string;
};

function mapRow(row: TransactionRow) {
  return {
    id: row.id,
    amount: row.amount,
    category: row.category,
    date: row.date,
    createdAt: row.createdAt,
    ...(row.item ? { itemName: row.item } : {}),
    ...(row.note ? { note: row.note } : {}),
  } satisfies Transaction;
}

function addOneDayISO(dateISO: string) {
  const current = new Date(`${dateISO}T00:00:00`);
  const next = new Date(current);
  next.setDate(next.getDate() + 1);

  const year = next.getFullYear();
  const month = `${next.getMonth() + 1}`.padStart(2, '0');
  const day = `${next.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export async function addTransaction(transaction: NewTransactionInput) {
  await initDatabaseAsync();
  const db = await getDbAsync();

  const createdAt = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO transactions (id, amount, category, item, note, date, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    transaction.id,
    transaction.amount,
    transaction.category,
    transaction.itemName ?? null,
    transaction.note ?? null,
    transaction.date,
    createdAt
  );
}

export async function getAllTransactions() {
  await initDatabaseAsync();
  const db = await getDbAsync();

  const rows = await db.getAllAsync<TransactionRow>(
    `SELECT id, amount, category, item, note, date, createdAt
     FROM transactions
     ORDER BY createdAt DESC`
  );

  return rows.map(mapRow);
}

export async function getTransactionsByDate(dateISO: string, limit = 10) {
  await initDatabaseAsync();
  const db = await getDbAsync();

  const toISO = addOneDayISO(dateISO);

  const rows = await db.getAllAsync<TransactionRow>(
    `SELECT id, amount, category, item, note, date, createdAt
     FROM transactions
     WHERE date >= ? AND date < ?
     ORDER BY createdAt DESC
     LIMIT ?`,
    dateISO,
    toISO,
    limit
  );

  return rows.map(mapRow);
}

export async function deleteTransaction(id: string) {
  await initDatabaseAsync();
  const db = await getDbAsync();

  await db.runAsync(`DELETE FROM transactions WHERE id = ?`, id);
}
