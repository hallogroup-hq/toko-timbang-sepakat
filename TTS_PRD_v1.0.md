# TOKO TIMBANG SEPAKAT — PRODUCT REQUIREMENTS DOCUMENT (PRD)
**Versi:** 1.0 | **Tanggal:** 12 Oktober 2026 | **Status:** Implementation-ready baseline; tetap dapat direvisi via change log
**Relasi dokumen:** `TTS_ERD_Database_Spec_v1.0.md`, `TTS_UX_Spec_v1.0.md`, `TTS_Antigravity_Master_Prompt.md`, `TTS_Katalog_Awal_94_Produk.csv`, dan blueprint v0.1.

> **Tujuan:** Bangun web app belanja bahan baku B2B-first untuk coffee shop/kafe/F&B; tetap menerima pembeli individu. Pelanggan menyusun keranjang dan mengirim pesanan terformat ke WhatsApp. Konfirmasi stok, ongkir, pembayaran dan pengiriman dikelola admin lewat chat. **Tidak ada pembayaran online / payment gateway pada MVP.**

## 0. Keputusan final, sumber kebenaran dan kebijakan non-asumsi

1. Nama saat ini **Toko Timbang Sepakat**, sebelumnya **Toko Renjana**. Daftar 94 produk pada gambar **HARGA JUAL TOKO RENJANA** dan harganya benar sebagai harga jual awal, boleh diperbarui dari dashboard.
2. Pelanggan **tanpa wajib login**. Pada checkout: `nama_pembeli` **wajib**, `nama_usaha` **opsional**; keduanya masuk pesan WhatsApp bila ada.
3. Penanganan order lewat **admin WA**, termasuk perubahan barang yang keburu dipesan, stok habis, ongkir, konfirmasi pembayaran dan penyelesaian transaksi. Tidak perlu integrasi logistik/kurir/stock reservation/purchase order saat MVP.
4. **Harga per satuan jual**: `Karton / Pack` dan `Pcs` ditranskripsikan persis sesuai daftar. Tidak menebak apakah karton, pack, dus, atau jumlah isi kemasan; admin nanti bisa memperjelas. `harga kosong` bukan `Rp0` dan **bukan opsi dapat dibeli**.
5. Foto produk akan diupayakan otomatis oleh Antigravity dari sumber publik yang dapat dipakai secara sah, dengan pencocokan produk dan provenance; **jangan mengarang gambar merek/kemasan atau mengambil foto tanpa memeriksa hak penggunaan**. Gambar yang ambigu menjadi placeholder yang jujur, tidak menghambat katalog berfungsi.
6. Logo/branding hanya dari folder **`~/Downloads/TokoTimbangSepakat/Branding`** pada komputer tempat Antigravity bekerja. Folder itu belum diakses pada penyusunan dokumen ini. Jika kosong/hilang/format tidak kompatibel, jangan mengganti dengan desain yang sebelumnya ditolak, gunakan teks brand sementara dan laporkan blocker.
7. Nama dan harga asli jangan 'dibetulkan' otomatis. Salah eja yang tampak, mis. `Davinci Cramel`, adalah bahan review admin, bukan izin mengubah source record.
8. UX **mobile-first, empatik, sederhana**, arah klasik-modern tetapi bukan vintage dekoratif. Prioritaskan task utama: cari bahan, tentukan satuan/jumlah, tambah keranjang, kirim WA.
9. Lingkup bisnis awal tidak ditentukan oleh wilayah/ongkir/minimum order; **hindari aturan yang diada-adakan**. Admin menyelesaikannya di chat.
10. Tidak perlu memasukkan identitas supplier saat ini, meskipun arsitektur menyisakan ruang untuk pertumbuhan.

## 1. Masalah, pelanggan, jobs-to-be-done

**Primary persona:** pemilik coffee shop, purchasing, kepala barista, pengelola kafe/restoran/minuman. Kebutuhan: restock cepat, daftar bahan jelas, harga per pcs atau karton, pembelian ulang. **Secondary:** individu membeli bahan baku satuan.

