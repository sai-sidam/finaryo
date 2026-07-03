import { Router } from "express";
import { createHash } from "node:crypto";
import { getPrismaClient } from "../db.js";
import { getDefaultUserIdOrThrow } from "../config/defaultUser.js";
import { statementUpload } from "../middleware/uploads.js";
import {
  resolveCategorizationSchema,
  reviewTransactionParamsSchema,
  transactionFiltersSchema,
  transactionParamsSchema,
  transactionUpdateSchema,
} from "../schemas.js";
import {
  buildTransactionFingerprint,
  resolveCategorizationDecision,
} from "../services/categorization.js";
import { reconcileDebtAccountsFromCreditCardImports } from "../services/debts.js";
import {
  buildStableAccountLabel,
  inferAccountTypeFromTransactionCorpus,
  inferBankNameFromText,
  parseStatementFile,
} from "../services/statementParser.js";
import { roundMoney, sumMoney } from "../utils/money.js";
import { normalizeDescriptionForMemory, sanitizeCategory } from "../utils/text.js";

const prisma = getPrismaClient();
const router = Router();

router.get("/api/transactions", async (req, res, next) => {
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

    const limit = filters.limit ?? 500;
    const offset = filters.offset ?? 0;
    const page = transactions.slice(offset, offset + limit);

    return res.json({ data: page });
  } catch (error) {
    return next(error);
  }
});

