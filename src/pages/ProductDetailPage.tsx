import React, { useEffect, useState } from 'react';
import { ChevronLeft, Plus, Minus, ShoppingBag, Check } from 'lucide-react';
import { Product, SellableOption } from '../lib/types.ts';
import { formatRupiah } from '../lib/format.ts';
import { ProductPlaceholder } from '../components/ProductPlaceholder.tsx';
import { addToCart } from '../lib/cart.ts';
import { useToast } from '../components/Toast.tsx';

interface Props {
  slug: string;
  onNavigate: (path: string) => void;
}

export const ProductDetailPage: React.FC<Props> = ({ slug, onNavigate }) => {
  const { showToast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedOption, setSelectedOption] = useState<SellableOption | null>(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/products/${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error('Produk tidak ditemukan');
        return r.json();
      })
      .then((res) => {
        if (res.data) {
          setProduct(res.data);
          if (res.data.options && res.data.options.length > 0) {
            setSelectedOption(res.data.options[0]);
          }
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleAddToCart = () => {
    if (!product || !selectedOption) return;
    addToCart(
      {
        productId: product.id,
        optionId: selectedOption.id,
        productName: product.display_name,
        unitLabel: selectedOption.unit_label,
        priceIdr: selectedOption.price_idr
      },
      qty
    );
    showToast(`${qty} ${selectedOption.unit_label} ${product.display_name} ditambahkan ke keranjang.`);
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-lg mx-auto py-6">
        <div className="h-8 w-24 bg-zinc-200 rounded-lg animate-pulse" />
        <div className="h-64 bg-zinc-200 rounded-2xl animate-pulse" />
        <div className="h-10 bg-zinc-200 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-sm text-zinc-500">Produk yang Anda cari tidak ditemukan.</p>
        <button
          onClick={() => onNavigate('/produk')}
          className="px-4 py-2 bg-zinc-900 text-white text-xs font-semibold rounded-lg"
        >
          Kembali ke Katalog
        </button>
      </div>
    );
  }

  const isUnavailable = product.availability === 'unavailable';
  const totalPrice = (selectedOption?.price_idr || 0) * qty;

  return (
    <div className="max-w-lg mx-auto space-y-6 pb-16">
      {/* Back button */}
      <button
        onClick={() => onNavigate('/produk')}
        className="flex items-center gap-1 text-xs font-semibold text-zinc-600 hover:text-zinc-900 py-1 transition-colors"
      >
        <ChevronLeft size={16} />
        <span>Kembali ke Katalog</span>
      </button>

      {/* Product Image / Placeholder Card */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="aspect-square sm:aspect-4/3 w-full bg-zinc-50 flex items-center justify-center p-6">
          {product.image_url || ((product as any).images && (product as any).images.length > 0) ? (
            <img
              src={product.image_url || (product as any).images[0].url}
              alt={product.display_name}
              className="w-full h-full object-contain"
            />
          ) : (
            <ProductPlaceholder categoryId={product.category?.id} size={48} className="w-full h-full" />
          )}
        </div>

        <div className="p-5 space-y-3">
          <div>
            <span className="text-xs font-medium text-zinc-500 block">
              {product.category?.name || 'Bahan Baku'}
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 mt-0.5">
              {product.display_name}
            </h1>
          </div>

          {/* Unit selection options */}
          <div className="space-y-2 pt-2">
            <span className="text-xs font-semibold text-zinc-700 block">Pilihan Satuan:</span>
            <div className="grid grid-cols-1 gap-2">
              {product.options.map((opt) => {
                const isSelected = selectedOption?.id === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedOption(opt)}
                    className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? 'border-[#BA3C07] bg-orange-50/50 ring-1 ring-[#BA3C07]'
                        : 'border-zinc-200 hover:border-zinc-300 bg-white'
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
          </div>

          {/* Quantity Controls */}
          {!isUnavailable && (
            <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-700">Jumlah Pesanan:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-11 h-11 rounded-lg bg-zinc-100 text-zinc-800 font-bold flex items-center justify-center hover:bg-zinc-200 transition-colors"
                  aria-label="Kurangi jumlah pesanan"
                >
                  <Minus size={16} />
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  aria-label="Jumlah pesanan"
                  min="1"
                  max="9999"
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 h-11 text-center font-bold text-sm bg-zinc-50 border border-zinc-200 rounded-lg py-1.5 outline-none focus:border-[#BA3C07]"
                />
                <button
                  onClick={() => setQty((q) => q + 1)}
                  className="w-11 h-11 rounded-lg bg-zinc-100 text-zinc-800 font-bold flex items-center justify-center hover:bg-zinc-200 transition-colors"
                  aria-label="Tambah jumlah pesanan"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Action button */}
          <div className="pt-2">
            {isUnavailable ? (
              <div className="w-full py-3 bg-zinc-100 text-zinc-400 font-semibold text-sm rounded-xl text-center">
                Produk sedang tidak tersedia
              </div>
            ) : (
              <button
                onClick={handleAddToCart}
                className="w-full py-3.5 bg-[#BA3C07] hover:bg-[#9E3205] text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs active:scale-98"
              >
                <ShoppingBag size={18} />
                <span>Tambah ke Keranjang ({formatRupiah(totalPrice)})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Information Note */}
      <div className="bg-zinc-100/70 border border-zinc-200/70 rounded-xl p-4 text-xs text-zinc-600 space-y-1">
        <span className="font-semibold text-zinc-900 block">Catatan Pembelian:</span>
        <p>
          Konfirmasi stok aktual dan ongkos kirim akan dikoordinasikan langsung melalui WhatsApp admin sebelum pembayaran.
        </p>
      </div>
    </div>
  );
};
