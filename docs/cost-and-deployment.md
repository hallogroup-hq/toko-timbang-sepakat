# Cost & Deployment Strategy — Toko Timbang Sepakat

## 1. Hosting & Infrastructure Architecture
- **Local Development / Preview**: Self-contained Node.js + Vite full-stack application running on local port with persistent SQLite DB file (`data/tts.db`). Zero external cost.
- **Staging / Self-Hosted Option**: Single VPS / Docker container or lightweight Node.js service (e.g. Railway, Render, Fly.io, or VPS) using SQLite with WAL mode.
- **Serverless / Edge Option (Future)**: Cloudflare Pages (Frontend) + Cloudflare Workers (Hono API) + Cloudflare D1 (SQLite) + Cloudflare R2 (Object storage for product images).
  - Free Tier limits: D1 5M reads/day, 100k writes/day; R2 10GB storage; Workers 100k requests/day. Well within Toko Timbang Sepakat initial volume.

## 2. External Third-Party APIs
- WhatsApp: Free `https://wa.me` click-to-chat URL protocol. Zero monthly cost, zero API fees.
- Image storage: Local filesystem `/public/uploads/` during MVP, with static asset serving. Optional future Cloudflare R2 or S3 bucket adapter.
- No paid third-party search, analytics, or payment gateways on MVP.

## 3. Production Deployment Policy
- As per instructions: **Never deploy to production without explicit user/owner consent**.
- Local executable preview and full staging readiness provided with automated smoke tests.
