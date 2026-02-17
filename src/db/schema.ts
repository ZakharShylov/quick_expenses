import { getDbAsync } from './db';

let initPromise: Promise<void> | null = null;

type TableColumnInfo = {
  name: string;
};

async function ensureAttachmentUriColumn() {
  const db = await getDbAsync();
  const columns = await db.getAllAsync<TableColumnInfo>(`PRAGMA table_info(transactions);`);
  const hasAttachmentColumn = columns.some((column) => column.name === 'attachmentUri');

  if (!hasAttachmentColumn) {
    await db.execAsync(`ALTER TABLE transactions ADD COLUMN attachmentUri TEXT;`);
  }
}

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
          attachmentUri TEXT,
          date TEXT NOT NULL,
          createdAt TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );
      `);

      await ensureAttachmentUriColumn();
    })();
  }

  return initPromise;
}
