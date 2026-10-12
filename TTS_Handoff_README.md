# TOKO TIMBANG SEPAKAT — DEVELOPMENT HANDOFF
**Versi 1.0 | 12 Oktober 2026**

## Mulai di sini
Paket ini adalah **spesifikasi dan data awal** untuk Antigravity, **belum website yang sudah dibangun**. Buka `TTS_Antigravity_Master_Prompt.md` dan jadikan sebagai instruksi eksekusi utamanya. Sebaiknya seluruh file diekstrak ke folder kerja Antigravity, mis. `<repo>/handoff/TTS/` agar nama referensi tetap sama.

### File dan fungsi
| File | Kegunaan |
|---|---|
| `TTS_Antigravity_Master_Prompt.md` | Instruksi developer agent, gating G0–G9, image discovery, stopping rules |
| `TTS_PRD_v1.0.md` | Persyaratan produk, fitur, operasi, API & batas MVP |
| `TTS_UX_Spec_v1.0.md` | Layar-per-layar, UX HP, microcopy, admin UX, state, aksesibilitas |
| `TTS_ERD_Database_Spec_v1.0.md` | Relasi, state machine, data governance dan price snapshot |
| `TTS_Database_Schema_v1.0.sql` | Baseline SQLite/D1 SQL yang telah diuji sintaks secara lokal |
| `TTS_QA_Acceptance_Matrix_v1.0.md` | Kasus uji dan bukti kelulusan per gate |
| `TTS_Katalog_Awal_94_Produk.csv` | Transkripsi awal 94 produk/harga jual dari data pemilik |
| `c5e7dc29-de87-4b3c-a95d-8010c9df70bc.JPG` | Gambar sumber daftar harga Toko Renjana untuk audit |
| `Toko_Timbang_Sepakat_Product_Architecture_v0.1.md` | Dokumen awal, prioritas di bawah versi 1.0 |

## Hal yang TIDAK perlu diminta lagi kepada pemilik
- Identitas supplier sekarang.
- Sistem ongkir otomatis, alamat pembeli, payment gateway, akun customer wajib.
- Stok real-time atau integrasi kurir. Semua bisa ditangani melalui admin WhatsApp.
- Pemesanan ulang lintas perangkat (baru fase berikut).
- Logo baru. Asset final akan disediakan di **`~/Downloads/TokoTimbangSepakat/Branding`** pada komputer yang menjalankan Antigravity; jika folder kosong, gunakan text fallback dan catat kendala.

## Hal yang ANTIGRAVITY perlu konfigurasi nyata sebelum live
- **Nomor WhatsApp admin** dalam format internasional valid, harus diisi owner lewat secure settings. Jangan menebak nomor.
- Kredensial admin melalui bootstrap aman (bukan seed password sederhana).
- Domain/Cloudflare account kalau memilih deployment online; uji kuota gratis aktual dan minta izin eksplisit sebelum production release.
- Jika pengguna nanti memberi foto produk resmi/izin gambar, gunakan sebagai sumber diutamakan; image search tidak menjamin hak pakai.

## Peringatan source data
- **Toko Renjana = nama lama** dari bisnis Toko Timbang Sepakat. Jangan tulis `Renjana` pada storefront, kecuali provenance internal import; sumber harga tetap valid.
- Harga asli bisa diedit semua di admin, dan histori pesanan tetap snapshot harga lama.
- Koreksi nama resmi dari pemilik sudah diterapkan pada CSV: `FN` → `Susu F&N` (baris sumber 4), `Outside` → `Oatside` (baris sumber 72). Nama seperti `Susu F&N`, `Oatside`, `Greenfield`, `Matcha` masih perlu verifikasi varian/kemasan untuk foto spesifik. Foto salah akan lebih merugikan daripada placeholder.
- `Karton / Pack` adalah kolom harga **bukan konfirmasi ukuran fisik**. Harga sel kosong tidak boleh ditafsirkan sebagai Rp0.
- Dokumen dan data tidak meliputi bukti lisensi foto maupun akses file brand; Antigravity wajib mencari dan melaporkan hasil secara jujur.

## Cara menjalankan tugas di Antigravity
1. Unduh ZIP handoff, ekstrak ke folder kerja. Jangan hanya menempel prompt tanpa companion files.
2. Berikan perintah `TTS_Antigravity_Master_Prompt.md` secara lengkap (atau buka file dan minta Antigravity membacanya). Pastikan file yang dibaca sesuai versi.
3. Minta Antigravity mengikuti quality gates G0–G8 secara otonom, **hanya lanjut jika PASS**, menyimpan laporan di `docs/gates/`.
4. Lihat local preview dan evidensi responsive/mobile; jangan puas hanya dengan klaim selesai.
5. **Jangan deploy production tanpa persetujuan eksplisit.**

## Apa yang sudah dicek dalam pembuatan dokumen
- Validasi teknis offline: skema SQL berhasil dieksekusi di SQLite standar, 18 tabel. Insert dari 94 row CSV menghasilkan 94 produk & 106 opsi (35+71), tidak ada opsi dengan harga 0. Beberapa entri raw diverifikasi sebagai spot check dan subtotal contoh Rp705.000 diuji.
- Belum ada aplikasi, belum crawling katalog foto, belum ada bukti uji UI berjalan, dan belum menyentuh folder Branding lokal pengguna. Semua itu sengaja diserahkan sebagai pekerjaan Antigravity.
