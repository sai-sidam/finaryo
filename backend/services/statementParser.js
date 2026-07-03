import { randomUUID } from "node:crypto";
import * as XLSX from "xlsx";
import { runtimeConfig } from "../config/env.js";
import { normalizeExcelDate } from "../utils/dates.js";
import { findColumnIndex, normalizeHeaderKey, parseAmountValue, pickRowValue } from "../utils/text.js";

export function inferAccountTypeFromText(text) {
  const normalized = text.toLowerCase();
  if (
    /(credit card|card statement|card no\.?|card number|card ending|visa|mastercard|amex|american express|discover|statement period|minimum due|total due|payment due date|available credit|credit limit|interest charged on purchases|interest charge:?purchases)/i.test(
      normalized,
    )
  ) {
    return "credit_card";
  }
  if (/(savings|saving account)/i.test(normalized)) {
    return "savings";
  }
  if (/(loan|emi|mortgage|car loan|personal loan)/i.test(normalized)) {
    return "loan";
  }
  // Only classify as cash when explicitly a cash account, not because the statement contains "cashback/cash advance".
  if (/(cash account|wallet balance|petty cash|cash ledger)/i.test(normalized)) {
    return "cash";
  }
  return "checking";
}

export function sanitizeAccountName(value) {
  const cleaned = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, 80);
}

export function inferBankNameFromText(text) {
  const normalized = String(text ?? "").toLowerCase();
  const knownBanks = [
    { name: "Chase", pattern: /(chase|jpmorgan)/i },
    { name: "Bank of America", pattern: /(bank of america|bofa)/i },
    { name: "Wells Fargo", pattern: /(wells fargo)/i },
    { name: "Citi", pattern: /(citibank|citi)/i },
    { name: "Capital One", pattern: /(capital one)/i },
    { name: "American Express", pattern: /(american express|amex)/i },
    { name: "Discover", pattern: /(discover)/i },
    { name: "HDFC Bank", pattern: /(hdfc)/i },
    { name: "ICICI Bank", pattern: /(icici)/i },
    { name: "SBI", pattern: /(state bank of india|sbi)/i },
    { name: "Axis Bank", pattern: /(axis bank)/i },
  ];
  const match = knownBanks.find((bank) => bank.pattern.test(normalized));
  return match?.name ?? null;
}

export function isKnownBankNameLikelyPresent(bankName, text) {
  const normalizedBank = String(bankName ?? "").toLowerCase().trim();
  const normalizedText = String(text ?? "").toLowerCase();
  if (!normalizedBank) return false;
  const aliases = {
    chase: ["chase", "jpmorgan"],
    "bank of america": ["bank of america", "bofa"],
    "wells fargo": ["wells fargo"],
    citi: ["citibank", "citi"],
    "capital one": ["capital one"],
    "american express": ["american express", "amex"],
    discover: ["discover"],
    "hdfc bank": ["hdfc"],
    "icici bank": ["icici"],
    sbi: ["state bank of india", "sbi"],
    "axis bank": ["axis bank"],
  };
  const tokens = aliases[normalizedBank] ?? [normalizedBank];
  return tokens.some((token) => normalizedText.includes(token));
}

