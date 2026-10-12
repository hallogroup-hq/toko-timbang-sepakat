import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface Props {
  onNavigate: (path: string) => void;
}

export const InfoPage: React.FC<Props> = ({ onNavigate }) => {
  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div>
        <button
          onClick={() => onNavigate('/')}
          className="flex items-center gap-1 text-xs font-semibold text-zinc-600 hover:text-zinc-900 py-1 transition-colors mb-2"
        >
          <ArrowLeft size={16} />
          <span>Kembali ke Beranda</span>
        </button>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
          Informasi & Cara Pemesanan
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 mt-1">
          Panduan ringkas belanja bahan baku di Toko Timbang Sepakat.
        </p>
      </div>

      {/* Tentang Toko */}
      <section className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-3 shadow-2xs">
        <h2 className="text-base font-bold text-zinc-900">Tentang Toko Timbang Sepakat</h2>
        <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
          Toko Timbang Sepakat (sebelumnya dikenal sebagai Toko Renjana) adalah penyedia bahan baku terpercaya untuk coffee shop, kafe, dan pelaku bisnis makanan & minuman (F&B). Kami juga melayani pembelian eceran untuk kebutuhan individu.
        </p>
        <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
          Seluruh produk memiliki harga satuan yang jelas (tersedia pilihan satuan karton/pack atau pcs). Pembelian dilakukan secara langsung tanpa registrasi akun yang rumit.
        </p>
      </section>

      {/* Alur Belanja */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-700">
          Alur Belanja 3 Langkah
        </h2>

        <div className="space-y-3">
          <div className="bg-white border border-zinc-200 rounded-xl p-4 flex gap-3.5 items-start">
            <span className="w-6 h-6 rounded-full bg-zinc-900 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
              1
            </span>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-zinc-900">Pilih Produk & Satuan</h3>
              <p className="text-xs text-zinc-600">
                Gunakan pencarian atau filter kategori untuk menemukan bahan yang dibutuhkan. Tentukan apakah Anda membutuhkan satuan karton/pack atau pcs, lalu atur kuantitas.
              </p>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl p-4 flex gap-3.5 items-start">
            <span className="w-6 h-6 rounded-full bg-zinc-900 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
              2
            </span>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-zinc-900">Periksa Keranjang & Isi Nama</h3>
              <p className="text-xs text-zinc-600">
                Masuk ke halaman checkout. Cukup isi Nama Pembeli dan Nama Usaha (opsional). Sistem secara otomatis menghitung subtotal barang dan merapikan format teks pesanan.
              </p>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl p-4 flex gap-3.5 items-start">
            <span className="w-6 h-6 rounded-full bg-zinc-900 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
              3
            </span>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-zinc-900">Kirim Rincian ke WhatsApp Admin</h3>
              <p className="text-xs text-zinc-600">
                Klik tombol "Pesan Melalui WhatsApp" untuk membuka chat dengan admin. Admin kami akan langsung mengonfirmasi ketersediaan barang fisik, ongkos kirim sesuai lokasi, dan rekening pembayaran.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Ketentuan Transaksi & Privasi */}
      <section className="bg-zinc-100/70 border border-zinc-200/70 rounded-2xl p-5 space-y-3 text-xs text-zinc-600">
        <h2 className="font-bold text-zinc-900 text-sm">Ketentuan Pelayanan</h2>
        <ul className="space-y-2 list-disc list-inside">
          <li>
            Membuka WhatsApp dan membuat rincian pesanan adalah <strong>checkout intent</strong> (belum merupakan transaksi final).
          </li>
          <li>
            Total tagihan final termasuk ongkos kirim disepakati bersama admin di dalam chat WhatsApp sebelum pembayaran dilakukan.
          </li>
          <li>
            Nama yang Anda isi hanya digunakan untuk menyapa dan mempermudah admin memproses daftar belanja Anda. Kami tidak menyimpan data pribadi sensitif tanpa izin.
          </li>
        </ul>
      </section>
    </div>
  );
};
