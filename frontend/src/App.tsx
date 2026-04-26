import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { usePlaidLink } from "react-plaid-link";
import "./App.css";
import type {
  CategorizationRule,
  DebtAccount,
  DebtProjection,
  Expense,
  HandLoan,
  MonthlyInsights,
  PaydayEvent,
  PayslipDocument,
  PlaidSyncSummary,
  RecurringCandidate,
  SavingsGoal,
  Transaction,
  UploadResult,
} from "./types";
import { buildCalendarDays, formatCurrency, monthStartDate, toMonthKey } from "./utils";
import InsightsSection from "./components/InsightsSection";
import PayslipSection from "./components/PayslipSection";
import PaydaySection from "./components/PaydaySection";
import RulesSection from "./components/RulesSection";
import TransactionsSection from "./components/TransactionsSection";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

function App() {
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
  const [recurringCandidates, setRecurringCandidates] = useState<RecurringCandidate[]>([]);
  const [isLoadingRecurring, setIsLoadingRecurring] = useState(false);
  const [payslipFile, setPayslipFile] = useState<File | null>(null);
  const [isUploadingPayslip, setIsUploadingPayslip] = useState(false);
  const [payslips, setPayslips] = useState<PayslipDocument[]>([]);
  const [isLoadingPayslips, setIsLoadingPayslips] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    void loadRecurringCandidates();
    void loadPayslips();
  }, []);

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
      void loadTransactions();
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
      await Promise.all([loadExpenses(), loadTransactions()]);
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
      await Promise.all([loadExpenses(), loadTransactions()]);
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

  return (
    <main className="page">
      <section className="panel">
        <h1>Finaryo Expense Tracker</h1>
        <p className="subtitle">Track expenses and save them to the backend API.</p>

        <section className="plaid-panel">
          <h2>Plaid Sandbox Setup</h2>
          <p>Connect your sandbox bank and sync transactions securely via backend-only Plaid credentials.</p>
          <div className="plaid-actions">
            <button type="button" onClick={createPlaidLinkToken} disabled={isCreatingLinkToken}>
              {isCreatingLinkToken ? "Creating link token..." : "1) Create Link Token"}
            </button>
            <button
              type="button"
              onClick={() => openPlaid()}
              disabled={!plaidLinkToken || !isPlaidReady}
            >
              2) Connect Plaid Item
            </button>
            <button type="button" onClick={syncPlaidTransactions} disabled={isSyncingPlaid || !isPlaidConnected}>
              {isSyncingPlaid ? "Syncing..." : "3) Sync Transactions"}
            </button>
          </div>
          {plaidSummary && (
            <div className="plaid-summary">
              <strong>Latest Plaid sync summary</strong>
              <span>Item: {plaidSummary.itemId ?? "N/A"}</span>
              <span>Added: {plaidSummary.addedCount}</span>
              <span>Modified: {plaidSummary.modifiedCount}</span>
              <span>Removed: {plaidSummary.removedCount}</span>
            </div>
          )}
        </section>

        <section className="upload-panel">
          <h2>Statement Upload (Temporary Bank Input)</h2>
          <p>Upload a .xlsx, .xls, or .csv file to import transactions while Plaid is optional.</p>
          <form className="upload-form" onSubmit={handleStatementUpload}>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(event) => {
                setStatementFile(event.target.files?.[0] ?? null);
                setUploadResult(null);
              }}
            />
            <button type="submit" disabled={isUploadingStatement || !statementFile}>
              {isUploadingStatement ? "Uploading..." : "Upload statement"}
            </button>
          </form>
          {uploadResult && (
            <div className="upload-summary">
              <strong>Import summary</strong>
              <span>Imported: {uploadResult.importedCount}</span>
              <span>Skipped: {uploadResult.skippedCount}</span>
              {uploadResult.invalidRows.length > 0 && (
                <span>Invalid rows: {uploadResult.invalidRows.map((row) => row.rowNumber).join(", ")}</span>
              )}
            </div>
          )}
          {uploadResult && uploadResult.transactions.length > 0 && (
            <ul className="upload-transaction-list">
              {uploadResult.transactions.slice(0, 8).map((transaction) => (
                <li key={transaction.id} className="upload-transaction-item">
                  <div>
                    <strong>{transaction.description}</strong>
                    <small>
                      {new Date(transaction.date).toLocaleDateString()} - {transaction.category}
                    </small>
                  </div>
                  <span>{formatCurrency(transaction.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <form className="expense-form" onSubmit={handleSubmit}>
          <label>
            Name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Groceries"
              required
              maxLength={80}
            />
          </label>

          <label>
            Amount
            <input
              type="number"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0.01"
              required
            />
          </label>

          <label>
            Category
            <input
              type="text"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="e.g. Food"
              maxLength={80}
            />
          </label>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Add expense"}
          </button>
        </form>

        {error && <p className="error">{error}</p>}

        <div className="summary">
          <span>Total expenses</span>
          <strong>{formatCurrency(total)}</strong>
        </div>

        <PaydaySection
          activeMonth={activeMonth}
          setActiveMonth={setActiveMonth}
          loadPaydays={loadPaydays}
          calendarCells={calendarCells}
          selectedPaydayDate={selectedPaydayDate}
          setSelectedPaydayDate={setSelectedPaydayDate}
          paydaySet={paydaySet}
          paydays={paydays}
          editingPaydayId={editingPaydayId}
          setEditingPaydayId={setEditingPaydayId}
          paydayAmount={paydayAmount}
          setPaydayAmount={setPaydayAmount}
          paydayNote={paydayNote}
          setPaydayNote={setPaydayNote}
          paydayRecurrence={paydayRecurrence}
          setPaydayRecurrence={setPaydayRecurrence}
          handlePaydaySubmit={handlePaydaySubmit}
          isLoadingPaydays={isLoadingPaydays}
          handleDeletePayday={handleDeletePayday}
        />

        <TransactionsSection
          searchText={searchText}
          setSearchText={setSearchText}
          filterCategory={filterCategory}
          setFilterCategory={setFilterCategory}
          minAmount={minAmount}
          setMinAmount={setMinAmount}
          maxAmount={maxAmount}
          setMaxAmount={setMaxAmount}
          loadTransactions={loadTransactions}
          editingTransaction={editingTransaction}
          setEditingTransaction={setEditingTransaction}
          handleUpdateTransaction={handleUpdateTransaction}
          isLoadingTransactions={isLoadingTransactions}
          transactions={transactions}
          handleDeleteTransaction={handleDeleteTransaction}
        />

        <section className="debt-panel">
          <h2>Debt Accounts & Hand Loans</h2>
          <p>Track balances, APR, and payoff strategy for debts plus personal loans.</p>
          <form className="debt-form" onSubmit={handleDebtSubmit}>
            <input type="text" value={debtName} onChange={(event) => setDebtName(event.target.value)} placeholder="Debt name" required />
            <input type="text" value={debtLender} onChange={(event) => setDebtLender(event.target.value)} placeholder="Lender (optional)" />
            <input type="number" value={debtBalance} onChange={(event) => setDebtBalance(event.target.value)} placeholder="Balance" min="0.01" step="0.01" required />
            <input type="number" value={debtApr} onChange={(event) => setDebtApr(event.target.value)} placeholder="APR %" min="0" max="100" step="0.01" required />
            <input
              type="number"
              value={debtMinimumPayment}
              onChange={(event) => setDebtMinimumPayment(event.target.value)}
              placeholder="Minimum payment"
              min="0.01"
              step="0.01"
              required
            />
            <input type="number" value={debtDueDay} onChange={(event) => setDebtDueDay(event.target.value)} placeholder="Due day (1-31)" min="1" max="31" required />
            <button type="submit">{editingDebtId ? "Update Debt" : "Add Debt"}</button>
          </form>

          {isLoadingDebts ? (
            <p>Loading debt accounts...</p>
          ) : debts.length === 0 ? (
            <p>No debt accounts yet.</p>
          ) : (
            <ul className="debt-list">
              {debts.map((debt) => (
                <li key={debt.id} className="debt-item">
                  <div>
                    <strong>{debt.name}</strong>
                    <small>
                      APR {debt.apr}% - Min {formatCurrency(debt.minimumPayment)} - Due day {debt.dueDay}
                    </small>
                  </div>
                  <div className="debt-item-actions">
                    <span>{formatCurrency(debt.balance)}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingDebtId(debt.id);
                        setDebtName(debt.name);
                        setDebtLender(debt.lender ?? "");
                        setDebtBalance(String(debt.balance));
                        setDebtApr(String(debt.apr));
                        setDebtMinimumPayment(String(debt.minimumPayment));
                        setDebtDueDay(String(debt.dueDay));
                      }}
                    >
                      Edit
                    </button>
                    <button type="button" onClick={() => void handleDeleteDebt(debt.id)}>
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="projection-controls">
            <select
              value={projectionStrategy}
              onChange={(event) => {
                setProjectionStrategy(event.target.value as "avalanche" | "snowball");
              }}
            >
              <option value="avalanche">Avalanche</option>
              <option value="snowball">Snowball</option>
            </select>
            <input
              type="number"
              value={projectionBudget}
              onChange={(event) => setProjectionBudget(event.target.value)}
              placeholder="Optional monthly budget"
              min="0.01"
              step="0.01"
            />
            <button type="button" onClick={() => void loadDebtProjection()}>
              Refresh Projection
            </button>
          </div>
          {isLoadingProjection ? (
            <p>Calculating projection...</p>
          ) : projection ? (
            <div className="projection-summary">
              <strong>{projection.strategy} payoff projection</strong>
              <span>Debts: {projection.debtCount}</span>
              <span>Monthly budget: {formatCurrency(projection.monthlyBudget)}</span>
              <span>Months to payoff: {projection.monthsToPayoff}</span>
              <span>Estimated interest: {formatCurrency(projection.estimatedInterest)}</span>
              {projection.payoffOrderNames.length > 0 && (
                <span>Payoff order: {projection.payoffOrderNames.join(" -> ")}</span>
              )}
            </div>
          ) : null}

          <form className="hand-loan-form" onSubmit={handleHandLoanSubmit}>
            <select value={loanDirection} onChange={(event) => setLoanDirection(event.target.value as "borrowed" | "lent")}>
              <option value="borrowed">Borrowed</option>
              <option value="lent">Lent</option>
            </select>
            <input
              type="text"
              value={loanCounterparty}
              onChange={(event) => setLoanCounterparty(event.target.value)}
              placeholder="Counterparty"
              required
            />
            <input
              type="number"
              value={loanPrincipal}
              onChange={(event) => setLoanPrincipal(event.target.value)}
              placeholder="Principal"
              min="0.01"
              step="0.01"
              required
            />
            <input type="date" value={loanDueDate} onChange={(event) => setLoanDueDate(event.target.value)} />
            <select value={loanStatus} onChange={(event) => setLoanStatus(event.target.value as "active" | "paid")}>
              <option value="active">Active</option>
              <option value="paid">Paid</option>
            </select>
            <input type="text" value={loanNote} onChange={(event) => setLoanNote(event.target.value)} placeholder="Note (optional)" />
            <button type="submit">{editingLoanId ? "Update Hand Loan" : "Add Hand Loan"}</button>
          </form>

          {isLoadingHandLoans ? (
            <p>Loading hand loans...</p>
          ) : handLoans.length === 0 ? (
            <p>No hand loans yet.</p>
          ) : (
            <ul className="debt-list">
              {handLoans.map((loan) => (
                <li key={loan.id} className="debt-item">
                  <div>
                    <strong>
                      {loan.direction} - {loan.counterparty}
                    </strong>
                    <small>
                      {loan.status}
                      {loan.dueDate ? ` - Due ${new Date(loan.dueDate).toLocaleDateString()}` : ""}
                      {loan.note ? ` - ${loan.note}` : ""}
                    </small>
                  </div>
                  <div className="debt-item-actions">
                    <span>{formatCurrency(loan.principal)}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingLoanId(loan.id);
                        setLoanDirection(loan.direction);
                        setLoanCounterparty(loan.counterparty);
                        setLoanPrincipal(String(loan.principal));
                        setLoanDueDate(loan.dueDate ? loan.dueDate.slice(0, 10) : "");
                        setLoanStatus(loan.status);
                        setLoanNote(loan.note ?? "");
                      }}
                    >
                      Edit
                    </button>
                    <button type="button" onClick={() => void handleDeleteHandLoan(loan.id)}>
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="savings-panel">
          <h2>Savings Goals</h2>
          <p>Create goals, track progress, and add contributions.</p>
          <form className="savings-form" onSubmit={handleCreateSavingsGoal}>
            <input type="text" value={goalName} onChange={(event) => setGoalName(event.target.value)} placeholder="Goal name" required />
            <input
              type="number"
              value={goalTargetAmount}
              onChange={(event) => setGoalTargetAmount(event.target.value)}
              placeholder="Target amount"
              min="0.01"
              step="0.01"
              required
            />
            <input type="date" value={goalTargetDate} onChange={(event) => setGoalTargetDate(event.target.value)} />
            <label className="checkbox-line">
              <input
                type="checkbox"
                checked={goalAutoContributePayday}
                onChange={(event) => setGoalAutoContributePayday(event.target.checked)}
              />
              Auto-contribute from payday
            </label>
            <input
              type="number"
              value={goalAutoContributePercent}
              onChange={(event) => setGoalAutoContributePercent(event.target.value)}
              placeholder="Auto contribution %"
              min="0"
              max="100"
              step="0.01"
            />
            <button type="submit">Create Savings Goal</button>
          </form>
          {isLoadingSavingsGoals ? (
            <p>Loading savings goals...</p>
          ) : savingsGoals.length === 0 ? (
            <p>No savings goals yet.</p>
          ) : (
            <ul className="savings-list">
              {savingsGoals.map((goal) => (
                <li key={goal.id} className="savings-item">
                  <div>
                    <strong>{goal.name}</strong>
                    <small>
                      Saved {formatCurrency(goal.savedAmount)} / {formatCurrency(goal.targetAmount)} | Remaining{" "}
                      {formatCurrency(goal.remainingAmount)}
                    </small>
                  </div>
                  <div className="savings-actions">
                    <input
                      type="number"
                      value={goalContributionAmount[goal.id] ?? ""}
                      onChange={(event) =>
                        setGoalContributionAmount((current) => ({ ...current, [goal.id]: event.target.value }))
                      }
                      placeholder="Contribution"
                      min="0.01"
                      step="0.01"
                    />
                    <button type="button" onClick={() => void handleAddSavingsContribution(goal.id)}>
                      Add
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <InsightsSection
          insightsMonth={insightsMonth}
          setInsightsMonth={setInsightsMonth}
          loadMonthlyInsights={loadMonthlyInsights}
          isLoadingInsights={isLoadingInsights}
          insights={insights}
        />

        <RulesSection
          ruleKeyword={ruleKeyword}
          setRuleKeyword={setRuleKeyword}
          ruleCategory={ruleCategory}
          setRuleCategory={setRuleCategory}
          handleCreateRule={handleCreateRule}
          isLoadingRules={isLoadingRules}
          rules={rules}
          handleDeleteRule={handleDeleteRule}
          loadRecurringCandidates={loadRecurringCandidates}
          isLoadingRecurring={isLoadingRecurring}
          recurringCandidates={recurringCandidates}
        />

        <PayslipSection
          API_BASE_URL={API_BASE_URL}
          payslipFile={payslipFile}
          setPayslipFile={setPayslipFile}
          isUploadingPayslip={isUploadingPayslip}
          handleUploadPayslip={handleUploadPayslip}
          isLoadingPayslips={isLoadingPayslips}
          payslips={payslips}
        />

        {isLoading ? (
          <p>Loading expenses...</p>
        ) : expenses.length === 0 ? (
          <p>No expenses yet. Add your first one above.</p>
        ) : (
          <ul className="expense-list">
            {expenses.map((expense) => (
              <li key={expense.id} className="expense-item">
                <div>
                  <strong>{expense.name}</strong>
                  <small>
                    {new Date(expense.createdAt).toLocaleString()} - {expense.category}
                  </small>
                </div>
                <span>{formatCurrency(expense.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

export default App;