export async function inferAccountMetadataWithGemini({ fileName, sheetName, cellTexts }) {
  if (!runtimeConfig.GEMINI_API_KEY) {
    return null;
  }
  const model = runtimeConfig.GEMINI_MODEL || "gemini-flash-lite-latest";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent`;
  const sampleText = cellTexts.slice(0, 180).join(" | ").slice(0, 8000);
  const prompt = [
    "You classify bank statement account metadata.",
    "Return ONLY strict JSON with keys:",
    "bankName (string or null), accountType (one of checking,savings,credit_card,loan,cash),",
    "accountLabel (string), endingDigits (string or null), confidence (0 to 1).",
    "If uncertain, still choose best accountType and set lower confidence.",
    `File name: ${fileName}`,
    `Sheet name: ${sheetName}`,
    `Statement text sample: ${sampleText}`,
  ].join("\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": runtimeConfig.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 220,
        },
      }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const text =
      payload?.candidates?.[0]?.content?.parts
        ?.map((part) => part?.text)
        .filter(Boolean)
        .join(" ")
        ?.trim() ?? "";
    if (!text) return null;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    const allowedTypes = new Set(["checking", "savings", "credit_card", "loan", "cash"]);
    const accountType = allowedTypes.has(parsed?.accountType) ? parsed.accountType : null;
    const accountLabel = sanitizeAccountName(parsed?.accountLabel);
    const bankName = sanitizeAccountName(parsed?.bankName ?? "");
    const endingDigitsRaw = String(parsed?.endingDigits ?? "").trim();
    const endingDigits = /^\d{2,6}$/.test(endingDigitsRaw) ? endingDigitsRaw : null;
    const confidenceRaw = Number(parsed?.confidence);
    const confidence = Number.isFinite(confidenceRaw)
      ? Math.max(0, Math.min(confidenceRaw, 1))
      : null;
    if (!accountType) return null;
    return {
      bankName: bankName || null,
      accountType,
      accountLabel: accountLabel || null,
      endingDigits,
      confidence,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function buildStableAccountLabel({ bankName, accountType, endingDigits }) {
  const typeLabelMap = {
    credit_card: "Credit Card",
    checking: "Checking",
    savings: "Savings",
    loan: "Loan",
    cash: "Cash",
  };
  const base = bankName ? `${bankName} ${typeLabelMap[accountType] ?? "Account"}` : typeLabelMap[accountType] ?? "Account";
  if (endingDigits) {
    return `${base} • ${endingDigits}`;
  }
  return base;
}

export function isLikelySyntheticMonthLabel(value) {
  const text = String(value ?? "").toLowerCase().trim();
  if (!text) return true;
  const digits = (text.match(/\d/g) ?? []).length;
  return (
    /^[a-z]{3,9}\s?\d{4}/i.test(text) ||
    /^\d{4}\s+\d{2}\s+\d{2}/i.test(text) ||
    /^\d{4}[-_/]?\d{2}$/i.test(text) ||
    /(statement|summary|report|period|transaction download|downloaded transactions|export|csv|xlsx)/i.test(
      text,
    ) ||
    digits >= Math.ceil(text.replace(/\s+/g, "").length * 0.45)
  );
}

export async function inferAccountMetadata({ fileName, sheetName, rows, headerRowIndex }) {
  const scanLimit = Math.min(rows.length, Math.max(headerRowIndex + 1, 20));
  const scopeRows = rows.slice(0, scanLimit);
  const headerRows = rows.slice(0, Math.max(headerRowIndex, 0));
  const headerCellTexts = headerRows
    .flatMap((row) => (Array.isArray(row) ? row : []))
    .map((cell) => String(cell ?? "").trim())
    .filter(Boolean);
  const cellTexts = scopeRows
    .flatMap((row) => (Array.isArray(row) ? row : []))
    .map((cell) => String(cell ?? "").trim())
    .filter(Boolean);
  const scopeText = cellTexts.join(" | ");
  const headerText = headerCellTexts.join(" | ");
  const fileStem = String(fileName ?? "Primary")
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim();

  let accountName =
    cellTexts.find((text) => /^account name[:\s-]+/i.test(text))?.replace(/^account name[:\s-]+/i, "") ??
    cellTexts.find((text) => /^a\/?c name[:\s-]+/i.test(text))?.replace(/^a\/?c name[:\s-]+/i, "") ??
    null;
  const inferredBankFromHeader = inferBankNameFromText(`${headerText} ${sheetName} ${fileName}`);
  const bankName = isKnownBankNameLikelyPresent(inferredBankFromHeader, `${headerText} ${sheetName} ${fileName}`)
    ? inferredBankFromHeader
    : null;
  const accountNumberText = cellTexts.find((text) =>
    /(account number|a\/?c number|acct number|ending|xxxx|x{2,})/i.test(text),
  );
  const hasMaskedPattern = /(x{2,}\d{2,6}|\*{2,}\d{2,6}|ending\s+\d{2,6})/i.test(accountNumberText ?? "");
  const endingMatch = hasMaskedPattern ? accountNumberText?.match(/(\d{2,6})\s*$/) ?? null : null;
  const endingDigits = endingMatch?.[1] ?? null;

  if (!accountName) {
    if (accountNumberText) {
      const suffix = endingDigits ? ` • ${endingDigits}` : "";
      accountName = `${sanitizeAccountName(fileStem || sheetName || "Primary")}${suffix}`;
    }
  }

  const accountType = inferAccountTypeFromText(`${scopeText} ${sheetName} ${fileName}`);
  const fallbackName = sanitizeAccountName(fileStem || sheetName || "Primary");
  const inferredRawName = sanitizeAccountName(accountName || fallbackName || "Primary");
  const inferredName = isLikelySyntheticMonthLabel(inferredRawName)
    ? buildStableAccountLabel({ bankName, accountType, endingDigits })
    : inferredRawName;

  const aiMetadata = await inferAccountMetadataWithGemini({
    fileName,
    sheetName,
    cellTexts,
  });
  if (aiMetadata && (aiMetadata.confidence ?? 0) >= 0.65) {
    const trustedAiBankName = isKnownBankNameLikelyPresent(
      aiMetadata.bankName,
      `${headerText} ${sheetName} ${fileName}`,
    )
      ? aiMetadata.bankName
      : null;
    const aiLabel =
      aiMetadata.accountLabel ||
      buildStableAccountLabel({
        bankName: trustedAiBankName,
        accountType: aiMetadata.accountType,
        endingDigits: aiMetadata.endingDigits,
      });
    return {
      accountName: sanitizeAccountName(aiLabel || inferredName || "Primary"),
      accountType: aiMetadata.accountType,
    };
  }

  return {
    accountName: sanitizeAccountName(inferredName || "Primary"),
    accountType,
  };
}

export function isLikelyNoiseRow(description, amount, date, row) {
  const normalizedDescription = String(description ?? "").toLowerCase().trim();
  const hasDate = Boolean(date);
  const hasAmount = Number.isFinite(amount);
  if (!normalizedDescription && !hasDate && !hasAmount) {
    return true;
  }
  if (
    /(opening balance|closing balance|previous balance|new balance|available credit|credit limit|minimum due|payment due date|total amount due|statement period|finance charge|interest charged|total credits|total debits|totals?)/i.test(
      normalizedDescription,
    )
  ) {
    return true;
  }
  const rowValues = Array.isArray(row)
    ? row.map((item) => String(item ?? "").toLowerCase()).join(" | ")
    : String(row ?? "").toLowerCase();
  if (
    /(page \d+ of \d+|customer care|for queries|please pay|late fee|credit score|rewards summary|this is a computer generated statement)/i.test(
      rowValues,
    )
  ) {
    return true;
  }
  return false;
}

export function inferAccountTypeFromTransactionCorpus({ statementFileName, descriptions, fallbackType }) {
  const text = `${statementFileName ?? ""} ${descriptions.join(" ")}`.toLowerCase();
  if (
    /(payment from chk|interest charged|cash advance|credit card|card no|card ending|minimum due|available credit|total due)/i.test(
      text,
    )
  ) {
    return "credit_card";
  }
  if (/(loan|emi|installment|mortgage)/i.test(text)) {
    return "loan";
  }
  if (/(savings|saving account)/i.test(text)) {
    return "savings";
  }
  return fallbackType || "checking";
}

export function detectStatementHeader(rows) {
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

export function detectStatementColumnsWithoutHeader(rows) {
  const MAX_SCAN_ROWS = Math.min(rows.length, 40);
  const columnStats = new Map();

  for (let rowIndex = 0; rowIndex < MAX_SCAN_ROWS; rowIndex += 1) {
    const row = Array.isArray(rows[rowIndex]) ? rows[rowIndex] : [];
    row.forEach((cell, colIndex) => {
      const value = String(cell ?? "").trim();
      if (!value) return;
      const stats = columnStats.get(colIndex) ?? {
        dateHits: 0,
        amountHits: 0,
        textHits: 0,
      };
      if (normalizeExcelDate(cell)) {
        stats.dateHits += 1;
      }
      if (parseAmountValue(cell) != null) {
        stats.amountHits += 1;
      }
      if (/[a-zA-Z]/.test(value)) {
        stats.textHits += 1;
      }
      columnStats.set(colIndex, stats);
    });
  }

  const candidates = [...columnStats.entries()].map(([index, stats]) => ({ index, ...stats }));
  const dateCandidate = candidates.sort((a, b) => b.dateHits - a.dateHits)[0];
  const amountCandidate = candidates
    .filter((c) => c.index !== dateCandidate?.index)
    .sort((a, b) => b.amountHits - a.amountHits)[0];
  const descriptionCandidate = candidates
    .filter((c) => c.index !== dateCandidate?.index && c.index !== amountCandidate?.index)
    .sort((a, b) => b.textHits - a.textHits)[0];

  if (
    !dateCandidate ||
    !amountCandidate ||
    !descriptionCandidate ||
    dateCandidate.dateHits < 3 ||
    amountCandidate.amountHits < 3 ||
    descriptionCandidate.textHits < 3
  ) {
    return null;
  }

  return {
    headerRowIndex: -1,
    columns: {
      dateIndex: dateCandidate.index,
      descriptionIndex: descriptionCandidate.index,
      amountIndex: amountCandidate.index,
      debitIndex: -1,
      creditIndex: -1,
      categoryIndex: -1,
    },
  };
}

export function normalizeTransactionRow(row, index, columnIndexes = null) {
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

  if (isLikelyNoiseRow(normalizedDescription, normalizedAmount, normalizedDate, row)) {
    return { ignored: true };
  }

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

export async function parseStatementFile(file) {
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
  const detectedColumns = detectedHeader ?? detectStatementColumnsWithoutHeader(matrixRows);
  if (!detectedColumns) {
    const error = new Error(
      "Could not detect statement columns. Please include headers for date, description, and amount/debit/credit.",
    );
    error.statusCode = 400;
    throw error;
  }

  const validTransactions = [];
  const invalidRows = [];
  const dataRows =
    detectedColumns.headerRowIndex >= 0
      ? matrixRows.slice(detectedColumns.headerRowIndex + 1)
      : matrixRows;

  dataRows.forEach((row, index) => {
    const sheetRowNumber =
      detectedColumns.headerRowIndex >= 0
        ? detectedColumns.headerRowIndex + index + 2
        : index + 1;
    const result = normalizeTransactionRow(row, sheetRowNumber - 2, detectedColumns.columns);
    if (result.ignored) {
      return;
    }
    if (result.valid) {
      validTransactions.push(result.transaction);
    } else {
      invalidRows.push({ rowNumber: sheetRowNumber, reason: result.reason });
    }
  });

  const accountMetadata = await inferAccountMetadata({
    fileName: file.originalname,
    sheetName: firstSheetName,
    rows: matrixRows,
    headerRowIndex: Math.max(detectedColumns.headerRowIndex, 0),
  });

  return { validTransactions, invalidRows, accountMetadata };
}
