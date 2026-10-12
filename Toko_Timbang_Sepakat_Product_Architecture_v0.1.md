# TOKO TIMBANG SEPAKAT
## Product Architecture & UX Blueprint — v0.1
**Tanggal:** 12 Oktober 2026  
**Status:** Blueprint konsep untuk review sebelum PRD, ERD, dan implementasi. Bukan spesifikasi implementasi final.

---

## 1. Sumber kebenaran & keputusan yang sudah disepakati

- **Identitas:** Toko Timbang Sepakat (sebelumnya Toko Renjana). Perubahan nama tidak mengubah validitas daftar harga yang sudah diberikan.
- **Model:** B2B-first untuk coffee shop, kafe, usaha minuman, dan F&B; pembeli B2C tetap diterima.
- **Platform awal:** web app responsif, **mobile-first**. PWA adalah opsi setelah kebutuhan inti stabil.
- **Modal:** pengeluaran awal serendah mungkin; tidak membeli stok besar sebagai prasyarat sistem. Supplier telah tersedia, tidak perlu menyebut identitas mereka saat ini.
- **Katalog:** sumber awal adalah gambar daftar 94 baris produk bertajuk *Harga Jual Toko Renjana* dari pemilik. Harga pada daftar itu benar sebagai **harga jual awal**, tetapi **seluruh data katalog dan harga harus dapat diedit admin** kapan saja.
- **Tidak ada payment gateway di MVP.** Pengguna merakit keranjang lalu menuju WhatsApp; stok, ongkir, metode bayar, dan pengiriman dikonfirmasi admin.
- **Guest checkout diperbolehkan:** **Nama Pembeli wajib**; **Nama Toko / Usaha opsional**. Keduanya harus muncul di pesan WhatsApp apabila diisi.
- **Admin dashboard tetap ada**, termasuk manajemen katalog, SKU, satuan jual, harga, riwayat perubahan, pengelolaan permintaan dan pesanan.
- **Arah pengalaman:** klasik-modern yang ringan dan mudah dipahami; jangan menjadikan desain dekoratif, banner panjang, atau foto konseptual sebagai penghalang pembelian. Eksperimen logo sebelumnya tidak diteruskan sebagai keputusan visual.

### Hal yang tidak boleh diasumsikan

Tidak menambahkan produk fiktif atau harga spekulatif. Jangan mengarang isi per dus/karton, berat produk, ketersediaan stok, foto, SKU pemasok, minimum order, ongkos kirim, identitas pemasok, SLA pengiriman, atau tahun berdiri usaha. Jika data belum tersedia, sistem menyimpan status `belum diisi`, bukan menebak.

---

## 2. Masalah pelanggan yang akan diselesaikan

**Pengguna utama:** owner/purchasing/barista yang membeli bahan untuk usaha. Mereka sering mempunyai daftar bahan yang sudah jelas dan ingin memesan ulang atau segera mengisi stok. Pengguna tambahan: pelanggan individu yang membeli sedikit produk.

**Jobs to be done:**
1. "Saya punya daftar belanja; saya ingin menemukannya dan memesan tanpa chat satu per satu."
2. "Saya ingin membedakan harga dan satuan pcs versus karton/pack sebelum memutuskan."
3. "Saya ingin tahu subtotal belanja dan mengirim pesan rapi ke admin tanpa mengetik ulang."
4. "Saya ingin bisa mengubah isi keranjang tanpa kehilangan pekerjaan saya."
5. "Saya ingin mengulang belanja rutin lebih cepat daripada kunjungan pertama."

**Nilai produk:** *pilih bahan, hitung jelas, kirim rapi ke WhatsApp* — bukan marketplace penuh sejak hari pertama.

---

## 3. Arsitektur pengalaman: customer-facing

### 3.1 Information architecture MVP

| Halaman | Tujuan pengguna | Prioritas |
|---|---|---|
| `/` Beranda | Mencari produk, menuju kategori, memulai belanja | Wajib |
| `/produk` Katalog | Daftar produk, search, filter kategori, cepat tambah keranjang | Wajib |
| `/produk/{slug}` Detail | Nama, foto jika tersedia, satuan/harga, jumlah, keterangan | Wajib / layout ringkas |
| `/keranjang` | Mengedit item, satuan, jumlah, subtotal | Wajib |
| `/checkout` | Nama wajib, nama usaha opsional, preview pesan, lanjut WhatsApp | Wajib |
| `/informasi` | Cara memesan, cakupan pengiriman, kebijakan dasar dan kontak | Wajib konten minimal |
| `/admin` | Login admin dan back office | Wajib |
| `/akun`, `/pesanan-saya` | Akun pelanggan lintas perangkat | **Bukan MVP**; siapkan ruang data untuk masa depan |

