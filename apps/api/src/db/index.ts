import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lokasi database default di root/data/kidsgo.db
const defaultDbPath = path.resolve(__dirname, '../../../../data/kidsgo.db');

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!dbInstance) {
    const currentDbPath = process.env.DATABASE_PATH || defaultDbPath;
    const dbDir = path.dirname(currentDbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    dbInstance = new Database(currentDbPath, {
      verbose: process.env.NODE_ENV === 'development' ? undefined : undefined,
    });

    // Aktifkan foreign key enforcement & WAL mode sesuai AGENTS.md
    dbInstance.pragma('foreign_keys = ON');
    dbInstance.pragma('journal_mode = WAL');
  }
  return dbInstance;
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
