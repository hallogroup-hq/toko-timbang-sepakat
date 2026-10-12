import React, { useEffect, useState } from 'react';
import { Search, ArrowRight, ChevronRight } from 'lucide-react';
import { Category, Product } from '../lib/types.ts';
import { formatRupiah } from '../lib/format.ts';
import { ProductPlaceholder } from '../components/ProductPlaceholder.tsx';
import { addToCart } from '../lib/cart.ts';
import { useToast } from '../components/Toast.tsx';
import { FALLBACK_CATEGORIES, FALLBACK_PRODUCTS } from '../data/catalogData.ts';

interface Props {
  onNavigate: (path: string, query?: Record<string, string>) => void;
}

export const HomePage: React.FC<Props> = ({ onNavigate }) => {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>(FALLBACK_CATEGORIES);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>(FALLBACK_PRODUCTS.slice(0, 10));
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/categories').then((r) => r.json()).catch(() => null),
      fetch('/api/products').then((r) => r.json()).catch(() => null)
    ])
      .then(([catRes, prodRes]) => {
        if (catRes && catRes.data && Array.isArray(catRes.data) && catRes.data.length > 0) {
          setCategories(catRes.data);
        }
        if (prodRes && prodRes.data && Array.isArray(prodRes.data) && prodRes.data.length > 0) {
          setFeaturedProducts(prodRes.data.slice(0, 10));
        }
      })
      .catch((err) => console.error('Failed to load home data', err))
      .finally(() => setLoading(false));
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onNavigate('/produk', { q: searchQuery.trim() });
    } else {
      onNavigate('/produk');
    }
  };

  const handleQuickAdd = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    if (product.options.length === 1) {
      const opt = product.options[0];
      addToCart({
        productId: product.id,
        optionId: opt.id,
        productName: product.display_name,
        unitLabel: opt.unit_label,
        priceIdr: opt.price_idr
      });
      showToast(`${product.display_name} (${opt.unit_label}) ditambahkan ke keranjang.`);
    } else {
      onNavigate(`/produk/${product.slug}`);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      {/* 1. Header Hero & Search Section */}
      <section className="relative -mx-4 sm:mx-0 sm:rounded-2xl overflow-hidden border-y sm:border border-zinc-800/20 shadow-sm bg-zinc-950">
        {/* Full background image */}
        <div className="absolute inset-0 z-0">
          <img
            src="/hero-banner.jpg"
            alt="Bahan baku kafe Toko Timbang Sepakat"
            className="w-full h-full object-cover object-center"
            loading="eager"
          />
          {/* Contrast gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/95 via-zinc-950/80 to-zinc-950/65 sm:bg-gradient-to-r sm:from-zinc-950/95 sm:via-zinc-950/80 sm:to-zinc-950/50" />
        </div>

        {/* Foreground Content */}
        <div className="relative z-10 max-w-2xl px-5 py-8 sm:px-8 sm:py-12 md:py-14 space-y-4 text-left">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Bahan baku kafe lengkap, pesanan langsung ke WhatsApp.
          </h1>
          <p className="text-sm sm:text-base text-zinc-200 leading-relaxed max-w-xl">
            Susu fresh &amp; UHT, sirup premium, bubuk perisa, dan kemasan siap restock. Tanpa biaya akun, kalkulasi subtotal otomatis dan transparan.
          </p>

          {/* Search bar above the fold */}
          <form onSubmit={handleSearchSubmit} className="relative pt-2 max-w-xl">
            <div className="relative flex items-center">
              <Search
                size={18}
                className="absolute left-3.5 text-zinc-400 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari susu UHT, sirup vanilla, kemasan, atau bahan lainnya..."
                className="w-full pl-10 pr-24 py-3 bg-white border border-white/20 rounded-xl text-sm text-zinc-900 placeholder:text-zinc-500 focus:bg-white focus:border-[#BA3C07] focus:ring-2 focus:ring-[#BA3C07]/30 transition-all outline-none shadow-md"
              />
              <button
                type="submit"
                className="absolute right-1.5 px-4 py-2 bg-[#BA3C07] hover:bg-[#9E3205] text-white text-xs font-bold rounded-lg transition-colors shadow-2xs active:scale-98"
              >
                Cari
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* 2. Category Chips Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-700">
            Kategori Bahan Baku
          </h2>
          <button
            onClick={() => onNavigate('/produk')}
            className="text-xs font-semibold text-zinc-900 hover:underline flex items-center gap-0.5"
          >
            Semua Produk <ChevronRight size={14} />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar sm:grid sm:grid-cols-4 sm:overflow-visible sm:mx-0 sm:px-0">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onNavigate('/produk', { category: cat.slug })}
              className="shrink-0 bg-white border border-zinc-200 hover:border-zinc-900 rounded-xl px-4 py-3 text-left transition-all group flex flex-col justify-between min-w-[130px] sm:min-w-0"
            >
              <span className="text-xs text-zinc-400 font-medium block">Kategori</span>
              <span className="text-sm font-semibold text-zinc-900 mt-1 group-hover:text-zinc-950 block">
                {cat.name}
              </span>
              <span className="text-[11px] text-zinc-500 mt-2 block">
                {cat.product_count !== undefined ? `${cat.product_count} produk` : 'Lihat daftar'}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 3. Featured / Quick Restock Products */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-800">
              Daftar Restock Cepat
            </h2>
            <p className="text-xs text-zinc-500">Pilihan bahan baku yang siap dipesan hari ini.</p>
          </div>
          <button
            onClick={() => onNavigate('/produk')}
            className="text-xs font-bold text-[#BA3C07] hover:underline flex items-center gap-0.5"
          >
            Buka Katalog <ArrowRight size={14} />
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-white border border-zinc-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-zinc-200 rounded-xl divide-y divide-zinc-100 overflow-hidden shadow-2xs">
            {featuredProducts.map((p) => {
              const isUnavailable = p.availability === 'unavailable';
              return (
                <div
                  key={p.id}
                  onClick={() => onNavigate(`/produk/${p.slug}`)}
                  className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-orange-50/20 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-lg bg-zinc-50 shrink-0 overflow-hidden flex items-center justify-center border border-zinc-200/60 p-1">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.display_name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <ProductPlaceholder categoryId={p.category?.id} size={20} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[11px] text-zinc-500 block truncate">
                        {p.category?.name || 'Bahan Baku'}
                      </span>
                      <h3 className="text-sm font-semibold text-zinc-900 truncate group-hover:text-[#BA3C07] transition-colors">
                        {p.display_name}
                      </h3>
                      <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5 text-xs text-zinc-600">
                        {p.options.map((opt) => (
                          <span key={opt.id} className="font-medium text-zinc-700">
                            {opt.unit_label}: <span className="font-bold text-[#BA3C07]">{formatRupiah(opt.price_idr)}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {isUnavailable ? (
                      <span className="text-xs text-zinc-400 font-medium px-2 py-1 bg-zinc-100 rounded-md">
                        Habis
                      </span>
                    ) : (
                      <button
                        onClick={(e) => handleQuickAdd(p, e)}
                        className="px-3.5 py-1.5 bg-[#BA3C07] hover:bg-[#9E3205] text-white text-xs font-bold rounded-lg transition-colors min-h-[36px] shadow-2xs active:scale-98"
                        aria-label={`Tambah ${p.display_name}`}
                      >
                        {p.options.length > 1 ? 'Pilih Satuan' : '+ Tambah'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. Cara Pesan Singkat */}
      <section className="bg-zinc-100/80 border border-zinc-200/80 rounded-2xl p-5 sm:p-6 space-y-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-800">
            Cara Belanja di Toko Timbang Sepakat
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Tiga langkah mudah untuk restock bahan baku kafe Anda.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white border border-zinc-200/70 p-4 rounded-xl space-y-1">
            <span className="text-xs font-bold text-zinc-400">01</span>
            <h3 className="text-sm font-semibold text-zinc-900">Pilih Bahan & Satuan</h3>
            <p className="text-xs text-zinc-600">
              Cari produk, tentukan kebutuhan per pcs atau per karton/pack, lalu masukkan ke keranjang.
            </p>
          </div>

          <div className="bg-white border border-zinc-200/70 p-4 rounded-xl space-y-1">
            <span className="text-xs font-bold text-zinc-400">02</span>
            <h3 className="text-sm font-semibold text-zinc-900">Periksa Rincian Pesanan</h3>
            <p className="text-xs text-zinc-600">
              Isi nama pemesan dan nama usaha Anda. Sistem menyiapkan draft teks pesanan secara otomatis.
            </p>
          </div>

          <div className="bg-white border border-zinc-200/70 p-4 rounded-xl space-y-1">
            <span className="text-xs font-bold text-zinc-400">03</span>
            <h3 className="text-sm font-semibold text-zinc-900">Kirim ke WhatsApp Admin</h3>
            <p className="text-xs text-zinc-600">
              Buka WhatsApp dengan satu klik. Admin kami mengonfirmasi ketersediaan, ongkir, dan pembayaran.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
