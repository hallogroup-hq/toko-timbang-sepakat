# TOKO TIMBANG SEPAKAT — UX SPECIFICATION & CONTENT DESIGN
**Versi:** 1.0 · **Tanggal:** 12 Oktober 2026 · **Status:** acuan implementasi mobile-first
**Baca bersama:** `TTS_PRD_v1.0.md`, `TTS_ERD_Database_Spec_v1.0.md`, `TTS_Database_Schema_v1.0.sql`, `TTS_Katalog_Awal_94_Produk.csv`.

> **Prinsip pengalaman:** Toko bahan baku B2B untuk coffee shop dan usaha F&B, tetap bisa dibeli individu. Pengalaman inti harus terasa seperti membuat daftar restock: cari → pilih satuan → masukkan jumlah → lihat subtotal → isi nama → buka WhatsApp dengan teks siap kirim. **Bukan marketplace, bukan kasir otomatis, dan bukan situs company profile dengan katalog tersembunyi.**

## 1. Product experience north star

**Satu kalimat:** *Bahan baku yang kamu cari, harganya jelas, pesannya tinggal kirim.* Tidak perlu slogan ini ditampilkan secara harfiah di UI.

**Jobs yang harus unggul:**
1. Pembeli reguler tahu nama barang; dapat menemukannya, mengetik jumlah besar, dan berbelanja beberapa item tanpa harus masuk-keluar halaman detail.
2. Pembeli pemula dapat memahami bahwa `Karton / Pack` dan `Pcs` adalah **dua opsi jual jika memang tercantum harganya**, bukan janji konversi unit.
3. Pembeli HP dapat mengoreksi keranjang dengan satu tangan, menyelesaikan form checkout dalam beberapa detik, dan menyalin pesan bila WhatsApp gagal terbuka.
4. Admin dapat mengubah harga dan menandai stok habis secara cepat, tanpa bergantung pada developer.

**Anti-goals:** splash screen, login wajib, hero tiga layar, testimonial palsu, angka stok palsu, animasi dekoratif yang menghalangi scroll, toast bertumpuk, icon-only untuk aksi utama, empat kolom produk di HP, *auto-redirect* sebelum pengguna membaca rincian, desain vintage ornament-heavy, teks promosi AI-generik, produk fiktif.

## 2. Persona dan konteks lapangan (hipotesis, perlu validasi dengan pengguna nyata)

| Persona | Kondisi kerja | Kebutuhan | Hambatan yang harus dihilangkan |
|---|---|---|---|
| Pemilik coffee shop | Memesan di sela operasional, sering dari HP | Belanja lintas kategori cepat dan biaya terukur | Harus mengulang chat satu-satu; memilih unit keliru |
| Kepala barista / purchasing | Sudah membawa daftar restock | Search cepat, tambah ke cart tanpa detail page | Jumlah yang banyak susah diketik; scroll hilang |
| Owner F&B baru | Belum hafal seluruh produk | Kategori masuk akal, harga jelas | Nama singkat/ambigu, foto belum ada, banyak filter |
| Pembeli rumah tangga | Beli beberapa item satuan | Tidak perlu akun usaha | Form panjang, minimum pembelian fiktif |
| Admin operasional | Tanggapi chat dan update stok/harga | Edit harga/status beberapa klik, lihat intent | Statistik klik WA disalahartikan sebagai omzet |

Jangan menyimpulkan perilaku ini sudah tervalidasi secara riset lapangan. Uji tugas riil dengan 3–5 pengguna sasaran sebelum go-live bila memungkinkan.

## 3. Information architecture dan navigasi

### Publik
- `/` — **Beranda**: logo dari folder branding asli, search langsung terlihat, kategori, akses cepat menuju seluruh produk, ringkasan cara pesan.
- `/produk` — **Katalog**: daftar lengkap produk, kategori, filter sederhana, pencarian di URL (q/category), sort yang tidak membandingkan harga paket dengan harga pcs secara menyesatkan.
- `/produk/:slug` — **Detail**: nama, gambar asli jika tersedia, opsi satuan valid, price, qty, tambah ke cart, informasi singkat yang memang diketahui.
- `/keranjang` — **Keranjang**: edit qty, hapus, subtotal, penjelasan ongkir lewat admin.
- `/checkout` — **Siapkan WhatsApp**: nama wajib, nama usaha opsional, ringkasan final, pratinjau pesan, tombol WA + salin.
- `/informasi` — **Cara pesan / kontak**: 3 langkah dan batasan proses WA; tidak perlu bertele-tele.

