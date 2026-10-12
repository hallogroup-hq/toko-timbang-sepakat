import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export function runBackup(): string {
  const dataDir = path.resolve(process.cwd(), 'data');
  const srcDbPath = path.join(dataDir, 'tts.db');

  if (!fs.existsSync(srcDbPath)) {
    throw new Error(`Database source not found at ${srcDbPath}`);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `tts-backup-${timestamp}.db`;
  const backupPath = path.join(dataDir, backupFileName);

  fs.copyFileSync(srcDbPath, backupPath);

  // Verify integrity
  const db = new DatabaseSync(backupPath);
  const result = db.prepare('PRAGMA integrity_check;').get() as { integrity_check: string };
  db.close();

  if (result.integrity_check !== 'ok') {
    fs.unlinkSync(backupPath);
    throw new Error(`Backup integrity check failed: ${result.integrity_check}`);
  }

  console.log(`Database backup created successfully: ${backupFileName}`);
  console.log(`Size: ${fs.statSync(backupPath).size} bytes`);
  return backupPath;
}

if (process.argv[1]?.endsWith('backup.ts')) {
  try {
    runBackup();
  } catch (err: any) {
    console.error('Backup error:', err.message);
    process.exit(1);
  }
}
