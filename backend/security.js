import crypto from "node:crypto";
import rateLimit from "express-rate-limit";
import { z } from "zod";

const envSchema = z
  .object({
    PORT: z.string().optional(),
    HOST: z.string().default("127.0.0.1"),
    CORS_ORIGIN: z.string().optional(),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required."),
    // Plaid is optional: statement-only mode works without it.
    PLAID_CLIENT_ID: z.string().min(1).optional(),
    PLAID_SECRET: z.string().min(1).optional(),
    PLAID_ENV: z.enum(["sandbox", "development", "production"]).default("sandbox"),
    PLAID_PRODUCTS: z.string().default("transactions"),
    PLAID_COUNTRY_CODES: z.string().default("US"),
    PLAID_REDIRECT_URI: z.string().optional(),
    APP_ENCRYPTION_KEY: z.string().min(32, "APP_ENCRYPTION_KEY must be at least 32 characters."),
    USER_ID: z.string().default("local-user"),
    GEMINI_API_KEY: z.string().min(1).optional(),
    GEMINI_MODEL: z.string().default("gemini-2.0-flash-lite"),
  })
  .refine((env) => Boolean(env.PLAID_CLIENT_ID) === Boolean(env.PLAID_SECRET), {
    message: "PLAID_CLIENT_ID and PLAID_SECRET must be set together.",
  });

export function loadAndValidateEnv(rawEnv) {
  const parsed = envSchema.safeParse(rawEnv);
  if (!parsed.success) {
    const formatted = parsed.error.issues.map((issue) => issue.message).join("; ");
    throw new Error(`Invalid environment configuration: ${formatted}`);
  }
  return parsed.data;
}

export function isPlaidConfigured(config) {
  return Boolean(config.PLAID_CLIENT_ID && config.PLAID_SECRET);
}

export function createApiRateLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please retry later." },
  });
}

export function generateRequestId() {
  return crypto.randomUUID();
}

