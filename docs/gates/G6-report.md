# Gate G6 Report: Admin Order Operations and Revenue KPI

## Gate Status: PASS

### 1. Intent Conversion to Confirmed Order
- Endpoint: `POST /api/admin/orders/from-intent/:intent_id`.
- Immutable Snapshot: Copies `checkout_intent_lines` into `order_lines` with frozen unit prices, quantities, and line totals.
- Intent Lifecycle: Flags `checkout_intents.status = 'converted'` with `converted_at` timestamp.
- Replay Protection: Prevents duplicate conversion. Second attempt returns 400 Bad Request with existing order reference.

### 2. Revenue KPI Invariants
- Endpoint: `GET /api/admin/orders/metrics`.
- Strict Truthfulness: Checkout intents are strictly excluded from revenue metrics.
- Revenue Filter: Only orders in `paid` or `completed` status contribute to `total_revenue_idr`.
- Metric Separation: Total checkout intents and unconfirmed drafts are tracked as pipeline count, never monetary revenue.

### 3. Order Operations & Lifecycle Events
- Status Updates: Endpoint `PUT /api/admin/orders/:id/status` supports transitions: `pending` -> `confirmed` -> `processing` -> `shipped` -> `completed` / `cancelled`.
- Shipping Fee Adjustment: Allows merchant to specify confirmed shipping cost (`shipping_fee_idr`), updating `total_idr = subtotal_idr + shipping_fee_idr`.
- Audit Trail: Every state transition and shipping fee amendment records an immutable event in `order_events` with admin actor ID, previous status, next status, and metadata notes.

### 4. Automated Test Evidence
- Command: `npx vitest run tests/orders-ops.test.ts`
- File: `tests/orders-ops.test.ts`
- Tests: 3/3 tests PASS (ADMIN-05, ADMIN-06, ADMIN-07).

### 5. Gate Eligibility
- Gate G6 is PASSED.
