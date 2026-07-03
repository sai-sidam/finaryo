import { z } from "zod";
import { CATEGORY_WHITELIST } from "./config/constants.js";

export const categorySchema = z.enum(CATEGORY_WHITELIST);
// Signed money value: spend is negative, income positive; zero is meaningless.
export const signedAmountSchema = z.coerce
  .number()
  .finite()
  .refine((value) => value !== 0, { message: "Amount cannot be zero." })
  .refine((value) => Math.abs(value) <= 1_000_000_000, { message: "Amount is out of range." });
export const plaidRequestSchema = z.object({
  userId: z.string().min(1).max(100).optional(),
});

export const plaidLinkTokenSchema = plaidRequestSchema.extend({
  clientName: z.string().min(2).max(50).optional(),
});

export const publicTokenExchangeSchema = plaidRequestSchema.extend({
  publicToken: z.string().min(1, "publicToken is required."),
});

export const transactionsSyncSchema = plaidRequestSchema.extend({
  count: z.number().int().min(1).max(500).optional(),
});
export const transactionFiltersSchema = z.object({
  q: z.string().max(120).optional(),
  category: z.string().max(80).optional(),
  minAmount: z.coerce.number().nonnegative().optional(),
  maxAmount: z.coerce.number().nonnegative().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});
export const transactionUpdateSchema = z.object({
  description: z.string().trim().min(1).max(200).optional(),
  amount: signedAmountSchema.optional(),
  category: categorySchema.optional(),
  date: z.string().datetime().optional(),
});
export const reviewTransactionParamsSchema = z.object({
  id: z.string().min(1),
});
export const resolveCategorizationSchema = z.object({
  category: categorySchema,
  applyToSimilar: z.boolean().optional(),
});
export const transactionParamsSchema = z.object({
  sourceType: z.enum(["expense", "imported"]),
  id: z.string().min(1),
});
export const paydayQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
});
export const paydayCreateSchema = z.object({
  date: z.string().datetime(),
  expectedAmount: z.coerce.number().positive(),
  note: z.string().trim().max(200).optional(),
  recurrence: z.enum(["none", "biweekly", "monthly"]).default("none"),
});
export const paydayParamsSchema = z.object({
  id: z.string().min(1),
});
export const debtCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  lender: z.string().trim().max(120).optional(),
  balance: z.coerce.number().positive(),
  apr: z.coerce.number().min(0).max(100),
  minimumPayment: z.coerce.number().positive(),
  dueDay: z.coerce.number().int().min(1).max(31),
});
export const debtUpdateSchema = debtCreateSchema.partial();
export const debtParamsSchema = z.object({
  id: z.string().min(1),
});
export const handLoanCreateSchema = z.object({
  direction: z.enum(["borrowed", "lent"]),
  counterparty: z.string().trim().min(1).max(120),
  principal: z.coerce.number().positive(),
  dueDate: z.string().datetime().optional(),
  status: z.enum(["active", "paid"]).default("active"),
  note: z.string().trim().max(200).optional(),
});
export const handLoanUpdateSchema = handLoanCreateSchema.partial();
export const handLoanParamsSchema = z.object({
  id: z.string().min(1),
});
export const debtProjectionSchema = z.object({
  strategy: z.enum(["avalanche", "snowball"]).default("avalanche"),
  monthlyBudget: z.coerce.number().positive().optional(),
});
export const categorizationRuleSchema = z.object({
  keyword: z.string().trim().min(1).max(100),
  category: categorySchema,
  isActive: z.boolean().optional(),
});
export const categorizationRuleUpdateSchema = categorizationRuleSchema.partial();
export const ruleParamsSchema = z.object({
  id: z.string().min(1),
});
export const savingsGoalSchema = z.object({
  name: z.string().trim().min(1).max(120),
  targetAmount: z.coerce.number().positive(),
  targetDate: z.string().datetime().optional(),
  autoContributePayday: z.boolean().optional(),
  autoContributePercent: z.coerce.number().min(0).max(100).optional(),
  status: z.enum(["active", "completed", "paused"]).optional(),
});
export const savingsGoalUpdateSchema = savingsGoalSchema.partial();
export const savingsGoalParamsSchema = z.object({
  id: z.string().min(1),
});
export const savingsContributionSchema = z.object({
  amount: z.coerce.number().positive(),
  note: z.string().trim().max(200).optional(),
  sourceType: z.enum(["manual", "payday"]).default("manual"),
});
export const payslipParamsSchema = z.object({
  id: z.string().min(1),
});
