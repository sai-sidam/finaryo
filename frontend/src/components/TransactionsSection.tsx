import type { FormEvent } from "react";
import type { Transaction } from "../types";
import { formatCurrency } from "../utils";

type TransactionsSectionProps = {
  searchText: string;
  setSearchText: (value: string) => void;
  filterCategory: string;
  setFilterCategory: (value: string) => void;
  minAmount: string;
  setMinAmount: (value: string) => void;
  maxAmount: string;
  setMaxAmount: (value: string) => void;
  loadTransactions: () => Promise<void>;
  editingTransaction: Transaction | null;
  setEditingTransaction: (
    value: Transaction | null | ((current: Transaction | null) => Transaction | null),
  ) => void;
  handleUpdateTransaction: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  isLoadingTransactions: boolean;
  transactions: Transaction[];
  handleDeleteTransaction: (transaction: Transaction) => Promise<void>;
  reviewTransactions: Transaction[];
  isLoadingReviewTransactions: boolean;
  reviewCategoryEdits: Record<string, string>;
  setReviewCategoryEdits: (
    value: Record<string, string> | ((current: Record<string, string>) => Record<string, string>),
  ) => void;
  handleResolveReviewTransaction: (transactionId: string, applyToSimilar: boolean) => Promise<void>;
};

function TransactionsSection({
  searchText,
  setSearchText,
  filterCategory,
  setFilterCategory,
  minAmount,
  setMinAmount,
  maxAmount,
  setMaxAmount,
  loadTransactions,
  editingTransaction,
  setEditingTransaction,
  handleUpdateTransaction,
  isLoadingTransactions,
  transactions,
  handleDeleteTransaction,
  reviewTransactions,
  isLoadingReviewTransactions,
  reviewCategoryEdits,
  setReviewCategoryEdits,
  handleResolveReviewTransaction,
}: TransactionsSectionProps) {
  return (
    <section className="transactions-panel">
      <h2>Transaction Hub</h2>
      <p>Search, filter, edit, and delete manual and imported transactions.</p>
      <form
        className="transaction-filters"
        onSubmit={(event) => {
          event.preventDefault();
          void loadTransactions();
        }}
      >
        <input
          type="text"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="Search description"
        />
        <input
          type="text"
          value={filterCategory}
          onChange={(event) => setFilterCategory(event.target.value)}
          placeholder="Category"
        />
        <input
          type="number"
          value={minAmount}
          onChange={(event) => setMinAmount(event.target.value)}
          placeholder="Min amount"
          min="0"
          step="0.01"
        />
        <input
          type="number"
          value={maxAmount}
          onChange={(event) => setMaxAmount(event.target.value)}
          placeholder="Max amount"
          min="0"
          step="0.01"
        />
        <button type="submit">Apply Filters</button>
      </form>

      {editingTransaction && (
        <form className="edit-transaction-form" onSubmit={(event) => void handleUpdateTransaction(event)}>
          <strong>Editing transaction</strong>
          <input
            type="text"
            value={editingTransaction.description}
            onChange={(event) =>
              setEditingTransaction((current) => (current ? { ...current, description: event.target.value } : current))
            }
            required
          />
          <input
            type="number"
            value={editingTransaction.amount}
            onChange={(event) =>
              setEditingTransaction((current) =>
                current ? { ...current, amount: Number(event.target.value) } : current,
              )
            }
            min="0.01"
            step="0.01"
            required
          />
          <input
            type="text"
            value={editingTransaction.category}
            onChange={(event) =>
              setEditingTransaction((current) => (current ? { ...current, category: event.target.value } : current))
            }
            required
          />
          <input
            type="date"
            value={editingTransaction.date.slice(0, 10)}
            onChange={(event) =>
              setEditingTransaction((current) =>
                current ? { ...current, date: new Date(event.target.value).toISOString() } : current,
              )
            }
            required
          />
          <div className="edit-actions">
            <button type="submit">Save Changes</button>
            <button type="button" onClick={() => setEditingTransaction(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {isLoadingTransactions ? (
        <p>Loading transactions...</p>
      ) : transactions.length === 0 ? (
        <p>No transactions match your filters.</p>
      ) : (
        <ul className="transaction-list">
          {transactions.map((transaction) => (
            <li key={`${transaction.sourceType}-${transaction.id}`} className="transaction-item">
              <div>
                <strong>{transaction.description}</strong>
                <small>
                  {new Date(transaction.date).toLocaleDateString()} - {transaction.category} - {transaction.sourceType}
                  {transaction.accountName ? ` - ${transaction.accountName}` : ""}
                </small>
              </div>
              <div className="transaction-actions">
                <span>{formatCurrency(transaction.amount)}</span>
                <button type="button" onClick={() => setEditingTransaction(transaction)}>
                  Edit
                </button>
                <button type="button" onClick={() => void handleDeleteTransaction(transaction)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <section className="review-queue-panel">
        <h3>Needs Review</h3>
        <p>Low-confidence AI categorization suggestions are listed here.</p>
        {isLoadingReviewTransactions ? (
          <p>Loading review queue...</p>
        ) : reviewTransactions.length === 0 ? (
          <p>No transactions need review.</p>
        ) : (
          <ul className="transaction-list">
            {reviewTransactions.map((transaction) => (
              <li key={`review-${transaction.id}`} className="transaction-item">
                <div>
                  <strong>{transaction.description}</strong>
                  <small>
                    {new Date(transaction.date).toLocaleDateString()} - Suggested: {transaction.category} - Confidence:{" "}
                    {transaction.categorizationConfidence != null
                      ? `${Math.round(transaction.categorizationConfidence * 100)}%`
                      : "N/A"}
                  </small>
                </div>
                <div className="transaction-actions">
                  <span>{formatCurrency(transaction.amount)}</span>
                  <input
                    type="text"
                    placeholder="Category"
                    value={reviewCategoryEdits[transaction.id] ?? transaction.category}
                    onChange={(event) =>
                      setReviewCategoryEdits((current) => ({
                        ...current,
                        [transaction.id]: event.target.value,
                      }))
                    }
                  />
                  <button type="button" onClick={() => void handleResolveReviewTransaction(transaction.id, false)}>
                    Approve
                  </button>
                  <button type="button" onClick={() => void handleResolveReviewTransaction(transaction.id, true)}>
                    Apply to Similar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

export default TransactionsSection;
