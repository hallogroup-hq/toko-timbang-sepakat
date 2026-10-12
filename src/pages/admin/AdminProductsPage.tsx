import React, { useEffect, useState } from 'react';
import { Search, Edit2, X } from 'lucide-react';
import { formatRupiah } from '../../lib/format.ts';
import { useToast } from '../../components/Toast.tsx';

export const AdminProductsPage: React.FC = () => {
  const { showToast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Edit modal
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editSku, setEditSku] = useState('');
  const [editAvailability, setEditAvailability] = useState('ask_admin');
  const [saving, setSaving] = useState(false);

  const loadData = () => {
    setLoading(true);
    let url = '/api/admin/products?';
    if (search.trim()) url += `q=${encodeURIComponent(search.trim())}&`;
    if (categoryFilter) url += `category=${encodeURIComponent(categoryFilter)}&`;

    Promise.all([
      fetch(url).then((r) => r.json()),
      fetch('/api/admin/categories').then((r) => r.json())
    ])
      .then(([prodRes, catRes]) => {
        if (prodRes.data) setProducts(prodRes.data);
        if (catRes.data) setCategories(catRes.data);
      })
      .catch((err) => console.error('Failed to load products', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [search, categoryFilter]);

  const handleOpenEdit = (p: any) => {
    setEditingProduct(p);
    setEditName(p.display_name);
    setEditCategoryId(p.category_id || '');
    setEditSku(p.sku || '');
    setEditAvailability(p.availability);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/admin/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: editName.trim(),
          category_id: editCategoryId || null,
          sku: editSku.trim() || null,
          availability: editAvailability
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menyimpan perubahan.');
      }

      showToast('Produk berhasil diperbarui.');
      setEditingProduct(null);
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleQuickAvailabilityChange = async (productId: string, newAvailability: string) => {
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability: newAvailability })
      });
      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, availability: newAvailability } : p))
        );
        showToast('Status ketersediaan diubah.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">
            Katalog & Manajemen Produk
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Kelola nama tampil, kategori, SKU, dan ketersediaan stok fisik.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan nama, kode SEPAKAT, atau SKU..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs outline-none focus:border-zinc-900 transition-colors"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-white border border-zinc-200 rounded-xl text-xs py-2 px-3 outline-none focus:border-zinc-900 transition-colors"
        >
          <option value="">Semua Kategori</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Products Table */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-3.5">Kode Sumber</th>
                <th className="py-3 px-3.5">Nama Produk</th>
                <th className="py-3 px-3.5">Kategori</th>
                <th className="py-3 px-3.5">Opsi & Harga</th>
                <th className="py-3 px-3.5">Ketersediaan</th>
                <th className="py-3 px-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-zinc-400">
                    Memuat katalog...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-zinc-400">
                    Tidak ada produk ditemukan.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="py-3 px-3.5 font-mono text-zinc-400 font-medium">
                      {p.source_key || '-'}
                    </td>
                    <td className="py-3 px-3.5">
                      <span className="font-semibold text-zinc-900 block">{p.display_name}</span>
                      {p.source_name && p.source_name !== p.display_name && (
                        <span className="text-[10px] text-zinc-400 block">
                          Asli: {p.source_name}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-zinc-600">
                      {p.category_name || '-'}
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="flex flex-col gap-0.5">
                        {p.options.map((opt: any) => (
                          <span key={opt.id} className="text-zinc-700">
                            {opt.unit_label}: <strong className="font-semibold text-zinc-900">{formatRupiah(opt.price_idr)}</strong>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-3.5">
                      <select
                        value={p.availability}
                        onChange={(e) => handleQuickAvailabilityChange(p.id, e.target.value)}
                        className={`text-xs font-medium py-1 px-2 rounded-lg border cursor-pointer outline-none ${
                          p.availability === 'available'
                            ? 'bg-zinc-100 border-zinc-300 text-zinc-900'
                            : p.availability === 'unavailable'
                            ? 'bg-zinc-200 border-zinc-400 text-zinc-700'
                            : 'bg-zinc-50 border-zinc-200 text-zinc-600'
                        }`}
                      >
                        <option value="ask_admin">Konfirmasi Admin</option>
                        <option value="available">Tersedia</option>
                        <option value="unavailable">Tidak Tersedia</option>
                      </select>
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="p-1.5 text-zinc-500 hover:text-zinc-900 rounded-lg hover:bg-zinc-100 transition-colors"
                        title="Edit Produk"
                      >
                        <Edit2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Product Modal */}
      {editingProduct && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white max-w-md w-full rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Edit Produk</h3>
                <span className="text-[11px] font-mono text-zinc-400">
                  {editingProduct.source_key || editingProduct.id}
                </span>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700">Nama Tampil Produk</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-zinc-900 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700">Kategori</label>
                <select
                  value={editCategoryId}
                  onChange={(e) => setEditCategoryId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-zinc-900 focus:bg-white transition-colors"
                >
                  <option value="">Pilih Kategori...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700">SKU (Opsional)</label>
                <input
                  type="text"
                  value={editSku}
                  onChange={(e) => setEditSku(e.target.value)}
                  placeholder="Kode SKU unik"
                  className="w-full mt-1 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-zinc-900 focus:bg-white transition-colors font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700">Status Ketersediaan</label>
                <select
                  value={editAvailability}
                  onChange={(e) => setEditAvailability(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-zinc-900 focus:bg-white transition-colors"
                >
                  <option value="ask_admin">Konfirmasi Admin (Default)</option>
                  <option value="available">Tersedia</option>
                  <option value="unavailable">Tidak Tersedia</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
