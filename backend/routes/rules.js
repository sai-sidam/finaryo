import { Router } from "express";
import { getPrismaClient } from "../db.js";
import { getDefaultUserIdOrThrow } from "../config/defaultUser.js";
import { categorizationRuleSchema, categorizationRuleUpdateSchema, ruleParamsSchema } from "../schemas.js";

const prisma = getPrismaClient();
const router = Router();

router.get("/api/categorization-rules", async (_req, res, next) => {
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

router.post("/api/categorization-rules", async (req, res, next) => {
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

router.patch("/api/categorization-rules/:id", async (req, res, next) => {
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

router.delete("/api/categorization-rules/:id", async (req, res, next) => {
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

export default router;
