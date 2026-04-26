import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { createReadStream, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as pdfParseModule from "pdf-parse";
import * as XLSX from "xlsx";
import { z } from "zod";
import { ensureDefaultUser, getPrismaClient } from "./db.js";
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
const payslipsDirectory = path.resolve(__dirname, "./uploads/payslips");
mkdirSync(payslipsDirectory, { recursive: true });
const parsePdf = pdfParseModule.default ?? pdfParseModule;
const plaidClient = createPlaidClient(runtimeConfig);
const prisma = getPrismaClient();
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
const transactionFiltersSchema = z.object({
  q: z.string().max(120).optional(),
  category: z.string().max(80).optional(),
  minAmount: z.coerce.number().nonnegative().optional(),
  maxAmount: z.coerce.number().nonnegative().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
const transactionUpdateSchema = z.object({
  description: z.string().trim().min(1).max(200).optional(),
  amount: z.coerce.number().positive().optional(),
  category: z.string().trim().min(1).max(80).optional(),
  date: z.string().datetime().optional(),
});
const reviewTransactionParamsSchema = z.object({
  id: z.string().min(1),
});
const resolveCategorizationSchema = z.object({
  category: z.string().trim().min(1).max(80),
  applyToSimilar: z.boolean().optional(),
});
const transactionParamsSchema = z.object({
  sourceType: z.enum(["expense", "imported"]),
  id: z.string().min(1),
});
const paydayQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
});
const paydayCreateSchema = z.object({
  date: z.string().datetime(),
  expectedAmount: z.coerce.number().positive(),
  note: z.string().trim().max(200).optional(),
  recurrence: z.enum(["none", "biweekly", "monthly"]).default("none"),
});
const paydayParamsSchema = z.object({
  id: z.string().min(1),
});
const debtCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  lender: z.string().trim().max(120).optional(),
  balance: z.coerce.number().positive(),
  apr: z.coerce.number().min(0).max(100),
  minimumPayment: z.coerce.number().positive(),
  dueDay: z.coerce.number().int().min(1).max(31),
});
const debtUpdateSchema = debtCreateSchema.partial();
const debtParamsSchema = z.object({
  id: z.string().min(1),
});
const handLoanCreateSchema = z.object({
  direction: z.enum(["borrowed", "lent"]),
  counterparty: z.string().trim().min(1).max(120),
  principal: z.coerce.number().positive(),
  dueDate: z.string().datetime().optional(),
  status: z.enum(["active", "paid"]).default("active"),
  note: z.string().trim().max(200).optional(),
});
const handLoanUpdateSchema = handLoanCreateSchema.partial();
const handLoanParamsSchema = z.object({
  id: z.string().min(1),
});
const debtProjectionSchema = z.object({
  strategy: z.enum(["avalanche", "snowball"]).default("avalanche"),
  monthlyBudget: z.coerce.number().positive().optional(),
});
const categorizationRuleSchema = z.object({
  keyword: z.string().trim().min(1).max(100),
  category: z.string().trim().min(1).max(80),
  isActive: z.boolean().optional(),
});
const categorizationRuleUpdateSchema = categorizationRuleSchema.partial();
const ruleParamsSchema = z.object({
  id: z.string().min(1),
});
const savingsGoalSchema = z.object({
  name: z.string().trim().min(1).max(120),
  targetAmount: z.coerce.number().positive(),
  targetDate: z.string().datetime().optional(),
  autoContributePayday: z.boolean().optional(),
  autoContributePercent: z.coerce.number().min(0).max(100).optional(),
  status: z.enum(["active", "completed", "paused"]).optional(),
});
const savingsGoalUpdateSchema = savingsGoalSchema.partial();
const savingsGoalParamsSchema = z.object({
  id: z.string().min(1),
});
const savingsContributionSchema = z.object({
  amount: z.coerce.number().positive(),
  note: z.string().trim().max(200).optional(),
  sourceType: z.enum(["manual", "payday"]).default("manual"),
});
const payslipParamsSchema = z.object({
  id: z.string().min(1),
});
const FILE_UPLOAD_LIMIT_BYTES = 5 * 1024 * 1024;
const statementUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: FILE_UPLOAD_LIMIT_BYTES,
  },
});
const payslipUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, payslipsDirectory),
    filename: (_req, file, cb) => {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `${Date.now()}-${safeName}`);
    },
  }),
  limits: {
    fileSize: FILE_UPLOAD_LIMIT_BYTES,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf")) {
      return cb(null, true);
    }
    return cb(new Error("Only PDF payslips are supported."));
  },
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
let defaultUserId = null;

function validateExpensePayload(payload) {
  const name = typeof payload?.name === "string" ? payload.name.trim() : "";
  const amountValue = typeof payload?.amount === "number" ? payload.amount : Number(payload?.amount);
  const category = typeof payload?.category === "string" ? payload.category.trim() : "Uncategorized";

  if (!name) {
    return { valid: false, message: "Name is required." };
  }

  if (!Number.isFinite(amountValue) || amountValue <= 0) {
    return { valid: false, message: "Amount must be a number greater than 0." };
  }

  return {
    valid: true,
    name,
    amount: Number(amountValue.toFixed(2)),
    category: category || "Uncategorized",
  };
}

function pickRowValue(row, keys) {
  for (const key of keys) {
    const matchedKey = Object.keys(row).find((currentKey) => currentKey.toLowerCase().trim() === key);
    if (matchedKey) {
      return row[matchedKey];
    }
  }
  return undefined;
}

const CATEGORY_WHITELIST = [
  "Uncategorized",
  "Food",
  "Transport",
  "Groceries",
  "Shopping",
  "Bills",
  "Rent",
  "Utilities",
  "Healthcare",
  "Entertainment",
  "Travel",
  "Education",
  "Income",
  "Transfer",
  "Subscriptions",
  "Insurance",
  "Debt Payment",
  "Savings",
  "Cash Withdrawal",
  "Fees",
  "Taxes",
  "Other",
];

