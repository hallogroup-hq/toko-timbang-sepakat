# Gate G1 Report — Data Model, Schema, Migrations, Idempotent Seed & Source Fidelity

## Gate Status: PASS

### 1. Migrations & Schema Invariants
- Database: Native `node:sqlite` (`data/tts.db`).
- Schema: 18 tables defined and created matching `TTS_Database_Schema_v1.0.sql`.
- Invariants: Foreign keys enabled (`PRAGMA foreign_keys = ON;`), WAL mode enabled (`PRAGMA journal_mode = WAL;`).

### 2. Seed & Fidelity Results
- Source: `TTS_Katalog_Awal_94_Produk.csv` (94 products).
- Total Products Seeded: Exactly 94 records.
- Total Sellable Options Seeded: Exactly 106 records.
  - Karton / Pack Options: 35 options.
  - Pcs Options: 71 options.
  - Zero-price / Blank cells: 0 options generated for empty cells. No Rp0 or negative prices.
- Naming fidelity:
  - `RENJANA-004` correctly seeded as `Susu F&N`.
  - `RENJANA-072` correctly seeded as `Oatside`.
  - Unverified source spellings preserved (`Davinci Cramel` on `RENJANA-036`, `Lotus Bisqof` on `RENJANA-093`).
  - `Greenfield` (`RENJANA-001`) and `Greenfield UHT` (`RENJANA-002`) remain separate products.
- Arithmetic Verification:
  - Greenfield UHT (2 × Rp240.000) + Trieste Vanilla (3 × Rp75.000) = Rp705.000 verified.
- Idempotence:
  - Consecutive runs test: 0 duplicates, 0 overwrites of existing data.

### 3. Automated Test Evidence
- Command: `npm test`
- File: `tests/seed.test.ts`
- Result: 6/6 tests PASS.

### 4. Gate Eligibility
- Gate G1 is PASSED. Ready to proceed to Gate G2 (Admin Auth, Products CRUD, Pricing Audit & Bulk Import).