| Job | Penghambat sekarang | Nilai MVP |
|---|---|---|
| Menyiapkan 10–30 item belanja | Chat WA satu demi satu | Cari, tambah cepat, keranjang tunggal |
| Beli bahan campuran ecer/karton | Salah satuan, salah total | Pilihan satuan terpisah dan subtotal benar |
| Mencari bahan tertentu saat sibuk | Browsing panjang di HP | Search cepat, katalog berbasis daftar |
| Mengetahui estimasi biaya | Harus tanya admin dahulu | Subtotal live berdasarkan harga terkini |
| Menghubungi admin | Menyalin nama barang manual | Pesan WA siap kirim termasuk nama pembeli |
| Mengelola perubahan harga | Update item satu per satu | Bulk edit/import dan history harga |

### Objective dan metrik
- **North-star MVP:** pengguna berhasil menyusun keranjang dan membuka WhatsApp dengan pesan yang benar (ini **checkout intent**, bukan omzet).
- **Kualitas:** 100% item/price dari seed terimport sesuai data; tidak ada harga fiktif; subtotal dan pesan selalu selaras.
- **Usability:** pengguna baru dapat menemukan satu produk, menambah ke keranjang dan sampai preview WA di HP tanpa bantuan; pengujian bersama 3–5 orang relevan jika memungkinkan, tanpa mengklaim penelitian formal.
- **Admin:** edit harga dan status produk tidak butuh perubahan kode.
- **Metrik yang tidak boleh dipalsukan:** `checkout intent`, `WA open click`, `confirmed order`, `paid`, `completed` dipisah; klik WA tidak membuktikan pesan terkirim.

## 2. Ruang lingkup / bukan ruang lingkup

### P0 — wajib sebelum dipakai pelanggan
- Halaman beranda sederhana, katalog kategori/filter/pencarian, detail produk minimal, keranjang persisten, checkout guest nama wajib, preview pesan, link WA click-to-chat, fallback copy pesan.
- Harga per opsi jual yang aktif; verifikasi server saat checkout; refresh keranjang saat harga/produk berubah.
- Panel admin dengan login aman, katalog CRUD, satuan, SKU, kategori, gambar, harga, status tersedia/tidak tersedia/perlu konfirmasi, edit satuan/harga, nomor WhatsApp, data import/export, audit harga.
- Import dari `TTS_Katalog_Awal_94_Produk.csv` tanpa menebak field kosong, serta proses review data.
- Checkout intent dan order manual, pencatatan order yang telah benar-benar dikonfirmasi di WA; statistik terpisah.
- Pipeline otomatis **discovery + verifikasi + pencatatan asal foto produk**; image queue untuk kasus tidak pasti; tampilkan placeholder bila belum tersedia.
- QA dan keamanan minimum, mobile accessible, deployment preview + production **hanya setelah persetujuan owner**.

### P1 — penambahan setelah MVP stabil
- `Beli Lagi`/daftar belanja terakhir pada browser yang sama; daftar favorit lokal, bulk edit UX lebih kaya, recurring import diff, histori pelanggan opsional, unduh daftar harga, admin shortcut mobile.
- Jika cost hampir nol dan tidak mengganggu P0, sebagian P1 dapat ikut, tetapi **jangan menunda launching gara-gara P1**.

### P2 — tidak untuk sekarang
- Akun wajib pelanggan, pembayaran online, multi-warehouse, POS, wholesale contract pricing, live shipping API, stok antar-cabang, route delivery, sync WhatsApp Business API, CRM automation, supplier purchase order, retur kompleks, loyalty.

## 3. Sitemap dan navigasi

| Route | Visibility | Tujuan dan state |
|---|---|---|
| `/` | publik | Brand, search di atas fold, kategori, produk mudah dibeli, cara pesan singkat |
| `/produk` | publik | Daftar dapat dicari/filter/sort dengan parameter URL yang stabil |
| `/produk/:slug` | publik | Detail singkat, image/placeholder, harga per opsi, quantity, tambah |
| `/keranjang` | publik | Edit/remove/multiple satuan, subtotal, CTA checkout |
| `/checkout` | publik | Nama pembeli wajib, nama usaha opsional, preview, submit intent & WA |
| `/informasi` | publik | Cara pesan, kontak & info kebijakan realistis tanpa janji palsu |
| `/admin/login` | privat | Login admin |
| `/admin` | privat | Ringkasan operasional tanpa omset dari klik WA |
| `/admin/produk` | privat | List/filter/create/edit/archive/toggle availability |
| `/admin/kategori` | privat | CRUD kategori & urutan |
| `/admin/harga` | privat | Edit harga massal & history |
| `/admin/import` | privat | Upload, preview diff, konfirmasi & laporan batch |
| `/admin/foto` | privat | Review image candidates / provenance / upload |
| `/admin/permintaan` | privat | Checkout intent; belum dianggap order |
| `/admin/pesanan` | privat | Order terkonfirmasi & manual order |
| `/admin/pengaturan` | privat | Nomor WA, copy informasi toko, logo path/publikasi aset, role |

