import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, "../frontend/dist");
const frontendIndexPath = path.join(frontendDistPath, "index.html");
const hasFrontendBuild = existsSync(frontendIndexPath);

if (CORS_ORIGIN) {
  const allowedOrigins = CORS_ORIGIN.split(",").map((origin) => origin.trim());
  app.use(cors({ origin: allowedOrigins }));
} else {
  // Default to permissive CORS in local development.
  app.use(cors());
}

app.use(express.json());

const expenses = [];

function validateExpensePayload(payload) {
  const name = typeof payload?.name === "string" ? payload.name.trim() : "";
  const amountValue = typeof payload?.amount === "number" ? payload.amount : Number(payload?.amount);

  if (!name) {
    return { valid: false, message: "Name is required." };
  }

  if (!Number.isFinite(amountValue) || amountValue <= 0) {
    return { valid: false, message: "Amount must be a number greater than 0." };
  }

  return { valid: true, name, amount: Number(amountValue.toFixed(2)) };
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/expenses", (_req, res) => {
  res.json({ data: expenses });
});

app.post("/api/expenses", (req, res) => {
  const validation = validateExpensePayload(req.body);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.message });
  }

  const expense = {
    id: randomUUID(),
    name: validation.name,
    amount: validation.amount,
    createdAt: new Date().toISOString(),
  };

  expenses.unshift(expense);

  return res.status(201).json({ message: "Expense saved.", data: expense });
});

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "API route not found" });
});

if (hasFrontendBuild) {
  app.use(express.static(frontendDistPath));

  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(frontendIndexPath);
  });
} else {
  app.get("/", (_req, res) => {
    res.send("Frontend build not found. Run `npm run build` in the repository root.");
  });
}

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
