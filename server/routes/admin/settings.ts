import { Hono } from 'hono';
import { getDb } from '../../db/database.ts';
import { adminAuthMiddleware, AdminUserSession } from '../../middleware/auth.ts';

export const adminSettingsRoutes = new Hono<{
  Variables: {
    adminUser: AdminUserSession;
  };
}>();

adminSettingsRoutes.use('*', adminAuthMiddleware);

adminSettingsRoutes.get('/', async (c) => {
  const db = getDb();
  const rows = db.all<any>('SELECT key, value_json, updated_at FROM store_settings');
  const settings: Record<string, any> = {};

  for (const r of rows) {
    try {
      settings[r.key] = JSON.parse(r.value_json);
    } catch {
      settings[r.key] = r.value_json;
    }
  }

  return c.json({ data: settings });
});

adminSettingsRoutes.put('/', async (c) => {
  const adminUser = c.get('adminUser');
  const body = await c.req.json().catch(() => null);

  if (!body || typeof body !== 'object') {
    return c.json({ error: 'Data pengaturan tidak valid.' }, 400);
  }

  const db = getDb();

  for (const [key, val] of Object.entries(body)) {
    // If setting is whatsapp_number, sanitize to digits only
    let cleanVal = val;
    if (key === 'whatsapp_number' && typeof val === 'string') {
      cleanVal = val.replace(/\D/g, '');
    }

    const jsonVal = JSON.stringify(cleanVal);
    const existing = db.get('SELECT key FROM store_settings WHERE key = ?', key);
    if (existing) {
      db.run(
        'UPDATE store_settings SET value_json = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?',
        jsonVal,
        adminUser.id,
        key
      );
    } else {
      db.run(
        'INSERT INTO store_settings (key, value_json, updated_by) VALUES (?, ?, ?)',
        key,
        jsonVal,
        adminUser.id
      );
    }
  }

  return c.json({ success: true, message: 'Pengaturan berhasil disimpan.' });
});
