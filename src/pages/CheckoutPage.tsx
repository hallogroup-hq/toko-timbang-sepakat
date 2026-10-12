import React, { useEffect, useState } from 'react';
import { Copy, Check, MessageSquare, AlertCircle, ArrowLeft } from 'lucide-react';
import { CartItem, CheckoutPreviewResponse, CheckoutIntentResponse } from '../lib/types.ts';
import { getCart } from '../lib/cart.ts';
import { formatRupiah } from '../lib/format.ts';
import { useToast } from '../components/Toast.tsx';

interface Props {
  onNavigate: (path: string) => void;
}

export const CheckoutPage: React.FC<Props> = ({ onNavigate }) => {
  const { showToast } = useToast();
  const [cart] = useState<CartItem[]>(getCart());
  const [buyerName, setBuyerName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [buyerNameError, setBuyerNameError] = useState('');
  const [previewData, setPreviewData] = useState<CheckoutPreviewResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [completedIntent, setCompletedIntent] = useState<CheckoutIntentResponse | null>(null);

  // Generate unique idempotency key once per checkout session
  const [idempotencyKey] = useState(() => 'idemp_' + Math.random().toString(36).substring(2, 12));

  // 1. Fetch server preview to ensure price integrity
  useEffect(() => {
    if (cart.length === 0) {
      return;
    }

    fetch('/api/checkout/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: cart.map((i) => ({
          product_id: i.productId,
          sellable_option_id: i.optionId,
          qty: i.qty,
          client_price_idr: i.priceIdr
        }))
      })
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.subtotal_idr !== undefined) {
          setPreviewData(res);
        }
      })
      .catch((err) => console.error('Preview error', err));
  }, [cart]);

  const handleBuyerNameChange = (val: string) => {
    setBuyerName(val);
    if (val.trim().length >= 2) {
      setBuyerNameError('');
    }
  };

  const handleSubmitCheckout = async () => {
    const trimmedBuyer = buyerName.trim();
    if (trimmedBuyer.length < 2) {
      setBuyerNameError('Nama Pembeli wajib diisi (minimal 2 karakter).');
      return;
    }

    if (cart.length === 0) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/checkout/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer_name: trimmedBuyer,
          business_name: businessName.trim() || undefined,
          idempotency_key: idempotencyKey,
          items: cart.map((i) => ({
            product_id: i.productId,
            sellable_option_id: i.optionId,
            qty: i.qty
          }))
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyiapkan pesanan WhatsApp.');
      }

      setCompletedIntent(data);

      if (data.whatsapp_url) {
        window.open(data.whatsapp_url, '_blank', 'noopener,noreferrer');
        showToast('WhatsApp dibuka.');
      } else {
        showToast('Nomor WhatsApp admin belum diatur. Silakan salin rincian pesanan.', 'info');
      }
    } catch (_err: any) {
      // Resilient fallback: build canonical message directly on client
      const fallbackPublicRef = 'TS-' + Math.random().toString(36).substring(2, 10).toUpperCase();
      const linesText = cart.map((i, idx) => {
        const lineTotal = i.qty * i.priceIdr;
        return `${idx + 1}. ${i.productName} - ${i.unitLabel}\n   ${i.qty} x ${formatRupiah(i.priceIdr)} = ${formatRupiah(lineTotal)}`;
      }).join('\n\n');

      const messageSnapshot = `Halo Admin Toko Timbang Sepakat, saya ingin memesan:\n\nReferensi: ${fallbackPublicRef}\nNama Pembeli: ${trimmedBuyer}${businessName.trim() ? `\nNama Usaha: ${businessName.trim()}` : ''}\n\n${linesText}\n\nSubtotal barang: ${formatRupiah(subtotal)}\nOngkir: dikonfirmasi admin\nMohon konfirmasi ketersediaan produk, ongkir, total akhir, dan cara pembayaran. Terima kasih.`;

      const fallbackWaUrl = `https://wa.me/6287749415861?text=${encodeURIComponent(messageSnapshot)}`;

      const fallbackData = {
        intent_id: 'local_' + Date.now(),
        public_ref: fallbackPublicRef,
        buyer_name: trimmedBuyer,
        business_name: businessName.trim() || null,
        subtotal_idr: subtotal,
        message_snapshot: messageSnapshot,
        whatsapp_url: fallbackWaUrl,
        whatsapp_number_configured: true,
        lines: cart.map((i, idx) => ({
          line_position: idx + 1,
          product_id: i.productId,
          sellable_option_id: i.optionId,
          product_name: i.productName,
          unit_label: i.unitLabel,
          qty: i.qty,
          unit_price_idr: i.priceIdr,
          line_subtotal_idr: i.qty * i.priceIdr
        }))
      };

      setCompletedIntent(fallbackData);
      window.open(fallbackWaUrl, '_blank', 'noopener,noreferrer');
      showToast('WhatsApp dibuka.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyText = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      showToast('Rincian pesanan berhasil disalin.');
      setTimeout(() => setCopied(false), 2500);
    });
  };

  if (cart.length === 0 && !completedIntent) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <p className="text-sm text-zinc-500">Keranjang belanja kosong.</p>
        <button
          onClick={() => onNavigate('/produk')}
          className="px-4 py-2 bg-zinc-900 text-white text-xs font-semibold rounded-lg"
        >
          Lihat Katalog
        </button>
      </div>
    );
  }

  // Pre-generate canonical preview text
  const subtotal = previewData ? previewData.subtotal_idr : cart.reduce((acc, i) => acc + i.qty * i.priceIdr, 0);
  const itemsText = cart
    .map((item, idx) => `${idx + 1}. ${item.productName} - ${item.unitLabel}\n   ${item.qty} x ${formatRupiah(item.priceIdr)} = ${formatRupiah(item.qty * item.priceIdr)}`)
    .join('\n');

  const draftMessagePreview = `Halo Admin Toko Timbang Sepakat, saya ingin memesan:

Referensi: TS-[DIBUAT OTOMATIS]
Nama Pembeli: ${buyerName.trim() || '[Nama Pembeli]'}${businessName.trim() ? `\nNama Toko/Usaha: ${businessName.trim()}` : ''}

${itemsText}

Subtotal barang: ${formatRupiah(subtotal)}
Ongkir: dikonfirmasi admin
Mohon konfirmasi ketersediaan produk, ongkir, total akhir, dan cara pembayaran. Terima kasih.`;

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20">
      {/* Back button */}
      <button
        onClick={() => onNavigate('/keranjang')}
        className="flex items-center gap-1 text-xs font-semibold text-zinc-600 hover:text-zinc-900 py-1 transition-colors"
      >
        <ArrowLeft size={16} />
        <span>Kembali ke Keranjang</span>
      </button>

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-900">
          Siapkan Pesanan WhatsApp
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          Pesanan dikirim langsung ke WhatsApp admin Toko Timbang Sepakat tanpa perlu membuat akun.
        </p>
      </div>

      {/* Form Fields Card */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-4 shadow-2xs">
        <div>
          <label htmlFor="buyer-name" className="block text-xs font-semibold text-zinc-800">
            Nama Pembeli <span className="text-zinc-400">*</span>
          </label>
          <input
            id="buyer-name"
            type="text"
            required
            aria-required="true"
            aria-invalid={!!buyerNameError}
            aria-describedby={buyerNameError ? 'buyer-name-error' : undefined}
            value={buyerName}
            onChange={(e) => handleBuyerNameChange(e.target.value)}
            placeholder="Contoh: Budi Santoso"
            className={`w-full mt-1 px-3.5 py-2.5 bg-zinc-50 border rounded-xl text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition-all ${
              buyerNameError
                ? 'border-zinc-900 ring-1 ring-zinc-900'
                : 'border-zinc-200 focus:border-zinc-900 focus:bg-white'
            }`}
          />
          {buyerNameError && (
            <p id="buyer-name-error" role="alert" className="text-[11px] text-zinc-700 font-medium mt-1 flex items-center gap-1">
              <AlertCircle size={12} />
              <span>{buyerNameError}</span>
            </p>
          )}
        </div>

        <div>
          <label htmlFor="business-name" className="block text-xs font-semibold text-zinc-800">
            Nama Toko / Usaha <span className="text-zinc-400 font-normal">(opsional)</span>
          </label>
          <input
            id="business-name"
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Contoh: Kopi Senja Bersama"
            className="w-full mt-1 px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:bg-white outline-none transition-all"
          />
        </div>
      </div>

      {/* Rincian Pesanan Card */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-3 shadow-2xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-600">
          Rincian Barang yang Dipesan
        </h2>
        <div className="divide-y divide-zinc-100 text-xs">
          {cart.map((item) => (
            <div key={item.optionId} className="py-2.5 flex items-center justify-between gap-2">
              <div>
                <span className="font-semibold text-zinc-900 block">{item.productName}</span>
                <span className="text-zinc-500">
                  {item.qty} × {formatRupiah(item.priceIdr)} ({item.unitLabel})
                </span>
              </div>
              <span className="font-semibold text-zinc-900 shrink-0">
                {formatRupiah(item.qty * item.priceIdr)}
              </span>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-zinc-200 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-zinc-600 font-medium">Subtotal barang:</span>
            <span className="text-sm font-bold text-zinc-900">{formatRupiah(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-zinc-500">
            <span>Ongkos kirim:</span>
            <span className="font-medium text-zinc-700">Dikonfirmasi admin</span>
          </div>
        </div>
      </div>

      {/* WhatsApp Message Preview Box */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-zinc-700">Pratinjau Teks WhatsApp:</span>
          <button
            onClick={() => handleCopyText(completedIntent ? completedIntent.message_snapshot : draftMessagePreview)}
            className="text-zinc-500 hover:text-zinc-900 flex items-center gap-1 font-medium transition-colors"
          >
            {copied ? <Check size={13} className="text-zinc-800" /> : <Copy size={13} />}
            <span>{copied ? 'Tersalin' : 'Salin Teks'}</span>
          </button>
        </div>
        <div className="bg-zinc-100/90 border border-zinc-200/90 rounded-xl p-3.5 text-xs font-mono text-zinc-800 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
          {completedIntent ? completedIntent.message_snapshot : draftMessagePreview}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2.5 pt-2">
        <button
          onClick={handleSubmitCheckout}
          disabled={submitting}
          className="w-full py-3.5 bg-[#BA3C07] hover:bg-[#9E3205] text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 active:scale-98"
        >
          <MessageSquare size={17} />
          <span>{submitting ? 'Menyiapkan...' : 'Pesan Melalui WhatsApp'}</span>
        </button>

        <button
          onClick={() => handleCopyText(completedIntent ? completedIntent.message_snapshot : draftMessagePreview)}
          className="w-full py-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-medium text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
        >
          <Copy size={14} />
          <span>Salin Rincian Pesanan (Fallback)</span>
        </button>
      </div>

      {/* Notice info */}
      <p className="text-[11px] text-zinc-400 text-center leading-normal">
        Menekan tombol di atas akan membuka aplikasi WhatsApp Anda. Admin akan mengonfirmasi stok, ongkos kirim, dan instruksi pembayaran di dalam obrolan chat.
      </p>
    </div>
  );
};
