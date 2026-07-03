import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { FormEvent } from "react";
import { FinanceAppContext, type FinanceAppContextValue } from "../context/FinanceAppContext";
import type {
  CategorizationRule,
  DebtAccount,
  DebtProjection,
  Expense,
  HandLoan,
  BalanceSheetInsights,
  MonthlyInsights,
  PaydayEvent,
  PayslipDocument,
  RecurringCandidate,
  SavingsGoal,
  Transaction,
  UploadResult,
} from "../types";
import { buildCalendarDays, monthStartDate, toLocalDateKey, toMonthKey } from "../utils";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const TRANSACTIONS_PAGE_SIZE = 100;

/** Parses a money text input; returns null when it isn't a usable number. */
function parseMoneyInput(raw: string): number | null {
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export function FinanceAppProvider({ children }: { children: ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Uncategorized");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statementFile, setStatementFile] = useState<File | null>(null);
  const [isUploadingStatement, setIsUploadingStatement] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [hasMoreTransactions, setHasMoreTransactions] = useState(false);
  const [isLoadingMoreTransactions, setIsLoadingMoreTransactions] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [reviewTransactions, setReviewTransactions] = useState<Transaction[]>([]);
  const [isLoadingReviewTransactions, setIsLoadingReviewTransactions] = useState(false);
  const [reviewCategoryEdits, setReviewCategoryEdits] = useState<Record<string, string>>({});
  const [activeMonth, setActiveMonth] = useState(() => monthStartDate(new Date()));
  const [selectedPaydayDate, setSelectedPaydayDate] = useState(() => toLocalDateKey(new Date()));
  const [paydayAmount, setPaydayAmount] = useState("");
  const [paydayNote, setPaydayNote] = useState("");
  const [paydayRecurrence, setPaydayRecurrence] = useState<"none" | "biweekly" | "monthly">("none");
  const [paydays, setPaydays] = useState<PaydayEvent[]>([]);
  const [isLoadingPaydays, setIsLoadingPaydays] = useState(false);
  const [editingPaydayId, setEditingPaydayId] = useState<string | null>(null);
  const [debts, setDebts] = useState<DebtAccount[]>([]);
  const [isLoadingDebts, setIsLoadingDebts] = useState(false);
  const [debtName, setDebtName] = useState("");
  const [debtLender, setDebtLender] = useState("");
  const [debtBalance, setDebtBalance] = useState("");
  const [debtApr, setDebtApr] = useState("");
  const [debtMinimumPayment, setDebtMinimumPayment] = useState("");
  const [debtDueDay, setDebtDueDay] = useState("");
  const [editingDebtId, setEditingDebtId] = useState<string | null>(null);
  const [handLoans, setHandLoans] = useState<HandLoan[]>([]);
  const [isLoadingHandLoans, setIsLoadingHandLoans] = useState(false);
  const [loanDirection, setLoanDirection] = useState<"borrowed" | "lent">("borrowed");
  const [loanCounterparty, setLoanCounterparty] = useState("");
  const [loanPrincipal, setLoanPrincipal] = useState("");
  const [loanDueDate, setLoanDueDate] = useState("");
  const [loanStatus, setLoanStatus] = useState<"active" | "paid">("active");
  const [loanNote, setLoanNote] = useState("");
  const [editingLoanId, setEditingLoanId] = useState<string | null>(null);
  const [projectionStrategy, setProjectionStrategy] = useState<"avalanche" | "snowball">("avalanche");
  const [projectionBudget, setProjectionBudget] = useState("");
  const [projection, setProjection] = useState<DebtProjection | null>(null);
  const [isLoadingProjection, setIsLoadingProjection] = useState(false);
  const [rules, setRules] = useState<CategorizationRule[]>([]);
  const [ruleKeyword, setRuleKeyword] = useState("");
  const [ruleCategory, setRuleCategory] = useState("");
  const [isLoadingRules, setIsLoadingRules] = useState(false);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [isLoadingSavingsGoals, setIsLoadingSavingsGoals] = useState(false);
  const [goalName, setGoalName] = useState("");
  const [goalTargetAmount, setGoalTargetAmount] = useState("");
  const [goalTargetDate, setGoalTargetDate] = useState("");
  const [goalAutoContributePayday, setGoalAutoContributePayday] = useState(false);
  const [goalAutoContributePercent, setGoalAutoContributePercent] = useState("");
  const [goalContributionAmount, setGoalContributionAmount] = useState<Record<string, string>>({});
  const [insightsMonth, setInsightsMonth] = useState(() => toMonthKey(new Date()));
  const [insights, setInsights] = useState<MonthlyInsights | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [isLoadingBalanceSheet, setIsLoadingBalanceSheet] = useState(false);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetInsights | null>(null);
  const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);
  const [duplicateCleanupSummary, setDuplicateCleanupSummary] = useState<string | null>(null);
  const [recurringCandidates, setRecurringCandidates] = useState<RecurringCandidate[]>([]);
  const [isLoadingRecurring, setIsLoadingRecurring] = useState(false);
  const [payslipFile, setPayslipFile] = useState<File | null>(null);
  const [isUploadingPayslip, setIsUploadingPayslip] = useState(false);
  const [payslips, setPayslips] = useState<PayslipDocument[]>([]);
  const [isLoadingPayslips, setIsLoadingPayslips] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const showSnackbar = useCallback((message: string) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  }, []);

  const total = useMemo(() => expenses.reduce((sum, expense) => sum + expense.amount, 0), [expenses]);
  const calendarCells = useMemo(() => buildCalendarDays(activeMonth), [activeMonth]);
  const paydaySet = useMemo(() => new Set(paydays.map((item) => item.date.slice(0, 10))), [paydays]);

  async function loadExpenses() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/expenses`);
      if (!response.ok) {
        throw new Error("Unable to load expenses.");
      }
      const payload = (await response.json()) as { data?: Expense[] };
      setExpenses(Array.isArray(payload.data) ? payload.data : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unexpected error while loading expenses.");
    } finally {
      setIsLoading(false);
    }
  }

  function buildTransactionQuery(offset: number) {
    const query = new URLSearchParams();
    if (searchText.trim()) {
      query.set("q", searchText.trim());
    }
    if (filterCategory.trim()) {
      query.set("category", filterCategory.trim());
    }
    if (minAmount.trim()) {
      query.set("minAmount", minAmount.trim());
    }
    if (maxAmount.trim()) {
      query.set("maxAmount", maxAmount.trim());
    }
    query.set("limit", String(TRANSACTIONS_PAGE_SIZE));
    query.set("offset", String(offset));
    return query;
  }

  async function loadTransactions() {
    setIsLoadingTransactions(true);
    setError(null);
    try {
      const query = buildTransactionQuery(0);
      const response = await fetch(`${API_BASE_URL}/api/transactions?${query.toString()}`);
      const payload = (await response.json()) as { error?: string; data?: Transaction[] };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load transactions.");
      }
      const rows = Array.isArray(payload.data) ? payload.data : [];
      setTransactions(rows);
      setHasMoreTransactions(rows.length === TRANSACTIONS_PAGE_SIZE);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unexpected error while loading transactions.");
    } finally {
      setIsLoadingTransactions(false);
    }
  }

  async function loadMoreTransactions() {
    setIsLoadingMoreTransactions(true);
    setError(null);
    try {
      const query = buildTransactionQuery(transactions.length);
      const response = await fetch(`${API_BASE_URL}/api/transactions?${query.toString()}`);
      const payload = (await response.json()) as { error?: string; data?: Transaction[] };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load more transactions.");
      }
      const rows = Array.isArray(payload.data) ? payload.data : [];
      setTransactions((current) => [...current, ...rows]);
      setHasMoreTransactions(rows.length === TRANSACTIONS_PAGE_SIZE);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unexpected error while loading more transactions.");
    } finally {
      setIsLoadingMoreTransactions(false);
    }
  }

  async function loadReviewTransactions() {
    setIsLoadingReviewTransactions(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/transactions/review`);
      const payload = (await response.json()) as { error?: string; data?: Transaction[] };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load review queue.");
      }
      const data = Array.isArray(payload.data) ? payload.data : [];
      setReviewTransactions(data);
      setReviewCategoryEdits((current) => {
        // Rebuild from the fresh queue so edits for resolved rows don't linger.
        const next: Record<string, string> = {};
        for (const row of data) {
          next[row.id] = current[row.id] ?? row.category;
        }
        return next;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unexpected error while loading review queue.");
    } finally {
      setIsLoadingReviewTransactions(false);
    }
  }

  async function loadPaydays(targetMonth: Date = activeMonth) {
    setIsLoadingPaydays(true);
    setError(null);
    try {
      const month = toMonthKey(targetMonth);
      const response = await fetch(`${API_BASE_URL}/api/paydays?month=${month}`);
      const payload = (await response.json()) as { error?: string; data?: PaydayEvent[] };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load paydays.");
      }
      setPaydays(Array.isArray(payload.data) ? payload.data : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unexpected error while loading paydays.");
    } finally {
      setIsLoadingPaydays(false);
    }
  }

  async function loadDebts() {
    setIsLoadingDebts(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/debts`);
      const payload = (await response.json()) as { error?: string; data?: DebtAccount[] };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load debt accounts.");
      }
      setDebts(Array.isArray(payload.data) ? payload.data : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unexpected error while loading debt accounts.");
    } finally {
      setIsLoadingDebts(false);
    }
  }

  async function loadHandLoans() {
    setIsLoadingHandLoans(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/hand-loans`);
      const payload = (await response.json()) as { error?: string; data?: HandLoan[] };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load hand loans.");
      }
      setHandLoans(Array.isArray(payload.data) ? payload.data : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unexpected error while loading hand loans.");
    } finally {
      setIsLoadingHandLoans(false);
    }
  }

  async function loadDebtProjection() {
    setIsLoadingProjection(true);
    setError(null);
    try {
      const params = new URLSearchParams({ strategy: projectionStrategy });
      if (projectionBudget.trim()) {
        params.set("monthlyBudget", projectionBudget.trim());
      }
      const response = await fetch(`${API_BASE_URL}/api/debts/projection?${params.toString()}`);
      const payload = (await response.json()) as { error?: string; data?: DebtProjection };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "Unable to load payoff projection.");
      }
      setProjection(payload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unexpected error while loading payoff projection.");
    } finally {
      setIsLoadingProjection(false);
    }
  }

  async function loadCategorizationRules() {
    setIsLoadingRules(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/categorization-rules`);
      const payload = (await response.json()) as { error?: string; data?: CategorizationRule[] };
      if (!response.ok) throw new Error(payload.error ?? "Unable to load rules.");
      setRules(Array.isArray(payload.data) ? payload.data : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load rules.");
    } finally {
      setIsLoadingRules(false);
    }
  }

  async function loadSavingsGoals() {
    setIsLoadingSavingsGoals(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/savings-goals`);
      const payload = (await response.json()) as { error?: string; data?: SavingsGoal[] };
      if (!response.ok) throw new Error(payload.error ?? "Unable to load savings goals.");
      setSavingsGoals(Array.isArray(payload.data) ? payload.data : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load savings goals.");
    } finally {
      setIsLoadingSavingsGoals(false);
    }
  }

  async function loadMonthlyInsights() {
    setIsLoadingInsights(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/insights/monthly?month=${insightsMonth}`);
      const payload = (await response.json()) as { error?: string; data?: MonthlyInsights };
      if (!response.ok || !payload.data) throw new Error(payload.error ?? "Unable to load monthly insights.");
      setInsights(payload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load monthly insights.");
    } finally {
      setIsLoadingInsights(false);
    }
  }

  async function loadBalanceSheet() {
    setIsLoadingBalanceSheet(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/insights/balance-sheet?month=${insightsMonth}`);
      const payload = (await response.json()) as { error?: string; data?: BalanceSheetInsights };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "Unable to load balance sheet.");
      }
      setBalanceSheet(payload.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load balance sheet.");
    } finally {
      setIsLoadingBalanceSheet(false);
    }
  }

  async function loadRecurringCandidates() {
    setIsLoadingRecurring(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/transactions/recurring`);
      const payload = (await response.json()) as { error?: string; data?: RecurringCandidate[] };
      if (!response.ok) throw new Error(payload.error ?? "Unable to load recurring candidates.");
      setRecurringCandidates(Array.isArray(payload.data) ? payload.data : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load recurring candidates.");
    } finally {
      setIsLoadingRecurring(false);
    }
  }

  async function loadPayslips() {
    setIsLoadingPayslips(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/payslips`);
      const payload = (await response.json()) as { error?: string; data?: PayslipDocument[] };
      if (!response.ok) throw new Error(payload.error ?? "Unable to load payslips.");
      setPayslips(Array.isArray(payload.data) ? payload.data : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load payslips.");
    } finally {
      setIsLoadingPayslips(false);
    }
  }

  useEffect(() => {
    void loadExpenses();
    void loadTransactions();
    void loadPaydays(activeMonth);
    void loadDebts();
    void loadHandLoans();
    void loadDebtProjection();
    void loadCategorizationRules();
    void loadSavingsGoals();
    void loadMonthlyInsights();
    void loadBalanceSheet();
    void loadRecurringCandidates();
    void loadPayslips();
    void loadReviewTransactions();
    // Initial data load only — loaders are stable for the app's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadMonthlyInsights();
    void loadBalanceSheet();
    // Refetch when the selected month changes; loaders read latest state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insightsMonth]);

  /** Reloads everything an import (statement or Plaid sync) can affect. */
  async function refreshAfterImport() {
    await Promise.all([
      loadTransactions(),
      loadReviewTransactions(),
      loadMonthlyInsights(),
      loadBalanceSheet(),
      loadDebts(),
      loadDebtProjection(),
    ]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amountValue = parseMoneyInput(amount);
    if (amountValue == null || amountValue <= 0) {
      setError("Amount must be a number greater than 0.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/expenses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, amount: amountValue, category }),
      });

      const payload = (await response.json()) as { error?: string; data?: Expense };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "Unable to save expense.");
      }

      setExpenses((currentExpenses) => [payload.data as Expense, ...currentExpenses]);
      setName("");
      setAmount("");
      setCategory("Uncategorized");
      void loadTransactions();
      showSnackbar("Expense added.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unexpected error while saving expense.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatementUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!statementFile) {
      setError("Please choose a .xlsx, .xls, or .csv file to upload.");
      return;
    }

    setError(null);
    setUploadResult(null);
    setIsUploadingStatement(true);
    try {
      const formData = new FormData();
      formData.append("statement", statementFile);

      const response = await fetch(`${API_BASE_URL}/api/transactions/upload`, {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as { error?: string; data?: UploadResult };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "Unable to upload statement.");
      }

      setUploadResult(payload.data);
      setStatementFile(null);
      await Promise.all([loadTransactions(), loadReviewTransactions(), loadMonthlyInsights(), loadBalanceSheet()]);
      showSnackbar("Statement imported.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload statement.");
    } finally {
      setIsUploadingStatement(false);
    }
  }

  async function handleDeleteTransaction(transaction: Transaction) {
    setError(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/transactions/${transaction.sourceType}/${transaction.id}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Unable to delete transaction.");
      }
      await Promise.all([loadExpenses(), loadTransactions(), loadReviewTransactions(), loadMonthlyInsights(), loadBalanceSheet()]);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete transaction.");
    }
  }

  async function handleUpdateTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingTransaction) {
      return;
    }
    if (!Number.isFinite(editingTransaction.amount) || editingTransaction.amount === 0) {
      setError("Amount must be a non-zero number (negative for spending).");
      return;
    }

    setError(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/transactions/${editingTransaction.sourceType}/${editingTransaction.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            description: editingTransaction.description,
            amount: editingTransaction.amount,
            category: editingTransaction.category,
            date: new Date(editingTransaction.date).toISOString(),
          }),
        },
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to update transaction.");
      }
      setEditingTransaction(null);
      await Promise.all([
        loadExpenses(),
        loadTransactions(),
        loadReviewTransactions(),
        loadMonthlyInsights(),
        loadBalanceSheet(),
      ]);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update transaction.");
    }
  }

  async function handlePaydaySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const expectedAmount = parseMoneyInput(paydayAmount);
    if (expectedAmount == null || expectedAmount <= 0) {
      setError("Expected amount must be a number greater than 0.");
      return;
    }
    setError(null);
    try {
      const payload = {
        date: new Date(`${selectedPaydayDate}T00:00:00.000Z`).toISOString(),
        expectedAmount,
        note: paydayNote.trim(),
        recurrence: paydayRecurrence,
      };

      const isEditing = Boolean(editingPaydayId);
      const url = isEditing ? `${API_BASE_URL}/api/paydays/${editingPaydayId}` : `${API_BASE_URL}/api/paydays`;
      const response = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const responsePayload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(responsePayload.error ?? "Unable to save payday.");
      }

      setPaydayAmount("");
      setPaydayNote("");
      setPaydayRecurrence("none");
      setEditingPaydayId(null);
      await loadPaydays(activeMonth);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save payday.");
    }
  }

  async function handleDeletePayday(id: string) {
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/paydays/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Unable to delete payday.");
      }
      await loadPaydays(activeMonth);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete payday.");
    }
  }

  async function handleDebtSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const balance = parseMoneyInput(debtBalance);
    const apr = parseMoneyInput(debtApr);
    const minimumPayment = parseMoneyInput(debtMinimumPayment);
    const dueDay = Number(debtDueDay);
    if (balance == null || balance <= 0 || apr == null || minimumPayment == null || minimumPayment <= 0) {
      setError("Balance, APR, and minimum payment must be valid numbers.");
      return;
    }
    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
      setError("Due day must be a whole number between 1 and 31.");
      return;
    }
    setError(null);
    try {
      const payload = {
        name: debtName,
        lender: debtLender,
        balance,
        apr,
        minimumPayment,
        dueDay,
      };
      const isEditing = Boolean(editingDebtId);
      const response = await fetch(
        isEditing ? `${API_BASE_URL}/api/debts/${editingDebtId}` : `${API_BASE_URL}/api/debts`,
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Unable to save debt account.");
      }
      setDebtName("");
      setDebtLender("");
      setDebtBalance("");
      setDebtApr("");
      setDebtMinimumPayment("");
      setDebtDueDay("");
      setEditingDebtId(null);
      await Promise.all([loadDebts(), loadDebtProjection()]);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save debt account.");
    }
  }

  async function handleDeleteDebt(id: string) {
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/debts/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Unable to delete debt account.");
      }
      await Promise.all([loadDebts(), loadDebtProjection()]);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete debt account.");
    }
  }

  async function handleHandLoanSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const principal = parseMoneyInput(loanPrincipal);
    if (principal == null || principal <= 0) {
      setError("Principal must be a number greater than 0.");
      return;
    }
    setError(null);
    try {
      const payload = {
        direction: loanDirection,
        counterparty: loanCounterparty,
        principal,
        dueDate: loanDueDate ? new Date(`${loanDueDate}T00:00:00.000Z`).toISOString() : undefined,
        status: loanStatus,
        note: loanNote,
      };
      const isEditing = Boolean(editingLoanId);
      const response = await fetch(
        isEditing ? `${API_BASE_URL}/api/hand-loans/${editingLoanId}` : `${API_BASE_URL}/api/hand-loans`,
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Unable to save hand loan.");
      }
      setLoanDirection("borrowed");
      setLoanCounterparty("");
      setLoanPrincipal("");
      setLoanDueDate("");
      setLoanStatus("active");
      setLoanNote("");
      setEditingLoanId(null);
      await loadHandLoans();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save hand loan.");
    }
  }

  async function handleDeleteHandLoan(id: string) {
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/hand-loans/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Unable to delete hand loan.");
      }
      await loadHandLoans();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete hand loan.");
    }
  }

  async function handleCreateRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/categorization-rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: ruleKeyword, category: ruleCategory }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to create rule.");
      setRuleKeyword("");
      setRuleCategory("");
      await loadCategorizationRules();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create rule.");
    }
  }

  async function handleDeleteRule(id: string) {
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/categorization-rules/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Unable to delete rule.");
      }
      await loadCategorizationRules();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete rule.");
    }
  }

  async function handleCreateSavingsGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const targetAmount = parseMoneyInput(goalTargetAmount);
    if (targetAmount == null || targetAmount <= 0) {
      setError("Target amount must be a number greater than 0.");
      return;
    }
    const autoContributePercent = parseMoneyInput(goalAutoContributePercent || "0");
    if (autoContributePercent == null || autoContributePercent < 0 || autoContributePercent > 100) {
      setError("Auto-contribute percent must be between 0 and 100.");
      return;
    }
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/savings-goals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: goalName,
          targetAmount,
          targetDate: goalTargetDate ? new Date(`${goalTargetDate}T00:00:00.000Z`).toISOString() : undefined,
          autoContributePayday: goalAutoContributePayday,
          autoContributePercent,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to create savings goal.");
      setGoalName("");
      setGoalTargetAmount("");
      setGoalTargetDate("");
      setGoalAutoContributePayday(false);
      setGoalAutoContributePercent("");
      await loadSavingsGoals();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create savings goal.");
    }
  }

  async function handleAddSavingsContribution(goalId: string) {
    const rawAmount = goalContributionAmount[goalId] ?? "";
    if (!rawAmount.trim()) return;
    const contributionAmount = parseMoneyInput(rawAmount);
    if (contributionAmount == null || contributionAmount <= 0) {
      setError("Contribution amount must be a number greater than 0.");
      return;
    }
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/savings-goals/${goalId}/contributions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: contributionAmount, sourceType: "manual" }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to add savings contribution.");
      setGoalContributionAmount((current) => ({ ...current, [goalId]: "" }));
      await loadSavingsGoals();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to add savings contribution.");
    }
  }

  async function handleUploadPayslip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!payslipFile) return;
    setIsUploadingPayslip(true);
    try {
      const formData = new FormData();
      formData.append("payslip", payslipFile);
      const response = await fetch(`${API_BASE_URL}/api/payslips/upload`, {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to upload payslip.");
      setPayslipFile(null);
      await loadPayslips();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload payslip.");
    } finally {
      setIsUploadingPayslip(false);
    }
  }

  async function handleResolveReviewTransaction(transactionId: string, applyToSimilar: boolean) {
    const categoryValue = (reviewCategoryEdits[transactionId] ?? "").trim();
    if (!categoryValue) {
      setError("Please enter a category before resolving review.");
      return;
    }
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/transactions/imported/${transactionId}/categorization`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: categoryValue,
          applyToSimilar,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to resolve transaction categorization.");
      }
      await Promise.all([
        loadTransactions(),
        loadReviewTransactions(),
        loadMonthlyInsights(),
        loadBalanceSheet(),
      ]);
    } catch (resolveError) {
      setError(
        resolveError instanceof Error
          ? resolveError.message
          : "Unable to resolve transaction categorization.",
      );
    }
  }

  async function performDuplicateCleanup() {
    setError(null);
    setDuplicateCleanupSummary(null);
    setIsCleaningDuplicates(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/transactions/cleanup-duplicates`, {
        method: "POST",
      });
      const payload = (await response.json()) as {
        error?: string;
        data?: { scannedCount?: number; duplicateCount?: number; deletedCount?: number; uniqueCount?: number };
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "Unable to clean duplicate transactions.");
      }
      const scanned = payload.data.scannedCount ?? 0;
      const duplicates = payload.data.duplicateCount ?? 0;
      const deleted = payload.data.deletedCount ?? 0;
      setDuplicateCleanupSummary(
        `Scanned ${scanned} imported rows. Found ${duplicates} duplicates and deleted ${deleted}.`,
      );
      await Promise.all([loadTransactions(), loadReviewTransactions(), loadMonthlyInsights(), loadBalanceSheet()]);
      showSnackbar(`Removed ${deleted} duplicate transactions.`);
    } catch (cleanupError) {
      setError(cleanupError instanceof Error ? cleanupError.message : "Unable to clean duplicate transactions.");
    } finally {
      setIsCleaningDuplicates(false);
    }
  }

  // The handlers close over the state above and are recreated every render.
  // Every piece of state they read is also a dependency here, so memoized
  // closures can never observe stale values.
  const finance = useMemo<FinanceAppContextValue>(
    () => ({
      API_BASE_URL,
      expenses,
      name,
      setName,
      amount,
      setAmount,
      category,
      setCategory,
      total,
      isLoading,
      isSubmitting,
      handleSubmit,
      transactions,
      isLoadingTransactions,
      loadTransactions,
      hasMoreTransactions,
      isLoadingMoreTransactions,
      loadMoreTransactions,
      searchText,
      setSearchText,
      filterCategory,
      setFilterCategory,
      minAmount,
      setMinAmount,
      maxAmount,
      setMaxAmount,
      editingTransaction,
      setEditingTransaction,
      handleUpdateTransaction,
      handleDeleteTransaction,
      reviewTransactions,
      isLoadingReviewTransactions,
      reviewCategoryEdits,
      setReviewCategoryEdits,
      handleResolveReviewTransaction,
      statementFile,
      setStatementFile,
      isUploadingStatement,
      uploadResult,
      setUploadResult,
      handleStatementUpload,
      isCleaningDuplicates,
      duplicateCleanupSummary,
      performDuplicateCleanup,
      activeMonth,
      setActiveMonth,
      calendarCells,
      paydaySet,
      paydays,
      isLoadingPaydays,
      loadPaydays,
      selectedPaydayDate,
      setSelectedPaydayDate,
      paydayAmount,
      setPaydayAmount,
      paydayNote,
      setPaydayNote,
      paydayRecurrence,
      setPaydayRecurrence,
      editingPaydayId,
      setEditingPaydayId,
      handlePaydaySubmit,
      handleDeletePayday,
      debts,
      isLoadingDebts,
      debtName,
      setDebtName,
      debtLender,
      setDebtLender,
      debtBalance,
      setDebtBalance,
      debtApr,
      setDebtApr,
      debtMinimumPayment,
      setDebtMinimumPayment,
      debtDueDay,
      setDebtDueDay,
      editingDebtId,
      setEditingDebtId,
      handleDebtSubmit,
      handleDeleteDebt,
      handLoans,
      isLoadingHandLoans,
      loanDirection,
      setLoanDirection,
      loanCounterparty,
      setLoanCounterparty,
      loanPrincipal,
      setLoanPrincipal,
      loanDueDate,
      setLoanDueDate,
      loanStatus,
      setLoanStatus,
      loanNote,
      setLoanNote,
      editingLoanId,
      setEditingLoanId,
      handleHandLoanSubmit,
      handleDeleteHandLoan,
      projectionStrategy,
      setProjectionStrategy,
      projectionBudget,
      setProjectionBudget,
      projection,
      isLoadingProjection,
      loadDebtProjection,
      rules,
      isLoadingRules,
      ruleKeyword,
      setRuleKeyword,
      ruleCategory,
      setRuleCategory,
      handleCreateRule,
      handleDeleteRule,
      savingsGoals,
      isLoadingSavingsGoals,
      goalName,
      setGoalName,
      goalTargetAmount,
      setGoalTargetAmount,
      goalTargetDate,
      setGoalTargetDate,
      goalAutoContributePayday,
      setGoalAutoContributePayday,
      goalAutoContributePercent,
      setGoalAutoContributePercent,
      goalContributionAmount,
      setGoalContributionAmount,
      handleCreateSavingsGoal,
      handleAddSavingsContribution,
      insightsMonth,
      setInsightsMonth,
      insights,
      isLoadingInsights,
      loadMonthlyInsights,
      balanceSheet,
      isLoadingBalanceSheet,
      loadBalanceSheet,
      recurringCandidates,
      isLoadingRecurring,
      loadRecurringCandidates,
      payslips,
      isLoadingPayslips,
      payslipFile,
      setPayslipFile,
      isUploadingPayslip,
      handleUploadPayslip,
      refreshAfterImport,
      error,
      setError,
      snackbarOpen,
      setSnackbarOpen,
      snackbarMessage,
      showSnackbar,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      expenses,
      name,
      amount,
      category,
      total,
      isLoading,
      isSubmitting,
      transactions,
      isLoadingTransactions,
      hasMoreTransactions,
      isLoadingMoreTransactions,
      searchText,
      filterCategory,
      minAmount,
      maxAmount,
      editingTransaction,
      reviewTransactions,
      isLoadingReviewTransactions,
      reviewCategoryEdits,
      statementFile,
      isUploadingStatement,
      uploadResult,
      isCleaningDuplicates,
      duplicateCleanupSummary,
      activeMonth,
      calendarCells,
      paydaySet,
      paydays,
      isLoadingPaydays,
      selectedPaydayDate,
      paydayAmount,
      paydayNote,
      paydayRecurrence,
      editingPaydayId,
      debts,
      isLoadingDebts,
      debtName,
      debtLender,
      debtBalance,
      debtApr,
      debtMinimumPayment,
      debtDueDay,
      editingDebtId,
      handLoans,
      isLoadingHandLoans,
      loanDirection,
      loanCounterparty,
      loanPrincipal,
      loanDueDate,
      loanStatus,
      loanNote,
      editingLoanId,
      projectionStrategy,
      projectionBudget,
      projection,
      isLoadingProjection,
      rules,
      isLoadingRules,
      ruleKeyword,
      ruleCategory,
      savingsGoals,
      isLoadingSavingsGoals,
      goalName,
      goalTargetAmount,
      goalTargetDate,
      goalAutoContributePayday,
      goalAutoContributePercent,
      goalContributionAmount,
      insightsMonth,
      insights,
      isLoadingInsights,
      balanceSheet,
      isLoadingBalanceSheet,
      recurringCandidates,
      isLoadingRecurring,
      payslips,
      isLoadingPayslips,
      payslipFile,
      isUploadingPayslip,
      error,
      snackbarOpen,
      snackbarMessage,
      showSnackbar,
    ],
  );

  return <FinanceAppContext.Provider value={finance}>{children}</FinanceAppContext.Provider>;
}
