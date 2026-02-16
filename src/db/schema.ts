import { getDbAsync } from './db';

let initPromise: Promise<void> | null = null;

export async function initDatabaseAsync() {
  if (!initPromise) {
    initPromise = (async () => {
      const db = await getDbAsync();

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS transactions (
          id TEXT PRIMARY KEY NOT NULL,
          amount REAL NOT NULL,
          category TEXT NOT NULL,
          item TEXT,
          note TEXT,
          date TEXT NOT NULL,
          createdAt TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );
      `);
    })();
  }

  return initPromise;
}
