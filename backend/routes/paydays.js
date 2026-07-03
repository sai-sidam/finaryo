import { Router } from "express";
import { getPrismaClient } from "../db.js";
import { getDefaultUserIdOrThrow } from "../config/defaultUser.js";
import { paydayCreateSchema, paydayParamsSchema, paydayQuerySchema } from "../schemas.js";
import { getMonthDateRange } from "../utils/dates.js";

const prisma = getPrismaClient();
const router = Router();

router.get("/api/paydays", async (req, res, next) => {
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

router.post("/api/paydays", async (req, res, next) => {
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

router.patch("/api/paydays/:id", async (req, res, next) => {
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

router.delete("/api/paydays/:id", async (req, res, next) => {
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

export default router;
