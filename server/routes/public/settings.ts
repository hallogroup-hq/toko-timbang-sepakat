import { Hono } from 'hono';
import { getDb } from '../../db/database.ts';

export const publicSettingsRoutes = new Hono();

publicSettingsRoutes.get('/', async (c) => {
  const db = getDb();
  const rows = db.all<any>('SELECT key, value_json FROM store_settings');
  const settings: Record<string, any> = {};

  for (const r of rows) {
    try {
      settings[r.key] = JSON.parse(r.value_json);
    } catch {
      settings[r.key] = r.value_json;
    }
  }

  // Do not expose raw internal phone directly unless configured, return whether configured
  const waNumber = typeof settings.whatsapp_number === 'string' ? settings.whatsapp_number.trim() : '';

  return c.json({
    data: {
      store_name: settings.store_name || 'Toko Timbang Sepakat',
      business_info: settings.business_info || 'Penyedia bahan baku terpercaya untuk coffee shop, kafe, dan F&B.',
      is_whatsapp_ready: waNumber.length >= 8
    }
  });
});
