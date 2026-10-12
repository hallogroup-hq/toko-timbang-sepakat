# Gate G5 Report — Server Checkout & Canonical WhatsApp Integration

## Gate Status: PASS

### 1. Server Authoritative Calculations
- Preview Endpoint: `/api/checkout/preview`. Ignores client prices and recalculates subtotal strictly from authoritative database rows.
- Dynamic Diff Detection: Flags price changes dynamically (`has_price_change: true`) if catalog prices were updated after the item entered the cart.

### 2. Form Validation & Data Integrity
- Nama Pembeli: Strictly required, trimmed 2–100 characters. Single-character or blank names rejected with 400 Bad Request.
- Nama Toko / Usaha: Optional, trimmed 0–120 characters. When omitted, the line is cleanly excluded from the WhatsApp message without placeholder artifacts.

### 3. Canonical WhatsApp Integration
- Reference Code: Unique, non-colliding `TS-[8 alphanumeric uppercase characters]`.
- Message Structure:
  - Header with recipient and reference.
  - Buyer and optional store name.
  - Line-by-line itemization: number, product name, unit label, quantity, unit price in IDR, line total.
  - Subtotal barang in IDR.
  - "Ongkir: dikonfirmasi admin".
  - Explicit confirmation request for stock, shipping, and payment terms.
- WhatsApp URL Generation: Built with `https://wa.me/{international-number}?text={encodeURIComponent(message)}`.
- Fallback: One-click "Salin Rincian Pesanan" button copies the full message to the clipboard if WhatsApp fails to open or is blocked.
- UI Truthfulness: Explicitly displays "WhatsApp dibuka" or "Teks disalin"; never falsely claims the order is submitted or paid.

### 4. Canonical Scenario Verification
- Greenfield UHT (2 × Rp240.000 Karton/Pack) + Trieste Vanilla (3 × Rp75.000 Pcs) = Rp705.000 verified across cart, preview API, server intent, snapshot database, and WhatsApp prefill text.

### 5. Idempotency
- Double-click or retry using the same idempotency key returns the existing intent without creating duplicate references.

### 6. Automated Test Evidence
- Command: `npm test`
- File: `tests/checkout.test.ts`
- Tests: 4/4 tests PASS.

### 7. Gate Eligibility
- Gate G5 is PASSED.
