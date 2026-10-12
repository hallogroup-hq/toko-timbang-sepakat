import React, { useEffect, useState } from 'react';
import { Search, X, Plus, Check } from 'lucide-react';
import { Product, Category, SellableOption } from '../lib/types.ts';
import { formatRupiah } from '../lib/format.ts';
import { ProductPlaceholder } from '../components/ProductPlaceholder.tsx';
import { addToCart } from '../lib/cart.ts';
import { useToast } from '../components/Toast.tsx';

interface Props {
  initialQuery?: string;
  initialCategory?: string;
  onNavigate: (path: string, query?: Record<string, string>) => void;
}

export const CatalogPage: React.FC<Props> = ({ initialQuery = '', initialCategory = '', onNavigate }) => {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [sort, setSort] = useState('relevance');
  const [loading, setLoading] = useState(true);

  // Unit selector bottom sheet / modal state
  const [activeProductForUnit, setActiveProductForUnit] = useState<Product | null>(null);
  const [selectedOption, setSelectedOption] = useState<SellableOption | null>(null);
  const [selectedQty, setSelectedQty] = useState(1);

  useEffect(() => {
    setLoading(true);
    let url = '/api/products?';
    if (search.trim()) url += `q=${encodeURIComponent(search.trim())}&`;
    if (selectedCategory) url += `category=${encodeURIComponent(selectedCategory)}&`;
    if (sort === 'name_asc') url += `sort=name_asc&`;

    Promise.all([
      fetch(url).then((r) => r.json()),
      fetch('/api/categories').then((r) => r.json())
    ])
      .then(([prodRes, catRes]) => {
        if (prodRes.data) setProducts(prodRes.data);
        if (catRes.data) setCategories(catRes.data);
      })
      .catch((err) => console.error('Failed to load catalog', err))
      .finally(() => setLoading(false));
  }, [search, selectedCategory, sort]);

  const handleOpenUnitSelector = (p: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveProductForUnit(p);
    setSelectedOption(p.options[0] || null);
    setSelectedQty(1);
  };

  const handleConfirmAddOption = () => {
    if (!activeProductForUnit || !selectedOption) return;
    addToCart(
      {
        productId: activeProductForUnit.id,
        optionId: selectedOption.id,
        productName: activeProductForUnit.display_name,
        unitLabel: selectedOption.unit_label,
        priceIdr: selectedOption.price_idr
      },
      selectedQty
    );
    showToast(`${activeProductForUnit.display_name} (${selectedOption.unit_label}) ditambahkan.`);
    setActiveProductForUnit(null);
  };

  const handleDirectAdd = (p: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    const opt = p.options[0];
    if (!opt) return;
    addToCart({
      productId: p.id,
      optionId: opt.id,
      productName: p.display_name,
      unitLabel: opt.unit_label,
      priceIdr: opt.price_idr
    });
    showToast(`${p.display_name} (${opt.unit_label}) ditambahkan.`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header & Search Control */}
      <div className="space-y-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
            Katalog Bahan Baku
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
            Daftar lengkap 94 bahan baku kafe dengan harga jual transparan.
          </p>
        </div>

        {/* Search input with clear button */}
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari bahan baku (misal: Greenfield, Trieste, Kemasan)..."
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-zinc-300 rounded-xl text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 rounded-full"
              aria-label="Hapus pencarian"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Categories Chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
          <button
            onClick={() => setSelectedCategory('')}
            className={`shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              !selectedCategory
                ? 'bg-[#BA3C07] text-white shadow-2xs'
                : 'bg-white border border-zinc-200 text-zinc-700 hover:border-orange-200 hover:bg-orange-50/20'
            }`}
          >
            Semua Kategori
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.slug === selectedCategory ? '' : c.slug)}
              className={`shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedCategory === c.slug
                  ? 'bg-[#BA3C07] text-white shadow-2xs'
                  : 'bg-white border border-zinc-200 text-zinc-700 hover:border-orange-200 hover:bg-orange-50/20'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Meta Bar: Product Count & Sort */}
        <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
          <span>Menampilkan {products.length} produk</span>
          <div className="flex items-center gap-1.5">
            <label htmlFor="sort-select" className="text-zinc-400">Urutkan:</label>
            <select
              id="sort-select"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="bg-transparent text-zinc-800 font-medium border-0 py-0 pl-1 pr-6 text-xs focus:ring-0 cursor-pointer"
            >
              <option value="relevance">Standar Toko</option>
              <option value="name_asc">Nama (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Products List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-20 bg-white border border-zinc-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mx-auto text-zinc-400">
            <Search size={22} />
          </div>
          <h2 className="text-base font-semibold text-zinc-900">
            Tidak ada produk yang sesuai
          </h2>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Tidak ditemukan produk dengan kata kunci atau filter terpilih.
          </p>
          {(search || selectedCategory) && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedCategory('');
              }}
              className="px-4 py-2 bg-zinc-900 text-white text-xs font-semibold rounded-lg hover:bg-zinc-800 transition-colors"
            >
              Reset Filter Pencarian
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((p) => {
            const isUnavailable = p.availability === 'unavailable';
            return (
              <div
                key={p.id}
                onClick={() => onNavigate(`/produk/${p.slug}`)}
                className="bg-white border border-zinc-200/90 hover:border-[#BA3C07]/40 rounded-xl p-3 sm:p-4 flex items-center justify-between gap-3 transition-colors cursor-pointer group shadow-2xs"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-14 h-14 rounded-lg bg-zinc-50 shrink-0 overflow-hidden flex items-center justify-center border border-zinc-200/60 p-1">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.display_name} className="w-full h-full object-contain" />
                    ) : (
                      <ProductPlaceholder categoryId={p.category?.id} size={22} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] text-zinc-500 block truncate">
                      {p.category?.name || 'Bahan Baku'}
                    </span>
                    <h2 className="text-sm font-semibold text-zinc-900 truncate group-hover:text-[#BA3C07] transition-colors">
                      {p.display_name}
                    </h2>
                    <div className="flex flex-wrap gap-x-2.5 gap-y-0.5 mt-1 text-xs">
                      {p.options.map((opt) => (
                        <span key={opt.id} className="text-zinc-600">
                          {opt.unit_label}:{' '}
                          <span className="font-bold text-[#BA3C07]">{formatRupiah(opt.price_idr)}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  {isUnavailable ? (
                    <span className="text-[11px] text-zinc-400 font-medium px-2.5 py-1 bg-zinc-100 rounded-md">
                      Sedang tidak tersedia
                    </span>
                  ) : p.options.length > 1 ? (
                    <button
                      onClick={(e) => handleOpenUnitSelector(p, e)}
                      className="px-3.5 py-1.5 bg-[#BA3C07] hover:bg-[#9E3205] text-white text-xs font-bold rounded-lg transition-colors min-h-[38px] flex items-center gap-1 shadow-2xs active:scale-98"
                      aria-label={`Pilih satuan untuk ${p.display_name}`}
                    >
                      <span>Pilih Satuan</span>
                    </button>
                  ) : (
                    <button
                      onClick={(e) => handleDirectAdd(p, e)}
                      className="px-3.5 py-1.5 bg-[#BA3C07] hover:bg-[#9E3205] text-white text-xs font-bold rounded-lg transition-colors min-h-[38px] flex items-center gap-1 shadow-2xs active:scale-98"
                      aria-label={`Tambah ${p.display_name}`}
                    >
                      <Plus size={14} />
                      <span>Tambah</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Unit Selector Bottom Sheet / Modal */}
      {activeProductForUnit && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setActiveProductForUnit(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Pilih satuan dan jumlah"
        >
          <div
            className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs text-zinc-500 font-medium block">Pilih Satuan Jual</span>
                <h3 className="text-base font-bold text-zinc-900 mt-0.5">
                  {activeProductForUnit.display_name}
                </h3>
              </div>
              <button
                onClick={() => setActiveProductForUnit(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-lg"
                aria-label="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            {/* Radio options for units */}
            <div className="space-y-2">
              {activeProductForUnit.options.map((opt) => {
                const isSelected = selectedOption?.id === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedOption(opt)}
                    className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? 'border-[#BA3C07] bg-orange-50/50 ring-1 ring-[#BA3C07]'
                        : 'border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div>
                      <span className="text-sm font-semibold text-zinc-900 block">
                        {opt.unit_label}
                      </span>
                      <span className="text-xs text-zinc-500 block mt-0.5">
                        Harga: <span className="font-bold text-[#BA3C07]">{formatRupiah(opt.price_idr)}</span>
                      </span>
                    </div>
                    {isSelected && <Check size={18} className="text-[#BA3C07]" />}
                  </button>
                );
              })}
            </div>

            {/* Quantity Selector */}
            <div className="pt-2 flex items-center justify-between border-t border-zinc-100">
              <span className="text-xs font-semibold text-zinc-700">Jumlah:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedQty((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-800 font-bold flex items-center justify-center hover:bg-zinc-200 transition-colors"
                  aria-label="Kurangi jumlah"
                >
                  -
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="9999"
                  value={selectedQty}
                  onChange={(e) => setSelectedQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-14 text-center font-bold text-sm bg-zinc-50 border border-zinc-200 rounded-lg py-1 outline-none focus:border-[#BA3C07]"
                />
                <button
                  onClick={() => setSelectedQty((q) => q + 1)}
                  className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-800 font-bold flex items-center justify-center hover:bg-zinc-200 transition-colors"
                  aria-label="Tambah jumlah"
                >
                  +
                </button>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleConfirmAddOption}
              className="w-full py-3 bg-[#BA3C07] hover:bg-[#9E3205] text-white font-bold text-sm rounded-xl transition-colors shadow-xs active:scale-98"
            >
              Tambah ke Keranjang ({formatRupiah((selectedOption?.price_idr || 0) * selectedQty)})
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