**Navigation mobile:** Beranda, Katalog, Keranjang; tambahan Informasi di menu. Jangan menampilkan menu Akun Pelanggan jika tidak diimplementasikan. Header sederhana dengan identitas brand, search, keranjang. Mobile tab menu hanya item yang benar-benar fungsional.

## 4. Functional requirements, priority dan acceptance

### FR-CAT — katalog dan pencarian
- **FR-CAT-01** Import 94 source rows; preservasi `source_row`, `source_key`, nama asli, dua kolom harga, raw category/pack metadata, dan audit import.
- **FR-CAT-02** Admin dapat edit nama display, source alias (tanpa menghapus nama asal), brand nullable, kategori, deskripsi nullable, foto, SKU nullable, opsi satuan/harga, urutan dan status publikasi.
- **FR-CAT-03** Search case-insensitive pada nama, merek, alias; toleransi spasi, tanda baca, aksen sederhana. Produk tidak aktif tidak muncul publik.
- **FR-CAT-04** Filter kategori, sortir alfabetis/harga jika jelas unitnya; sort harga dengan dua unit berbeda **tidak boleh menyesatkan**. Default relevansi/abjad, sort harga di dalam satu unit bila diterapkan.
- **FR-CAT-05** Item yang belum punya foto = placeholder produk netral; tidak membuat AI-fake packaging. Label unit berasal dari opsi yang benar-benar ada.
- **FR-CAT-06** Availability: `ask_admin` (default), `available` (hanya bila admin yakin), `unavailable`; ketika unavailable, CTA tambah dinonaktifkan dengan copy `Sedang tidak tersedia`. Jangan menampilkan jumlah stok tanpa data.
- **Acceptance:** cari `Trieste Vanilla` dan temukan entri asli; `Greenfield` tidak digabung dengan `Greenfield UHT`; produk dengan hanya satu harga hanya punya satu opsi; produk unavailable tidak dapat ditambahkan; brand/size tidak ditambahkan dari dugaan.

### FR-PRICE — satuan, harga, aritmetika
- **FR-PRICE-01** Opsi harga tersimpan sebagai integer rupiah, minimal satu opsi valid untuk publikasi; opsi kosong tidak muncul dan tidak berubah menjadi nol.
- **FR-PRICE-02** Label awal berupa `Karton / Pack` dan/atau `Pcs` sesuai kolom sumber; admin boleh mengganti menjadi `Karton`, `Dus`, dll setelah verifikasi. Isi kemasan nullable; jangan hitung harga per pcs dari pack tanpa `pack_quantity` tervalidasi.
- **FR-PRICE-03** Kuantitas bilangan bulat positif; input numerik langsung, batas untuk mencegah penyalahgunaan, tombol +/−; validasi server authoritative.
- **FR-PRICE-04** Keranjang dapat memuat produk sama dalam opsi satuan berbeda, masing-masing line terpisah; total adalah penjumlahan qty × unit_price_idr yang masih valid.
- **FR-PRICE-05** Semua edit harga menyimpan `old`, `new`, `actor`, `timestamp`, `reason` opsional, `source import batch` jika relevan.
- **FR-PRICE-06** Saat checkout server memvalidasi ulang harga; jika ada perubahan, frontend harus menampilkan perubahan lama → baru dan meminta konfirmasi explicit. Tidak boleh mengirim WA dengan harga usang diam-diam.
- **Acceptance:** Greenfield UHT **2 × Rp240.000** (opsi source Karton / Pack) dan Trieste Vanilla **3 × Rp75.000** (Pcs) = **Rp705.000**. Jika harga berubah setelah cart, subtotal dan pesan sinkron hanya setelah user menerima update.

