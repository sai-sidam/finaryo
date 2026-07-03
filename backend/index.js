import cors from "cors";
import express from "express";
import helmet from "helmet";
import { setDefaultUserId } from "./config/defaultUser.js";
import {
  CORS_ORIGIN,
  PORT,
  frontendDistPath,
  frontendIndexPath,
  hasFrontendBuild,
  runtimeConfig,
} from "./config/env.js";
import { plaidClient } from "./config/plaid.js";
import { ensureDefaultUser } from "./db.js";
import { apiNotFoundHandler, errorHandler, notFoundHandler } from "./middleware/errors.js";
import debtsRouter from "./routes/debts.js";
import expensesRouter from "./routes/expenses.js";
import healthRouter from "./routes/health.js";
import insightsRouter from "./routes/insights.js";
import paydaysRouter from "./routes/paydays.js";
import payslipsRouter from "./routes/payslips.js";
import plaidRouter from "./routes/plaid.js";
import rulesRouter from "./routes/rules.js";
import savingsRouter from "./routes/savings.js";
import transactionsRouter from "./routes/transactions.js";
import { createApiRateLimiter, generateRequestId } from "./security.js";

const app = express();

if (CORS_ORIGIN) {
  const allowedOrigins = CORS_ORIGIN.split(",").map((origin) => origin.trim());
  app.use(cors({ origin: allowedOrigins }));
} else {
  // Default: only allow local dev origins instead of reflecting any origin.
  const localOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin || localOriginPattern.test(origin)) {
          return cb(null, true);
        }
        return cb(null, false);
      },
    }),
  );
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

app.use(healthRouter);
app.use(expensesRouter);
app.use(transactionsRouter);
app.use(paydaysRouter);
app.use(debtsRouter);
app.use(rulesRouter);
app.use(insightsRouter);
app.use(savingsRouter);
app.use(payslipsRouter);
app.use(plaidRouter);

app.use("/api", apiNotFoundHandler);

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

app.use(notFoundHandler);

app.use(errorHandler);

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception, shutting down:", error);
  process.exit(1);
});

async function startServer() {
  try {
    const defaultUser = await ensureDefaultUser(runtimeConfig);
    setDefaultUserId(defaultUser.id);
    app.listen(PORT, runtimeConfig.HOST, () => {
      console.log(`Server is running on http://${runtimeConfig.HOST}:${PORT}`);
      if (!plaidClient) {
        console.log("Plaid is not configured — running in statement-only mode.");
      }
    });
  } catch (error) {
    console.error("Failed to start server", error);
    process.exit(1);
  }
}

void startServer();
