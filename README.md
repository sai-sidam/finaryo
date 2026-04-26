# Finaryo

Finaryo is a single-machine personal finance app with:

- expense + transaction tracking
- statement upload (`.xlsx`, `.xls`, `.csv`)
- payday calendar + recurring payday entries
- debt + hand-loan tracking
- avalanche/snowball payoff projection
- savings goals + contributions + payday auto-contributions
- monthly insights
- categorization rules + recurring transaction detection
- payslip PDF upload and retrieval

The app is a monolith:

- `frontend/` (Vite + React)
- `backend/` (Express + Prisma + SQLite) serving APIs and built frontend

## Prerequisites

- Node.js 20+
- npm

## First-time setup

```bash
cp backend/.env.example backend/.env
npm run install:all
```

Then open `backend/.env` and set:

- `PLAID_CLIENT_ID`
- `PLAID_SECRET`
- `APP_ENCRYPTION_KEY` (32+ chars)

## Start the app

```bash
npm run start:monolith
```

App URL: `http://localhost:3001`

## Development

- Frontend dev server: `npm run dev:frontend`
- Backend server: `npm run dev:backend`
- Prisma migration: `npm run prisma:migrate --prefix backend`
- Prisma Studio: `npm run prisma:studio --prefix backend`

## Validation

### 1) Frontend build

```bash
npm run build --prefix frontend
```

### 2) Backend smoke test

Start backend first (must include required env values), then:

```bash
npm run smoke --prefix backend
```

## Data safety (SQLite)

DB file: `backend/prisma/dev.db`

### Create backup

```bash
npm run db:backup --prefix backend
```

### Restore backup

```bash
npm run db:restore --prefix backend -- ./backups/<backup-file>.db
```

## Notes

- For local solo use, data is persistent in SQLite.
- Do not commit `backend/.env`.
- Payslips are stored locally under `backend/uploads/payslips`.