### FR-CART — keranjang
- **FR-CART-01** Keranjang lokal per browser persisten melalui reload/tutup tab; tanpa login dan tanpa sinkronisasi lintas perangkat.
- **FR-CART-02** Tambah item tidak memaksa masuk halaman keranjang; feedback kecil + jumlah badge + toast singkat yang tidak menutup kontrol.
- **FR-CART-03** Edit qty, hapus line, kosongkan dengan konfirmasi; subtotal jelas; ongkir `Dikonfirmasi admin`.
- **FR-CART-04** Line unavailable atau opsi nonaktif setelah cart tersimpan = tampil warning dan minta hapus/ubah sebelum submit checkout.
- **FR-CART-05** Setelah kembali dari WA, cart **tidak otomatis dikosongkan**, karena membuka WA tidak sama dengan mengirim pesan.
- **Acceptance:** cart tetap setelah reload; penambahan varian opsi tidak mengubah harga opsi lain; tidak ada klaim `order berhasil` di sini.

### FR-WA — checkout via WhatsApp
- **FR-WA-01** Nama Pembeli `trim` panjang 2–100 karakter wajib; nama usaha opsional 0–120 karakter; proteksi HTML/script/control characters untuk penyajian dan batas maksimum teks, tanpa menghilangkan nama sah. Jangan meminta nomor HP/email/alamat untuk MVP.
- **FR-WA-02** Preview final menampilkan nama, nama usaha bila diisi, referensi, seluruh list item (nama, satuan, kuantitas, harga satuan, subtotal line), subtotal barang, info ongkir belum dihitung, permintaan konfirmasi.
- **FR-WA-03** Setelah validasi server, buat `checkout_intent` bersnapshot, referensi publik acak/unik, `status=created` (bukan order/paid/sent).
- **FR-WA-04** Bangun `https://wa.me/{international-number}?text={encodeURIComponent(message)}` dengan nomor admin dari settings. Link hanya membuka draft chat, tidak mengirim otomatis.
- **FR-WA-05** Sediakan `Salin rincian pesanan` dan opsi buka chat tanpa prefilling bila tautan gagal atau URL terlalu panjang. Untuk pesan panjang, jangan potong daftar barang diam-diam; user harus tetap bisa menyalin seluruh teks.
- **FR-WA-06** Double tap/multiple retry menggunakan checkout token/idempotency key; server tidak menghasilkan intent duplikat untuk satu aksi retry.
- **FR-WA-07** Jika opsi produk berubah/stock flag unavailable/harga update → minta koreksi sebelum membuat checkout intent.
- **Acceptance:** nama usaha kosong tidak mencetak label `Nama Toko`; pesan tidak kehilangan line; klik dua kali tidak membuat 2 intent; keranjang tetap utuh; pesan WA akurat; WA route tidak membutuhkan API berbayar.

### FR-ADMIN — dashboard, keamanan, order admin
- **FR-ADMIN-01** Admin owner login melalui credentials yang di-bootstrap aman tanpa registrasi admin publik; password hash aman, session `HttpOnly`, `Secure`, `SameSite=Lax/Strict`, CSRF protection, retry throttling, logout dan timeout.
- **FR-ADMIN-02** Dashboard menu sederhana: Katalog, Harga, Impor, Foto Produk, Permintaan, Pesanan, Pengaturan. Role awal `owner` dan `staff` (opsional staff bisa deferred, tetapi backend authorization siap).
- **FR-ADMIN-03** CRUD item/opsi/category serta state `draft/published/archived`, availability terpisah. Soft archive untuk produk yang punya order history.
- **FR-ADMIN-04** Edit inline harga untuk produk tunggal, bulk preview, import Excel/CSV bertahap, export CSV UTF-8. Import tidak menimpa tanpa preview dan konfirmasi.
- **FR-ADMIN-05** Intent `created` ditampilkan sebagai **belum terverifikasi di WA**. Admin dapat convert → official order, arsipkan tanpa konversi, atau buat order manual dari chat langsung. Tidak ada state `WA terkirim` yang diklaim otomatis.
- **FR-ADMIN-06** Official order: simpan snapshots line, total barang, ongkir opsional, penyesuaian harga/item yang disepakati manual, status `confirmed / awaiting_payment / paid / preparing / completed / cancelled` sesuai operasi nyata. Gunakan `order notes` dan `audit` untuk perubahan.
- **FR-ADMIN-07** Settings nomor WhatsApp (format internasional tanpa +/spasi) harus dapat diuji lewat tombol `Uji buka chat`, nama brand, teks layanan dan kontak.
- **FR-ADMIN-08** Admin order dashboard **tidak menghitung intent sebagai omzet**. Omzet berdasarkan definisi `completed` atau `paid` yang diberi label eksplisit.
- **Acceptance:** ubah harga Greenfield UHT di admin → katalog publik memuat nilai baru; historical confirmed order tidak berubah; `created` intent tidak masuk laporan penjualan; URL admin tidak bisa diakses tanpa sesi valid.

