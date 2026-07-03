import { createContext, useContext } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import type {
  BalanceSheetInsights,
  CategorizationRule,
  DebtAccount,
  DebtProjection,
  Expense,
  HandLoan,
  MonthlyInsights,
  PaydayEvent,
  PayslipDocument,
  RecurringCandidate,
  SavingsGoal,
  Transaction,
  UploadResult,
} from "../types";

export interface FinanceAppContextValue {
  API_BASE_URL: string;

  // Expenses / quick-add form
  expenses: Expense[];
  name: string;
  setName: (value: string) => void;
  amount: string;
  setAmount: (value: string) => void;
  category: string;
  setCategory: (value: string) => void;
  total: number;
  isLoading: boolean;
  isSubmitting: boolean;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;

  // Transactions
  transactions: Transaction[];
  isLoadingTransactions: boolean;
  loadTransactions: () => Promise<void>;
  hasMoreTransactions: boolean;
  isLoadingMoreTransactions: boolean;
  loadMoreTransactions: () => Promise<void>;
  searchText: string;
  setSearchText: (value: string) => void;
  filterCategory: string;
  setFilterCategory: (value: string) => void;
  minAmount: string;
  setMinAmount: (value: string) => void;
  maxAmount: string;
  setMaxAmount: (value: string) => void;
  editingTransaction: Transaction | null;
  setEditingTransaction: Dispatch<SetStateAction<Transaction | null>>;
  handleUpdateTransaction: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  handleDeleteTransaction: (transaction: Transaction) => Promise<void>;

  // Review queue
  reviewTransactions: Transaction[];
  isLoadingReviewTransactions: boolean;
  reviewCategoryEdits: Record<string, string>;
  setReviewCategoryEdits: Dispatch<SetStateAction<Record<string, string>>>;
  handleResolveReviewTransaction: (transactionId: string, applyToSimilar: boolean) => Promise<void>;

  // Statement upload
  statementFile: File | null;
  setStatementFile: (value: File | null) => void;
  isUploadingStatement: boolean;
  uploadResult: UploadResult | null;
  setUploadResult: (value: UploadResult | null) => void;
  handleStatementUpload: (event: FormEvent<HTMLFormElement>) => Promise<void>;

  // Duplicate cleanup
  isCleaningDuplicates: boolean;
  duplicateCleanupSummary: string | null;
  performDuplicateCleanup: () => Promise<void>;

  // Paydays / calendar
  activeMonth: Date;
  setActiveMonth: (value: Date) => void;
  calendarCells: Array<{ date: Date; inCurrentMonth: boolean }>;
  paydaySet: Set<string>;
  paydays: PaydayEvent[];
  isLoadingPaydays: boolean;
  loadPaydays: (targetMonth?: Date) => Promise<void>;
  selectedPaydayDate: string;
  setSelectedPaydayDate: (value: string) => void;
  paydayAmount: string;
  setPaydayAmount: (value: string) => void;
  paydayNote: string;
  setPaydayNote: (value: string) => void;
  paydayRecurrence: "none" | "biweekly" | "monthly";
  setPaydayRecurrence: (value: "none" | "biweekly" | "monthly") => void;
  editingPaydayId: string | null;
  setEditingPaydayId: (value: string | null) => void;
  handlePaydaySubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  handleDeletePayday: (id: string) => Promise<void>;

  // Debts
  debts: DebtAccount[];
  isLoadingDebts: boolean;
  debtName: string;
  setDebtName: (value: string) => void;
  debtLender: string;
  setDebtLender: (value: string) => void;
  debtBalance: string;
  setDebtBalance: (value: string) => void;
  debtApr: string;
  setDebtApr: (value: string) => void;
  debtMinimumPayment: string;
  setDebtMinimumPayment: (value: string) => void;
  debtDueDay: string;
  setDebtDueDay: (value: string) => void;
  editingDebtId: string | null;
  setEditingDebtId: (value: string | null) => void;
  handleDebtSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  handleDeleteDebt: (id: string) => Promise<void>;