**Mobile bottom navigation:** Beranda, Katalog, Keranjang. Area akun **jangan ditampilkan** jika fitur akun pelanggan belum nyata; pengaturan/layanan bisa berada di menu. Jangan membuat navigasi semu.

### 3.2 Kerangka layar mobile

**Beranda**: header ringkas brand + keranjang; kolom cari dominan; kategori yang relevan untuk F&B; akses langsung ke produk; daftar produk singkat dan tombol masuk katalog; penjelasan singkat cara memesan. Tidak harus memakai hero bergambar tinggi.

**Katalog**: search persisten, chip kategori, daftar item informatif (nama, harga untuk setiap opsi jual yang tersedia, tombol tambah); filter/sort yang relevan. Di HP, pilih **baris produk** bila informasi harga/satuan terlalu padat untuk grid 2 kolom. Jangan mendahulukan estetika grid di atas keterbacaan.

**Item**: tampilkan pilihan satuan dalam kontrol eksplisit. Jika ada harga per karton dan pcs, label dan nilainya jelas. Jika jumlah isi karton tidak diketahui, **jangan menghitung harga ekuivalen per pcs dari karton**. Input kuantitas menerima angka langsung selain +/-.

**Keranjang**: tiap baris menampilkan nama, opsi satuan, jumlah, harga satuan, subtotal; subtotal semua barang; ongkir ditandai *belum dihitung*. Keranjang bertahan saat halaman ditutup/dibuka ulang di perangkat yang sama jika penyimpanan lokal tersedia.

**Checkout**: form singkat Nama Pembeli (wajib), Nama Toko/Usaha (opsional); preview pesan otomatis; tombol *Pesan melalui WhatsApp*. Konfirmasi via WhatsApp bukan pembayaran otomatis. Sebelum membuat link, sistem validasi ulang harga dan keberlakuan opsi jual.

### 3.3 Detail empati mobile

- Ukuran teks dan area tap yang nyaman; jangan mengandalkan ikon tanpa label untuk aksi utama.
- Keyboard numerik untuk jumlah, bisa ketik `12` langsung (bukan menekan tombol + dua belas kali).
- Setelah tambah barang, konfirmasi singkat plus ringkasan keranjang yang terlihat; tidak harus memunculkan dialog setiap penambahan.
- Tombol lanjut keranjang yang mudah dijangkau saat keranjang berisi barang; tidak menutupi kartu produk.
- Kembali dari detail produk mempertahankan filter, pencarian, dan posisi scroll sebisa mungkin.
- Loading, error jaringan, hasil pencarian kosong, dan barang yang belum punya harga perlu keadaan UI yang jelas serta tindakan berikutnya.
- Jangan mewajibkan login, email, nomor HP, alamat, atau OTP untuk memulai pemesanan jika belum dibutuhkan dalam alur WhatsApp yang disepakati.

### 3.4 Repeat order yang realistis

MVP tanpa login **tidak bisa menjanjikan histori order lintas perangkat**. Opsi yang masuk akal adalah *daftar belanja terakhir pada browser yang sama* (local saved cart/recent lists, berlabel jujur), sementara histori resmi disimpan di admin setelah order dikonfirmasi. Repeat order lintas perangkat memerlukan identitas pelanggan di fase berikutnya.

---

## 4. Aturan katalog, satuan, dan harga

### 4.1 Prinsip data