### Back-office
- `/admin/login` — masuk sebagai staf/owner, **bukan akun customer**.
- `/admin` — panel ringkas dengan aksi cepat. Tidak boleh menyebut checkout intents sebagai omzet.
- `/admin/produk`, `/admin/produk/:id`, `/admin/kategori` — pengelolaan katalog/opsi/unit/foto/status.
- `/admin/harga` — daftar harga editable (single/bulk) plus riwayat.
- `/admin/import` — upload/preview/perubahan/import result.
- `/admin/foto` — kandidat gambar, verifikasi kecocokan dan hak pakai.
- `/admin/permintaan` — intent yang dibuat (status *belum diverifikasi terkirim*).
- `/admin/pesanan` — pesanan sungguh-sungguh yang dikonfirmasi admin lewat WA.
- `/admin/pengaturan` — nomor WA, data bisnis, branding dan keterangan publik.

### Navigation HP
- Beranda dan Katalog paling menonjol; keranjang selalu bisa diakses dari header dan/atau bottom bar.
- Bottom navigation **maksimum tiga** item awal: `Beranda`, `Katalog`, `Keranjang`. Jangan menampilkan `Akun` ketika tidak ada akun customer.
- Search mudah ditemukan dari hampir semua layar toko. Dalam katalog, search selalu dekat bagian atas sebelum filter.
- Informasi dan kontak dapat berada di menu sederhana/footer. Tombol chat admin umum tidak boleh menggantikan alur `keranjang → checkout`.
- Back button mempertahankan pencarian, filter, fokus saat kembali, dan lokasi scroll semampunya.

## 4. Screen specification — PUBLIK

### S01 · Beranda `/`
**Tujuan:** pengguna segera bisa mencari atau memilih bahan. **Prioritas konten urut:** header (brand/cart) → pencarian → kategori inti → CTA `Lihat Semua Produk` / shortcut restock → daftar produk dari katalog asli → cara pesan ringkas.

**Desktop:** header satu baris, search lebar dan jelas, cart dengan count, navigasi kategori horizontal, daftar produk. Hero **opsional** dan maksimal satu blok pendek; jangan membutuhkan banner foto untuk menyelesaikan tugas.

**HP:** header ringkas, logo tajam dan tidak memakan setengah layar; search full width (min 44px tinggi); chip kategori boleh horizontal scroll dengan petunjuk scroll; daftar produk satu kolom lebih baik jika dua pilihan harga tidak muat di grid. Keranjang aktif tampil sticky ringan di bawah konten saat berisi item, **tidak menutup bottom nav/CTA produk**.

**Primary action:** fokus search atau masuk katalog. **Loading:** skeleton yang tidak berubah tinggi. **Empty:** jika katalog belum dipublish, tampil `Produk sedang disiapkan. Silakan hubungi admin.` + tautan WhatsApp umum (jika nomor sudah dikonfigurasi). Tidak mengarang featured products.

### S02 · Katalog `/produk`
**Core layout:** search → kategori chips/filter → jumlah hasil → daftar produk. Tampilan desktop boleh grid/card atau mode list. **Mobile utamakan informasi daripada gambar besar**.

Setiap item di daftar harus memuat: nama sebenarnya, foto kecil asli/placeholder, harga yang tersedia disertai label opsi, kondisi ketersediaan, satu CTA tambah. Bila 2 opsi tersedia: tapping CTA menampilkan bottom sheet `Pilih satuan` dengan harga yang bisa dibedakan. Jika hanya 1 opsi: bisa langsung tambah satu (tetap tampil unit yang dipilih). Kuantitas banyak dapat diubah di cart atau sheet.

**Search behavior:** case-insensitive; debounce 200–350ms hanya indikatif (uji perangkat rendah); pencarian ke server bila dibutuhkan, URL query stabil tanpa data pribadi; clear search; hasil relevan; state `Tidak ada produk untuk “...”` + hapus filter. Searching `Greenfield` menampilkan Greenfield dan Greenfield UHT sebagai dua produk terpisah.