function normalizeDescriptionForMemory(description) {
  return String(description ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeCategory(category, fallbackCategory = "Uncategorized") {
  const normalized = String(category ?? "").trim();
  return CATEGORY_WHITELIST.includes(normalized) ? normalized : fallbackCategory;
}

async function classifyCategoryWithGemini({ description, amount }) {
  if (!runtimeConfig.GEMINI_API_KEY) {
    return null;
  }
  const model = runtimeConfig.GEMINI_MODEL || "gemini-2.0-flash-lite";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent?key=${encodeURIComponent(runtimeConfig.GEMINI_API_KEY)}`;
  const prompt = [
    "You categorize finance transactions.",
    `Allowed categories: ${CATEGORY_WHITELIST.join(", ")}`,
    `Transaction description: ${description}`,
    `Transaction amount: ${amount}`,
    "Return ONLY valid JSON with keys: category (string from allowed list), confidence (0 to 1).",
  ].join("\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 120,
        },
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      return null;
    }
    const payload = await response.json();
    const text =
      payload?.candidates?.[0]?.content?.parts
        ?.map((part) => part?.text)
        .filter(Boolean)
        .join(" ")
        ?.trim() ?? "";
    if (!text) {
      return null;
    }
    const jsonTextMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonTextMatch) {
      return null;
    }
    const parsed = JSON.parse(jsonTextMatch[0]);
    const category = sanitizeCategory(parsed?.category, "Uncategorized");
    const confidenceRaw = Number(parsed?.confidence);
    const confidence = Number.isFinite(confidenceRaw)
      ? Math.min(Math.max(confidenceRaw, 0), 1)
      : null;
    return { category, confidence };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeHeaderKey(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function parseAmountValue(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const isNegative = raw.includes("(") || /\bdr\b/i.test(raw) || raw.startsWith("-");
  const cleaned = raw.replace(/[,$()\s]/g, "").replace(/\b(cr|dr)\b/gi, "");
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  const absolute = Math.abs(parsed);
  return isNegative ? -absolute : absolute;
}

function findColumnIndex(normalizedHeaders, aliases) {
  const aliasSet = new Set(aliases.map((alias) => normalizeHeaderKey(alias)));
  return normalizedHeaders.findIndex((header) => aliasSet.has(header));
}

function detectStatementHeader(rows) {
  const MAX_SCAN_ROWS = 30;
  for (let rowIndex = 0; rowIndex < Math.min(rows.length, MAX_SCAN_ROWS); rowIndex += 1) {
    const row = Array.isArray(rows[rowIndex]) ? rows[rowIndex] : [];
    const normalizedHeaders = row.map((cell) => normalizeHeaderKey(cell));
    if (normalizedHeaders.every((cell) => !cell)) {
      continue;
    }

    const dateIndex = findColumnIndex(normalizedHeaders, [
      "date",
      "transaction date",
      "posted date",
      "booked date",
      "value date",
      "txn date",
      "trans date",
    ]);
    const descriptionIndex = findColumnIndex(normalizedHeaders, [
      "description",
      "name",
      "merchant",
      "details",
      "memo",
      "narration",
      "transaction details",
      "remarks",
      "particulars",
      "transaction description",
    ]);
    const amountIndex = findColumnIndex(normalizedHeaders, [
      "amount",
      "transaction amount",
      "value",
      "amt",
      "txn amount",
      "debit amount",
      "credit amount",
      "withdrawal amount",
      "deposit amount",
      "withdrawal amt",
      "deposit amt",
      "dr amount",
      "cr amount",
    ]);
    const debitIndex = findColumnIndex(normalizedHeaders, [
      "debit",
      "debit amount",
      "withdrawal",
      "withdrawal amount",
      "withdrawal amt",
      "dr",
      "dr amount",
    ]);
    const creditIndex = findColumnIndex(normalizedHeaders, [
      "credit",
      "credit amount",
      "deposit",
      "deposit amount",
      "deposit amt",
      "cr",
      "cr amount",
    ]);
    const categoryIndex = findColumnIndex(normalizedHeaders, ["category", "type", "transaction type", "subtype"]);

    const hasDate = dateIndex >= 0;
    const hasDescription = descriptionIndex >= 0;
    const hasAmount = amountIndex >= 0 || debitIndex >= 0 || creditIndex >= 0;
    if (hasDate && hasDescription && hasAmount) {
      return {
        headerRowIndex: rowIndex,
        columns: {
          dateIndex,
          descriptionIndex,
          amountIndex,
          debitIndex,
          creditIndex,
          categoryIndex,
        },
      };
    }
  }
  return null;
}

function normalizeExcelDate(value) {
  if (value == null || value === "") {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) {
      return null;
    }
    const normalized = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H, parsed.M, parsed.S));
    return normalized.toISOString();
  }

  const maybeDate = new Date(String(value));
  if (Number.isNaN(maybeDate.getTime())) {
    return null;
  }
  return maybeDate.toISOString();
}

function normalizeTransactionRow(row, index, columnIndexes = null) {
  const readCell = (cellIndex) => (cellIndex >= 0 && Array.isArray(row) ? row[cellIndex] : undefined);

  const description =
    columnIndexes?.descriptionIndex != null
      ? readCell(columnIndexes.descriptionIndex)
      : pickRowValue(row, [
          "description",
          "name",
          "merchant",
          "details",
          "memo",
          "narration",
          "transaction details",
          "remarks",
          "particulars",
        ]);
  const date =
    columnIndexes?.dateIndex != null
      ? readCell(columnIndexes.dateIndex)
      : pickRowValue(row, [
          "date",
          "transaction date",
          "posted date",
          "booked date",
          "value date",
          "txn date",
          "trans date",
        ]);
  const category =
    columnIndexes?.categoryIndex != null
      ? readCell(columnIndexes.categoryIndex)
      : pickRowValue(row, ["category", "type", "transaction type", "subtype"]);

  let amount;
  if (columnIndexes) {
    const directAmount = readCell(columnIndexes.amountIndex);
    const debit = readCell(columnIndexes.debitIndex);
    const credit = readCell(columnIndexes.creditIndex);

    if (directAmount !== undefined && String(directAmount).trim() !== "") {
      amount = parseAmountValue(directAmount);
    } else {
      const parsedDebit = parseAmountValue(debit);
      const parsedCredit = parseAmountValue(credit);
      if (parsedDebit != null && Math.abs(parsedDebit) > 0) {
        amount = -Math.abs(parsedDebit);
      } else if (parsedCredit != null && Math.abs(parsedCredit) > 0) {
        amount = Math.abs(parsedCredit);
      }
    }
  } else {
    amount = parseAmountValue(
      pickRowValue(row, [
        "amount",
        "transaction amount",
        "value",
        "amt",
        "debit",
        "credit",
        "withdrawal amount",
        "deposit amount",
      ]),
    );
  }

  const normalizedDescription = String(description ?? "").trim();
  const normalizedAmount = amount;
  const normalizedDate = normalizeExcelDate(date);
  const normalizedCategory = String(category ?? "").trim();

  // Ignore non-data rows (headers/footers/empty rows) without polluting invalidRows.
  if (!normalizedDescription && !normalizedDate && (normalizedAmount == null || !Number.isFinite(normalizedAmount))) {
    return { ignored: true };
  }

  if (!normalizedDescription || !Number.isFinite(normalizedAmount) || !normalizedDate) {
    return {
      valid: false,
      reason:
        "Each row must include a parseable date, description, and amount columns (e.g. date, description, amount).",
      rowNumber: index + 2,
    };
  }

  return {
    valid: true,
    transaction: {
      id: randomUUID(),
      date: normalizedDate,
      description: normalizedDescription,
      amount: Number(normalizedAmount.toFixed(2)),
      category: normalizedCategory || "Uncategorized",
      source: "uploaded_statement",
    },
  };
}

function parseStatementFile(file) {
  if (!file) {
    const error = new Error("Please upload an Excel or CSV statement file.");
    error.statusCode = 400;
    throw error;
  }

  const workbook = XLSX.read(file.buffer, { type: "buffer", cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    const error = new Error("Unable to read worksheet from uploaded file.");
    error.statusCode = 400;
    throw error;
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const matrixRows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: "",
    raw: true,
    blankrows: false,
  });

  if (!matrixRows.length) {
    const error = new Error("Uploaded file is empty.");
    error.statusCode = 400;
    throw error;
  }

  const detectedHeader = detectStatementHeader(matrixRows);
  if (!detectedHeader) {
    const error = new Error(
      "Could not detect statement columns. Please include headers for date, description, and amount/debit/credit.",
    );
    error.statusCode = 400;
    throw error;
  }

  const validTransactions = [];
  const invalidRows = [];
  const dataRows = matrixRows.slice(detectedHeader.headerRowIndex + 1);

  dataRows.forEach((row, index) => {
    const sheetRowNumber = detectedHeader.headerRowIndex + index + 2;
    const result = normalizeTransactionRow(row, sheetRowNumber - 2, detectedHeader.columns);
    if (result.ignored) {
      return;
    }
    if (result.valid) {
      validTransactions.push(result.transaction);
    } else {
      invalidRows.push({ rowNumber: sheetRowNumber, reason: result.reason });
    }
  });

  return { validTransactions, invalidRows };
}

function getDefaultUserIdOrThrow() {
  if (!defaultUserId) {
    const error = new Error("Default user is not initialized yet.");
    error.statusCode = 503;
    throw error;
  }
  return defaultUserId;
}

function getMonthDateRange(rawMonth) {
  if (!rawMonth) {
    return null;
  }
  const [yearText, monthText] = rawMonth.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return null;
  }
  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0));
  return { start, end };
}

function toMonthDateKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function calculatePayoffProjection(debts, strategy, monthlyBudgetOverride) {
  if (debts.length === 0) {
    return { strategy, monthlyBudget: 0, monthsToPayoff: 0, estimatedInterest: 0, payoffOrder: [] };
  }

  const monthlyBudget =
    typeof monthlyBudgetOverride === "number"
      ? monthlyBudgetOverride
      : debts.reduce((sum, debt) => sum + debt.minimumPayment, 0);

  const working = debts.map((debt) => ({
    id: debt.id,
    name: debt.name,
    balance: debt.balance,
    apr: debt.apr,
    minimumPayment: debt.minimumPayment,
  }));

  let months = 0;
  let interestPaid = 0;
  const payoffOrder = [];
  const MAX_MONTHS = 600;

  while (working.some((debt) => debt.balance > 0.01) && months < MAX_MONTHS) {
    months += 1;
    for (const debt of working) {
      if (debt.balance <= 0.01) {
        continue;
      }
      const monthlyRate = debt.apr / 100 / 12;
      const monthlyInterest = debt.balance * monthlyRate;
      debt.balance += monthlyInterest;
      interestPaid += monthlyInterest;
    }

    let remainingBudget = monthlyBudget;
    for (const debt of working) {
      if (debt.balance <= 0.01) {
        continue;
      }
      const payment = Math.min(debt.minimumPayment, debt.balance, remainingBudget);
      debt.balance -= payment;
      remainingBudget -= payment;
    }

    const openDebts = working
      .filter((debt) => debt.balance > 0.01)
      .sort((a, b) => {
        if (strategy === "avalanche") {
          return b.apr - a.apr || b.balance - a.balance;
        }
        return a.balance - b.balance || b.apr - a.apr;
      });

    let cursor = 0;
    while (remainingBudget > 0.01 && openDebts.length > 0) {
      const target = openDebts[cursor % openDebts.length];
      const payment = Math.min(target.balance, remainingBudget);
      target.balance -= payment;
      remainingBudget -= payment;
      if (target.balance <= 0.01) {
        target.balance = 0;
        if (!payoffOrder.includes(target.id)) {
          payoffOrder.push(target.id);
        }
        openDebts.splice(cursor % openDebts.length, 1);
      } else {
        cursor += 1;
      }
    }

    for (const debt of working) {
      if (debt.balance <= 0.01 && !payoffOrder.includes(debt.id)) {
        debt.balance = 0;
        payoffOrder.push(debt.id);
      }
    }
  }

  return {
    strategy,
    monthlyBudget: Number(monthlyBudget.toFixed(2)),
    monthsToPayoff: months,
    estimatedInterest: Number(interestPaid.toFixed(2)),
    payoffOrder,
  };
}

async function applyCategorizationRules({ userId, description, fallbackCategory }) {
  const normalizedDescription = description.toLowerCase();
  const rules = await prisma.categorizationRule.findMany({
    where: { userId, isActive: true },
    orderBy: { createdAt: "asc" },
  });
  const match = rules.find((rule) => normalizedDescription.includes(rule.keyword.toLowerCase()));
  return match?.category ?? fallbackCategory;
}

async function resolveCategorizationDecision({ userId, description, amount, fallbackCategory }) {
  const normalizedDescription = normalizeDescriptionForMemory(description);
  const normalizedFallbackCategory = sanitizeCategory(fallbackCategory, "Uncategorized");
  const amountValue = Number(amount) || 0;

  // Strong deterministic income and internal-transfer guards.
  if (
    /(salary|payroll|direct deposit|ach credit|interest credit|employer deposit|salary credit)/i.test(
      normalizedDescription,
    ) &&
    amountValue > 0
  ) {
    return {
      category: "Income",
      source: "rule",
      status: "auto_assigned",
      confidence: 0.99,
      normalizedDescription,
    };
  }
  if (
    /(credit card payment|cc payment|card payment|payment thank you|autopay card|visa payment|mastercard payment)/i.test(
      normalizedDescription,
    )
  ) {
    return {
      category: "Transfer",
      source: "rule",
      status: "auto_assigned",
      confidence: 0.99,
      normalizedDescription,
    };
  }

  const rules = await prisma.categorizationRule.findMany({
    where: { userId, isActive: true },
    orderBy: { createdAt: "asc" },
  });
  const matchedRule = rules.find((rule) => normalizedDescription.includes(rule.keyword.toLowerCase()));
  if (matchedRule) {
    return {
      category: sanitizeCategory(matchedRule.category, normalizedFallbackCategory),
      source: "rule",
      status: "auto_assigned",
      confidence: 0.98,
      normalizedDescription,
    };
  }

  const memory = await prisma.merchantCategoryMemory.findFirst({
    where: { userId, normalizedDescription },
    orderBy: { updatedAt: "desc" },
  });
  if (memory) {
    return {
      category: sanitizeCategory(memory.category, normalizedFallbackCategory),
      source: "memory",
      status: "auto_assigned",
      confidence: Math.min(Math.max(memory.confidence ?? 0.9, 0.7), 1),
      normalizedDescription,
    };
  }

  const aiPrediction = await classifyCategoryWithGemini({
    description: normalizedDescription,
    amount,
  });
  if (!aiPrediction) {
    return {
      category: normalizedFallbackCategory,
      source: "ai",
      status: "needs_review",
      confidence: null,
      normalizedDescription,
    };
  }
  const resolvedCategory = sanitizeCategory(aiPrediction.category, normalizedFallbackCategory);
  return {
    category: resolvedCategory,
    source: "ai",
    status: aiPrediction.confidence != null && aiPrediction.confidence >= 0.75 ? "auto_assigned" : "needs_review",
    confidence: aiPrediction.confidence != null ? Number(aiPrediction.confidence.toFixed(2)) : null,
    normalizedDescription,
  };
}

function tryExtractPayslipData(text) {
  const compact = text.replace(/\s+/g, " ").trim();
  const amountMatch =
    compact.match(/(?:net pay|net salary|take home|amount paid)\D{0,20}(\d[\d,]*(?:\.\d{2})?)/i) ??
    compact.match(/\$?(\d[\d,]*(?:\.\d{2})?)\s*(?:usd)?/i);
  const dateMatch =
    compact.match(/(?:pay date|payment date|paid on)\D{0,15}(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i) ??
    compact.match(/\b(\d{4}-\d{2}-\d{2})\b/);

  const extractedNetPay = amountMatch ? Number(amountMatch[1].replace(/,/g, "")) : null;
  const extractedPayDate = dateMatch ? new Date(dateMatch[1]) : null;
  const validDate = extractedPayDate && !Number.isNaN(extractedPayDate.getTime()) ? extractedPayDate : null;

  return {
    extractedNetPay: Number.isFinite(extractedNetPay) ? extractedNetPay : null,
    extractedPayDate: validDate,
  };
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", plaidEnv: runtimeConfig.PLAID_ENV });
});

app.get("/api/expenses", async (_req, res, next) => {
  try {
    const userId = getDefaultUserIdOrThrow();
    const expenses = await prisma.expense.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      data: expenses.map((expense) => ({
        ...expense,
        createdAt: expense.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/expenses", async (req, res, next) => {
  const validation = validateExpensePayload(req.body);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.message });
  }

  try {
    const userId = getDefaultUserIdOrThrow();
    const resolvedCategory = await applyCategorizationRules({
      userId,
      description: validation.name,
      fallbackCategory: validation.category,
    });
    const expense = await prisma.expense.create({
      data: {
        userId,
        name: validation.name,
        amount: validation.amount,
        category: resolvedCategory,
      },
    });

    return res.status(201).json({
      message: "Expense saved.",
      data: {
        ...expense,
        createdAt: expense.createdAt.toISOString(),
      },
    });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/transactions", async (req, res, next) => {
  try {
    const userId = getDefaultUserIdOrThrow();
    const filters = transactionFiltersSchema.parse(req.query ?? {});
    const minAmount = filters.minAmount;
    const maxAmount = filters.maxAmount;
    const q = filters.q?.trim();
    const category = filters.category?.trim();
    const startDate = filters.startDate ? new Date(filters.startDate) : null;
    const endDate = filters.endDate ? new Date(filters.endDate) : null;

    const amountFilter = {
      ...(typeof minAmount === "number" ? { gte: minAmount } : {}),
      ...(typeof maxAmount === "number" ? { lte: maxAmount } : {}),
    };
    const hasAmountFilter = Object.keys(amountFilter).length > 0;
    const expenseDateFilter = {
      ...(startDate ? { gte: startDate } : {}),
      ...(endDate ? { lte: endDate } : {}),
    };
    const hasDateFilter = Object.keys(expenseDateFilter).length > 0;

    const [expenses, importedTransactions] = await Promise.all([
      prisma.expense.findMany({
        where: {
          userId,
          ...(hasAmountFilter ? { amount: amountFilter } : {}),
          ...(category ? { category: { equals: category } } : {}),
          ...(q ? { name: { contains: q } } : {}),
          ...(hasDateFilter ? { createdAt: expenseDateFilter } : {}),
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.importedTransaction.findMany({
        where: {
          userId,
          ...(hasAmountFilter ? { amount: amountFilter } : {}),
          ...(category ? { category: { equals: category } } : {}),
          ...(q ? { description: { contains: q } } : {}),
          ...(hasDateFilter ? { date: expenseDateFilter } : {}),
        },
        orderBy: { date: "desc" },
      }),
    ]);

    const transactions = [
      ...expenses.map((expense) => ({
        id: expense.id,
        sourceType: "expense",
        description: expense.name,
        amount: expense.amount,
        category: expense.category,
        date: expense.createdAt.toISOString(),
      })),
      ...importedTransactions.map((transaction) => ({
        id: transaction.id,
        sourceType: "imported",
        description: transaction.description,
        amount: transaction.amount,
        category: transaction.category,
        date: transaction.date.toISOString(),
        accountName: transaction.accountName,
        accountType: transaction.accountType,
        categorizationSource: transaction.categorizationSource,
        categorizationStatus: transaction.categorizationStatus,
        categorizationConfidence: transaction.categorizationConfidence,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return res.json({ data: transactions });
  } catch (error) {
    return next(error);
  }
});

app.patch("/api/transactions/:sourceType/:id", async (req, res, next) => {
  try {
    const userId = getDefaultUserIdOrThrow();
    const params = transactionParamsSchema.parse(req.params ?? {});
    const payload = transactionUpdateSchema.parse(req.body ?? {});
    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ error: "Provide at least one field to update." });
    }

    if (params.sourceType === "expense") {
      const updatedExpense = await prisma.expense.updateMany({
        where: { id: params.id, userId },
        data: {
          ...(payload.description ? { name: payload.description } : {}),
          ...(typeof payload.amount === "number" ? { amount: Number(payload.amount.toFixed(2)) } : {}),
          ...(payload.category ? { category: payload.category } : {}),
          ...(payload.date ? { createdAt: new Date(payload.date) } : {}),
        },
      });

      if (updatedExpense.count === 0) {
        return res.status(404).json({ error: "Transaction not found." });
      }
    } else {
      const existingImport =
        payload.category || payload.description
          ? await prisma.importedTransaction.findFirst({
              where: { id: params.id, userId },
            })
          : null;
      const updatedImport = await prisma.importedTransaction.updateMany({
        where: { id: params.id, userId },
        data: {
          ...(payload.description
            ? {
                description: payload.description,
                normalizedDescription: normalizeDescriptionForMemory(payload.description),
              }
            : {}),
          ...(typeof payload.amount === "number" ? { amount: Number(payload.amount.toFixed(2)) } : {}),
          ...(payload.category
            ? {
                category: payload.category,
                categorizationSource: "manual",
                categorizationStatus: "approved",
                categorizationConfidence: 1,
              }
            : {}),
          ...(payload.date ? { date: new Date(payload.date) } : {}),
        },
      });

      if (updatedImport.count === 0) {
        return res.status(404).json({ error: "Transaction not found." });
      }

      if (payload.category && existingImport) {
        const normalizedDescription =
          existingImport.normalizedDescription || normalizeDescriptionForMemory(existingImport.description);
        await prisma.merchantCategoryMemory.upsert({
          where: {
            userId_normalizedDescription: {
              userId,
              normalizedDescription,
            },
          },
          update: {
            category: sanitizeCategory(payload.category, payload.category),
            confidence: 1,
            source: "manual_edit",
          },
          create: {
            userId,
            normalizedDescription,
            category: sanitizeCategory(payload.category, payload.category),
            confidence: 1,
            source: "manual_edit",
          },
        });
      }
    }

    return res.json({ message: "Transaction updated." });
  } catch (error) {
    return next(error);
  }
});

app.delete("/api/transactions/:sourceType/:id", async (req, res, next) => {
  try {
    const userId = getDefaultUserIdOrThrow();
    const params = transactionParamsSchema.parse(req.params ?? {});

    if (params.sourceType === "expense") {
      const deletedExpense = await prisma.expense.deleteMany({
        where: { id: params.id, userId },
      });
      if (deletedExpense.count === 0) {
        return res.status(404).json({ error: "Transaction not found." });
      }
    } else {
      const deletedImport = await prisma.importedTransaction.deleteMany({
        where: { id: params.id, userId },
      });
      if (deletedImport.count === 0) {
        return res.status(404).json({ error: "Transaction not found." });
      }
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

app.get("/api/transactions/review", async (_req, res, next) => {
  try {
    const userId = getDefaultUserIdOrThrow();
    const reviewTransactions = await prisma.importedTransaction.findMany({
      where: { userId, categorizationStatus: "needs_review" },
      orderBy: { date: "desc" },
    });
    return res.json({
      data: reviewTransactions.map((transaction) => ({
        id: transaction.id,
        sourceType: "imported",
        description: transaction.description,
        amount: transaction.amount,
        category: transaction.category,
        date: transaction.date.toISOString(),
        accountName: transaction.accountName,
        accountType: transaction.accountType,
        categorizationSource: transaction.categorizationSource,
        categorizationStatus: transaction.categorizationStatus,
        categorizationConfidence: transaction.categorizationConfidence,
      })),
    });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/transactions/reclassify-existing", async (req, res, next) => {
  try {
    const userId = getDefaultUserIdOrThrow();
    const onlyUncategorized = req.query?.onlyUncategorized === "true";
    const whereClause = {
      userId,
      ...(onlyUncategorized ? { category: "Uncategorized" } : {}),
    };
    const existingTransactions = await prisma.importedTransaction.findMany({
      where: whereClause,
      orderBy: { date: "desc" },
    });

    let updatedCount = 0;
    let autoAssignedCount = 0;
    let needsReviewCount = 0;

    for (const transaction of existingTransactions) {
      const categorization = await resolveCategorizationDecision({
        userId,
        description: transaction.description,
        amount: transaction.amount,
        fallbackCategory: transaction.category || "Uncategorized",
      });

      const result = await prisma.importedTransaction.updateMany({
        where: { id: transaction.id, userId },
        data: {
          normalizedDescription: categorization.normalizedDescription,
          category: categorization.category,
          categorizationSource: categorization.source,
          categorizationStatus: categorization.status,
          categorizationConfidence: categorization.confidence,
        },
      });
      if (result.count > 0) {
        updatedCount += result.count;
        if (categorization.status === "auto_assigned") {
          autoAssignedCount += 1;
        } else if (categorization.status === "needs_review") {
          needsReviewCount += 1;
        }
      }
    }

    return res.json({
      data: {
        scannedCount: existingTransactions.length,
        updatedCount,
        autoAssignedCount,
        needsReviewCount,
      },
    });
  } catch (error) {
    return next(error);
  }
});

app.patch("/api/transactions/imported/:id/categorization", async (req, res, next) => {
  try {
    const userId = getDefaultUserIdOrThrow();
    const params = reviewTransactionParamsSchema.parse(req.params ?? {});
    const payload = resolveCategorizationSchema.parse(req.body ?? {});

    const existing = await prisma.importedTransaction.findFirst({
      where: { id: params.id, userId },
    });
    if (!existing) {
      return res.status(404).json({ error: "Transaction not found." });
    }

    const normalizedDescription = existing.normalizedDescription || normalizeDescriptionForMemory(existing.description);
    const normalizedCategory = sanitizeCategory(payload.category, payload.category);

    const updateManyResult = await prisma.importedTransaction.updateMany({
      where: {
        userId,
        ...(payload.applyToSimilar
          ? { normalizedDescription }
          : { id: params.id }),
      },
      data: {
        category: normalizedCategory,
        categorizationSource: payload.applyToSimilar ? "memory" : "manual",
        categorizationStatus: "approved",
        categorizationConfidence: payload.applyToSimilar ? 0.95 : 1,
      },
    });

    await prisma.merchantCategoryMemory.upsert({
      where: {
        userId_normalizedDescription: {
          userId,
          normalizedDescription,
        },
      },
      update: {
        category: normalizedCategory,
        confidence: payload.applyToSimilar ? 0.95 : 1,
        source: "manual_review",
      },
      create: {
        userId,
        normalizedDescription,
        category: normalizedCategory,
        confidence: payload.applyToSimilar ? 0.95 : 1,
        source: "manual_review",
      },
    });

    return res.json({
      message: payload.applyToSimilar
        ? "Categorization applied to similar transactions."
        : "Categorization updated.",
      data: {
        updatedCount: updateManyResult.count,
      },
    });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/paydays", async (req, res, next) => {
  try {
    const userId = getDefaultUserIdOrThrow();
    const query = paydayQuerySchema.parse(req.query ?? {});
    const monthRange = getMonthDateRange(query.month);
    if (query.month && !monthRange) {
      return res.status(400).json({ error: "month must use YYYY-MM format." });
    }

    const paydays = await prisma.paydayEvent.findMany({
      where: {
        userId,
        ...(monthRange ? { date: { gte: monthRange.start, lt: monthRange.end } } : {}),
      },
      orderBy: { date: "asc" },
    });

    return res.json({
      data: paydays.map((payday) => ({
        ...payday,
        date: payday.date.toISOString(),
        createdAt: payday.createdAt.toISOString(),
        updatedAt: payday.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/paydays", async (req, res, next) => {
  try {
    const userId = getDefaultUserIdOrThrow();
    const payload = paydayCreateSchema.parse(req.body ?? {});
    const payday = await prisma.paydayEvent.create({
      data: {
        userId,
        date: new Date(payload.date),
        expectedAmount: Number(payload.expectedAmount.toFixed(2)),
        note: payload.note ?? null,
        recurrence: payload.recurrence,
      },
    });

    const autoGoals = await prisma.savingsGoal.findMany({
      where: {
        userId,
        status: "active",
        autoContributePayday: true,
        autoContributePercent: { gt: 0 },
      },
    });
    for (const goal of autoGoals) {
      const amount = (payday.expectedAmount * goal.autoContributePercent) / 100;
      if (amount > 0) {
        await prisma.savingsContribution.create({
          data: {
            userId,
            goalId: goal.id,
            amount: Number(amount.toFixed(2)),
            sourceType: "payday",
            note: `Auto contribution from payday ${payday.date.toISOString().slice(0, 10)}`,
          },
        });
      }
    }

    return res.status(201).json({
      data: {
        ...payday,
        date: payday.date.toISOString(),
        createdAt: payday.createdAt.toISOString(),
        updatedAt: payday.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    return next(error);
  }
});

app.patch("/api/paydays/:id", async (req, res, next) => {
  try {
    const userId = getDefaultUserIdOrThrow();
    const params = paydayParamsSchema.parse(req.params ?? {});
    const payload = paydayCreateSchema.partial().parse(req.body ?? {});

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ error: "Provide at least one field to update." });
    }

    const result = await prisma.paydayEvent.updateMany({
      where: { id: params.id, userId },
      data: {
        ...(payload.date ? { date: new Date(payload.date) } : {}),
        ...(typeof payload.expectedAmount === "number"
          ? { expectedAmount: Number(payload.expectedAmount.toFixed(2)) }
          : {}),
        ...(payload.note !== undefined ? { note: payload.note || null } : {}),
        ...(payload.recurrence ? { recurrence: payload.recurrence } : {}),
      },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: "Payday event not found." });
    }

    return res.json({ message: "Payday event updated." });
  } catch (error) {
    return next(error);
  }
});

app.delete("/api/paydays/:id", async (req, res, next) => {
  try {
    const userId = getDefaultUserIdOrThrow();
    const params = paydayParamsSchema.parse(req.params ?? {});
    const result = await prisma.paydayEvent.deleteMany({
      where: { id: params.id, userId },
    });
    if (result.count === 0) {
      return res.status(404).json({ error: "Payday event not found." });
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

app.get("/api/debts", async (_req, res, next) => {
  try {
    const userId = getDefaultUserIdOrThrow();
    const debts = await prisma.debtAccount.findMany({
      where: { userId },
      orderBy: [{ apr: "desc" }, { createdAt: "asc" }],
    });
    return res.json({
      data: debts.map((debt) => ({
        ...debt,
        createdAt: debt.createdAt.toISOString(),
        updatedAt: debt.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/debts", async (req, res, next) => {
  try {
    const userId = getDefaultUserIdOrThrow();
    const payload = debtCreateSchema.parse(req.body ?? {});
    const debt = await prisma.debtAccount.create({
      data: {
        userId,
        name: payload.name,
        lender: payload.lender || null,
        balance: Number(payload.balance.toFixed(2)),
        apr: Number(payload.apr.toFixed(2)),
        minimumPayment: Number(payload.minimumPayment.toFixed(2)),
        dueDay: payload.dueDay,
      },
    });
    return res.status(201).json({
      data: {
        ...debt,
        createdAt: debt.createdAt.toISOString(),
        updatedAt: debt.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    return next(error);
  }
});

app.patch("/api/debts/:id", async (req, res, next) => {
  try {
    const userId = getDefaultUserIdOrThrow();
    const params = debtParamsSchema.parse(req.params ?? {});
    const payload = debtUpdateSchema.parse(req.body ?? {});
    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ error: "Provide at least one field to update." });
    }

    const result = await prisma.debtAccount.updateMany({
      where: { id: params.id, userId },
      data: {
        ...(payload.name ? { name: payload.name } : {}),
        ...(payload.lender !== undefined ? { lender: payload.lender || null } : {}),
        ...(typeof payload.balance === "number" ? { balance: Number(payload.balance.toFixed(2)) } : {}),
        ...(typeof payload.apr === "number" ? { apr: Number(payload.apr.toFixed(2)) } : {}),
        ...(typeof payload.minimumPayment === "number"
          ? { minimumPayment: Number(payload.minimumPayment.toFixed(2)) }
          : {}),
        ...(typeof payload.dueDay === "number" ? { dueDay: payload.dueDay } : {}),
      },
    });
    if (result.count === 0) {
      return res.status(404).json({ error: "Debt account not found." });
    }
    return res.json({ message: "Debt account updated." });
  } catch (error) {
    return next(error);
  }
});

app.delete("/api/debts/:id", async (req, res, next) => {
  try {
    const userId = getDefaultUserIdOrThrow();
    const params = debtParamsSchema.parse(req.params ?? {});
    const result = await prisma.debtAccount.deleteMany({
      where: { id: params.id, userId },
    });
    if (result.count === 0) {
      return res.status(404).json({ error: "Debt account not found." });
    }
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

app.get("/api/hand-loans", async (_req, res, next) => {
  try {
    const userId = getDefaultUserIdOrThrow();
    const loans = await prisma.handLoan.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return res.json({
      data: loans.map((loan) => ({
        ...loan,
        dueDate: loan.dueDate ? loan.dueDate.toISOString() : null,
        createdAt: loan.createdAt.toISOString(),
        updatedAt: loan.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/hand-loans", async (req, res, next) => {
  try {
    const userId = getDefaultUserIdOrThrow();
    const payload = handLoanCreateSchema.parse(req.body ?? {});
    const loan = await prisma.handLoan.create({
      data: {
        userId,
        direction: payload.direction,
        counterparty: payload.counterparty,
        principal: Number(payload.principal.toFixed(2)),
        dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
        status: payload.status,
        note: payload.note || null,
      },
    });
    return res.status(201).json({
      data: {
        ...loan,
        dueDate: loan.dueDate ? loan.dueDate.toISOString() : null,
        createdAt: loan.createdAt.toISOString(),
        updatedAt: loan.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    return next(error);
  }
});

app.patch("/api/hand-loans/:id", async (req, res, next) => {
  try {
    const userId = getDefaultUserIdOrThrow();
    const params = handLoanParamsSchema.parse(req.params ?? {});
    const payload = handLoanUpdateSchema.parse(req.body ?? {});
    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ error: "Provide at least one field to update." });
    }
    const result = await prisma.handLoan.updateMany({
      where: { id: params.id, userId },
      data: {
        ...(payload.direction ? { direction: payload.direction } : {}),
        ...(payload.counterparty ? { counterparty: payload.counterparty } : {}),
        ...(typeof payload.principal === "number" ? { principal: Number(payload.principal.toFixed(2)) } : {}),
        ...(payload.dueDate !== undefined ? { dueDate: payload.dueDate ? new Date(payload.dueDate) : null } : {}),
        ...(payload.status ? { status: payload.status } : {}),
        ...(payload.note !== undefined ? { note: payload.note || null } : {}),
      },
    });
    if (result.count === 0) {
      return res.status(404).json({ error: "Hand loan not found." });
    }
    return res.json({ message: "Hand loan updated." });
  } catch (error) {
    return next(error);
  }
});

app.delete("/api/hand-loans/:id", async (req, res, next) => {
  try {
    const userId = getDefaultUserIdOrThrow();
    const params = handLoanParamsSchema.parse(req.params ?? {});
    const result = await prisma.handLoan.deleteMany({
      where: { id: params.id, userId },
    });
    if (result.count === 0) {
      return res.status(404).json({ error: "Hand loan not found." });
    }
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

app.get("/api/debts/projection", async (req, res, next) => {
  try {
    const userId = getDefaultUserIdOrThrow();
    const query = debtProjectionSchema.parse(req.query ?? {});
    const debts = await prisma.debtAccount.findMany({
      where: { userId },
      orderBy: [{ apr: "desc" }, { balance: "desc" }],
    });
    const projection = calculatePayoffProjection(debts, query.strategy, query.monthlyBudget);
    return res.json({
      data: {
        ...projection,
        debtCount: debts.length,
        payoffOrderNames: projection.payoffOrder
          .map((id) => debts.find((debt) => debt.id === id)?.name)
          .filter(Boolean),
      },
    });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/categorization-rules", async (_req, res, next) => {
  try {
    const userId = getDefaultUserIdOrThrow();
    const rules = await prisma.categorizationRule.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
    return res.json({ data: rules });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/categorization-rules", async (req, res, next) => {
  try {
    const userId = getDefaultUserIdOrThrow();
    const payload = categorizationRuleSchema.parse(req.body ?? {});
    const rule = await prisma.categorizationRule.create({
      data: {
        userId,
        keyword: payload.keyword,
        category: payload.category,
        isActive: payload.isActive ?? true,
      },
    });
    return res.status(201).json({ data: rule });
  } catch (error) {
    return next(error);
  }
});

app.patch("/api/categorization-rules/:id", async (req, res, next) => {
  try {
    const userId = getDefaultUserIdOrThrow();
    const params = ruleParamsSchema.parse(req.params ?? {});
    const payload = categorizationRuleUpdateSchema.parse(req.body ?? {});
    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ error: "Provide at least one field to update." });
    }
    const result = await prisma.categorizationRule.updateMany({
      where: { id: params.id, userId },
      data: payload,
    });
    if (result.count === 0) {
      return res.status(404).json({ error: "Rule not found." });
    }
    return res.json({ message: "Rule updated." });
  } catch (error) {
    return next(error);
  }
});

app.delete("/api/categorization-rules/:id", async (req, res, next) => {
  try {
    const userId = getDefaultUserIdOrThrow();
    const params = ruleParamsSchema.parse(req.params ?? {});
    const result = await prisma.categorizationRule.deleteMany({
      where: { id: params.id, userId },
    });
    if (result.count === 0) {
      return res.status(404).json({ error: "Rule not found." });
    }
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

app.get("/api/transactions/recurring", async (_req, res, next) => {
  try {
    const userId = getDefaultUserIdOrThrow();
    const [expenses, imported] = await Promise.all([
      prisma.expense.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
      prisma.importedTransaction.findMany({ where: { userId }, orderBy: { date: "asc" } }),
    ]);
    const all = [
      ...expenses.map((item) => ({
        description: item.name,
        amount: item.amount,
        date: item.createdAt,
      })),
      ...imported.map((item) => ({
        description: item.description,
        amount: item.amount,
        date: item.date,
      })),
    ];
    const byDescription = new Map();
    for (const row of all) {
      const key = row.description.trim().toLowerCase();
      if (!byDescription.has(key)) {
        byDescription.set(key, []);
      }
      byDescription.get(key).push(row);
    }
    const recurring = [];
    for (const [description, rows] of byDescription.entries()) {
      if (rows.length < 3) continue;
      const sorted = rows.sort((a, b) => a.date.getTime() - b.date.getTime());
      const gaps = [];
      for (let i = 1; i < sorted.length; i += 1) {
        gaps.push((sorted[i].date.getTime() - sorted[i - 1].date.getTime()) / (1000 * 60 * 60 * 24));
      }
      const averageGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
      if (averageGap >= 20 && averageGap <= 40) {
        recurring.push({
          description,
          count: rows.length,
          averageAmount: Number((rows.reduce((sum, row) => sum + row.amount, 0) / rows.length).toFixed(2)),
          averageGapDays: Number(averageGap.toFixed(1)),
        });
      }
    }
    return res.json({ data: recurring });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/insights/monthly", async (req, res, next) => {
  try {
    const userId = getDefaultUserIdOrThrow();
    const month = typeof req.query.month === "string" ? req.query.month : null;
    const monthRange = getMonthDateRange(month ?? toMonthDateKey(new Date()));
    if (!monthRange) {
      return res.status(400).json({ error: "month must use YYYY-MM format." });
    }
    const [expenses, imported, paydays] = await Promise.all([
      prisma.expense.findMany({ where: { userId, createdAt: { gte: monthRange.start, lt: monthRange.end } } }),
      prisma.importedTransaction.findMany({ where: { userId, date: { gte: monthRange.start, lt: monthRange.end } } }),
      prisma.paydayEvent.findMany({ where: { userId, date: { gte: monthRange.start, lt: monthRange.end } } }),
    ]);

    const importedIncome = imported.filter((row) => row.category === "Income").reduce((sum, row) => sum + row.amount, 0);
    const importedExpense = imported
      .filter((row) => row.category !== "Income" && row.category !== "Transfer")
      .reduce((sum, row) => sum + Math.abs(row.amount), 0);
    const expenseTotal = expenses.reduce((sum, row) => sum + row.amount, 0) + importedExpense;
    const incomeTotal = paydays.reduce((sum, row) => sum + row.expectedAmount, 0) + importedIncome;
    const byCategory = new Map();
    for (const row of [
      ...expenses.map((x) => ({ category: x.category, amount: x.amount })),
      ...imported
        .filter((x) => x.category !== "Transfer")
        .map((x) => ({ category: x.category, amount: Math.abs(x.amount) })),
    ]) {
      byCategory.set(row.category, (byCategory.get(row.category) ?? 0) + Math.abs(row.amount));
    }
    const topCategories = [...byCategory.entries()]
      .map(([category, amount]) => ({ category, amount: Number(amount.toFixed(2)) }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return res.json({
      data: {
        month: month ?? toMonthDateKey(new Date()),
        expenseTotal: Number(expenseTotal.toFixed(2)),
        incomeTotal: Number(incomeTotal.toFixed(2)),
        net: Number((incomeTotal - expenseTotal).toFixed(2)),
        topCategories,
      },
    });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/insights/balance-sheet", async (req, res, next) => {
  try {
    const userId = getDefaultUserIdOrThrow();
    const month = typeof req.query.month === "string" ? req.query.month : null;
    const monthRange = month ? getMonthDateRange(month) : null;
    if (month && !monthRange) {
      return res.status(400).json({ error: "month must use YYYY-MM format." });
    }
    const imported = await prisma.importedTransaction.findMany({
      where: {
        userId,
        ...(monthRange ? { date: { gte: monthRange.start, lt: monthRange.end } } : {}),
      },
      orderBy: { date: "asc" },
    });

    const accountSummary = new Map();
    for (const row of imported) {
      const key = `${row.accountName}::${row.accountType}`;
      const current = accountSummary.get(key) ?? {
        accountName: row.accountName,
        accountType: row.accountType,
        netFlow: 0,
        income: 0,
        expenses: 0,
        transfers: 0,
      };
      const amount = Number(row.amount) || 0;
      current.netFlow += amount;
      if (row.category === "Income") current.income += Math.max(amount, 0);
      else if (row.category === "Transfer") current.transfers += Math.abs(amount);
      else current.expenses += Math.abs(amount);
      accountSummary.set(key, current);
    }

    const accounts = [...accountSummary.values()].map((row) => ({
      ...row,
      netFlow: Number(row.netFlow.toFixed(2)),
      income: Number(row.income.toFixed(2)),
      expenses: Number(row.expenses.toFixed(2)),
      transfers: Number(row.transfers.toFixed(2)),
    }));
    const totalNetFlow = accounts.reduce((sum, row) => sum + row.netFlow, 0);

    return res.json({
      data: {
        month: month ?? null,
        accounts,
        totalNetFlow: Number(totalNetFlow.toFixed(2)),
      },
    });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/savings-goals", async (_req, res, next) => {
  try {
    const userId = getDefaultUserIdOrThrow();
    const goals = await prisma.savingsGoal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { contributions: true },
    });
    return res.json({
      data: goals.map((goal) => {
        const saved = goal.contributions.reduce((sum, c) => sum + c.amount, 0);
        return {
          ...goal,
          targetDate: goal.targetDate ? goal.targetDate.toISOString() : null,
          createdAt: goal.createdAt.toISOString(),
          updatedAt: goal.updatedAt.toISOString(),
          savedAmount: Number(saved.toFixed(2)),
          remainingAmount: Number(Math.max(goal.targetAmount - saved, 0).toFixed(2)),
        };
      }),
    });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/savings-goals", async (req, res, next) => {
  try {
    const userId = getDefaultUserIdOrThrow();
    const payload = savingsGoalSchema.parse(req.body ?? {});
    const goal = await prisma.savingsGoal.create({
      data: {
        userId,
        name: payload.name,
        targetAmount: Number(payload.targetAmount.toFixed(2)),
        targetDate: payload.targetDate ? new Date(payload.targetDate) : null,
        autoContributePayday: payload.autoContributePayday ?? false,
        autoContributePercent: Number((payload.autoContributePercent ?? 0).toFixed(2)),
        status: payload.status ?? "active",
      },
    });
    return res.status(201).json({
      data: {
        ...goal,
        targetDate: goal.targetDate ? goal.targetDate.toISOString() : null,
        createdAt: goal.createdAt.toISOString(),
        updatedAt: goal.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    return next(error);
  }
});

app.patch("/api/savings-goals/:id", async (req, res, next) => {
  try {
    const userId = getDefaultUserIdOrThrow();
    const params = savingsGoalParamsSchema.parse(req.params ?? {});
    const payload = savingsGoalUpdateSchema.parse(req.body ?? {});
    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ error: "Provide at least one field to update." });
    }
    const result = await prisma.savingsGoal.updateMany({
      where: { id: params.id, userId },
      data: {
        ...(payload.name ? { name: payload.name } : {}),
        ...(typeof payload.targetAmount === "number" ? { targetAmount: Number(payload.targetAmount.toFixed(2)) } : {}),
        ...(payload.targetDate !== undefined ? { targetDate: payload.targetDate ? new Date(payload.targetDate) : null } : {}),
        ...(payload.autoContributePayday !== undefined ? { autoContributePayday: payload.autoContributePayday } : {}),
        ...(typeof payload.autoContributePercent === "number"
          ? { autoContributePercent: Number(payload.autoContributePercent.toFixed(2)) }
          : {}),
        ...(payload.status ? { status: payload.status } : {}),
      },
    });
    if (result.count === 0) return res.status(404).json({ error: "Savings goal not found." });
    return res.json({ message: "Savings goal updated." });
  } catch (error) {
    return next(error);
  }
});

app.delete("/api/savings-goals/:id", async (req, res, next) => {
  try {
    const userId = getDefaultUserIdOrThrow();
    const params = savingsGoalParamsSchema.parse(req.params ?? {});
    const result = await prisma.savingsGoal.deleteMany({ where: { id: params.id, userId } });
    if (result.count === 0) return res.status(404).json({ error: "Savings goal not found." });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

app.post("/api/savings-goals/:id/contributions", async (req, res, next) => {
  try {
    const userId = getDefaultUserIdOrThrow();
    const params = savingsGoalParamsSchema.parse(req.params ?? {});
    const payload = savingsContributionSchema.parse(req.body ?? {});
    const goal = await prisma.savingsGoal.findFirst({ where: { id: params.id, userId } });
    if (!goal) return res.status(404).json({ error: "Savings goal not found." });
    const contribution = await prisma.savingsContribution.create({
      data: {
        userId,
        goalId: goal.id,
        amount: Number(payload.amount.toFixed(2)),
        sourceType: payload.sourceType,
        note: payload.note || null,
      },
    });
    return res.status(201).json({
      data: {
        ...contribution,
        createdAt: contribution.createdAt.toISOString(),
      },
    });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/payslips/upload", payslipUpload.single("payslip"), async (req, res, next) => {
  try {
    const userId = getDefaultUserIdOrThrow();
    if (!req.file) {
      return res.status(400).json({ error: "Please upload a payslip PDF." });
    }
    const pdfBuffer = await new Promise((resolve, reject) => {
      const chunks = [];
      createReadStream(req.file.path)
        .on("data", (chunk) => chunks.push(chunk))
        .on("end", () => resolve(Buffer.concat(chunks)))
        .on("error", reject);
    });
    const parsed = await parsePdf(pdfBuffer);
    const extracted = tryExtractPayslipData(parsed.text);
    const parseStatus = extracted.extractedPayDate && extracted.extractedNetPay ? "parsed" : "needs_review";
    const payslip = await prisma.payslipDocument.create({
      data: {
        userId,
        fileName: req.file.originalname,
        storagePath: req.file.path,
        extractedPayDate: extracted.extractedPayDate,
        extractedNetPay: extracted.extractedNetPay,
        parseStatus,
        parseNotes:
          parseStatus === "parsed"
            ? "Date and net pay extracted from PDF text."
            : "Could not confidently extract date/net pay. Please confirm manually.",
      },
    });
    return res.status(201).json({
      data: {
        ...payslip,
        extractedPayDate: payslip.extractedPayDate ? payslip.extractedPayDate.toISOString() : null,
        createdAt: payslip.createdAt.toISOString(),
      },
    });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/payslips", async (_req, res, next) => {
  try {
    const userId = getDefaultUserIdOrThrow();
    const items = await prisma.payslipDocument.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return res.json({
      data: items.map((item) => ({
        ...item,
        extractedPayDate: item.extractedPayDate ? item.extractedPayDate.toISOString() : null,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/payslips/:id/download", async (req, res, next) => {
  try {
    const userId = getDefaultUserIdOrThrow();
    const params = payslipParamsSchema.parse(req.params ?? {});
    const payslip = await prisma.payslipDocument.findFirst({
      where: { id: params.id, userId },
    });
    if (!payslip) return res.status(404).json({ error: "Payslip not found." });
    return res.download(payslip.storagePath, payslip.fileName);
  } catch (error) {
    return next(error);
  }
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

app.post("/api/transactions/upload", statementUpload.single("statement"), async (req, res, next) => {
  try {
    const parsed = parseStatementFile(req.file);
    const userId = getDefaultUserIdOrThrow();
    const statementFileName = req.file?.originalname ?? "statement";
    const accountNameRaw = typeof req.body?.accountName === "string" ? req.body.accountName.trim() : "";
    const accountTypeRaw = typeof req.body?.accountType === "string" ? req.body.accountType.trim().toLowerCase() : "";
    const accountName = accountNameRaw || "Primary";
    const accountType = ["checking", "savings", "credit_card", "loan", "cash"].includes(accountTypeRaw)
      ? accountTypeRaw
      : "checking";
    const savedTransactions = [];
    for (const transaction of parsed.validTransactions) {
      const categorization = await resolveCategorizationDecision({
        userId,
        description: transaction.description,
        amount: transaction.amount,
        fallbackCategory: transaction.category,
      });
      const saved = await prisma.importedTransaction.create({
        data: {
          userId,
          statementFileName,
          accountName,
          accountType,
          date: new Date(transaction.date),
          description: transaction.description,
          normalizedDescription: categorization.normalizedDescription,
          amount: transaction.amount,
          category: categorization.category,
          categorizationSource: categorization.source,
          categorizationStatus: categorization.status,
          categorizationConfidence: categorization.confidence,
          source: transaction.source,
        },
      });
      savedTransactions.push(saved);
    }
    const autoCategorizedCount = savedTransactions.filter(
      (transaction) => transaction.categorizationStatus === "auto_assigned",
    ).length;
    const needsReviewCount = savedTransactions.filter(
      (transaction) => transaction.categorizationStatus === "needs_review",
    ).length;

    return res.status(201).json({
      data: {
        importedCount: savedTransactions.length,
        skippedCount: parsed.invalidRows.length,
        autoCategorizedCount,
        needsReviewCount,
        transactions: savedTransactions.map((transaction) => ({
          id: transaction.id,
          date: transaction.date.toISOString(),
          description: transaction.description,
          amount: transaction.amount,
          category: transaction.category,
          source: transaction.source,
          accountName: transaction.accountName,
          accountType: transaction.accountType,
          categorizationSource: transaction.categorizationSource,
          categorizationStatus: transaction.categorizationStatus,
          categorizationConfidence: transaction.categorizationConfidence,
        })),
        invalidRows: parsed.invalidRows,
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
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      error: `File too large. Upload a file up to ${Math.floor(FILE_UPLOAD_LIMIT_BYTES / (1024 * 1024))}MB.`,
    });
  }

  if (typeof err?.statusCode === "number") {
    return res.status(err.statusCode).json({ error: err.message });
  }

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

async function startServer() {
  try {
    const defaultUser = await ensureDefaultUser(runtimeConfig);
    defaultUserId = defaultUser.id;
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server", error);
    process.exit(1);
  }
}

void startServer();