1. **Product** mewakili satu entri barang nyata. Variasi ukuran/tipe jangan diciptakan otomatis dari nama yang ambigu.
2. **Sellable option** mewakili pilihan jual yang memang memiliki harga, misalnya `pcs`, `pack`, `karton`, atau `dus`. Satu produk boleh memiliki satu atau lebih opsi. *Karton/Pack* dalam spreadsheet awal **belum boleh diinterpretasikan sebagai kedua satuan sekaligus**: unit labelnya harus dapat dikonfirmasi admin.
3. Setiap opsi menyimpan harga jual **dalam IDR integer**, status aktif, dan `pack_quantity` nullable (isi per karton/pack hanya bila diketahui).
4. **Product ID internal immutable** tidak bergantung pada SKU. SKU admin-editable, bersifat opsional pada impor awal, lalu harus unik bila diisi. Jangan membuat SKU pemasok fiktif.
5. **Harga katalog adalah harga terkini; harga dalam riwayat pesanan adalah snapshot.**
6. Tidak ada harga bertingkat berdasarkan volume atau hak istimewa B2B di MVP kecuali datanya/aturannya diberikan. **Harga karton vs pcs** bukan berarti otomatis *quantity tier pricing*.
7. Opsi dengan harga kosong **tidak dapat dipilih**. Jangan memperlakukan kosong sebagai Rp0.
8. Produk dapat disembunyikan tanpa menghapus histori order lama.

### 4.2 Contoh validasi dari daftar yang diberikan

- **Greenfield UHT**: karton/pack Rp240.000 dan pcs Rp20.000 pada tabel; tampilkan sebagai dua **opsi harga sumber**; label akhir karton-vs-pack dan isi per kemasan diperjelas admin bila diperlukan.
- **Trieste Vanilla**: hanya harga pada kolom pcs Rp75.000; jangan menawarkan pilihan karton fiktif.
- **Cup Seal**: harga tercatat Rp49.500 pada kolom pcs; penamaan unit fisik atau isi roll perlu diverifikasi, jangan diubah dari `pcs` tanpa persetujuan.
- **Greenfield** dan **Greenfield UHT** tetap entri terpisah sampai admin menyatakan keduanya satu produk/varian; jangan menggabungkan hanya karena kemiripan nama.
- `Karton / Pack` dan `Pcs` adalah header harga asli; ketika impor, simpan nilai dan penanda sumber; review unit yang ambigu sebelum dipublikasikan.

### 4.3 Operasi harga

**Single edit:** admin dapat mengubah nama, kategori, foto, SKU, opsi dan harga. Validasi harga nonnegatif dan format angka.

**Bulk edit:** tabel produk dengan edit massal terkontrol dan preview *sebelum menyimpan*, menonjolkan produk berubah dan nilai lama → baru.

**CSV/Excel import:** lakukan pemetaan kolom; preview pembuatan/perubahan; deteksi duplikat; pengecekan satuan/harga kosong; konfirmasi eksplisit; transaksi impor atomik atau terlaporkan per baris secara jelas; ekspor katalog. Impor harus memiliki **import batch ID** dan opsi mengunduh hasil baris gagal.

**Identity matching:** jangan matching hanya dari nama produk. Prefer ID internal/SKU yang sudah ada; untuk impor pertama, simpan `source_row_number` sebagai metadata. Jika baris baru tidak dapat dicocokkan aman, tandai untuk review dan jangan diam-diam overwrite item lain.

**Price audit:** catat siapa, kapan, entitas, harga sebelum/sesudah, sumber perubahan (manual/import). Saat checkout, harga diverifikasi ulang di server; apabila berubah saat keranjang dibuat, tampilkan perbandingan dan minta persetujuan pelanggan sebelum lanjut WhatsApp.

---

## 5. Alur pemesanan WhatsApp yang benar

### 5.1 Customer journey

`Katalog → Pilih opsi satuan dan jumlah → Keranjang → Nama pembeli + Nama usaha opsional → Review harga terkini → Buat referensi checkout → Buka WhatsApp → Pelanggan tekan Kirim → Admin konfirmasi manual`.

### 5.2 Contoh format pesan (harga nyata dari daftar awal)

```text
Halo TOKO TIMBANG SEPAKAT, saya ingin memesan:

Referensi: TS-[kode referensi]
Nama Pembeli: Andi
Nama Usaha: Kopi Senja

1. Greenfield UHT — 2 karton/pack x Rp240.000 = Rp480.000
2. Trieste Vanilla — 3 pcs x Rp75.000 = Rp225.000

Subtotal barang: Rp705.000
Ongkir: dikonfirmasi admin

Mohon konfirmasi ketersediaan barang,
biaya pengiriman, dan total pembayaran. Terima kasih.
```