**Category UX:** label singkat berbasis kebutuhan coffee shop; kategori awal dapat disusun dengan pemetaan admin, **tidak boleh mengubah 94 nama asli**. Kategori produk yang belum dipetakan tetap dicari lewat Semua Produk, bukan hilang.

**Sort:** `Paling relevan`, `Nama A-Z` aman untuk MVP. `Harga terendah` hanya bila konteks satuan sama/terfilter; jika harga campuran `Karton / Pack` dan `Pcs`, jangan bandingkan seolah barang sama.

### S03 · Detail `/produk/:slug`
**Header:** kembali, nama. **Konten:** gambar jika hak pakai valid atau neutral placeholder; nama asli; tambahan merek/ukuran hanya jika terverifikasi; pill pilihan unit (`Pcs`, `Karton / Pack` jika ada harga); harga opsi terpilih; quantity controls (minus, numeric input, plus); CTA `Tambah ke Keranjang` yang menyebut unit bila membantu.

**Undetermined details:** jangan menulis `1 karton = 12 pcs`, deskripsi produk, status `ready stok`, berat, dimensi, manfaat kesehatan, izin produk, atau foto generatif bila tidak ada data. Tampilkan hanya detail yang diketahui. Gunakan teks `Detail kemasan dapat ditanyakan kepada admin` bila relevan, bukan memaksa data palsu.

**Sold out:** jika product/option unavailable, CTA disabled `Sedang tidak tersedia`; produk bisa tetap terlihat jika business rule admin mengizinkan discoverable; jangan hilangkan item dari cart existing tanpa pesan.

### S04 · Keranjang `/keranjang`
**Baris:** thumbnail netral/asli, nama, label opsi jual, harga satuan dengan IDR, quantity input +/−, subtotal baris, aksi `Hapus`. Dua opsi dari satu produk **dua baris terpisah**. Input quantity mengizinkan mengetik dua digit tanpa 12 tap; minus pada qty=1 tidak menghapus diam-diam (tawarkan aksi hapus).

**Ringkasan sticky:** `Subtotal barang`, angka tegas, `Ongkir dikonfirmasi admin`, CTA `Lanjut ke WhatsApp` menuju **form checkout**, bukan langsung WA tanpa nama. Hanya satu CTA utama terlihat. Saat cart kosong: ilustrasi kecil opsional atau icon, teks `Keranjang masih kosong`, CTA `Cari Bahan Baku`.

**Repricing/error:** jika admin memperbarui harga sejak produk masuk cart, tampil item yang berubah `Harga diperbarui: RpX → RpY`, subtotal baru dan tombol `Mengerti, lanjutkan`. Jika opsi tak tersedia, sorot baris dengan langkah `Hapus dari keranjang`; jangan hilangkan item diam-diam. Jangan kosongkan cart saat kembali dari WhatsApp.

### S05 · Checkout `/checkout`
**Satu layar sederhana**, tidak wizard, tidak akun, tidak alamat, tidak OTP.

| Field | UI behavior | Validasi |
|---|---|---|
| Nama Pembeli | Text input `Nama Pembeli *`, autofill name jika ada, autocomplete name | trim 2–100 karakter, wajib; kesalahan dekat field |
| Nama Toko / Usaha | Text input `Nama Toko / Usaha (opsional)` | trim 0–120 karakter; jika kosong jangan cetak label di pesan |
| Rincian | List item + qty + unit + harga + line subtotal | read-only di checkout, edit membawa ke cart |
| Total | `Subtotal barang` + `Ongkir: dikonfirmasi admin` | tidak boleh disebut tagihan final |
| Preview WA | salinan teks final, collapsible bila panjang tapi semua isi tersedia | reference dan item sama dengan server snapshot |
| CTA | `Pesan Melalui WhatsApp` | enabled setelah validasi dan stok/price check |
| Fallback | `Salin Rincian Pesanan` | copy full text, bukan potongan |

**Two-stage UX:**
1. Isi nama → tekan `Periksa Pesanan` jika perlu perbedaan harga; atau inline validation/reprice dan CTA WA ketika sudah sinkron.
2. Server menerima POST, melakukan validasi dan membuat checkout intent **baru**, mengembalikan pesan dan `wa.me` URL. Browser membuka chat prefilled melalui **user gesture**, atau menampilkan `Buka WhatsApp` jika popup terblokir. Pengguna sendiri menekan tombol Send di aplikasi WhatsApp. UI hanya berkata `WhatsApp dibuka`/`Salin Pesan`, **jangan mengaku pesanan telah terkirim atau diterima**.

