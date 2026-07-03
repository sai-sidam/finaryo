import { Router } from "express";
import { getPrismaClient } from "../db.js";
import { getDefaultUserIdOrThrow } from "../config/defaultUser.js";
import { dedupeImportedTransactionsForInsights } from "../services/categorization.js";
import { getMonthDateRange, toMonthDateKey } from "../utils/dates.js";
import { roundMoney, sumMoney, toCents } from "../utils/money.js";

const prisma = getPrismaClient();
const router = Router();

router.get("/api/insights/monthly", async (req, res, next) => {
  try {
    const userId = getDefaultUserIdOrThrow();
    const month = typeof req.query.month === "string" ? req.query.month : null;
    const monthRange = getMonthDateRange(month ?? toMonthDateKey(new Date()));
    if (!monthRange) {
      return res.status(400).json({ error: "month must use YYYY-MM format." });
    }
    const [expenses, importedRaw, paydays] = await Promise.all([
      prisma.expense.findMany({ where: { userId, createdAt: { gte: monthRange.start, lt: monthRange.end } } }),
      prisma.importedTransaction.findMany({ where: { userId, date: { gte: monthRange.start, lt: monthRange.end } } }),
      prisma.paydayEvent.findMany({ where: { userId, date: { gte: monthRange.start, lt: monthRange.end } } }),
    ]);
    const imported = dedupeImportedTransactionsForInsights(importedRaw);

    const importedIncome = sumMoney(
      imported.filter((row) => row.category === "Income").map((row) => row.amount),
    );
    const importedExpense = sumMoney(
      imported
        .filter((row) => row.category !== "Income" && row.category !== "Transfer")
        .map((row) => Math.abs(row.amount)),
    );
    const expenseTotal = sumMoney([...expenses.map((row) => row.amount), importedExpense]);
    const incomeTotal = sumMoney([...paydays.map((row) => row.expectedAmount), importedIncome]);
    const byCategoryCents = new Map();
    for (const row of [
      ...expenses.map((x) => ({ category: x.category, amount: x.amount })),
      ...imported
        .filter((x) => x.category !== "Transfer")
        .map((x) => ({ category: x.category, amount: Math.abs(x.amount) })),
    ]) {
      byCategoryCents.set(row.category, (byCategoryCents.get(row.category) ?? 0) + toCents(Math.abs(row.amount)));
    }
    const topCategories = [...byCategoryCents.entries()]
      .map(([category, cents]) => ({ category, amount: cents / 100 }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return res.json({
      data: {
        month: month ?? toMonthDateKey(new Date()),
        expenseTotal: roundMoney(expenseTotal),
        incomeTotal: roundMoney(incomeTotal),
        net: roundMoney(incomeTotal - expenseTotal),
        topCategories,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/api/insights/balance-sheet", async (req, res, next) => {
  try {
    const userId = getDefaultUserIdOrThrow();
    const month = typeof req.query.month === "string" ? req.query.month : null;
    const monthRange = month ? getMonthDateRange(month) : null;
    if (month && !monthRange) {
      return res.status(400).json({ error: "month must use YYYY-MM format." });
    }
    const importedRaw = await prisma.importedTransaction.findMany({
      where: {
        userId,
        ...(monthRange ? { date: { gte: monthRange.start, lt: monthRange.end } } : {}),
      },
      orderBy: { date: "asc" },
    });
    const imported = dedupeImportedTransactionsForInsights(importedRaw);

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
      const amountCents = toCents(Number(row.amount) || 0);
      current.netFlow += amountCents;
      if (row.category === "Income") current.income += Math.max(amountCents, 0);
      else if (row.category === "Transfer") current.transfers += Math.abs(amountCents);
      else current.expenses += Math.abs(amountCents);
      accountSummary.set(key, current);
    }

    const accounts = [...accountSummary.values()].map((row) => ({
      ...row,
      netFlow: row.netFlow / 100,
      income: row.income / 100,
      expenses: row.expenses / 100,
      transfers: row.transfers / 100,
    }));
    const totalNetFlow = sumMoney(accounts.map((row) => row.netFlow));

    return res.json({
      data: {
        month: month ?? null,
        accounts,
        totalNetFlow: roundMoney(totalNetFlow),
      },
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
