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

  return rows.map((row) => ({
    id: row.id,
    amount: row.amount,
    category: row.category,
    date: row.date,
    createdAt: row.createdAt,
    ...(row.item ? { itemName: row.item } : {}),
    ...(row.note ? { note: row.note } : {}),
  })) satisfies Transaction[];
}