**Text canonical contoh dari data asli (tanpa menambah pack count):**
```text
Halo Admin Toko Timbang Sepakat, saya ingin memesan:

Referensi: TS-XXXXXXXX
Nama Pembeli: [nama yang diisi]
Nama Toko/Usaha: [hanya jika diisi]

1. Greenfield UHT — Karton / Pack
   2 x Rp240.000 = Rp480.000
2. Trieste Vanilla — Pcs
   3 x Rp75.000 = Rp225.000

Subtotal barang: Rp705.000
Ongkir: dikonfirmasi admin
Mohon konfirmasi ketersediaan produk, ongkir, total akhir, dan cara pembayaran. Terima kasih.
```
Tidak mencetak kurung placeholder pada hasil nyata; referensi unik berasal dari server. Kalau pesan sangat panjang dan URL tidak bisa dibuka, tampilkan full copy + tombol `Buka chat admin` sebagai fallback. Hilangkan input dari URL aplikasi kita sendiri; query WA pasti membawa teks karena diperlukan fitur click-to-chat.

### S06 · Informasi `/informasi`
Urutan: `1. Pilih produk 2. Periksa keranjang 3. Kirim daftar ke WhatsApp`; jelaskan `Admin mengonfirmasi ketersediaan, ongkir, dan pembayaran lewat WhatsApp.` Cantumkan kebijakan privasi ringkas (nama digunakan untuk membantu menindaklanjuti permintaan; jangan menyajikan seolah privasi hukum final tanpa ditinjau). Jangan mengarang jadwal operasional, wilayah layanan, alamat toko, atau minimum order.

## 5. Interaction patterns & design-system requirements

**Art direction:** *klasik-modern, contemporary merchant utility*. Identitas visual resmi dari `~/Downloads/TokoTimbangSepakat/Branding`; warna dan font belum final sampai aset dibaca. Jangan menghidupkan kembali logo generatif yang sudah ditolak. Hindari panel krem bertumpuk, gradien dekoratif, garis pemisah di mana-mana, drop shadow besar, watermark, foto toko fiktif, ilustrasi pseudo-3D.

**Typography:** body minimal 16px pada form HP; price jelas, aligned/tabular figures bila memungkinkan; hirarki 3 level secukupnya. **Spacing:** konsisten 4/8px rhythm tanpa padding berlebih pada list. **Touch:** target ≥44x44 CSS px untuk aksi utama (ideal); buffer di dekat aksi destruktif. **Contrast:** AA, terlihat saat HP di luar ruangan. **Motion:** feedback singkat, hormati `prefers-reduced-motion`; jangan efek entrance panjang. **Keyboard:** search/autofill/qty numeric, focus visible, no traps. **Screen readers:** icon button memiliki accessible name, error field announced, toast nonintrusive.

**Persistence:** cart disimpan browser-local; gagal storage tidak membuat aplikasi crash. Nama pembeli **jangan persist tanpa alasan**; jika disimpan sementara untuk refresh form, jangan masukkan local analytics. No account navigation.

**Performance:** kompres gambar untuk web, gunakan dimensions/responsive srcset, lazy-load below fold; paginated catalog; avoid CLS; navigasi baik pada network lambat. **Responsive test:** 320*, 360, 375, 390, 430, 768, 1024, 1280 CSS px; *320 mode degradasi tetap bisa melakukan checkout tanpa overflow.*

## 6. Admin screens and usability

### A01 · Admin home
4 ringkasan terpisah: `Produk dipublikasikan`, `Produk tidak tersedia`, `Permintaan checkout (belum diverifikasi)`, `Pesanan dikonfirmasi`. Aksi cepat: `Ubah Harga`, `Tandai Tidak Tersedia`, `Buka Daftar Permintaan`. Tidak menampilkan omzet dari checkout intents/WA clicks.

