import React, { useEffect, useState } from 'react';
import { Save, MessageSquare } from 'lucide-react';
import { useToast } from '../../components/Toast.tsx';

export const AdminSettingsPage: React.FC = () => {
  const { showToast } = useToast();
  const [waNumber, setWaNumber] = useState('');
  const [storeName, setStoreName] = useState('Toko Timbang Sepakat');
  const [businessInfo, setBusinessInfo] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((res) => {
        if (res.data) {
          setWaNumber(res.data.whatsapp_number || '');
          if (res.data.store_name) setStoreName(res.data.store_name);
          if (res.data.business_info) setBusinessInfo(res.data.business_info);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const cleanWa = waNumber.replace(/\D/g, '');
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsapp_number: cleanWa,
          store_name: storeName.trim(),
          business_info: businessInfo.trim()
        })
      });

      if (!res.ok) throw new Error('Gagal menyimpan pengaturan.');
      showToast('Pengaturan berhasil disimpan.');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestWhatsApp = () => {
    const cleanWa = waNumber.replace(/\D/g, '');
    if (!cleanWa) {
      alert('Masukkan nomor WhatsApp terlebih dahulu.');
      return;
    }
    const testUrl = `https://wa.me/${cleanWa}?text=${encodeURIComponent(
      'Halo Admin Toko Timbang Sepakat, ini pesan uji coba konfigurasi nomor WhatsApp.'
    )}`;
    window.open(testUrl, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return <div className="text-xs text-zinc-400 py-8">Memuat pengaturan...</div>;
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-900">
          Pengaturan Toko & Kontak WhatsApp
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          Atur nomor WhatsApp tujuan pesanan pelanggan dan informasi identitas toko.
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-4 shadow-2xs">
        <div>
          <label className="block text-xs font-semibold text-zinc-800">
            Nomor WhatsApp Admin (Tujuan Pesanan) <span className="text-zinc-400">*</span>
          </label>
          <div className="flex gap-2 mt-1">
            <input
              type="text"
              required
              value={waNumber}
              onChange={(e) => setWaNumber(e.target.value)}
              placeholder="Contoh: 6281234567890 (format internasional tanpa + atau spasi)"
              className="flex-1 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono outline-none focus:border-zinc-900 focus:bg-white transition-colors"
            />
            <button
              type="button"
              onClick={handleTestWhatsApp}
              className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shrink-0"
              title="Uji buka WhatsApp dengan nomor ini"
            >
              <MessageSquare size={13} />
              <span>Uji Buka Chat</span>
            </button>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            Wajib diisi dengan kode negara Indonesia (diawali 62). Nomor ini digunakan untuk membuat tautan prefill saat pelanggan checkout.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-800">Nama Toko</label>
          <input
            type="text"
            required
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            className="w-full mt-1 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs outline-none focus:border-zinc-900 focus:bg-white transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-800">Keterangan Layanan</label>
          <textarea
            rows={3}
            value={businessInfo}
            onChange={(e) => setBusinessInfo(e.target.value)}
            placeholder="Keterangan toko untuk pembeli..."
            className="w-full mt-1 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs outline-none focus:border-zinc-900 focus:bg-white transition-colors"
          />
        </div>

        <div className="pt-2 border-t border-zinc-100 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-40"
          >
            <Save size={14} />
            <span>{saving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
