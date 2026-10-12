import React, { useEffect, useState } from 'react';
import { MessageSquare, ShoppingBag, Eye, X } from 'lucide-react';
import { formatRupiah } from '../../lib/format.ts';
import { useToast } from '../../components/Toast.tsx';

export const AdminOrdersPage: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'intents' | 'orders'>('intents');
  const [intents, setIntents] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Detail view modal
  const [activeDetail, setActiveDetail] = useState<any | null>(null);
  const [shippingFeeInput, setShippingFeeInput] = useState<string>('');
  const [statusInput, setStatusInput] = useState<string>('confirmed');
  const [adminNoteInput, setAdminNoteInput] = useState<string>('');
  const [updatingOrder, setUpdatingOrder] = useState(false);

  const loadData = () => {
    setLoading(true);
    if (activeTab === 'intents') {
      fetch('/api/admin/orders/intents')
        .then((r) => r.json())
        .then((res) => {
          if (res.data) setIntents(res.data);
        })
        .finally(() => setLoading(false));
    } else {
      fetch('/api/admin/orders/orders')
        .then((r) => r.json())
        .then((res) => {
          if (res.data) setOrders(res.data);
        })
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const handleConvertIntent = async (intentId: string) => {
    try {
      const res = await fetch(`/api/admin/orders/from-intent/${intentId}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengonversi pesanan.');

      showToast(`Permintaan berhasil dikonversi menjadi pesanan ${data.public_ref}`);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpenOrderDetail = (orderId: string) => {
    fetch(`/api/admin/orders/orders/${orderId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.data) {
          setActiveDetail(res.data);
          setShippingFeeInput(
            res.data.shipping_fee_idr !== null ? String(res.data.shipping_fee_idr) : ''
          );
          setStatusInput(res.data.status);
          setAdminNoteInput(res.data.admin_note || '');
        }
      });
  };

  const handleSaveOrderStatus = async () => {
    if (!activeDetail) return;
    setUpdatingOrder(true);
    try {
      const shippingFee = shippingFeeInput ? parseInt(shippingFeeInput, 10) : null;
      const res = await fetch(`/api/admin/orders/orders/${activeDetail.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: statusInput,
          shipping_fee_idr: shippingFee,
          admin_note: adminNoteInput
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memperbarui pesanan.');

      showToast('Status pesanan berhasil diperbarui.');
      setActiveDetail(null);
      loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdatingOrder(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-900">
          Manajemen Permintaan & Pesanan
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          Kelola pesan checkout WhatsApp yang masuk dan konversi menjadi pesanan resmi toko.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 gap-2">
        <button
          onClick={() => setActiveTab('intents')}
          className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'intents'
              ? 'border-zinc-900 text-zinc-900'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <MessageSquare size={14} />
          <span>Permintaan Checkout WA ({intents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'orders'
              ? 'border-zinc-900 text-zinc-900'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <ShoppingBag size={14} />
          <span>Pesanan Terkonfirmasi ({orders.length})</span>
        </button>
      </div>

      {/* Tab 1: Intents */}
      {activeTab === 'intents' && (
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 text-zinc-500 uppercase tracking-wider font-semibold border-b border-zinc-200">
                <tr>
                  <th className="py-3 px-3.5">Referensi</th>
                  <th className="py-3 px-3.5">Nama Pembeli</th>
                  <th className="py-3 px-3.5">Nama Toko/Usaha</th>
                  <th className="py-3 px-3.5">Subtotal Barang</th>
                  <th className="py-3 px-3.5">Waktu</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-zinc-400">
                      Memuat permintaan...
                    </td>
                  </tr>
                ) : intents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-zinc-400">
                      Belum ada permintaan checkout masuk.
                    </td>
                  </tr>
                ) : (
                  intents.map((it) => (
                    <tr key={it.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="py-3 px-3.5 font-mono font-bold text-zinc-900">
                        {it.public_ref}
                      </td>
                      <td className="py-3 px-3.5 font-semibold text-zinc-900">
                        {it.buyer_name}
                      </td>
                      <td className="py-3 px-3.5 text-zinc-600">
                        {it.business_name || '-'}
                      </td>
                      <td className="py-3 px-3.5 font-medium text-zinc-900">
                        {formatRupiah(it.subtotal_idr)}
                      </td>
                      <td className="py-3 px-3.5 text-zinc-400 text-[11px]">
                        {new Date(it.created_at).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            it.status === 'converted'
                              ? 'bg-zinc-900 text-white'
                              : 'bg-zinc-100 text-zinc-700'
                          }`}
                        >
                          {it.status === 'converted' ? 'Terkonversi' : 'Belum Diverifikasi'}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        {it.status === 'created' && (
                          <button
                            onClick={() => handleConvertIntent(it.id)}
                            className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold transition-colors"
                          >
                            Konversi Pesanan
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Orders */}
      {activeTab === 'orders' && (
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 text-zinc-500 uppercase tracking-wider font-semibold border-b border-zinc-200">
                <tr>
                  <th className="py-3 px-3.5">No. Pesanan</th>
                  <th className="py-3 px-3.5">Nama Pembeli</th>
                  <th className="py-3 px-3.5">Subtotal</th>
                  <th className="py-3 px-3.5">Ongkir</th>
                  <th className="py-3 px-3.5">Total Akhir</th>
                  <th className="py-3 px-3.5">Status</th>
                  <th className="py-3 px-3.5 text-right">Rincian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-zinc-400">
                      Memuat pesanan...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-zinc-400">
                      Belum ada pesanan terkonfirmasi.
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="py-3 px-3.5 font-mono font-bold text-zinc-900">
                        {o.public_ref}
                      </td>
                      <td className="py-3 px-3.5 font-semibold text-zinc-900">
                        {o.buyer_name}
                      </td>
                      <td className="py-3 px-3.5 text-zinc-700">
                        {formatRupiah(o.subtotal_idr)}
                      </td>
                      <td className="py-3 px-3.5 text-zinc-700">
                        {o.shipping_fee_idr !== null ? formatRupiah(o.shipping_fee_idr) : 'Belum diatur'}
                      </td>
                      <td className="py-3 px-3.5 font-bold text-zinc-900">
                        {o.total_idr !== null ? formatRupiah(o.total_idr) : '-'}
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="px-2 py-0.5 bg-zinc-100 rounded text-[11px] font-semibold text-zinc-800">
                          {o.status}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        <button
                          onClick={() => handleOpenOrderDetail(o.id)}
                          className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {activeDetail && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white max-w-lg w-full rounded-2xl p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">
                  Rincian Pesanan {activeDetail.public_ref}
                </h3>
                <span className="text-[11px] text-zinc-500">
                  Pembeli: {activeDetail.buyer_name}
                  {activeDetail.business_name ? ` (${activeDetail.business_name})` : ''}
                </span>
              </div>
              <button
                onClick={() => setActiveDetail(null)}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            {/* Line items snapshot */}
            <div className="space-y-2 text-xs">
              <span className="font-semibold text-zinc-700 block">Daftar Barang (Snapshot):</span>
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl divide-y divide-zinc-100 p-2">
                {activeDetail.lines?.map((l: any) => (
                  <div key={l.id} className="py-1.5 px-2 flex justify-between">
                    <div>
                      <span className="font-semibold text-zinc-900 block">
                        {l.product_name_snapshot} ({l.unit_label_snapshot})
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        {l.qty} × {formatRupiah(l.unit_price_idr)}
                      </span>
                    </div>
                    <span className="font-bold text-zinc-900">
                      {formatRupiah(l.line_subtotal_idr)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Edit Status & Ongkir */}
            <div className="space-y-3 pt-2 border-t border-zinc-100 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Status Pesanan</label>
                  <select
                    value={statusInput}
                    onChange={(e) => setStatusInput(e.target.value)}
                    className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-zinc-900"
                  >
                    <option value="confirmed">Dikonfirmasi (confirmed)</option>
                    <option value="awaiting_payment">Menunggu Pembayaran</option>
                    <option value="paid">Lunas (paid)</option>
                    <option value="preparing">Sedang Disiapkan</option>
                    <option value="completed">Selesai (completed)</option>
                    <option value="cancelled">Dibatalkan</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Ongkos Kirim (Rp)</label>
                  <input
                    type="number"
                    value={shippingFeeInput}
                    onChange={(e) => setShippingFeeInput(e.target.value)}
                    placeholder="Contoh: 15000"
                    className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-zinc-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Catatan Admin</label>
                <textarea
                  rows={2}
                  value={adminNoteInput}
                  onChange={(e) => setAdminNoteInput(e.target.value)}
                  placeholder="Catatan pengiriman atau resi transfer..."
                  className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-zinc-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveDetail(null)}
                  className="px-3 py-1.5 bg-zinc-100 text-zinc-700 font-medium rounded-xl"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handleSaveOrderStatus}
                  disabled={updatingOrder}
                  className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-xl"
                >
                  {updatingOrder ? 'Menyimpan...' : 'Simpan Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
