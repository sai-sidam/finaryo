import { Router } from "express";
import { getPrismaClient } from "../db.js";
import { getDefaultUserIdOrThrow } from "../config/defaultUser.js";
import { applyCategorizationRules } from "../services/categorization.js";

const prisma = getPrismaClient();
const router = Router();

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

router.get("/api/expenses", async (_req, res, next) => {
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

router.post("/api/expenses", async (req, res, next) => {
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

export default router;
