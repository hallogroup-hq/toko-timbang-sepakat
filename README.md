# Toko Timbang Sepakat — Web App

Aplikasi web B2B-first supplier bahan baku kafe, coffee shop, dan usaha F&B untuk **Toko Timbang Sepakat**. Dilengkapi storefront publik responsif mobile-first, kalkulasi pesanan WhatsApp kanonikal, serta dashboard admin back-office untuk manajemen produk, audit histori harga, dan pemrosesan pesanan.

---

## 1. Fitur Utama

### Storefront Publik (Customer-Facing)
- **Katalog Lengkap & Responsif**: Menampilkan 94 produk bahan baku F&B dengan 106 opsi satuan jual (35 Karton/Pack, 71 Pcs).
- **Pencarian Cepat & Filter Kategori**: Pencarian teks instan (debounced) berdasarkan nama produk, SKU, dan kategori.
- **Dukungan Multi-Satuan**: Modal pemilihan satuan (Karton/Pack vs Pcs) langsung dari daftar produk maupun halaman detail.
- **Keranjang Belanja Persisten**: Data keranjang tersimpan di `localStorage` per unit satuan, mendukung pengetikan langsung kuantitas via keyboard numerik mobile.
- **Kalkulasi Server-Authoritative**: Validasi harga server sebelum checkout untuk mencegah manipulasi harga dari sisi client.
- **Checkout WhatsApp Kanonikal**: Form checkout tanpa kewajiban login. Menghasilkan pesan terstruktur dengan kode referensi unik `TS-[8 karakter]`, rincian barang, subtotal, dan fallback salin ke clipboard.

### Dashboard Admin (Back-Office)
- **Autentikasi Aman**: Hash password `scrypt`, sesi token aman di database, proteksi rate-limiting lockout (HTTP 429).
- **Manajemen Produk (CRUD)**: Kelola nama, kategori, status publikasi (`published`/`draft`), dan ketersediaan fisik.
- **Audit Harga**: Ubah harga per opsi satuan dengan pencatatan otomatis di tabel audit `price_changes` (mencatat user, waktu, harga lama, dan harga baru).
- **Import CSV 2-Tahap**: Pratinjau diff sebelum komit dengan validasi tipe data dan penolakan harga kosong.
- **Operasi Pesanan**: Konversi checkout intent menjadi pesanan fisik terkonfirmasi dengan snapshot harga immutable. Catatan audit `order_events` untuk setiap perubahan status dan penyesuaian ongkos kirim.
- **Revenue KPI Terverifikasi**: Hanya menghitung pesanan berstatus `paid` atau `completed` ke dalam omzet. Checkout intent tidak pernah dihitung sebagai penjualan.
- **Antrean Kurasi Gambar**: 94 produk diaudit legalitas dan kecocokan variannya. Gambar yang belum diverifikasi hak pakainya diarahkan ke antrean review admin dan menggunakan ikon SVG netral.

---

## 2. Arsitektur & Teknologi

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Vite.
- **Backend API**: Hono framework berjalan di atas Node.js (`@hono/node-server`).
- **Database**: SQLite lokal via modul bawaan Node.js (`node:sqlite` / `DatabaseSync`), berjalan synchronous dengan WAL mode (`journal_mode = WAL`) dan `foreign_keys = ON`.
- **Pengujian**: Vitest dengan 35 automated test cases lintas 8 test suites.

---

## 3. Persyaratan Sistem

- Node.js versi 22 atau lebih baru (direkomendasikan Node.js 22.x / 24.x / 26.x).
- npm versi 10 atau lebih baru.

---

## 4. Panduan Menjalankan Aplikasi Secara Lokal

### A. Instalasi Dependensi
```bash
npm install
```

### B. Migrasi Skema Database & Seed Data
Jalankan migrasi 18 tabel dan masukkan data awal (94 produk, 106 opsi harga, akun admin default):
```bash
npm run db:migrate
npm run db:seed
```

### C. Menjalankan Server Pengembangan (Dev Mode)
Buka dua terminal atau jalankan secara paralel:
```bash
# Terminal 1: Backend API (port 3000)
npm run dev:server

# Terminal 2: Frontend Vite dev server (port 5173, mem-proxy /api ke port 3000)
npm run dev
```
Akses web app customer di: `http://localhost:5173`
Akses halaman admin di: `http://localhost:5173/admin`

### D. Menjalankan Mode Produksi (Single Port 3000)
```bash
npm run build
npm start
```
Akses storefront dan admin langsung di: `http://localhost:3000`

---

## 5. Kredensial Admin Awal (Bootstrap)

Akun admin bawaan yang dibuat pada saat initial seed:
- **Email**: `admin@tokotimbangsepakat.com`
- **Password**: `AdminTokoSepakat2026!`

> **Catatan Keamanan**: Segera ubah kredensial admin dan nomor WhatsApp toko di halaman **Pengaturan Toko** (`/admin/settings`) setelah proses penyerahan selesai.

---

## 6. Pengujian & Verifikasi Kualitas

Untuk menjalankan seluruh test suite otomatis:
```bash
npm test
```

Untuk memverifikasi kepatuhan tipe TypeScript pada client dan server:
```bash
npm run typecheck
```

Untuk membuat salinan cadangan snapshot database lokal:
```bash
npm run db:backup
```

---

## 7. Status Quality Gates

- **Gate G0**: Workspace, Asset Inventory & Data Source Audit (PASS)
- **Gate G1**: SQLite Schema, Migrations & Idempotent Seed (PASS)
- **Gate G2**: Admin Auth, Product CRUD, Pricing Audit & CSV Import (PASS)
- **Gate G3**: Product Image Discovery & Audit Ledger (PASS)
- **Gate G4**: Mobile-First Customer Catalog & Cart UI (PASS)
- **Gate G5**: Server Checkout & Canonical WhatsApp Integration (PASS)
- **Gate G6**: Admin Order Operations & Revenue KPI Invariants (PASS)
- **Gate G7**: Accessibility, Security, Performance & QA Matrix Verification (PASS)
- **Gate G8**: Local/Staging Handoff Readiness (PASS)
- **Gate G9**: Production Deployment (Menunggu persetujuan pemilik)
