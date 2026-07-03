import { Router } from "express";
import { getPrismaClient } from "../db.js";
import { getDefaultUserIdOrThrow } from "../config/defaultUser.js";
import {
  debtCreateSchema,
  debtParamsSchema,
  debtProjectionSchema,
  debtUpdateSchema,
  handLoanCreateSchema,
  handLoanParamsSchema,
  handLoanUpdateSchema,
} from "../schemas.js";
import { calculatePayoffProjection } from "../services/debts.js";

const prisma = getPrismaClient();
const router = Router();

router.get("/api/debts", async (_req, res, next) => {
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

router.post("/api/debts", async (req, res, next) => {
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

router.patch("/api/debts/:id", async (req, res, next) => {
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
        // Once the user edits a debt, imports must stop overwriting it.
        autoManaged: false,
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

router.delete("/api/debts/:id", async (req, res, next) => {
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

router.get("/api/hand-loans", async (_req, res, next) => {
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

router.post("/api/hand-loans", async (req, res, next) => {
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

router.patch("/api/hand-loans/:id", async (req, res, next) => {
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

router.delete("/api/hand-loans/:id", async (req, res, next) => {
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

router.get("/api/debts/projection", async (req, res, next) => {
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

export default router;