### A02 · Katalog & editor
List searchable dan editable; satu baris per produk untuk overview dengan nama sumber yang bisa dicari, status, kategori, foto, dan jumlah opsi harga. Detail editor memiliki tab/section yang tidak berlebihan: `Informasi`, `Pilihan Harga`, `Foto`, `Status`.
- Original source name read-only provenance; displayed name editable.
- SKU optional, unique if filled; no autogenerated supplier SKU. Opsi harga dapat ditambah/arsipkan/edit label/harga; `pack_quantity` optional.
- Untuk produk sumber berdua harga, tampil dua opsi jual yang benar, bukan satu `price` global.
- `Tersedia` hanya bila admin yakin; default `Konfirmasi ke admin`. `Tidak tersedia` langsung menonaktifkan tambah.
- Confirmation before archive/delete; jangan hard-delete order history.

### A03 · Pricing table
Mode list mirip spreadsheet tetapi aman di HP: search, satu row per *sellable option*, nama produk sticky di desktop, price integer IDR; tombol `Simpan` mengubah hanya yang diedit. Bulk edit harus memiliki preview diff dan dampak item berubah, conflict check/version control, audit log. Input IDR `Rp` formatting saat blur tanpa corrupt angka. Nonaktif/nonexistent prices ditampilkan `—`, **bukan Rp0**.

### A04 · Import wizard (minimum 3 steps)
1. `Upload CSV/XLSX` → autodetect kolom + mapping pilihan, keamanan header injection.
2. `Preview Perubahan` menampilkan `baru/diubah/tidak berubah/konflik`, nama lama → baru, harga lama → baru, row error. Tidak mengubah data dulu.
3. `Konfirmasi Import` → transactional update atau fail-safe batching; result report + replay idempotent. Jangan overwrite edit admin diam-diam dari seed awal.

### A05 · Foto produk & provenance
Tabel per source row: nama sumber, candidate thumbnails, source URL, license evidence, image size, confidence/match factors, status `otomatis disetujui` hanya bila seluruh gate identity + rights **dan** kebijakan auto-approval tercatat jelas. Admin punya tindakan `Pilih`, `Tolak`, `Upload File Sendiri`. Ketidakjelasan = placeholder. **Jangan hotlink sumber publik tanpa izin**.

### A06 · Permintaan checkout
List checkout intents dengan reference, created_at, buyer name, business name, item count, subtotal snapshot, `Belum dipastikan terkirim`. Tindakan: `Salin reference`, `Lihat pesan`, `Buat pesanan terkonfirmasi` setelah cek chat. Tampilkan copy eksplisit `Pelanggan mungkin hanya membuka WhatsApp`; jangan ada tombol `Tandai sudah dikirim` berbasis klik.

### A07 · Pesanan
Admin bisa membuat order dari intent atau manual setelah persetujuan WA; simpan informasi penyesuaian barang, harga, ongkir jika diketahui, status manual, timestamp, actor, catatan (tidak otomatis). `Total akhir` hanya jika ongkir/nominal final diketahui; jangan otomatis menambahkan ongkir 0. Laporan omzet hanya menggunakan pesanan berstatus pembayaran terkonfirmasi sesuai definisi konsisten.

### A08 · Pengaturan
Nomor admin WA dalam format E.164 valid (contoh UI boleh placeholder generik `62…` tanpa nomor sungguhan); teks informasi toko, pengaturan avatar/logo dari branding folder, kategori/navigation; no API keys in browser. Backup/export tersedia untuk owner.

## 7. Full state matrix

| Komponen | Normal | Kosong | Loading | Error/Edge | Recovery |
|---|---|---|---|---|---|
| Search | daftar cocok | `Produk tidak ditemukan` | skeleton/list placeholder | 429/offline | coba lagi, reset filter |
| Product image | gambar berizin | placeholder netral | reserved ratio box | img gagal | placeholder, bukan gambar merek lain |
| Product price | harga unit valid | opsi tidak ditampilkan | shimmer ringkas | berubah | tampil diff dan konfirmasi |
| Add to cart | toast count updated | — | button pending singkat | stok berubah/nonaktif | update cart |
| Cart | line & subtotal | empty CTA | hydrate local state | storage blocked | in-memory cart + warning nonfatal |
| Checkout | form + preview | form empty validation | pending server | offline/timeouts/conflict | retry idempotent atau copy |
| WA deep link | chat terbuka | — | tidak tampil sukses palsu | app not installed/url long | web WA, copy message |
| Admin catalog | editable list | add product CTA | loading | unauthorized/conflict | re-login/reload version |
| Admin import | preview diff | empty | parsing | invalid schema/partial | error per row, no commit |
| Admin image | verified photo | candidate queue empty | scanning | rights unknown | placeholder + review |

