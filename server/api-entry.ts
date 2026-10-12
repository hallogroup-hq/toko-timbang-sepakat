import { handle } from 'hono/vercel';
import app from './index.ts';
import { runMigrations } from './db/migrate.ts';
import { seedDatabase } from './db/seed.ts';

// Ensure DB is initialized on cold start
try {
  runMigrations();
  seedDatabase();
} catch (err) {
  console.error('Database initialization warning:', err);
}

export default handle(app);