router.patch("/api/transactions/:sourceType/:id", async (req, res, next) => {
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
      const existingImport = await prisma.importedTransaction.findFirst({
        where: { id: params.id, userId },
      });
      if (!existingImport) {
        return res.status(404).json({ error: "Transaction not found." });
      }

      const nextDescription = payload.description ?? existingImport.description;
      const nextAmount =
        typeof payload.amount === "number" ? Number(payload.amount.toFixed(2)) : existingImport.amount;
      const nextDate = payload.date ? new Date(payload.date) : existingImport.date;
      // Keep the dedup fingerprint in sync with the edited fields so
      // re-importing the same statement doesn't create duplicates.
      const transactionFingerprint = buildTransactionFingerprint({
        date: nextDate,
        description: nextDescription,
        amount: nextAmount,
        accountName: existingImport.accountName,
        accountType: existingImport.accountType,
      });

      await prisma.importedTransaction.update({
        where: { id: existingImport.id },
        data: {
          ...(payload.description
            ? {
                description: payload.description,
                normalizedDescription: normalizeDescriptionForMemory(payload.description),
              }
            : {}),
          ...(typeof payload.amount === "number" ? { amount: nextAmount } : {}),
          ...(payload.category
            ? {
                category: sanitizeCategory(payload.category),
                categorizationSource: "manual",
                categorizationStatus: "approved",
                categorizationConfidence: 1,
              }
            : {}),
          ...(payload.date ? { date: nextDate } : {}),
          transactionFingerprint,
        },
      });

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

router.delete("/api/transactions/:sourceType/:id", async (req, res, next) => {
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

router.get("/api/transactions/review", async (_req, res, next) => {
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

router.post("/api/transactions/reclassify-existing", async (req, res, next) => {
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

router.post("/api/transactions/reinfer-accounts", async (_req, res, next) => {
  try {
    const userId = getDefaultUserIdOrThrow();
    const imports = await prisma.importedTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        statementFileName: true,
        date: true,
        description: true,
        amount: true,
        accountName: true,
        accountType: true,
      },
    });
    const byStatement = new Map();
    for (const row of imports) {
      const key = row.statementFileName || "statement";
      if (!byStatement.has(key)) {
        byStatement.set(key, []);
      }
      byStatement.get(key).push(row);
    }

    let updatedCount = 0;
    for (const [statementFileName, rows] of byStatement.entries()) {
      const descriptions = rows.map((row) => row.description).filter(Boolean);
      const inferredType = inferAccountTypeFromTransactionCorpus({
        statementFileName,
        descriptions,
        fallbackType: rows[0]?.accountType ?? "checking",
      });
      const bankName = inferBankNameFromText(`${statementFileName} ${descriptions.join(" ")}`);
      const endingMatch = statementFileName.match(/(\d{3,6})(?=\.[a-z]+$|$)/i) ?? null;
      const endingDigits = endingMatch?.[1] ?? null;
      const inferredName = buildStableAccountLabel({
        bankName,
        accountType: inferredType,
        endingDigits,
      });
      // Account name/type feed the dedup fingerprint, so each row's
      // fingerprint must be recomputed alongside the account change.
      for (const row of rows) {
        await prisma.importedTransaction.update({
          where: { id: row.id },
          data: {
            accountType: inferredType,
            accountName: inferredName,
            transactionFingerprint: buildTransactionFingerprint({
              date: row.date,
              description: row.description,
              amount: row.amount,
              accountName: inferredName,
              accountType: inferredType,
            }),
          },
        });
        updatedCount += 1;
      }
    }
    await reconcileDebtAccountsFromCreditCardImports(userId);

    return res.json({
      data: {
        statementGroups: byStatement.size,
        updatedCount,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/api/transactions/cleanup-duplicates", async (req, res, next) => {
  try {
    const userId = getDefaultUserIdOrThrow();
    const dryRun = req.query?.dryRun === "true";
    const imported = await prisma.importedTransaction.findMany({
      where: { userId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        date: true,
        description: true,
        amount: true,
        accountName: true,
        accountType: true,
      },
    });

    const seen = new Set();
    const duplicateIds = [];
    for (const row of imported) {
      const fingerprint = buildTransactionFingerprint({
        date: row.date,
        description: row.description,
        amount: row.amount,
        accountName: row.accountName,
        accountType: row.accountType,
      });
      if (seen.has(fingerprint)) {
        duplicateIds.push(row.id);
      } else {
        seen.add(fingerprint);
      }
    }

    let deletedCount = 0;
    if (!dryRun && duplicateIds.length > 0) {
      const deleteResult = await prisma.importedTransaction.deleteMany({
        where: { userId, id: { in: duplicateIds } },
      });
      deletedCount = deleteResult.count;
    }

    return res.json({
      data: {
        scannedCount: imported.length,
        uniqueCount: seen.size,
        duplicateCount: duplicateIds.length,
        deletedCount,
        dryRun,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.patch("/api/transactions/imported/:id/categorization", async (req, res, next) => {
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

router.get("/api/transactions/recurring", async (_req, res, next) => {
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
          averageAmount: roundMoney(sumMoney(rows.map((row) => row.amount)) / rows.length),
          averageGapDays: Number(averageGap.toFixed(1)),
        });
      }
    }
    return res.json({ data: recurring });
  } catch (error) {
    return next(error);
  }
});

router.post("/api/transactions/upload", statementUpload.single("statement"), async (req, res, next) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ error: "Missing statement file data." });
    }
    const parsed = await parseStatementFile(req.file);
    const userId = getDefaultUserIdOrThrow();
    const statementFileName = req.file?.originalname ?? "statement";
    const statementFileHash = createHash("sha256").update(req.file.buffer).digest("hex");
    const existingImport = await prisma.statementImport.findFirst({
      where: { userId, fileHash: statementFileHash },
    });
    if (existingImport) {
      return res.status(200).json({
        data: {
          importedCount: 0,
          skippedCount: parsed.invalidRows.length,
          duplicateCount: parsed.validTransactions.length,
          autoCategorizedCount: 0,
          needsReviewCount: 0,
          accountName: parsed.accountMetadata?.accountName ?? "Primary",
          accountType: parsed.accountMetadata?.accountType ?? "checking",
          transactions: [],
          invalidRows: parsed.invalidRows,
          duplicateReason: "This statement file was already imported (same file hash).",
        },
      });
    }
    const accountName = parsed.accountMetadata?.accountName ?? "Primary";
    const accountType = parsed.accountMetadata?.accountType ?? "checking";

    // Categorization (rules/memory/AI) happens outside the DB transaction —
    // it may call an external API and must not hold the write lock.
    const rowsToInsert = [];
    let duplicateCount = 0;
    const seenFingerprintsInFile = new Set();
    for (const transaction of parsed.validTransactions) {
      const transactionFingerprint = buildTransactionFingerprint({
        date: transaction.date,
        description: transaction.description,
        amount: transaction.amount,
        accountName,
        accountType,
      });
      if (seenFingerprintsInFile.has(transactionFingerprint)) {
        duplicateCount += 1;
        continue;
      }
      seenFingerprintsInFile.add(transactionFingerprint);
      const existingTransaction = await prisma.importedTransaction.findFirst({
        where: {
          userId,
          transactionFingerprint,
        },
        select: { id: true },
      });
      if (existingTransaction) {
        duplicateCount += 1;
        continue;
      }
      const categorization = await resolveCategorizationDecision({
        userId,
        description: transaction.description,
        amount: transaction.amount,
        fallbackCategory: transaction.category,
      });
      rowsToInsert.push({
        userId,
        statementFileName,
        statementFileHash,
        accountName,
        accountType,
        date: new Date(transaction.date),
        description: transaction.description,
        normalizedDescription: categorization.normalizedDescription,
        transactionFingerprint,
        amount: transaction.amount,
        category: categorization.category,
        categorizationSource: categorization.source,
        categorizationStatus: categorization.status,
        categorizationConfidence: categorization.confidence,
        source: transaction.source,
      });
    }

    let savedTransactions;
    try {
      // Atomic: either the whole statement lands (rows + import record) or
      // nothing does. The StatementImport unique (userId, fileHash) makes a
      // concurrent duplicate upload fail cleanly instead of double-importing.
      savedTransactions = await prisma.$transaction(async (tx) => {
        const saved = [];
        for (const row of rowsToInsert) {
          saved.push(await tx.importedTransaction.create({ data: row }));
        }
        await tx.statementImport.create({
          data: {
            userId,
            statementFileName,
            fileHash: statementFileHash,
            importedCount: saved.length,
            duplicateCount,
          },
        });
        return saved;
      });
    } catch (transactionError) {
      if (transactionError?.code === "P2002") {
        return res.status(409).json({
          error: "This statement file was already imported (same file hash).",
        });
      }
      throw transactionError;
    }
    await reconcileDebtAccountsFromCreditCardImports(userId);
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
        duplicateCount,
        autoCategorizedCount,
        needsReviewCount,
        accountName,
        accountType,
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

export default router;
