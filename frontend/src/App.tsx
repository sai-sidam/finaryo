import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { usePlaidLink } from "react-plaid-link";
import "./App.css";

type Expense = {
  id: string;
  name: string;
  amount: number;
  createdAt: string;
};

type PlaidSyncSummary = {
  itemId: string | null;
  addedCount: number;
  modifiedCount: number;
  removedCount: number;
  cursor: string | null;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function App() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingLinkToken, setIsCreatingLinkToken] = useState(false);
  const [isSyncingPlaid, setIsSyncingPlaid] = useState(false);
  const [plaidLinkToken, setPlaidLinkToken] = useState<string | null>(null);
  const [isPlaidConnected, setIsPlaidConnected] = useState(false);
  const [plaidSummary, setPlaidSummary] = useState<PlaidSyncSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(() => expenses.reduce((sum, expense) => sum + expense.amount, 0), [expenses]);

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

  useEffect(() => {
    void loadExpenses();
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
        body: JSON.stringify({ name, amount: Number(amount) }),
      });

      const payload = (await response.json()) as { error?: string; data?: Expense };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "Unable to save expense.");
      }

      setExpenses((currentExpenses) => [payload.data as Expense, ...currentExpenses]);
      setName("");
      setAmount("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unexpected error while saving expense.");
    } finally {
      setIsSubmitting(false);
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

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Add expense"}
          </button>
        </form>

        {error && <p className="error">{error}</p>}

        <div className="summary">
          <span>Total expenses</span>
          <strong>{formatCurrency(total)}</strong>
        </div>

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
                  <small>{new Date(expense.createdAt).toLocaleString()}</small>
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
