import { CATEGORY_WHITELIST } from "../config/constants.js";

export function pickRowValue(row, keys) {
  for (const key of keys) {
    const matchedKey = Object.keys(row).find((currentKey) => currentKey.toLowerCase().trim() === key);
    if (matchedKey) {
      return row[matchedKey];
    }
  }
  return undefined;
}

export function normalizeDescriptionForMemory(description) {
  return String(description ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizeCategory(category, fallbackCategory = "Uncategorized") {
  const normalized = String(category ?? "").trim();
  return CATEGORY_WHITELIST.includes(normalized) ? normalized : fallbackCategory;
}

export function normalizeHeaderKey(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function parseAmountValue(value) {
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

export function findColumnIndex(normalizedHeaders, aliases) {
  const aliasSet = new Set(aliases.map((alias) => normalizeHeaderKey(alias)));
  return normalizedHeaders.findIndex((header) => aliasSet.has(header));
}
