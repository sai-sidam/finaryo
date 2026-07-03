import { Router } from "express";
import { getPrismaClient } from "../db.js";
import { getDefaultUserIdOrThrow } from "../config/defaultUser.js";
import {
  savingsContributionSchema,
  savingsGoalParamsSchema,
  savingsGoalSchema,
  savingsGoalUpdateSchema,
} from "../schemas.js";
import { roundMoney, sumMoney } from "../utils/money.js";

const prisma = getPrismaClient();
const router = Router();

router.get("/api/savings-goals", async (_req, res, next) => {
  try {
    const userId = getDefaultUserIdOrThrow();
    const goals = await prisma.savingsGoal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { contributions: true },
    });
    return res.json({
      data: goals.map((goal) => {
        const saved = sumMoney(goal.contributions.map((c) => c.amount));
        return {
          ...goal,
          targetDate: goal.targetDate ? goal.targetDate.toISOString() : null,
          createdAt: goal.createdAt.toISOString(),
          updatedAt: goal.updatedAt.toISOString(),
          savedAmount: roundMoney(saved),
          remainingAmount: roundMoney(Math.max(goal.targetAmount - saved, 0)),
        };
      }),
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/api/savings-goals", async (req, res, next) => {
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

router.patch("/api/savings-goals/:id", async (req, res, next) => {
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

router.delete("/api/savings-goals/:id", async (req, res, next) => {
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

router.post("/api/savings-goals/:id/contributions", async (req, res, next) => {
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

export default router;