## 8. Content design — contoh bahasa mikro yang boleh

- Search placeholder: `Cari susu, sirup, bubuk, kemasan...`
- CTA product: `Tambah` / `Pilih Satuan` (bila dua opsi).
- Toast: `[Nama produk] ditambahkan` + `Lihat Keranjang`.
- Empty cart: `Keranjang masih kosong. Cari bahan yang ingin kamu pesan.`
- Availability: `Sedang tidak tersedia` atau `Konfirmasi stok dengan admin` (jangan klaim stock real-time).
- Pricing: `Rp240.000 / Karton / Pack`, bukan `Rp240.000 / 12 pcs` tanpa dasar.
- Shipping: `Ongkir akan dikonfirmasi admin.`
- Checkout CTA: `Pesan Melalui WhatsApp`.
- Checkout helper: `Pesan belum otomatis terkirim. Kamu bisa memeriksanya sebelum mengirim lewat WhatsApp.`
- Error: `Harga beberapa produk berubah. Periksa perubahan sebelum melanjutkan.`
- Form error: `Masukkan nama pembeli (minimal 2 karakter).`
- Admin intents: `Permintaan checkout (belum tentu pesan WA terkirim)`.

**Jangan gunakan:** `Belanja Anda berhasil!` setelah WA open, `Stok selalu tersedia`, `100% original` tanpa bukti, `Gratis ongkir`, `Termurah`, `Sejak 1985`, rating palsu, rekomendasi AI random, deskripsi emosi panjang dalam tiap card.

## 9. Usability and visual acceptance — hard gates

1. Test user baru mencari `Trieste Vanilla`, memilih `Pcs` Rp75.000, mengubah qty=3 dan membukanya di cart; tidak perlu membuka detail lebih dari satu kali.
2. Test `Greenfield UHT` 2 `Karton / Pack` @Rp240.000 + `Trieste Vanilla` 3 `Pcs` @Rp75.000 → Rp705.000 pada keranjang, preview dan pesan.
3. Setelah tambah item kedua, `Kembali` tidak menghilangkan search/filter posisi atau keranjang.
4. Checkout guest tanpa `Nama Pembeli` blocked, tanpa Nama Usaha allowed, serta field opsional hilang dari teks WA.
5. Admin ubah harga ketika customer cart lama → user melihat perubahan dan persetujuan eksplisit sebelum WA.
6. Opsi harga kosong tidak bisa dipilih, tidak tampil `Rp0`.
7. Foto tidak ada → placeholder stabil. Foto salah identitas/izin tidak valid → tidak publish.
8. WA click → UI tidak menyatakan pesan sudah terkirim; cart bertahan.
9. Pada 360px: semua harga terbaca, controls tidak overlap, CTA bisa dijangkau dengan keyboard terbuka, no horizontal scroll.
10. Pada jaringan lambat/WA link gagal, copy full text memungkinkan menyelesaikan pekerjaan.
11. Admin dapat edit harga satu produk, mark unavailable, dan memeriksa intent tanpa debugging/kode.
12. Readability, AA contrast, keyboard flow, valid focus, responsive screenshots diperiksa, bukan hanya klaim.

## 10. Output yang harus dihasilkan Antigravity untuk verifikasi

- Figma-like screens boleh berupa screenshot browser nyata dari implementasi, bukan gambar generatif: 360px dan 390px untuk beranda, katalog, detail, cart, checkout; desktop 1280px katalog + admin pricing.
- Rekam alur screen/video pendek nyata (Playwright) untuk Search→Cart→Checkout→WA fallback.
- Accessibility audit dan manual keyboard checklist; alasan untuk pengecualian apa pun.
- Visual diffs per gate. Jangan menerima screenshot marketing mockup sebagai bukti UX working.
- Copy harus berasal dari field nyata; jangan membuat klaim baru agar tampak lebih lengkap.

## 11. Hal yang sengaja dibiarkan configurable

Nama kategori awal, headline beranda, warna/font dari branding, nomor WA, kebijakan minimum belanja (belum ada), jam layanan (belum ada), ongkir (ditentukan WA), lokasi toko fisik (belum ada), verifikasi spesifikasi kemasan tiap barang. **Tidak boleh menjadi blocker coding inti; default jujur + editable.**
