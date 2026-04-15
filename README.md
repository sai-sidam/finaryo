# Finaryo Full-Stack App

This repository contains:

- `backend/`: Express API for expenses
- `frontend/`: React + Vite client connected to the API

## Prerequisites

- Node.js 18+ (Node.js 20+ recommended)
- npm

## Setup

### 1) Backend

```bash
cd backend
cp .env.example .env
npm install
npm start
```

Backend runs on `http://localhost:3001`.

### 2) Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

The frontend uses Vite proxy so requests to `/api/*` are forwarded to `http://localhost:3001`.

## API Endpoints

- `GET /` health check
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
