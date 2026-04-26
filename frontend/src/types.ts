export type Expense = {
  id: string;
  name: string;
  amount: number;
  category: string;
  createdAt: string;
};

export type PlaidSyncSummary = {
  itemId: string | null;
  addedCount: number;
  modifiedCount: number;
  removedCount: number;
  cursor: string | null;
};

export type UploadedTransaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  source: string;
  accountName?: string;
  accountType?: string;
  categorizationSource?: "rule" | "memory" | "ai" | "manual";
  categorizationStatus?: "auto_assigned" | "needs_review" | "approved";
  categorizationConfidence?: number | null;
};

export type UploadResult = {
  importedCount: number;
  skippedCount: number;
  autoCategorizedCount?: number;
  needsReviewCount?: number;
  transactions: UploadedTransaction[];
  invalidRows: Array<{
    rowNumber: number;
    reason: string;
  }>;
};

export type Transaction = {
  id: string;
  sourceType: "expense" | "imported";
  description: string;
  amount: number;
  category: string;
  date: string;
  accountName?: string;
  accountType?: string;
  categorizationSource?: "rule" | "memory" | "ai" | "manual";
  categorizationStatus?: "auto_assigned" | "needs_review" | "approved";
  categorizationConfidence?: number | null;
};

export type PaydayEvent = {
  id: string;
  date: string;
  expectedAmount: number;
  note: string | null;
  recurrence: "none" | "biweekly" | "monthly";
};

export type DebtAccount = {
  id: string;
  name: string;
  lender: string | null;
  balance: number;
  apr: number;
  minimumPayment: number;
  dueDay: number;
};

export type HandLoan = {
  id: string;
  direction: "borrowed" | "lent";
  counterparty: string;
  principal: number;
  dueDate: string | null;
  status: "active" | "paid";
  note: string | null;
};

export type DebtProjection = {
  strategy: "avalanche" | "snowball";
  monthlyBudget: number;
  monthsToPayoff: number;
  estimatedInterest: number;
  debtCount: number;
  payoffOrderNames: string[];
};

export type CategorizationRule = {
  id: string;
  keyword: string;
  category: string;
  isActive: boolean;
};

export type SavingsGoal = {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: string | null;
  autoContributePayday: boolean;
  autoContributePercent: number;
  status: "active" | "completed" | "paused";
  savedAmount: number;
  remainingAmount: number;
};

export type PayslipDocument = {
  id: string;
  fileName: string;
  extractedPayDate: string | null;
  extractedNetPay: number | null;
  parseStatus: string;
  parseNotes: string | null;
};

export type MonthlyInsights = {
  month: string;
  expenseTotal: number;
  incomeTotal: number;
  net: number;
  topCategories: Array<{ category: string; amount: number }>;
};

export type BalanceSheetInsights = {
  month: string | null;
  totalNetFlow: number;
  accounts: Array<{
    accountName: string;
    accountType: string;
    netFlow: number;
    income: number;
    expenses: number;
    transfers: number;
  }>;
};

export type RecurringCandidate = {
  description: string;
  count: number;
  averageAmount: number;
  averageGapDays: number;
};
