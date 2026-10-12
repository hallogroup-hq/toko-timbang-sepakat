# Toko Timbang Sepakat — QA ACCEPTANCE MATRIX
**Versi 1.0 · 12 Oktober 2026.** Ini spesifikasi test, **bukan klaim bahwa web app sudah diuji**.

## Gate dan hard-stop
| Gate | Apa yang diperiksa | Bukti wajib | Condition |
|---|---|---|---|
| G0 | Repo & dokumen, katalog asli, inventory Branding folder | inventory paths + keputusan stack | Tidak lanjut seed jika CSV hilang |
| G1 | Schema+migration+source fidelity+seed idempotent | log SQL, count 94/106, diff screenshot | FAIL jika fabricated/missing price |
| G2 | Auth admin, CRUD, price audit, import preview/commit | unit/integration tests + screen capture | FAIL jika unauthenticated mutation berhasil |
| G3 | Product image pipeline | ledger 94 records, rights & match evidence | FAIL jika wrong/unlicensed photo dipublish |
| G4 | Customer mobile screens | screenshots 360/375/390/430, interaction tests | FAIL jika main CTA/price tidak terbaca |
| G5 | Cart, checkout, price conflict, WA URL | E2E evidence, formatted message | FAIL jika WA message salah / stale price silent |
| G6 | Manual confirmation admin & order audit | immutable snapshots, status logs | FAIL jika WA click dihitung penjualan |
| G7 | Accessibility/security/performance | screenshots + checks actual | FAIL jika high severity issue unresolved |
| G8 | Local/staging handoff readiness | successful clean local build, setup readme, backup/restore, smoke | Fail if not runnable/reproducible |
| G9 | Actual production deployment | explicit owner approval and production smoke | **Not auto-approved** |

## Test cases and expected evidence
| ID | Test | Expected |
|---|---|---|
| DATA-01 | Seed CSV source | 94 `products`, 106 `sellable_options` (35 Karton/Pack, 71 Pcs); no invented product |
| DATA-02 | Rows without one price | No hidden zero-price option; only priced options listed |
| DATA-03 | `Greenfield` vs `Greenfield UHT` | Separate products and separate search results |
| DATA-04 | Owner-approved naming corrections | `RENJANA-004` is `Susu F&N` and `RENJANA-072` is `Oatside`; other unverified source names such as `Davinci Cramel` and `Lotus Bisqof` are not silently renamed |
| DATA-05 | Seed rerun after admin edit | Does not overwrite edited price/name or duplicate rows |
| CAT-01 | Search `Trieste Vanilla` | Finds item with Pcs Rp75.000; no made-up carton price |
| CAT-02 | Category not assigned | Still visible under Semua Produk when published |
| CAT-03 | Unavailable item | Disabled add/checkout; existing intent snapshots persist |
| CAT-04 | Wrong/unknown image rights | No public product photo; neutral placeholder |
| PRICE-01 | 2 × Greenfield UHT Karton/Pack + 3 × Trieste Vanilla Pcs | Rp480.000 + Rp225.000 = Rp705.000 end-to-end |
| PRICE-02 | Product with two options | Two distinct IDs/prices in cart when both selected |
| PRICE-03 | Change price after customer adds to cart | Client gets explicit diff, reconfirms, messages use new canonical price |
| CART-01 | Reload and back from product detail | Cart persists; quantity and unit remain correct |
| CART-02 | Qty edit via mobile keyboard | Can type 12 directly, not 12 taps; server rejects invalid quantity |
| CART-03 | Return from WhatsApp | Cart does not disappear automatically |
| WA-01 | Buyer name blank/1 char | Client and server reject; error near field |
| WA-02 | Buyer name valid, business name blank | Form allowed; WA includes buyer, omits business label |
| WA-03 | Buyer and business valid | Both appear in message, URL correctly encoded |
| WA-04 | Multiple line cart | Every line includes product, correct unit, qty, unit price, line subtotal |
| WA-05 | Double-click / retry checkout | Idempotent intent, no duplicate reference |
| WA-06 | WA link blocked or too long | Copy **full** canonical message & open generic admin chat fallback |
| WA-07 | WA open | UI does **not** claim order sent/paid/accepted |
| ADMIN-01 | Unauthenticated request to mutate product/price/import | 401/403 |
| ADMIN-02 | Modify selling price | Effective on public catalog, price change recorded actor/time/old/new |
| ADMIN-03 | Existing order after price edit | Old order line snapshot unchanged |
| ADMIN-04 | Import new price file | Preview diff before commit; conflicts rejected; source provenance saved |
| ADMIN-05 | Intent → order conversion | One order per intent; manual order permitted with audit |
| ADMIN-06 | Revenue KPI | Counts paid/confirmed per documented basis, not clicks/intents |
| MEDIA-01 | Auto search all source products | Exactly 94 auditable ledger outcomes |
| MEDIA-02 | Unverified package variants for `Susu F&N` / `Matcha` / `Oatside` | No fabricated product-specific photo on unverified variant/size match |
| MEDIA-03 | Picture licensed but wrong flavor/size | Reject, do not publish |
| MEDIA-04 | Rights unclear but image visually matches | Leave in review queue; placeholder published |
| BRAND-01 | Read actual Branding folder | Use original logo as supplied; no AI-generated replacement |
| MOBILE-01 | Screens at 320/360/375/390/430 px | No horizontal overflow; controls/price/units readable |
| MOBILE-02 | Keyboard covering checkout | Primary action reachable; focus returns correctly |
| MOBILE-03 | Screen reader / keyboard | Visible focus, labels, meaningful buttons, errors announced |
| REL-01 | Network timeout in checkout | Non-destructive retry; keep cart and entered name safely |
| REL-02 | Clean clone / new environment | Setup docs + migrations + seed + dev server works |
| REL-03 | Backup/export and restore drill | Documented and verified against local/staging data |

## Test approach
- **Automated:** Vitest or equivalent for pure price/order logic, API integration and schema; Playwright for mobile E2E actual browser; axe/Lighthouse or equivalent as support, not substitute for manual checks.
- **Manual:** at least 3 realistic tasks on low-width physical/emulated HP, no sticky overlap, large cart, empty cart, out-of-stock, missing images, noisy weak network.
- **Content:** screenshots compared to actual CSV, not an invented sample; names and price snapshots must remain correct.
- **Security:** test rate-limit on public intent and admin login, injection in buyer name, XSS escaping, unprivileged API access, session expiry, import file validation.
- **Evidence:** each test record must have `PASS/FAIL/NOT RUN`, exact command/test filename and screenshot/log. `NOT RUN` is never `PASS`.

## Local-document checks performed when compiling handoff
- CSV 94 unique source keys, contiguous rows 1–94, 35 priced Karton/Pack cells + 71 priced Pcs cells = 106 option records; checked with Python standard-library CSV.
- SQLite schema parses successfully as **18 tables** in local `sqlite3` memory database; tested 94/106 inserts, sample rows, monetary integer arithmetic Rp705.000 and constraint rejecting known shipping + null total.
- **Not done:** live site, actual Antigravity implementation, product image crawling, preview/prod deploy, Cloudflare D1 runtime migration, hardware mobile E2E. These remain Antigravity work.