`Andi` dan `Kopi Senja` adalah **contoh identitas pemesan**, bukan data pelanggan nyata. Jika Nama Usaha tidak diisi, hilangkan baris tersebut. Label karton/pack tetap bergantung pada klarifikasi opsi jual pada katalog.

### 5.3 Perilaku teknis & batasan kejujuran

- Bentuk tautan **click-to-chat** WhatsApp dengan parameter teks yang di-*URL encode*. Membuka WhatsApp **tidak otomatis mengirim** pesan.
- Nomor tujuan WhatsApp dapat diganti dari pengaturan admin; simpan nomor format internasional yang valid.
- Web app boleh membuat **checkout intent** dan nomor referensi sebelum membuka WhatsApp; jangan memberi status `pesan terkirim` atau `order berhasil` hanya karena tautan dibuka.
- Bila pengguna menekan tombol dua kali akibat lambat, gunakan **idempotency** atau referensi sama selama satu percobaan, bukan membuat banyak pesanan.
- Setelah kembali dari WhatsApp, keranjang tidak langsung dikosongkan tanpa konfirmasi. Admin bisa menandai checkout menjadi order setelah percakapan terjadi.
- Simpan timestamp dan item snapshot untuk checkout intent, dengan kebijakan retensi yang wajar. Minimalkan data pribadi; identitas pemesan jangan terlihat publik.
- Sediakan aksi **Salin Pesan** jika aplikasi WhatsApp tidak tersedia / tautan gagal.
- Jangan mengasumsikan nomor WhatsApp pembeli bisa didapatkan oleh website tanpa pengguna memasukkannya; admin dapat memeriksa langsung di chat.

---

## 6. Admin operations

### 6.1 Menu MVP

| Modul | Fungsi inti |
|---|---|
| Beranda Admin | Produk aktif, intent baru, order perlu ditindaklanjuti; metrik tidak menyesatkan |
| Katalog | CRUD produk, kategori, foto, status tayang, opsi satuan/harga, SKU |
| Harga & Import | Bulk edit, impor CSV/Excel, preview, audit, ekspor |
| Checkout Intents | Daftar referensi yang dibuat saat menuju WhatsApp; status *belum terverifikasi* |
| Pesanan | Buat/konversi setelah ada konfirmasi chat; ubah status, ongkir, pembayaran, catatan |
| Pelanggan (ringkas) | Identitas yang diketahui, nama usaha jika ada, relasi ke pesanan terkonfirmasi |
| Pengaturan | Nomor WhatsApp, nama usaha, kontak, cakupan layanan, peran admin |

**Supplier management penuh, procurement, POS, multi-gudang, payment gateway, integrasi WhatsApp API, CRM otomatis, harga negosiasi per pelanggan:** **fase lanjut**, bukan prasyarat launching.

### 6.2 Status tanpa data palsu

**Checkout Intent:** `created` → `converted_to_order` atau `abandoned/expired` (berdasarkan tindakan/kebijakan; *tidak ada otomatis bukti WhatsApp terkirim*).

**Order resmi:** `confirmed` → `awaiting_payment` → `paid` → `preparing` → `completed`; dari beberapa status boleh menuju `cancelled` dengan alasan. Alur boleh menangani COD/manual transfer menurut keputusan operasional nantinya; tidak perlu mensimulasikan payment processor.

Semua transisi kritis disimpan beserta aktor dan timestamp. Barang yang tidak tersedia ditangani dengan **penyesuaian order yang disetujui pelanggan**; jangan mengubah harga/kuantitas order secara diam-diam.

**Reporting:** bedakan *checkout intents*, *pesanan terkonfirmasi*, *pesanan dibayar*, dan *penjualan selesai*. Jangan mencatat nilai semua checkout intents sebagai omzet.

### 6.3 Skenario admin manual

Ketika pelanggan datang langsung ke WhatsApp tanpa menggunakan link website, admin tetap bisa **membuat pesanan manual** agar data transaksi terpusat. Admin memilih item katalog dan merekam harga yang disepakati (dengan audit harga khusus bila berbeda), nama pembeli, catatan, ongkir, dan status transaksi. Fitur ini bisa masuk tahap MVP akhir jika terbukti rutin, tetapi model data harus mendukungnya.

---

## 7. Logical domain model (bukan ERD final)

