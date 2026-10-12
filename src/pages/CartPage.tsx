import React, { useEffect, useState } from 'react';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag } from 'lucide-react';
import { CartItem } from '../lib/types.ts';
import { getCart, updateCartQty, removeFromCart, clearCart, subscribeToCart } from '../lib/cart.ts';
import { formatRupiah } from '../lib/format.ts';

interface Props {
  onNavigate: (path: string) => void;
}

export const CartPage: React.FC<Props> = ({ onNavigate }) => {
  const [cart, setCart] = useState<CartItem[]>(getCart());

  useEffect(() => {
    return subscribeToCart(() => {
      setCart(getCart());
    });
  }, []);

  const subtotal = cart.reduce((acc, item) => acc + item.qty * item.priceIdr, 0);

  if (cart.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto text-zinc-400">
          <ShoppingBag size={28} />
        </div>
        <h1 className="text-lg font-bold text-zinc-900">Keranjang masih kosong</h1>
        <p className="text-xs text-zinc-500 max-w-xs mx-auto">
          Belum ada bahan baku yang ditambahkan. Silakan telusuri katalog untuk memesan kebutuhan kafe Anda.
        </p>
        <button
          onClick={() => onNavigate('/produk')}
          className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl transition-colors inline-flex items-center gap-1.5"
        >
          <span>Cari Bahan Baku</span>
          <ArrowRight size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200/80 pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">
            Keranjang Belanja
          </h1>
          <p className="text-xs text-zinc-500">{cart.length} jenis item dipilih</p>
        </div>
        <button
          onClick={() => {
            if (confirm('Yakin ingin mengosongkan seluruh keranjang?')) {
              clearCart();
            }
          }}
          className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors"
        >
          Kosongkan
        </button>
      </div>

      {/* Cart Items List */}
      <div className="bg-white border border-zinc-200 rounded-xl divide-y divide-zinc-100 overflow-hidden shadow-2xs">
        {cart.map((item) => {
          const lineTotal = item.qty * item.priceIdr;
          return (
            <div key={item.optionId} className="p-4 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-zinc-900">{item.productName}</h2>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500">
                  <span className="font-medium px-2 py-0.5 bg-zinc-100 text-zinc-700 rounded-md">
                    {item.unitLabel}
                  </span>
                  <span>@ {formatRupiah(item.priceIdr)}</span>
                </div>
                <div className="text-xs font-bold text-zinc-900 mt-2">
                  Total: {formatRupiah(lineTotal)}
                </div>
              </div>

              {/* Quantity Controls & Delete */}
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => updateCartQty(item.optionId, item.qty - 1)}
                    className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center hover:bg-zinc-200 transition-colors active:scale-95"
                    aria-label={`Kurangi jumlah ${item.productName}`}
                  >
                    <Minus size={14} />
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min="1"
                    max="9999"
                    value={item.qty}
                    onChange={(e) =>
                      updateCartQty(item.optionId, Math.max(1, parseInt(e.target.value) || 1))
                    }
                    className="w-14 h-8 text-center text-xs font-bold bg-zinc-50 border border-zinc-200 rounded-lg outline-none focus:border-zinc-900"
                    aria-label={`Jumlah ${item.productName}`}
                  />
                  <button
                    onClick={() => updateCartQty(item.optionId, item.qty + 1)}
                    className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center hover:bg-zinc-200 transition-colors active:scale-95"
                    aria-label={`Tambah jumlah ${item.productName}`}
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <button
                  onClick={() => removeFromCart(item.optionId)}
                  className="text-xs text-zinc-400 hover:text-zinc-700 py-1.5 px-2 -mr-2 rounded flex items-center gap-1 transition-colors"
                  aria-label={`Hapus ${item.productName}`}
                >
                  <Trash2 size={13} />
                  <span>Hapus</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Box */}
      <div className="bg-orange-50/30 border border-orange-100 rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-zinc-600">
          <span>Subtotal barang:</span>
          <span className="font-bold text-sm text-[#BA3C07]">{formatRupiah(subtotal)}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-zinc-500 border-t border-orange-200/50 pt-2">
          <span>Ongkos kirim:</span>
          <span className="font-medium text-zinc-700">Dikonfirmasi admin</span>
        </div>
      </div>

      {/* Sticky Bottom Actions */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-zinc-200/90 p-4 z-30">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div>
            <span className="text-[11px] text-zinc-500 block">Total Perkiraan</span>
            <span className="text-base font-extrabold text-[#BA3C07] block leading-tight">
              {formatRupiah(subtotal)}
            </span>
          </div>

          <button
            onClick={() => onNavigate('/checkout')}
            className="px-6 py-3 bg-[#BA3C07] hover:bg-[#9E3205] text-white font-bold text-xs sm:text-sm rounded-xl transition-colors flex items-center gap-1.5 shadow-xs active:scale-98"
          >
            <span>Lanjut ke WhatsApp</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