### FR-IMPORT — tata kelola 94 produk & harga berubah
- **FR-IMPORT-01** Import initial seed idempotent menggunakan `source_key` RENJANA-001..094; row original dapat ditelusuri, original columns tersimpan; jangan overwrite edit admin pada seed replay.
- **FR-IMPORT-02** CSV/Excel mapping: dukung header saat data baru masuk; parse IDR `280.000`, `Rp 280.000`, `280000`, blank; ambiguitas diberi peringatan.
- **FR-IMPORT-03** Match update: canonical internal ID / sku yang unik / exported `source_key`; match nama saja **tidak diizinkan untuk auto-overwrite**; beri review manual untuk collision.
- **FR-IMPORT-04** Lihat preview `baru/berubah/tidak berubah/error`, nilai lama→baru, pilihan commit atomik; hasil batch dapat diunduh termasuk row gagal.
- **FR-IMPORT-05** Rollback: snapshot/backup sebelum bulk mutation dan dokumentasikan prosedur restore; simpan transaction + change history.
- **Acceptance:** 94 source entries semuanya muncul dalam import audit dengan 0 silent drop; update baris satu tidak mengubah item lain; impor ulang sumber awal tidak mengembalikan harga admin ke harga lama.

### FR-IMAGE — discovery/crawl gambar produk
- **FR-IMAGE-01** CLI/job `images:discover` baca katalog dari DB/seed, cari kandidat secara bertahap dari website resmi brand/produsen, distributor dengan hak penggunaan yang jelas, atau image asset berlisensi sesuai penggunaan komersial.
- **FR-IMAGE-02** Pencarian per kandidat memakai **nama/brand/varian/volume/packaging** yang diketahui. Jangan menebak `brand`, `volume` atau varian untuk produk generik. Jangan gunakan hasil foto AI sebagai ganti foto kemasan.
- **FR-IMAGE-03** Catat URL halaman sumber, URL file asal, nama brand/site, tanggal temuan, status hak (`owned/permitted/licensed/unknown/rejected`), confidence match, alasan match dan dimensi gambar.
- **FR-IMAGE-04** Jangan melewati robots.txt, login, captcha, paywall, larangan download, atau batas rate. **Hasil Google Images hanya petunjuk penemuan, bukan lisensi komersial.** Jika hak tidak jelas, simpan kandidat untuk review, **jangan publikasikan**.
- **FR-IMAGE-05** Matching dapat *auto-approve* hanya ketika hak terverifikasi **dan** identitas produk (merek/varian/ukuran/kemasan) lengkap cocok menurut aturan ketat. Label `Susu F&N`, `Oatside`, `Matcha`, dll tetap memerlukan verifikasi varian/ukuran sebelum foto produk disetujui; nama `FN` dan `Outside` dari gambar sumber sudah dikoreksi sesuai konfirmasi pemilik.
- **FR-IMAGE-06** Foto terpilih dinormalisasi jadi format dan ukuran web (WebP/AVIF bila sesuai), tanpa crop yang mengubah produk/label; thumbnail dan full image; simpan file milik toko secara legal (jangan hotlink tanpa izin) dengan alt text informatif.
- **FR-IMAGE-07** Admin bisa ganti, upload manual, re-run scan, approve/reject kandidat, dan melihat file source. Placeholder netral saat foto belum ada, tanpa menghalangi jualan.
- **Acceptance:** tidak ada foto yang salah varian dipublikasikan otomatis; setiap foto terpublikasi mempunyai provenance + izin penggunaan; dapat run ulang tanpa menduplikasi; katalog tetap berfungsi saat sebagian foto kosong.

