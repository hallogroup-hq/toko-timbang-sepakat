import { handle } from 'hono/vercel';
import app from '../server/index.ts';
import { runMigrations } from '../server/db/migrate.ts';
import { seedDatabase } from '../server/db/seed.ts';

// Ensure DB is initialized on cold start
try {
  runMigrations();
  seedDatabase();
} catch (err) {
  console.error('Database initialization warning:', err);
}

export default handle(app);
