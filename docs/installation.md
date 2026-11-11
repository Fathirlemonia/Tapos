# TAPOS Local Setup

## Requirements

- Node.js 18+ and npm
- PostgreSQL 14+
- VS Code

## 1. Install and configure

From the project root, run `npm install`, copy `.env.example` to `.env`, then set `DATABASE_URL` and replace `JWT_SECRET` with a random value of at least 32 characters.

The origins in `CORS_ORIGINS` are for VS Code Live Server on ports 5500 and 5501. Update them if the frontends use different origins.

## 2. Create and initialize the database

Create an empty PostgreSQL database named `tapos`, then run:

```powershell
npm run db:migrate
npm run db:seed
```

Migrations create and version the schema. The seed contains demo catalog/business data only; it does not create sales transactions. In development, the seed creates demo owner and cashier accounts using bcrypt hashes. Their example passwords are configured through `SEED_OWNER_PASSWORD` and `SEED_CASHIER_PASSWORD` in `.env`; do not use those values in production.

## 3. Start the API

```powershell
npm start
```

Check `http://localhost:3000/api/health`. A healthy response requires PostgreSQL to be connected.

## Current status

The backend Phase 2 work is in progress. The API now expects PostgreSQL and does not fall back to in-memory records. The separate cashier and owner frontends have not yet been fully connected to the database API; that integration is scheduled for the following phases. Node.js/npm and PostgreSQL must be installed locally to run migrations or test the server.
