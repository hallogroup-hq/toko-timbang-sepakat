import React from 'react';

interface Props {
  onNavigate: (path: string) => void;
}

export const Footer: React.FC<Props> = ({ onNavigate }) => {
  return (
    <footer className="border-t border-zinc-200 bg-white mt-16 pb-20 md:pb-8 text-zinc-600 text-sm">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-zinc-100">
          <div>
            <span className="font-bold text-base text-zinc-900 block">
              Toko Timbang Sepakat
            </span>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm">
              Penyedia bahan baku terpercaya untuk coffee shop, kafe, dan usaha F&B. Pesan langsung dengan rincian rapi ke WhatsApp.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-xs font-medium">
            <button
              onClick={() => onNavigate('/produk')}
              className="hover:text-zinc-900 transition-colors"
            >
              Katalog Produk
            </button>
            <button
              onClick={() => onNavigate('/informasi')}
              className="hover:text-zinc-900 transition-colors"
            >
              Cara Pesan & Info Toko
            </button>
            <button
              onClick={() => onNavigate('/admin/login')}
              className="text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              Login Staf Admin
            </button>
          </div>
        </div>
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-400 gap-2">
          <p>© 2026 Toko Timbang Sepakat. Seluruh hak cipta dilindungi.</p>
          <p>Bahan baku tepat, hitungan transparan, pesanan tinggal kirim.</p>
        </div>
      </div>
    </footer>
  );
};
