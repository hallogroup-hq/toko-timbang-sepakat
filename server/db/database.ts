import { DatabaseSync, StatementSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

function getDbPath(): string {
  if (process.env.DATABASE_PATH) {
    return process.env.DATABASE_PATH;
  }
  if (process.env.VERCEL) {
    const tmpDb = path.join('/tmp', 'tts.db');
    const seedDb = path.join(process.cwd(), 'data', 'tts.db');
    if (!fs.existsSync(tmpDb) && fs.existsSync(seedDb)) {
      try {
        fs.copyFileSync(seedDb, tmpDb);
      } catch (err) {
        console.error('Failed to copy seed db to /tmp:', err);
      }
    }
    return tmpDb;
  }
  const dbDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dbDir)) {
    try {
      fs.mkdirSync(dbDir, { recursive: true });
    } catch {}
  }
  return path.join(dbDir, 'tts.db');
}

export class AppDatabase {
  private db: DatabaseSync;

  constructor(filePath: string = getDbPath()) {
    this.db = new DatabaseSync(filePath);
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.db.exec('PRAGMA journal_mode = WAL;');
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  prepare(sql: string): StatementSync {
    return this.db.prepare(sql);
  }

  get<T = any>(sql: string, ...params: any[]): T | undefined {
    const stmt = this.db.prepare(sql);
    return stmt.get(...params) as T | undefined;
  }

  all<T = any>(sql: string, ...params: any[]): T[] {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as T[];
  }

  run(sql: string, ...params: any[]): { changes: number | bigint; lastInsertRowid: number | bigint } {
    const stmt = this.db.prepare(sql);
    return stmt.run(...params);
  }

  close(): void {
    this.db.close();
  }
}

// Global singleton instance
let instance: AppDatabase | null = null;

export function getDb(customPath?: string): AppDatabase {
  if (customPath) {
    return new AppDatabase(customPath);
  }
  if (!instance) {
    instance = new AppDatabase();
  }
  return instance;
}