### FR-BRAND — lokal logo dan asset
- **FR-BRAND-01** Saat Antigravity implementasi lokal: inventaris `~/Downloads/TokoTimbangSepakat/Branding`, identifikasi versi yang benar dari file aktual (SVG/PNG/WebP atau lainnya), import/copy ke project asset pipeline, pertahankan rasio.
- **FR-BRAND-02** Brand name `TOKO TIMBANG SEPAKAT` tampil jelas. Jika folder tidak tersedia atau ada banyak kandidat yang tidak dapat ditentukan, **stop hanya pada gate branding** dan tampilkan daftar file untuk keputusan, sambil teruskan bagian teknis independen. Jangan generate logo baru.
- **FR-BRAND-03** Jangan mengunci warna hanya berdasarkan output logo yang pernah ditolak. UI klasik-modern dengan readability dan kepemimpinan konten.
- **Acceptance:** logo terlihat tajam di HP kecil, desktop, favicon bila ada asetnya, tanpa stretching; tidak memakai aset eksperimen yang ditolak.

## 5. Business rules terpusat

| ID | Rule |
|---|---|
| BR-01 | `subtotal_idr = Σ(quantity × price_idr)` integer; tidak ada pajak/discount/ongkir otomatis tanpa kebijakan eksplisit |
| BR-02 | Kartu dan checkout menggunakan **sellable_option_id**, bukan hanya product_id |
| BR-03 | Admin dapat mark `unavailable`; buyer tak dapat checkout opsi unavailable baru; order sebelumnya ditangani di WA |
| BR-04 | `checkout_intent` ≠ verified order; WA click tidak menjamin kirim |
| BR-05 | Perubahan harga tidak mengubah snapshot intent/order lama |
| BR-06 | Data input user hanya untuk komunikasi & pencatatan internal; jangan publikasikan nama pelanggan |
| BR-07 | URL/cart tidak menyimpan nama pembeli dalam query string; kirim POST API checkout |
| BR-08 | Semua item sumber 94 harus terlacak; 106 sel harga berisi angka pada screenshot source (35 kolom Karton/Pack + 71 kolom Pcs) |
| BR-09 | Tidak ada foto yang benar-benar identik = tidak ada foto; placeholder diperbolehkan |
| BR-10 | Tidak ada akun pelanggan berarti tidak janji fitur riwayat/pesanan lintas perangkat |

## 6. Nonfunctional requirements

**Security & privacy**
- Server-side validation untuk qty, prices, product state, WA target, order payload; prepared SQL queries, no trust client subtotals. CSRF protection untuk admin mutations, anti-enumeration, rate limit public POST checkout & login. XSS-safe display dan copy. Media upload check MIME/signature/size, sanitize SVG atau tolak SVG upload publik, storage permissions.
- Session admin token tak tersimpan di localStorage; password bcrypt/argon2id oleh adapter yang kompatibel runtime, bukan homegrown crypto. Secret di environment; jangan commit .env. Admin audit prices/settings. Error response tidak bocor stack/PII.
- Pengumpulan data hanya nama pembeli & nama usaha opsional saat checkout; kebijakan privasi singkat; retensi checkout intent belum terverifikasi misalnya **90 hari (default rancangan, admin-configurable)** lalu hapus/anonymize sesuai kebutuhan hukum. Jangan mengandalkan analytics invasif.

**Performance & accessibility**
- Mobile 360, 375, 390, 430 CSS px, tablet 768, desktop 1280+; no horizontal overflow; touch targets ideal **44x44 CSS px** untuk kontrol aksi; body normal minimal 16px pada form.
- Lazy-load image, ukuran file kecil, responsive image sets; skeleton tidak menggeser layout. Search responsif, pagination/load more alih-alih render semua berat.
- Keyboard navigation, focus visible, semantic buttons/labels, validation announced, color contrast minimal WCAG 2.2 AA sebisa mungkin; jangan mengandalkan warna saja.
- Offline bukan syarat; saat jaringan gagal tampil informasi serta retry dan cart aman. Layout mobile harus tetap usable dengan keyboard terbuka.

