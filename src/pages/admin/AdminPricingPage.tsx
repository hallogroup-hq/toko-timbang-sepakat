import React, { useEffect, useState } from 'react';
import { Search, Save, History, RotateCcw } from 'lucide-react';
import { formatRupiah } from '../../lib/format.ts';
import { useToast } from '../../components/Toast.tsx';

interface MatrixRow {
  product_id: string;
  product_name: string;
  source_key: string;
  sku: string | null;
  category_name: string | null;
  karton_option: {
    id: string;
    unit_label: string;
    price_idr: number;
    active: number;
  } | null;
  pcs_option: {
    id: string;
    unit_label: string;
    price_idr: number;
    active: number;
  } | null;
}

export const AdminPricingPage: React.FC = () => {
  const { showToast } = useToast();
  const [products, setProducts] = useState<MatrixRow[]>([]);
  // Key format: `${product_id}:karton_pack` or `${product_id}:pcs`
  const [editedPrices, setEditedPrices] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('Pembaruan harga operasional');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewHistory, setViewHistory] = useState(false);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);

  const loadPricing = () => {
    setLoading(true);
    let url = '/api/admin/pricing/matrix?';
    if (search.trim()) url += `q=${encodeURIComponent(search.trim())}`;
    fetch(url)
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setProducts(res.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPricing();
  }, [search]);

  const loadHistory = () => {
    fetch('/api/admin/pricing/history')
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setHistoryLogs(res.data);
      })
      .catch((err) => console.error(err));
  };

  const handlePriceInput = (productId: string, unitType: 'karton_pack' | 'pcs', val: string) => {
    const key = `${productId}:${unitType}`;
    const cleanStr = val.replace(/[^\d]/g, '');
    if (!cleanStr) {
      setEditedPrices((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
      return;
    }
    const numeric = parseInt(cleanStr, 10);
    setEditedPrices((prev) => ({
      ...prev,
      [key]: numeric
    }));
  };

  const handleSaveBatch = async () => {
    const updates: Array<{
      product_id: string;
      unit_type: 'karton_pack' | 'pcs';
      option_id?: string;
      new_price_idr: number;
      reason?: string;
    }> = [];

    for (const [key, newPrice] of Object.entries(editedPrices)) {
      if (newPrice <= 0) continue;
      const [prodId, unitType] = key.split(':') as [string, 'karton_pack' | 'pcs'];
      const product = products.find((p) => p.product_id === prodId);
      if (!product) continue;

      const currentOpt = unitType === 'karton_pack' ? product.karton_option : product.pcs_option;
      if (currentOpt && currentOpt.price_idr === newPrice) continue;

      updates.push({
        product_id: prodId,
        unit_type: unitType,
        option_id: currentOpt?.id,
        new_price_idr: newPrice,
        reason: reason.trim() || undefined
      });
    }

    if (updates.length === 0) {
      showToast('Tidak ada perubahan harga yang terdeteksi.', 'info');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/pricing/batch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan harga.');

      showToast(`Berhasil memperbarui ${data.updated_count} harga satuan dan karton.`);
      setEditedPrices({});
      loadPricing();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const totalChangedCount = Object.entries(editedPrices).filter(([key, newPrice]) => {
    if (newPrice <= 0) return false;
    const [prodId, unitType] = key.split(':') as [string, 'karton_pack' | 'pcs'];
    const product = products.find((p) => p.product_id === prodId);
    if (!product) return false;
    const currentOpt = unitType === 'karton_pack' ? product.karton_option : product.pcs_option;
    return !currentOpt || currentOpt.price_idr !== newPrice;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">
            Kelola Harga Jual (Karton & Satuan)
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Ubah harga sekarang untuk opsi Karton/Pack maupun Satuan/Pcs secara bersamaan dengan pencatatan riwayat audit otomatis.
          </p>
        </div>

        <button
          onClick={() => {
            setViewHistory(!viewHistory);
            if (!viewHistory) loadHistory();
          }}
          className="px-3.5 py-2 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5 self-start shadow-2xs"
        >
          <History size={14} className="text-[#BA3C07]" />
          <span>{viewHistory ? 'Tutup Log Audit' : 'Lihat Log Audit'}</span>
        </button>
      </div>

      {/* Audit Log Drawer */}
      {viewHistory && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-3 shadow-2xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
            Riwayat Log Perubahan Harga
          </h2>
          <div className="max-h-60 overflow-y-auto divide-y divide-zinc-100 text-xs">
            {historyLogs.length === 0 ? (
              <p className="text-zinc-400 py-3 text-center">Belum ada riwayat perubahan harga.</p>
            ) : (
              historyLogs.map((log) => (
                <div key={log.id} className="py-2.5 flex items-start justify-between gap-3">
                  <div>
                    <span className="font-semibold text-zinc-900 block">
                      {log.product_name} ({log.unit_label})
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      Oleh: {log.changed_by_name || 'Admin'} • {new Date(log.created_at).toLocaleString('id-ID')}
                    </span>
                    {log.reason && (
                      <span className="text-[11px] text-zinc-600 block italic mt-0.5">
                        Alasan: {log.reason}
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-zinc-400 line-through text-[11px] block">
                      {log.old_price_idr ? formatRupiah(log.old_price_idr) : 'Baru'}
                    </span>
                    <span className="text-[#BA3C07] font-bold block">
                      {formatRupiah(log.new_price_idr)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Actions & Batch Save Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 border border-zinc-200 rounded-xl shadow-2xs">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari produk berdasarkan nama atau kode..."
            className="w-full pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none focus:bg-white focus:border-[#BA3C07] transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Alasan perubahan harga"
            className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs outline-none focus:bg-white focus:border-[#BA3C07] transition-colors flex-1 sm:w-60"
          />

          <button
            onClick={handleSaveBatch}
            disabled={saving || totalChangedCount === 0}
            className="px-4 py-2 bg-[#BA3C07] hover:bg-[#9E3205] text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-40 shrink-0 shadow-xs active:scale-[0.98]"
          >
            <Save size={14} />
            <span>Simpan ({totalChangedCount})</span>
          </button>
        </div>
      </div>

      {/* Pricing Matrix Table */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-3.5 w-24">Kode</th>
                <th className="py-3 px-3.5">Nama Produk</th>
                <th className="py-3 px-3.5 bg-amber-50/50 border-l border-r border-amber-100">
                  <span className="block text-zinc-900 font-bold">Harga Karton / Pack</span>
                  <span className="text-[10px] text-zinc-500 font-normal">Sekarang &amp; Harga Baru</span>
                </th>
                <th className="py-3 px-3.5 bg-orange-50/40 border-r border-orange-100">
                  <span className="block text-zinc-900 font-bold">Harga Satuan (Pcs)</span>
                  <span className="text-[10px] text-zinc-500 font-normal">Sekarang &amp; Harga Baru</span>
                </th>
                <th className="py-3 px-3.5 text-center w-20">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-zinc-400">
                    Memuat data produk dan opsi harga...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-zinc-400">
                    Tidak ada produk ditemukan.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const kartonKey = `${p.product_id}:karton_pack`;
                  const pcsKey = `${p.product_id}:pcs`;

                  const editedKarton = editedPrices[kartonKey];
                  const editedPcs = editedPrices[pcsKey];

                  const isKartonModified =
                    editedKarton !== undefined &&
                    (!p.karton_option || p.karton_option.price_idr !== editedKarton);

                  const isPcsModified =
                    editedPcs !== undefined &&
                    (!p.pcs_option || p.pcs_option.price_idr !== editedPcs);

                  const hasAnyModified = isKartonModified || isPcsModified;

                  return (
                    <tr
                      key={p.product_id}
                      className={`hover:bg-zinc-50/80 transition-colors ${
                        hasAnyModified ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      {/* Kode */}
                      <td className="py-3 px-3.5 font-mono text-[11px] text-zinc-500 font-medium">
                        {p.source_key}
                      </td>

                      {/* Nama & Kategori */}
                      <td className="py-3 px-3.5">
                        <span className="font-semibold text-zinc-900 block">
                          {p.product_name}
                        </span>
                        <span className="text-[10px] text-zinc-500 block">
                          {p.category_name || 'Bahan Baku'}
                        </span>
                      </td>

                      {/* Karton / Pack Column */}
                      <td className="py-2.5 px-3.5 bg-amber-50/30 border-l border-r border-amber-100">
                        <div className="flex items-center gap-2">
                          <div className="w-24 text-right">
                            <span className="text-[10px] text-zinc-400 block leading-tight">Sekarang:</span>
                            <span className="font-semibold text-zinc-700 text-xs block">
                              {p.karton_option ? formatRupiah(p.karton_option.price_idr) : '-'}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400">
                                Rp
                              </span>
                              <input
                                type="text"
                                inputMode="numeric"
                                placeholder={p.karton_option ? String(p.karton_option.price_idr) : 'Set harga karton'}
                                value={editedKarton !== undefined ? String(editedKarton) : ''}
                                onChange={(e) =>
                                  handlePriceInput(p.product_id, 'karton_pack', e.target.value)
                                }
                                className={`w-full pl-7 pr-2.5 py-1.5 rounded-lg text-xs font-semibold outline-none transition-all ${
                                  isKartonModified
                                    ? 'bg-amber-100/70 border border-[#BA3C07] text-[#BA3C07]'
                                    : 'bg-white border border-zinc-200 focus:border-[#BA3C07]'
                                }`}
                              />
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Satuan / Pcs Column */}
                      <td className="py-2.5 px-3.5 bg-orange-50/20 border-r border-orange-100">
                        <div className="flex items-center gap-2">
                          <div className="w-24 text-right">
                            <span className="text-[10px] text-zinc-400 block leading-tight">Sekarang:</span>
                            <span className="font-semibold text-zinc-700 text-xs block">
                              {p.pcs_option ? formatRupiah(p.pcs_option.price_idr) : '-'}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400">
                                Rp
                              </span>
                              <input
                                type="text"
                                inputMode="numeric"
                                placeholder={p.pcs_option ? String(p.pcs_option.price_idr) : 'Set harga pcs'}
                                value={editedPcs !== undefined ? String(editedPcs) : ''}
                                onChange={(e) =>
                                  handlePriceInput(p.product_id, 'pcs', e.target.value)
                                }
                                className={`w-full pl-7 pr-2.5 py-1.5 rounded-lg text-xs font-semibold outline-none transition-all ${
                                  isPcsModified
                                    ? 'bg-orange-100/70 border border-[#BA3C07] text-[#BA3C07]'
                                    : 'bg-white border border-zinc-200 focus:border-[#BA3C07]'
                                }`}
                              />
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Reset Action */}
                      <td className="py-3 px-3.5 text-center">
                        {hasAnyModified && (
                          <button
                            onClick={() => {
                              setEditedPrices((prev) => {
                                const copy = { ...prev };
                                delete copy[kartonKey];
                                delete copy[pcsKey];
                                return copy;
                              });
                            }}
                            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
                            title="Reset perubahan baris ini"
                          >
                            <RotateCcw size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
