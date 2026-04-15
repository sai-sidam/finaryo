import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import "./App.css";

type Expense = {
  id: string;
  name: string;
  amount: number;
  createdAt: string;
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
