# TAPOS Integrated Owner Dashboard

TAPOS is being developed as two separate applications, a cashier tablet and a responsive owner dashboard, backed by one Express API and PostgreSQL database. The current work is Phase 2; frontend integration and offline IndexedDB synchronization are not complete yet.

## Struktur utama

- [index.html](index.html) – owner dashboard prototype; contains monitoring and management views only
- [cashier/index.html](cashier/index.html) – separate cashier tablet frontend
- [owner/index.html](owner/index.html) – separate owner dashboard frontend
- [backend/src/server.js](backend/src/server.js) – Express and authenticated WebSocket server
- [backend/src/routes/api.js](backend/src/routes/api.js) – PostgreSQL-backed auth, catalog, owner reads, and transaction endpoint
- [database/schema.sql](database/schema.sql) – initial PostgreSQL schema
- [database/migrations](database/migrations) – versioned schema changes
- [docs/installation.md](docs/installation.md) – local setup and current implementation status

## Menjalankan

Follow the setup steps in [docs/installation.md](docs/installation.md). Node.js, npm, and PostgreSQL are required; the API does not fall back to in-memory data.

## Demo akun

- Owner: `owner@tapos` / `admin123`
- Cashier: `cashier@tapos` / `cashier123`

## Catatan

Demo owner and cashier accounts are created by the development seed and use the passwords configured in `.env`. Do not use the example passwords in production. No live sales are inserted by the seed.
