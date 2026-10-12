# Architecture & Technology Decisions — Toko Timbang Sepakat

## ADR 001: Technology Stack Selection
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS.
  - Reason: Lightweight, high-performance, fast HMR, excellent mobile responsiveness, zero vendor lock-in.
- **Backend**: Node.js + Hono (using `@hono/node-server` and native `node:sqlite`).
  - Reason: Extremely fast, standards-compliant Request/Response API compatible with Cloudflare Workers / Node.js runtime, zero-dependency SQLite with synchronous safety and transaction atomicity.
- **Database**: SQLite (18 tables matching `TTS_Database_Schema_v1.0.sql`).
  - Native `node:sqlite` in Node 22/26 environment. Runs natively on macOS/Linux/Cloudflare D1 without compiling external C++ binaries.
- **State Management & Persistence**:
  - Customer Cart: Browser `localStorage` with versioned schema and error recovery.
  - Session Auth: HTTP-only, SameSite=Lax, Secure cookie session tokens stored in `admin_sessions`.

## ADR 002: Anti-Slop & Design Language
- **Design Philosophy**: Contemporary Merchant Utility (klasik-modern utility). Clean, high contrast, typography-first, functional.
- **Brand Palette**:
  - Primary Accent: Terracotta / Warm Amber (`#BA3C07` extracted from official brand logo).
  - Neutrals: Zinc / Slate (`#09090B`, `#18181B`, `#27272A`, `#71717A`, `#F4F4F5`, `#FAFAFA`).
  - Prohibitions: No AI-slop red/green badges or glow shapes, no decorative status dots, no fake testimonials, no artificial "Official/Verified" pills.
- **Mobile First**: Optimized for 360px, 375px, 390px, 430px viewports. Min tap targets 44px. Single-column catalog layout when multiple price units exist.

## ADR 003: WhatsApp Order Integration
- Server authoritative pricing: `/api/checkout/preview` and `/api/checkout/intent` compute prices from the database.
- Idempotency key per checkout attempt.
- Public reference: `TS-[8 alphanumeric chars]`.
- Canonical text snapshot saved in `checkout_intents`.
- Direct `wa.me` URL with full message copy fallback.
- Intent is separate from confirmed orders; admin manually verifies and converts orders.
