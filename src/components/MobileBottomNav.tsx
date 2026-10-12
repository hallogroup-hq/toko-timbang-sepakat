import React, { useEffect, useState } from 'react';
import { Home, Layers, ShoppingBag } from 'lucide-react';
import { getCartCount, subscribeToCart } from '../lib/cart.ts';

interface Props {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const MobileBottomNav: React.FC<Props> = ({ currentPath, onNavigate }) => {
  const [cartCount, setCartCount] = useState(getCartCount());

  useEffect(() => {
    return subscribeToCart(() => {
      setCartCount(getCartCount());
    });
  }, []);

  const navItems = [
    { label: 'Beranda', path: '/', icon: Home, exact: true },
    { label: 'Katalog', path: '/produk', icon: Layers, exact: false },
    { label: 'Keranjang', path: '/keranjang', icon: ShoppingBag, exact: true, count: cartCount }
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-zinc-200/90 pb-safe"
      aria-label="Navigasi bawah utama"
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const isActive = item.exact
            ? currentPath === item.path
            : currentPath.startsWith(item.path);
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => onNavigate(item.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 min-h-[48px] transition-colors relative ${
                isActive ? 'text-[#BA3C07] font-bold' : 'text-zinc-500 hover:text-zinc-800'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                <Icon size={20} strokeWidth={isActive ? 2.3 : 1.7} />
                {item.count !== undefined && item.count > 0 && (
                  <span className="absolute -top-1.5 -right-3 bg-[#BA3C07] text-white text-[10px] font-bold h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center leading-none shadow-xs">
                    {item.count > 99 ? '99+' : item.count}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-1 tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