**Reliability & ops**
- DB migrations versioned, seed idempotent, export/backup & restore drill, preview deployment, errors monitored, launch checklist. Semua error backend harus menghasilkan respons pemulihan; UI tidak boleh diam.
- `No vendor lock-in as goal`, bukan klaim otomatis portable; data model dan queries dipisahkan dari handlers melalui repository/services, dokumentasi migrasi dari D1 SQLite ke PostgreSQL di masa depan.

## 7. Rekomendasi implementasi teknis, terukur biaya

**Usulan, bukan mandat keras jika repo eksisting punya stack yang lebih baik:** React + TypeScript + Vite frontend, Hono di Cloudflare Workers, Cloudflare D1 (SQLite) via Drizzle ORM, static assets Cloudflare Workers; gambar legal hasil pipeline disimpan sebagai **assets proyek** pada MVP (94 produk masih ringan) dan desain abstract storage adapter untuk opsi R2/object storage ketika admin upload diperlukan. Image upload dinamis butuh penyimpanan persisten: jika belum ada bucket, nonaktifkan upload admin dengan pesan jelas dan tetap izinkan memilih image dari asset repositori; atau siapkan R2 gratis jika persyaratan akun terpenuhi. Jangan menyimpan binary image di D1.

**Alasan:** Workers Free + D1 dapat berbiaya awal rendah, tetapi **bukan janji biaya nol selamanya**. Kuota gratis punya batas harian dan layanan bisa berhenti saat limit tercapai. Verifikasi persyaratan aktivasi, harga dan layanan saat deployment.

Docs utama:
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/d1/platform/pricing/
- https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/
- https://faq.whatsapp.com/5913398998672934
- https://developers.google.com/search/docs/appearance/structured-data/image-license-metadata?hl=id

## 8. API contract (minimal)

| Endpoint | Method | Role | Body / output ringkas |
|---|---|---|---|
| `/api/catalog` | GET | public | `q, category, cursor, limit` → products published+option prices+approved image |
| `/api/products/:slug` | GET | public | product detail + only active options |
| `/api/checkout/preview` | POST | public | cart `option_id + qty`, buyer name, business name → validation/reprice preview & change warnings; no intent yet |
| `/api/checkout/intents` | POST | public | confirmed preview + idempotency key → intent ref, canonical message, WA URL |
| `/api/admin/session` | POST | public throttled | login user → secure cookie session |
| `/api/admin/session` | DELETE | admin | logout |
| `/api/admin/products` | GET/POST | admin | paginated catalog / create |
| `/api/admin/products/:id` | PATCH | admin | optimistic concurrency on `updated_at/version` |
| `/api/admin/options/:id/price` | PATCH | admin | price with reason+version; append price_change |
| `/api/admin/imports` | POST | admin | upload / parse / preview batch; **no commit yet** |
| `/api/admin/imports/:id/commit` | POST | admin | commit checked diff transactionally |
| `/api/admin/images/candidates` | GET | admin | filter unmatched/review candidates |
| `/api/admin/images/:id/approve` | POST | admin | permission & match checks |
| `/api/admin/intents` | GET | admin | created/opened-unverified intents |
| `/api/admin/orders` | GET/POST | admin | confirmed/manual orders |
| `/api/admin/orders/:id` | PATCH | admin | status/update with audit and version |
| `/api/admin/settings` | GET/PATCH | admin | WA settings + copy |

Error model: `{code, message, fields?, retryable?, request_id}`; `409` for stale price/cart/version, `422` validation, `401/403` admin, `429` rate limits. Never echo private DB internals.

## 9. Data migration & initial import decision

