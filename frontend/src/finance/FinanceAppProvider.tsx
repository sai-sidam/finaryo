import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { FormEvent } from "react";
import { usePlaidLink } from "react-plaid-link";
import { FinanceAppContext } from "../context/FinanceAppContext";
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
  PlaidSyncSummary,
  RecurringCandidate,
  SavingsGoal,
  Transaction,
  UploadResult,
} from "../types";
import { buildCalendarDays, monthStartDate, toMonthKey } from "../utils";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export function FinanceAppProvider({ children }: { children: ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Uncategorized");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingLinkToken, setIsCreatingLinkToken] = useState(false);
  const [isSyncingPlaid, setIsSyncingPlaid] = useState(false);
  const [plaidLinkToken, setPlaidLinkToken] = useState<string | null>(null);
  const [isPlaidConnected, setIsPlaidConnected] = useState(false);
  const [plaidSummary, setPlaidSummary] = useState<PlaidSyncSummary | null>(null);
  const [statementFile, setStatementFile] = useState<File | null>(null);
  const [isUploadingStatement, setIsUploadingStatement] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchText, setSearchText] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [reviewTransactions, setReviewTransactions] = useState<Transaction[]>([]);
  const [isLoadingReviewTransactions, setIsLoadingReviewTransactions] = useState(false);
  const [reviewCategoryEdits, setReviewCategoryEdits] = useState<Record<string, string>>({});
  const [activeMonth, setActiveMonth] = useState(() => monthStartDate(new Date()));
  const [selectedPaydayDate, setSelectedPaydayDate] = useState(() => new Date().toISOString().slice(0, 10));
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
  const [pendingPlaidOpen, setPendingPlaidOpen] = useState(false);

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

  async function loadTransactions() {
    setIsLoadingTransactions(true);
    try {
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
      const querySuffix = query.toString() ? `?${query.toString()}` : "";
      const response = await fetch(`${API_BASE_URL}/api/transactions${querySuffix}`);
      const payload = (await response.json()) as { error?: string; data?: Transaction[] };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load transactions.");
      }
      setTransactions(Array.isArray(payload.data) ? payload.data : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unexpected error while loading transactions.");
    } finally {
      setIsLoadingTransactions(false);
    }
  }

  async function loadReviewTransactions() {
    setIsLoadingReviewTransactions(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/transactions/review`);
      const payload = (await response.json()) as { error?: string; data?: Transaction[] };
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load review queue.");
      }
      const data = Array.isArray(payload.data) ? payload.data : [];
      setReviewTransactions(data);
      setReviewCategoryEdits((current) => {
        const next = { ...current };
        for (const row of data) {
          if (!next[row.id]) {
            next[row.id] = row.category;
          }
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
  }, []);

  useEffect(() => {
    void loadMonthlyInsights();
    void loadBalanceSheet();
  }, [insightsMonth]);

  const { open: openPlaid, ready: isPlaidReady } = usePlaidLink({
    token: plaidLinkToken,
    onSuccess: async (publicToken) => {
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/api/plaid/public-token/exchange`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ publicToken }),
        });
        const payload = (await response.json()) as { error?: string; data?: { itemId?: string } };
        if (!response.ok) {
          throw new Error(payload.error ?? "Plaid token exchange failed.");
        }
        setIsPlaidConnected(Boolean(payload.data?.itemId));
        showSnackbar("Bank connected.");
      } catch (exchangeError) {
        setError(exchangeError instanceof Error ? exchangeError.message : "Plaid token exchange failed.");
      }
    },
    onExit: (plaidError) => {
      if (plaidError?.error_message) {
        setError(plaidError.error_message);
      }
    },
  });

  useEffect(() => {
    if (pendingPlaidOpen && plaidLinkToken && isPlaidReady) {
      setPendingPlaidOpen(false);
      openPlaid();
    }
  }, [pendingPlaidOpen, plaidLinkToken, isPlaidReady, openPlaid]);

  async function createPlaidLinkToken() {
    setError(null);
    setIsCreatingLinkToken(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/plaid/link-token/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ clientName: "Finaryo MVP" }),
      });
      const payload = (await response.json()) as {
        error?: string;
        data?: { linkToken?: string };
      };

      if (!response.ok || !payload.data?.linkToken) {
        throw new Error(payload.error ?? "Failed to create Plaid link token.");
      }

      setPlaidLinkToken(payload.data.linkToken);
    } catch (linkTokenError) {
      setError(linkTokenError instanceof Error ? linkTokenError.message : "Failed to create Plaid link token.");
    } finally {
      setIsCreatingLinkToken(false);
    }
  }

  async function requestConnectBank() {
    setError(null);
    try {
      if (!plaidLinkToken) {
        await createPlaidLinkToken();
      }
      setPendingPlaidOpen(true);
    } catch {
      /* errors surfaced via setError in createPlaidLinkToken */
    }
  }

  async function syncPlaidTransactions() {
    setError(null);
    setIsSyncingPlaid(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/plaid/transactions/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const payload = (await response.json()) as {
        error?: string;
        data?: PlaidSyncSummary;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "Plaid transaction sync failed.");
      }
      setPlaidSummary(payload.data);
      setIsPlaidConnected(true);
      await Promise.all([
        loadTransactions(),
        loadReviewTransactions(),
        loadMonthlyInsights(),
        loadBalanceSheet(),
        loadDebts(),
        loadDebtProjection(),
      ]);
      showSnackbar("Transactions synced.");
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Plaid transaction sync failed.");
    } finally {
      setIsSyncingPlaid(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/expenses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, amount: Number(amount), category }),
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
    setError(null);
    try {
      const payload = {
        date: new Date(`${selectedPaydayDate}T00:00:00.000Z`).toISOString(),
        expectedAmount: Number(paydayAmount),
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
    setError(null);
    try {
      const payload = {
        name: debtName,
        lender: debtLender,
        balance: Number(debtBalance),
        apr: Number(debtApr),
        minimumPayment: Number(debtMinimumPayment),
        dueDay: Number(debtDueDay),
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
    setError(null);
    try {
      const payload = {
        direction: loanDirection,
        counterparty: loanCounterparty,
        principal: Number(loanPrincipal),
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
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/savings-goals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: goalName,
          targetAmount: Number(goalTargetAmount),
          targetDate: goalTargetDate ? new Date(`${goalTargetDate}T00:00:00.000Z`).toISOString() : undefined,
          autoContributePayday: goalAutoContributePayday,
          autoContributePercent: Number(goalAutoContributePercent || "0"),
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
    try {
      const response = await fetch(`${API_BASE_URL}/api/savings-goals/${goalId}/contributions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(rawAmount), sourceType: "manual" }),
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

  const finance = {
    API_BASE_URL,
    expenses,
    setExpenses,
    name,
    setName,
    amount,
    setAmount,
    category,
    setCategory,
    isLoading,
    setIsLoading,
    isLoadingTransactions,
    setIsLoadingTransactions,
    isSubmitting,
    setIsSubmitting,
    isCreatingLinkToken,
    setIsCreatingLinkToken,
    isSyncingPlaid,
    setIsSyncingPlaid,
    plaidLinkToken,
    setPlaidLinkToken,
    isPlaidConnected,
    setIsPlaidConnected,
    plaidSummary,
    setPlaidSummary,
    statementFile,
    setStatementFile,
    isUploadingStatement,
    setIsUploadingStatement,
    uploadResult,
    setUploadResult,
    transactions,
    setTransactions,
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
    reviewTransactions,
    setReviewTransactions,
    isLoadingReviewTransactions,
    setIsLoadingReviewTransactions,
    reviewCategoryEdits,
    setReviewCategoryEdits,
    activeMonth,
    setActiveMonth,
    selectedPaydayDate,
    setSelectedPaydayDate,
    paydayAmount,
    setPaydayAmount,
    paydayNote,
    setPaydayNote,
    paydayRecurrence,
    setPaydayRecurrence,
    paydays,
    setPaydays,
    isLoadingPaydays,
    setIsLoadingPaydays,
    editingPaydayId,
    setEditingPaydayId,
    debts,
    setDebts,
    isLoadingDebts,
    setIsLoadingDebts,
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
    handLoans,
    setHandLoans,
    isLoadingHandLoans,
    setIsLoadingHandLoans,
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
    projectionStrategy,
    setProjectionStrategy,
    projectionBudget,
    setProjectionBudget,
    projection,
    setProjection,
    isLoadingProjection,
    setIsLoadingProjection,
    rules,
    setRules,
    ruleKeyword,
    setRuleKeyword,
    ruleCategory,
    setRuleCategory,
    isLoadingRules,
    setIsLoadingRules,
    savingsGoals,
    setSavingsGoals,
    isLoadingSavingsGoals,
    setIsLoadingSavingsGoals,
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
    insightsMonth,
    setInsightsMonth,
    insights,
    setInsights,
    isLoadingInsights,
    setIsLoadingInsights,
    isLoadingBalanceSheet,
    setIsLoadingBalanceSheet,
    balanceSheet,
    setBalanceSheet,
    isCleaningDuplicates,
    setIsCleaningDuplicates,
    duplicateCleanupSummary,
    setDuplicateCleanupSummary,
    recurringCandidates,
    setRecurringCandidates,
    isLoadingRecurring,
    setIsLoadingRecurring,
    payslipFile,
    setPayslipFile,
    isUploadingPayslip,
    setIsUploadingPayslip,
    payslips,
    setPayslips,
    isLoadingPayslips,
    setIsLoadingPayslips,
    error,
    setError,
    snackbarOpen,
    setSnackbarOpen,
    snackbarMessage,
    setSnackbarMessage,
    showSnackbar,
    total,
    calendarCells,
    paydaySet,
    loadExpenses,
    loadTransactions,
    loadReviewTransactions,
    loadPaydays,
    loadDebts,
    loadHandLoans,
    loadDebtProjection,
    loadCategorizationRules,
    loadSavingsGoals,
    loadMonthlyInsights,
    loadBalanceSheet,
    loadRecurringCandidates,
    loadPayslips,
    createPlaidLinkToken,
    requestConnectBank,
    syncPlaidTransactions,
    openPlaid,
    isPlaidReady,
    handleSubmit,
    handleStatementUpload,
    handleDeleteTransaction,
    handleUpdateTransaction,
    handlePaydaySubmit,
    handleDeletePayday,
    handleDebtSubmit,
    handleDeleteDebt,
    handleHandLoanSubmit,
    handleDeleteHandLoan,
    handleCreateRule,
    handleDeleteRule,
    handleCreateSavingsGoal,
    handleAddSavingsContribution,
    handleUploadPayslip,
    handleResolveReviewTransaction,
    performDuplicateCleanup,
  };

  return <FinanceAppContext.Provider value={finance}>{children}</FinanceAppContext.Provider>;
}