| Entitas | Field penting | Alasan |
|---|---|---|
| `product` | id, name, brand?, category_id?, description?, image?, active, source_ref? | Menyimpan item riil dan status tampilan |
| `sellable_option` | id, product_id, unit_label, pack_count?, sku?, price_idr, active | Satu item, banyak harga per opsi jual |
| `category` | id, name, order, parent_id? | Navigasi kategori |
| `price_change` | id, option_id, old_price, new_price, actor_id, timestamp, source_batch? | Audit perubahan |
| `import_batch` | id, file_name, mapping, status, result_summary, actor_id | Import dengan jejak kualitas |
| `checkout_intent` | id, public_ref, buyer_name, business_name?, subtotal_snapshot, status, created_at | Merekam niat checkout tanpa mengklaim pesan terkirim |
| `checkout_intent_line` | intent_id, product_id?, option_id?, name_snapshot, unit_snapshot, unit_price_snapshot, qty, subtotal | Menjaga rincian walau harga katalog berubah |
| `order` | id, intent_id?, buyer_name, business_name?, status, shipping_fee?, final_total?, timestamps | Order terkonfirmasi dan dikelola manual |
| `order_line` | order_id, item snapshots, agreed_qty, agreed_unit_price | Detail transaksi final tidak tergantung perubahan katalog |
| `admin_user` | id, role, auth data, active | Back office aman |
| `audit_log` | id, actor, action, resource, changed_fields, timestamp | Akuntabilitas perubahan penting |
| `store_settings` | store_name, whatsapp_target, contact, service_info | Operasional yang fleksibel |

**Relasi:** `product` 1:N `sellable_option`; `category` 1:N `product`; `checkout_intent` 1:N `checkout_intent_line`; `checkout_intent` 0..1 `order` (kebijakan konversi jelas); `order` 1:N `order_line`; perubahan harga terhubung ke `sellable_option`.

**Keputusan implementasi belum final:** lokasi penyimpanan cart sementara (browser, dengan validasi server), tingkat normalisasi varian, mekanisme login admin, pilihan hosting/database, dan image storage. Tidak perlu mengunci vendor sebelum PRD menentukan beban dan kebutuhannya.

---

## 8. Scope prioritas: tidak semua fitur harus dibangun sekaligus

### P0 — Harus lolos sebelum launch

1. Katalog asli yang tervalidasi; tampil responsif, bisa dicari dan difilter.
2. Harga per opsi satuan tepat; harga kosong tidak dapat dibeli; quantity dan subtotal benar.
3. Keranjang stabil di HP, tidak mudah hilang; form Nama Pembeli wajib dan Nama Usaha opsional.
4. Preview pesan dan tautan WhatsApp akurat; tanpa klaim pesan dikirim otomatis.
5. Admin terautentikasi dapat edit produk, SKU, harga, status tayang, kategori, serta nomor WhatsApp.
6. Audit minimal perubahan harga; impor awal katalog dengan review per baris dan hasil tervalidasi.
7. Pencatatan checkout intent dan order manual yang tidak mencampur intent dengan penjualan.
8. Pengamanan dasar: otorisasi, validasi server, proteksi input, privasi data pembeli.

### P1 — Setelah MVP stabil atau sebelum perlu skala

Bulk edit yang lebih cepat, import berulang dengan diff yang matang, daftar belanja tersimpan di perangkat, customer order history dengan akun opsional, daftar harga wholesale yang dapat diunduh bila dibutuhkan, dashboard ringkasan order operasional, serta pengalaman order ulang yang mengurangi waktu belanja rutin.

### P2 — Ketika operasional menuntut

Multi-role kompleks, supplier purchase orders, stok real-time dan multi-gudang, pricing kontrak per pelanggan, penjadwalan pengiriman, POS offline, pembayaran otomatis, akun buyer multi-pengguna, integrasi WhatsApp Business API.

---

## 9. Acceptance / quality gates untuk menyiapkan PRD dan nantinya Antigravity

