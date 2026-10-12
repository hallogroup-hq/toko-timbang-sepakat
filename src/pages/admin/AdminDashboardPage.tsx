import React, { useEffect, useState } from 'react';
import { Package, AlertTriangle, MessageSquare, ShoppingBag, ArrowRight, CircleDollarSign } from 'lucide-react';
import { formatRupiah } from '../../lib/format.ts';

interface Props {
  onNavigate: (path: string) => void;
}

export const AdminDashboardPage: React.FC<Props> = ({ onNavigate }) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/orders/metrics')
      .then((r) => r.json())
      .then((res) => {
        if (res.metrics) setMetrics(res.metrics);
      })
      .catch((err) => console.error('Failed to load metrics', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-900">
          Ringkasan Operasional
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          Pantau status katalog, permintaan pesanan WhatsApp, dan transaksi terverifikasi.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-medium text-zinc-500">Katalog Aktif</span>
            <Package size={16} />
          </div>
          <div className="text-xl font-bold text-zinc-900">
            {loading ? '-' : metrics?.total_published_products || 0}
          </div>
          <span className="text-[10px] text-zinc-400 block">Produk dipublikasikan</span>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-medium text-zinc-500">Tidak Tersedia</span>
            <AlertTriangle size={16} />
          </div>
          <div className="text-xl font-bold text-zinc-900">
            {loading ? '-' : metrics?.total_unavailable_products || 0}
          </div>
          <span className="text-[10px] text-zinc-400 block">Stok kosong di katalog</span>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-medium text-zinc-500">Permintaan WA</span>
            <MessageSquare size={16} />
          </div>
          <div className="text-xl font-bold text-zinc-900">
            {loading ? '-' : metrics?.pending_checkout_requests || 0}
          </div>
          <span className="text-[10px] text-zinc-400 block">Belum dikonversi ke pesanan</span>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-medium text-zinc-500">Pesanan Sah</span>
            <ShoppingBag size={16} />
          </div>
          <div className="text-xl font-bold text-zinc-900">
            {loading ? '-' : metrics?.confirmed_orders_count || 0}
          </div>
          <span className="text-[10px] text-zinc-400 block">Dikonfirmasi oleh admin</span>
        </div>
      </div>

      {/* Revenue Audit Verification Card */}
      <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-2 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Pendapatan Sah Terverifikasi
          </span>
          <CircleDollarSign size={18} className="text-zinc-400" />
        </div>
        <div className="text-2xl font-bold text-zinc-900">
          {loading ? '-' : formatRupiah(metrics?.verified_revenue_idr || 0)}
        </div>
        <p className="text-[11px] text-zinc-500 leading-relaxed pt-1 border-t border-zinc-100">
          {metrics?.revenue_basis ||
            'Omzet hanya menghitung pesanan berstatus paid atau completed. Percobaan klik WhatsApp tidak dihitung sebagai omzet.'}
        </p>
      </div>

      {/* Quick Action Shortcuts */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-700">
          Aksi Cepat Operasional
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => onNavigate('/admin/harga')}
            className="p-4 bg-white border border-zinc-200 hover:border-zinc-900 rounded-xl text-left transition-all group flex items-center justify-between shadow-2xs"
          >
            <div>
              <span className="text-sm font-semibold text-zinc-900 block">Ubah Harga Jual</span>
              <span className="text-xs text-zinc-500 block mt-0.5">Spreadsheet & audit riwayat</span>
            </div>
            <ArrowRight size={16} className="text-zinc-400 group-hover:text-zinc-900 transition-colors" />
          </button>

          <button
            onClick={() => onNavigate('/admin/permintaan')}
            className="p-4 bg-white border border-zinc-200 hover:border-zinc-900 rounded-xl text-left transition-all group flex items-center justify-between shadow-2xs"
          >
            <div>
              <span className="text-sm font-semibold text-zinc-900 block">Daftar Permintaan WA</span>
              <span className="text-xs text-zinc-500 block mt-0.5">Konversi ke pesanan resmi</span>
            </div>
            <ArrowRight size={16} className="text-zinc-400 group-hover:text-zinc-900 transition-colors" />
          </button>

          <button
            onClick={() => onNavigate('/admin/import')}
            className="p-4 bg-white border border-zinc-200 hover:border-zinc-900 rounded-xl text-left transition-all group flex items-center justify-between shadow-2xs"
          >
            <div>
              <span className="text-sm font-semibold text-zinc-900 block">Impor File CSV</span>
              <span className="text-xs text-zinc-500 block mt-0.5">Preview diff sebelum commit</span>
            </div>
            <ArrowRight size={16} className="text-zinc-400 group-hover:text-zinc-900 transition-colors" />
          </button>
        </div>
      </div>
    </div>
  );
};
