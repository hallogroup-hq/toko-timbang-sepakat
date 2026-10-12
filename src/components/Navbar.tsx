import React, { useEffect, useState } from 'react';
import { ShoppingBag, Search } from 'lucide-react';
import { getCartCount, subscribeToCart } from '../lib/cart.ts';

interface Props {
  currentPath: string;
  onNavigate: (path: string) => void;
  onOpenSearch?: () => void;
}

export const Navbar: React.FC<Props> = ({ currentPath, onNavigate }) => {
  const [cartCount, setCartCount] = useState(getCartCount());

  useEffect(() => {
    return subscribeToCart(() => {
      setCartCount(getCartCount());
    });
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-zinc-200/80">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        {/* Brand Logo & Name */}
        <button
          onClick={() => onNavigate('/')}
          className="flex items-center text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 rounded-md p-1 -ml-1 transition-opacity hover:opacity-90"
          aria-label="Kembali ke beranda Toko Timbang Sepakat"
        >
          <img
            src="/branding/logo-color.png"
            alt="Toko Timbang Sepakat"
            className="h-10 sm:h-12 w-auto object-contain"
          />
        </button>

        {/* Center Navigation for Desktop */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-600">
          <button
            onClick={() => onNavigate('/')}
            className={`transition-colors hover:text-[#BA3C07] ${
              currentPath === '/' ? 'text-[#BA3C07] font-bold' : ''
            }`}
          >
            Beranda
          </button>
          <button
            onClick={() => onNavigate('/produk')}
            className={`transition-colors hover:text-[#BA3C07] ${
              currentPath.startsWith('/produk') ? 'text-[#BA3C07] font-bold' : ''
            }`}
          >
            Katalog Produk
          </button>
          <button
            onClick={() => onNavigate('/informasi')}
            className={`transition-colors hover:text-[#BA3C07] ${
              currentPath === '/informasi' ? 'text-[#BA3C07] font-bold' : ''
            }`}
          >
            Cara Pesan
          </button>
        </nav>

        {/* Right Actions: Search shortcut & Cart button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('/produk')}
            className="p-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors md:hidden"
            aria-label="Cari produk"
          >
            <Search size={20} strokeWidth={2} />
          </button>

          <button
            onClick={() => onNavigate('/keranjang')}
            className="relative p-2.5 text-zinc-800 hover:bg-orange-50/60 rounded-lg transition-colors flex items-center justify-center min-w-[44px] min-h-[44px]"
            aria-label={`Keranjang belanja, ${cartCount} item`}
          >
            <ShoppingBag size={21} strokeWidth={2} />
            {cartCount > 0 && (
              <span className="absolute top-1.5 right-1.5 bg-[#BA3C07] text-white text-[11px] font-bold h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center leading-none shadow-xs">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