1. `source_key` stable `RENJANA-001`...`RENJANA-094` untuk asal, **bukan SKU jual**.
2. CSV berisi 94 baris dan harga sesuai tabel gambar, hasil transkripsi; saat implementasi, **bandingkan kembali dengan gambar sumber sebelum publish**. Identitas supplier/pack count/category/foto dibiarkan kosong sampai valid.
3. Create 1 `product` per source row, 1 `sellable_option` per kolom harga yang berisi angka; total awal 94 product dan 106 sellable options, dibuktikan test.
4. `Karton / Pack` adalah **label sumber generik** dan `Pcs` sesuai spreadsheet; jangan membuat konversi isi sendiri. Tampilkan label itu sampai diubah admin.
5. Kategori dibentuk dari taksonomi navigasi dan pemetaan yang dapat diedit; staging `uncategorized` boleh, dilarang mengubah identitas produk karena dugaan kategori.
6. Tinjau outlier `Susu F&N`, `Dairy Champ Evaporasi`, `Equil Natural 760 ml Carton`, `Beras` dan nama ambigu lainnya tetapi tetap simpan harga sesuai sumber sampai admin mengubah.

## 10. Gate-based delivery dan bukti

| Gate | Deliverable | PASS criteria |
|---|---|---|
| G0 | Repo baseline + brand path inventory + database plan | Folder branding diinventaris/absen dilaporkan; tidak ada asumsi tersembunyi; stack disepakati via project defaults |
| G1 | Schema, migrations, seed & provenance | **94 products / 106 sellable options**, source fidelity audit lulus, price arithmetic test lulus |
| G2 | Admin auth + CRUD + import/export | Security test; admin bisa edit semua; price snapshot tidak mutable; import idempotent |
| G3 | Image discovery pipeline | Candidate report per 94 produk; hanya exact+licensed/permitted yang publish; tidak ada substitusi salah varian |
| G4 | Mobile storefront & catalog | Core flow nyaman pada 360/375/390/430; loading/empty/error state ada |
| G5 | Cart, repricing & WhatsApp | Identity form, WA message, qty/packs, fallback, idempotency & all snapshot tests PASS |
| G6 | Admin orders & integrity | Intent bukan omzet; manual order & status audit lulus |
| G7 | UX audit + E2E accessibility/security | Semua P0 end-to-end & keyboard/mobile; tidak ada high/critical issue |
| G8 | Preview/staging deployment | Preview live, smoke tests, backup restore drill; **jangan deploy production tanpa owner consent** |
| G9 | Production release with owner approval | Setelah keputusan owner eksplisit, live domain/WA test, roll-back plan, post-launch QA |

**Per gate:** tulis laporan file `docs/gates/GN-report.md` (perubahan, bukti command/screenshot, hasil tests, blockers, PASS/FAIL). **Hard-stop ketika FAIL** pada ketergantungan gate berikutnya; perbaiki sebelum melanjutkan, jangan menyatakan PASS karena test tidak dijalankan.

## 11. Launch smoke tests (minimum)

- Import 94/106 tanpa produk atau harga fabricated.
- Search `Trieste`, `Greenfield UHT`, `Cup Seal`, `Sanquick` mengembalikan data sesuai sumber.
- Kartu produk dengan opsi harga kosong tidak menampilkan Rp0.
- Tambah 2 opsi Karton/Pack Greenfield UHT @Rp240.000 dan 3 opsi Pcs Trieste Vanilla @Rp75.000 → **Rp705.000** di cart, preview dan WA.
- Nama pembeli kosong ditolak; nama usaha kosong dihapus dari WA; nama diisi masuk dan di-URL-encode.
- Update harga di admin ketika cart masih disimpan → konflik & refresh diterangkan; intent lama tetap menyimpan harga lama.
- Stok unavailable: item tidak dapat checkout baru; bila admin menandai unavailable setelah intent, order lama tidak berubah dan komunikasi lanjut via WA.
- Manually convert intent to order, change order status, add payment/fulfillment notes, metrics don't count intent as revenue.
- Upload/import invalid or ambiguous image fails safely, placeholder still shows.
- Audit responsive, route direct loading, unauthed admin redirect, injection tests, network error fallback, no false WA-sent confirmation.

## 12. Change control

Setiap perubahan requirement utama dicatat pada `docs/decisions.md`: tanggal, keputusan, alasan, dampak UI/DB/API/testing. Jangan implementasikan fitur mahal/kompleks karena dugaan. Jika detail operasional belum tersedia, gunakan default aman + copy jujur + editable settings; eskalasi hanya blocker yang benar-benar menghalangi P0.
