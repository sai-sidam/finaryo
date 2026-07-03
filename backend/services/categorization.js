import { getPrismaClient } from "../db.js";
import { CATEGORY_WHITELIST } from "../config/constants.js";
import { runtimeConfig } from "../config/env.js";
import { normalizeDescriptionForMemory, sanitizeCategory } from "../utils/text.js";

const prisma = getPrismaClient();

export async function classifyCategoryWithGemini({ description, amount }) {
  if (!runtimeConfig.GEMINI_API_KEY) {
    return null;
  }
  const model = runtimeConfig.GEMINI_MODEL || "gemini-2.0-flash-lite";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent`;
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
      headers: {
        "Content-Type": "application/json",
        // Keep the API key out of the URL so it can't leak into logs.
        "x-goog-api-key": runtimeConfig.GEMINI_API_KEY,
      },
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

export async function applyCategorizationRules({ userId, description, fallbackCategory }) {
  const normalizedDescription = description.toLowerCase();
  const rules = await prisma.categorizationRule.findMany({
    where: { userId, isActive: true },
    orderBy: { createdAt: "asc" },
  });
  const match = rules.find((rule) => normalizedDescription.includes(rule.keyword.toLowerCase()));
  return match?.category ?? fallbackCategory;
}

export async function resolveCategorizationDecision({ userId, description, amount, fallbackCategory }) {
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

export function buildTransactionFingerprint({ date, description, amount, accountName, accountType }) {
  const dayKey = new Date(date).toISOString().slice(0, 10);
  const normalizedDescription = normalizeDescriptionForMemory(description);
  const normalizedAmount = Number(Number(amount).toFixed(2)).toFixed(2);
  const normalizedAccount = `${String(accountName ?? "").toLowerCase().trim()}|${String(accountType ?? "")
    .toLowerCase()
    .trim()}`;
  return `${dayKey}|${normalizedAmount}|${normalizedDescription}|${normalizedAccount}`;
}

export function dedupeImportedTransactionsForInsights(rows) {
  const seen = new Set();
  const deduped = [];
  for (const row of rows) {
    const fingerprint = buildTransactionFingerprint({
      date: row.date,
      description: row.description,
      amount: row.amount,
      accountName: row.accountName,
      accountType: row.accountType,
    });
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    deduped.push(row);
  }
  return deduped;
}
