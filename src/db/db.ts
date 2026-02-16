import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'quick-expense.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDbAsync() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DATABASE_NAME);
  }

  return dbPromise;
}