| Gate | Bukti lulus | Stop jika... |
|---|---|---|
| G0 — Data fidelity | Seluruh 94 baris sumber terpetakan; error/ambiguitas masuk daftar review | Ada produk/price fiktif atau baris hilang tanpa laporan |
| G1 — Pricing/unit | Pcs vs karton/pack tidak tertukar, missing price bukan nol, total tepat | Sistem mengasumsikan konversi kemasan tanpa data |
| G2 — Mobile flow | Dari pencarian hingga preview WhatsApp dapat dipakai nyaman di viewport HP | Tombol ketutupan, form berlebihan, total tidak terlihat |
| G3 — WhatsApp truth | Nama wajib, nama usaha opsional; pesan lengkap dan URL encoded | Sistem mengklaim pesan terkirim hanya karena tab WhatsApp dibuka |
| G4 — Admin editing | Edit satuan/SKU/harga dan publikasi berjalan, audit tercatat | Update harga menimpa histori order lama |
| G5 — Import safety | Preview diff, pencocokan identitas, laporkan duplicate/invalid | Spreadsheet diam-diam mengubah produk yang salah |
| G6 — Order integrity | Checkout intent berbeda dari confirmed order; role admin diuji | Dashboard menganggap setiap intent sebagai omzet |
| G7 — Release readiness | Uji jalur utama end-to-end di mobile nyata, error/empty/network cases, backup dasar | Masih ada blocker kritis, fungsi utama rusak, atau data pelanggan terbuka |

**Contoh tes wajib:** pembeli menambahkan 2 karton/pack Greenfield UHT Rp240.000 dan 3 pcs Trieste Vanilla Rp75.000 → subtotal Rp705.000; nama usaha kosong dihilangkan; harga produk kemudian diedit tetapi checkout intent lama tetap menunjukkan snapshot sebelumnya; cart yang belum checkout disinkronkan ke harga baru setelah persetujuan pengguna.

---

## 10. Risiko nyata dan mitigasi

| Risiko | Mitigasi MVP |
|---|---|
| Stok supplier berubah saat pelanggan berbelanja | Jangan menulis `stok tersedia` tanpa bukti; konfirmasi di WhatsApp |
| Admin kewalahan melihat banyak chat | Referensi order pendek, pesan konsisten, dan panel intent/order terpisah |
| Harga berubah sering | Inline edit, preview import, audit, validasi harga sebelum checkout |
| Satuan/foto/nama belum lengkap | Kolom nullable, penanda data kurang lengkap, proses review admin |
| Intent tercatat tapi WA tidak pernah dikirim | Status `created` belum terverifikasi; tidak tercatat sebagai omzet |
| Pengguna HP merasa ribet | Minimal field, list katalog mudah discan, input angka langsung, keranjang persisten |
| Data customer & admin bocor | Minimasi PII, auth/role, validasi backend, rate limit, logging penting |
| Rp0 tidak menutup biaya operasi toko | Hindari komitmen stok/ongkir/auto-payment yang belum disepakati; mulai dari alur manual |

---

## 11. Open decisions (tidak harus dijawab sekaligus)

**Bisnis:** daerah layanan awal; ongkir dan metode penyerahan; minimum pembelian (jika ada); apakah pelanggan bisa preorder saat stok belum pasti; proses substitusi barang/retur.

**Data:** klasifikasi kategori final; nama produk yang masih ambigu; unit fisik pada kolom *Karton/Pack*; konversi isi kemasan; foto produk resmi; apakah butuh SKU pemasok.

**Operasi admin:** berapa admin/staf awal; apakah satu atau beberapa nomor WhatsApp; kapan order dianggap dibayar/selesai; apakah ada daftar harga khusus pelanggan B2B di fase berikutnya.

**Teknis:** pilihan hosting/database yang sesuai dengan biaya, kebutuhan admin file upload, keamanan, dan peluang ekspansi. Tunda pilihan teknis hingga alur P0 disetujui.

---

## 12. Next step

1. Review blueprint untuk memisahkan keputusan tetap dari asumsi.
2. Susun **Product Requirements Document (PRD)** yang implementable: fitur per layar, empty/error/loading states, validations, data rules, dan acceptance criteria.
3. Susun **ERD dan migration strategy** termasuk import source 94 produk, price history, dan order snapshots.
4. Baru setelah itu buat satu **master implementation prompt Antigravity** dengan urutan gate: schema/data → admin catalog → storefront/mobile → cart/checkout WhatsApp → order workflow → QA/security → deploy. **Tidak lanjut ke gate berikut bila gate sebelumnya belum PASS.**

> Dokumen ini hanya membekukan arsitektur logis. Tidak menetapkan logo, desain final, supplier, stok, SLA, harga baru, domain, ataupun klaim lain yang belum disetujui pemilik.