  // Hand loans
  handLoans: HandLoan[];
  isLoadingHandLoans: boolean;
  loanDirection: "borrowed" | "lent";
  setLoanDirection: (value: "borrowed" | "lent") => void;
  loanCounterparty: string;
  setLoanCounterparty: (value: string) => void;
  loanPrincipal: string;
  setLoanPrincipal: (value: string) => void;
  loanDueDate: string;
  setLoanDueDate: (value: string) => void;
  loanStatus: "active" | "paid";
  setLoanStatus: (value: "active" | "paid") => void;
  loanNote: string;
  setLoanNote: (value: string) => void;
  editingLoanId: string | null;
  setEditingLoanId: (value: string | null) => void;
  handleHandLoanSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  handleDeleteHandLoan: (id: string) => Promise<void>;

  // Payoff projection
  projectionStrategy: "avalanche" | "snowball";
  setProjectionStrategy: (value: "avalanche" | "snowball") => void;
  projectionBudget: string;
  setProjectionBudget: (value: string) => void;
  projection: DebtProjection | null;
  isLoadingProjection: boolean;
  loadDebtProjection: () => Promise<void>;

  // Categorization rules
  rules: CategorizationRule[];
  isLoadingRules: boolean;
  ruleKeyword: string;
  setRuleKeyword: (value: string) => void;
  ruleCategory: string;
  setRuleCategory: (value: string) => void;
  handleCreateRule: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  handleDeleteRule: (id: string) => Promise<void>;

  // Savings goals
  savingsGoals: SavingsGoal[];
  isLoadingSavingsGoals: boolean;
  goalName: string;
  setGoalName: (value: string) => void;
  goalTargetAmount: string;
  setGoalTargetAmount: (value: string) => void;
  goalTargetDate: string;
  setGoalTargetDate: (value: string) => void;
  goalAutoContributePayday: boolean;
  setGoalAutoContributePayday: (value: boolean) => void;
  goalAutoContributePercent: string;
  setGoalAutoContributePercent: (value: string) => void;
  goalContributionAmount: Record<string, string>;
  setGoalContributionAmount: Dispatch<SetStateAction<Record<string, string>>>;
  handleCreateSavingsGoal: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  handleAddSavingsContribution: (goalId: string) => Promise<void>;

  // Insights
  insightsMonth: string;
  setInsightsMonth: (value: string) => void;
  insights: MonthlyInsights | null;
  isLoadingInsights: boolean;
  loadMonthlyInsights: () => Promise<void>;
  balanceSheet: BalanceSheetInsights | null;
  isLoadingBalanceSheet: boolean;
  loadBalanceSheet: () => Promise<void>;
  recurringCandidates: RecurringCandidate[];
  isLoadingRecurring: boolean;
  loadRecurringCandidates: () => Promise<void>;

  // Payslips
  payslips: PayslipDocument[];
  isLoadingPayslips: boolean;
  payslipFile: File | null;
  setPayslipFile: (value: File | null) => void;
  isUploadingPayslip: boolean;
  handleUploadPayslip: (event: FormEvent<HTMLFormElement>) => Promise<void>;

  // Refresh hook for out-of-provider importers (e.g. Plaid connect flow)
  refreshAfterImport: () => Promise<void>;

  // Global error + snackbar
  error: string | null;
  setError: (value: string | null) => void;
  snackbarOpen: boolean;
  setSnackbarOpen: (value: boolean) => void;
  snackbarMessage: string;
  showSnackbar: (message: string) => void;
}

export const FinanceAppContext = createContext<FinanceAppContextValue | null>(null);

export function useFinanceApp(): FinanceAppContextValue {
  const ctx = useContext(FinanceAppContext);
  if (!ctx) {
    throw new Error("useFinanceApp must be used within FinanceAppProvider");
  }
  return ctx;
}
