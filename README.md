# Finaryo Monolith (Single Server)

This repository now runs as one monolith app:

- `frontend/` is built with Vite
- `backend/` (Express) serves both API routes and the built frontend files

You can run everything from the repository root.

## Prerequisites

- Node.js 18+ (Node.js 20+ recommended)
- npm

## First-time setup

```bash
cp backend/.env.example backend/.env
npm run install:all
```

## Run as a single app (one command)

```bash
npm run start:monolith
```

What this does:

1. Builds the frontend (`frontend/dist`)
2. Starts the backend server
3. Serves UI and API from the same server/port

Default URL: `http://localhost:3001`

## Development notes

- If you want frontend hot-reload while developing UI:
  - `npm run dev:frontend` (Vite dev server)
  - `npm run dev:backend` (Express API)
- For production-like local testing, prefer `npm run start:monolith`.

## API Endpoints

- `GET /api/health` health check
- `GET /api/expenses` list expenses
- `POST /api/expenses` create expense

### Create expense request body

```json
{
  "name": "Groceries",
  "amount": 42.5
}
```

## Notes

- Expenses are currently stored in memory (non-persistent).
- Do not commit local `.env` files.
