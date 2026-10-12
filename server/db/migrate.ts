import fs from 'node:fs';
import path from 'node:path';
import { getDb } from './database.ts';

export function runMigrations(customDbPath?: string) {
  const db = getDb(customDbPath);
  const schemaPath = path.resolve(process.cwd(), 'server/db/schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');

  // Execute schema
  db.exec(schemaSql);

  // Verify tables created
  const tables = db.all<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;"
  );

  console.log(`Database migrated successfully. Active tables (${tables.length}):`);
  tables.forEach((t) => console.log(` - ${t.name}`));
  return tables;
}

if (process.argv[1]?.endsWith('migrate.ts')) {
  runMigrations();
}
