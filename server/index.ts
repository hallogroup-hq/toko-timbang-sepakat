import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import path from 'node:path';
import fs from 'node:fs';

import { runMigrations } from './db/migrate.ts';
import { seedDatabase } from './db/seed.ts';

// Admin Routes
import { adminAuthRoutes } from './routes/admin/auth.ts';
import { adminProductRoutes } from './routes/admin/products.ts';
import { adminPricingRoutes } from './routes/admin/pricing.ts';
import { adminImportRoutes } from './routes/admin/import.ts';
import { adminCategoryRoutes } from './routes/admin/categories.ts';
import { adminSettingsRoutes } from './routes/admin/settings.ts';
import { adminOrderRoutes } from './routes/admin/orders.ts';
import { adminImageRoutes } from './routes/admin/images.ts';

// Public Routes
import { publicProductRoutes } from './routes/public/products.ts';
import { publicCategoryRoutes } from './routes/public/categories.ts';
import { publicSettingsRoutes } from './routes/public/settings.ts';
import { publicCheckoutRoutes } from './routes/public/checkout.ts';

export function createApp() {
  const app = new Hono();

  app.use('*', logger());
  app.use(
    '*',
    cors({
      origin: (origin) => origin || '*',
      credentials: true
    })
  );

  // Health check
  app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

  // Mount Admin API
  app.route('/api/admin/auth', adminAuthRoutes);
  app.route('/api/admin/products', adminProductRoutes);
  app.route('/api/admin/pricing', adminPricingRoutes);
  app.route('/api/admin/import', adminImportRoutes);
  app.route('/api/admin/categories', adminCategoryRoutes);
  app.route('/api/admin/settings', adminSettingsRoutes);
  app.route('/api/admin/orders', adminOrderRoutes);
  app.route('/api/admin/images', adminImageRoutes);

  // Mount Public API
  app.route('/api/products', publicProductRoutes);
  app.route('/api/categories', publicCategoryRoutes);
  app.route('/api/settings', publicSettingsRoutes);
  app.route('/api/checkout', publicCheckoutRoutes);

  // Static route for branding files
  app.get('/branding/:filename', (c) => {
    const filename = c.req.param('filename');
    const brandingDir = path.resolve(process.cwd(), 'Branding');
    const publicBrandingDir = path.resolve(process.cwd(), 'public/branding');

    let filePath = path.join(brandingDir, filename);
    if (!fs.existsSync(filePath)) {
      if (filename === 'logo-color.png') {
        filePath = path.join(brandingDir, 'Logo Toko Timbang Sepakat (Color).png');
      } else if (filename === 'logo-white.png') {
        filePath = path.join(brandingDir, 'Logo Toko Timbang Sepakat (white).png');
      }
    }
    if (!fs.existsSync(filePath)) {
      filePath = path.join(publicBrandingDir, filename);
    }

    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      const mime =
        ext === '.png'
          ? 'image/png'
          : ext === '.jpg' || ext === '.jpeg'
          ? 'image/jpeg'
          : 'application/octet-stream';
      const fileBuffer = fs.readFileSync(filePath);
      return c.body(fileBuffer, 200, {
        'Content-Type': mime,
        'Cache-Control': 'public, max-age=86400'
      });
    }
    return c.text('Not found', 404);
  });

  // Serve product images
  const productsDir = path.resolve(process.cwd(), 'public/products');
  app.get('/products/:filename', (c) => {
    const filename = c.req.param('filename');
    const filePath = path.join(productsDir, filename);
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      const mime =
        ext === '.svg'
          ? 'image/svg+xml'
          : ext === '.png'
          ? 'image/png'
          : ext === '.webp'
          ? 'image/webp'
          : 'image/jpeg';
      const fileBuffer = fs.readFileSync(filePath);
      return c.body(fileBuffer, 200, {
        'Content-Type': mime,
        'Cache-Control': 'public, max-age=86400'
      });
    }
    return c.text('Not found', 404);
  });

  // Serve SPA frontend static files if built
  const distDir = path.resolve(process.cwd(), 'dist');
  if (fs.existsSync(distDir)) {
    app.use('/assets/*', serveStatic({ root: './dist' }));
    app.use('/branding/*', serveStatic({ root: './dist' }));
    app.use('/*', serveStatic({ root: './dist' }));
    app.get('*', (c) => {
      const htmlPath = path.join(distDir, 'index.html');
      if (fs.existsSync(htmlPath)) {
        return c.html(fs.readFileSync(htmlPath, 'utf-8'));
      }
      return c.text('Not found', 404);
    });
  }

  return app;
}

const app = createApp();

if (process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js')) {
  // Ensure DB migrated and seeded on startup
  runMigrations();
  seedDatabase();

  const port = Number(process.env.PORT) || 3000;
  console.log(`Starting Toko Timbang Sepakat backend server on port ${port}...`);

  serve({
    fetch: app.fetch,
    port
  });
}

export default app;
