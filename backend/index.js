import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { createPlaidClient, getPlaidLinkConfig } from "./plaidClient.js";
import {
  encryptSecret,
  getPlaidAccessToken,
  getPlaidItemId,
  getTransactionsCursor,
  savePlaidAccessToken,
  setTransactionsCursor,
} from "./plaidStore.js";
import { createApiRateLimiter, generateRequestId, loadAndValidateEnv } from "./security.js";

dotenv.config();

const app = express();
const runtimeConfig = loadAndValidateEnv(process.env);
const PORT = Number(runtimeConfig.PORT) || 3001;
const CORS_ORIGIN = runtimeConfig.CORS_ORIGIN;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, "../frontend/dist");
const frontendIndexPath = path.join(frontendDistPath, "index.html");
const hasFrontendBuild = existsSync(frontendIndexPath);
const plaidClient = createPlaidClient(runtimeConfig);
const plaidLinkConfig = getPlaidLinkConfig(runtimeConfig);
const plaidRequestSchema = z.object({
  userId: z.string().min(1).max(100).optional(),
});

const plaidLinkTokenSchema = plaidRequestSchema.extend({
  clientName: z.string().min(2).max(50).optional(),
});

const publicTokenExchangeSchema = plaidRequestSchema.extend({
  publicToken: z.string().min(1, "publicToken is required."),
});

const transactionsSyncSchema = plaidRequestSchema.extend({
  count: z.number().int().min(1).max(500).optional(),
});

if (CORS_ORIGIN) {
  const allowedOrigins = CORS_ORIGIN.split(",").map((origin) => origin.trim());
  app.use(cors({ origin: allowedOrigins }));
} else {
  // Default to permissive CORS in local development.
  app.use(cors());
}

app.disable("x-powered-by");
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(express.json({ limit: "200kb" }));
app.use((req, res, next) => {
  const requestId = generateRequestId();
  res.setHeader("x-request-id", requestId);
  req.requestId = requestId;
  next();
});
app.use("/api", createApiRateLimiter());

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
  res.json({ status: "ok", plaidEnv: runtimeConfig.PLAID_ENV });
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

app.post("/api/plaid/link-token/create", async (req, res, next) => {
  try {
    const payload = plaidLinkTokenSchema.parse(req.body ?? {});
    const userId = payload.userId ?? runtimeConfig.USER_ID;
    const clientName = payload.clientName ?? "Finaryo";

    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: clientName,
      language: "en",
      products: plaidLinkConfig.products,
      country_codes: plaidLinkConfig.countryCodes,
      redirect_uri: runtimeConfig.PLAID_REDIRECT_URI,
    });

    return res.json({
      data: {
        linkToken: response.data.link_token,
        expiration: response.data.expiration,
      },
    });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/plaid/public-token/exchange", async (req, res, next) => {
  try {
    const payload = publicTokenExchangeSchema.parse(req.body ?? {});
    const userId = payload.userId ?? runtimeConfig.USER_ID;

    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: payload.publicToken,
    });

    const encryptedAccessToken = encryptSecret(exchangeResponse.data.access_token, runtimeConfig.APP_ENCRYPTION_KEY);

    savePlaidAccessToken({
      userId,
      encryptedAccessToken,
      itemId: exchangeResponse.data.item_id,
    });

    return res.status(201).json({
      data: {
        itemId: exchangeResponse.data.item_id,
      },
    });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/plaid/transactions/sync", async (req, res, next) => {
  try {
    const payload = transactionsSyncSchema.parse(req.body ?? {});
    const userId = payload.userId ?? runtimeConfig.USER_ID;
    const accessToken = getPlaidAccessToken({
      userId,
      encryptionSecret: runtimeConfig.APP_ENCRYPTION_KEY,
    });

    if (!accessToken) {
      return res.status(400).json({ error: "No Plaid item connected for this user." });
    }

    let cursor = getTransactionsCursor(userId);
    let hasMore = true;
    let added = [];
    let modified = [];
    let removed = [];
    let rounds = 0;

    while (hasMore) {
      rounds += 1;
      if (rounds > 10) {
        break;
      }

      const syncResponse = await plaidClient.transactionsSync({
        access_token: accessToken,
        cursor: cursor ?? undefined,
        count: payload.count ?? 100,
      });

      const data = syncResponse.data;
      added = [...added, ...data.added];
      modified = [...modified, ...data.modified];
      removed = [...removed, ...data.removed];
      cursor = data.next_cursor;
      hasMore = data.has_more;
    }

    if (cursor) {
      setTransactionsCursor(userId, cursor);
    }

    return res.json({
      data: {
        itemId: getPlaidItemId(userId),
        addedCount: added.length,
        modifiedCount: modified.length,
        removedCount: removed.length,
        cursor,
      },
    });
  } catch (error) {
    return next(error);
  }
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
  if (err instanceof z.ZodError) {
    return res.status(400).json({
      error: "Invalid request payload.",
      details: err.issues.map((issue) => issue.message),
    });
  }

  if (err?.response?.data) {
    const plaidError = err.response.data;
    return res.status(400).json({
      error: plaidError.error_message ?? "Plaid request failed.",
      plaidErrorCode: plaidError.error_code,
      plaidErrorType: plaidError.error_type,
    });
  }

  console.error(`[${_req.requestId}]`, err);
  return res.status(500).json({
    error: "Internal server error",
    requestId: _req.requestId,
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
