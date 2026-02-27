import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('aislechef.db');
  await runMigrations(db);
  return db;
}

async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS lists (
      listId      TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      lastUpdated TEXT NOT NULL,
      createdAt   TEXT NOT NULL,
      isDeleted   INTEGER NOT NULL DEFAULT 0,
      synced      INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS items (
      itemId      TEXT PRIMARY KEY,
      listId      TEXT NOT NULL,
      itemName    TEXT NOT NULL,
      quantity    REAL NOT NULL DEFAULT 0,
      unit        TEXT NOT NULL,
      lastUpdated TEXT NOT NULL,
      createdAt   TEXT NOT NULL,
      isDeleted   INTEGER NOT NULL DEFAULT 0,
      synced      INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_items_listId ON items (listId);
    CREATE INDEX IF NOT EXISTS idx_lists_createdAt ON lists (createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_items_createdAt ON items (createdAt DESC);
  `);
}
