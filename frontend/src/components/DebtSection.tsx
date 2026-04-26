import type { FormEvent } from "react";
import type { DebtAccount, DebtProjection, HandLoan } from "../types";
import { formatCurrency } from "../utils";
import EmptyState from "./ui/EmptyState";
import SectionHeader from "./ui/SectionHeader";
import StatPill from "./ui/StatPill";
import Card from "./ui/Card";

type DebtSectionProps = {
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
  isLoadingDebts: boolean;
  debts: DebtAccount[];
  handleDeleteDebt: (id: string) => Promise<void>;
  projectionStrategy: "avalanche" | "snowball";
  setProjectionStrategy: (value: "avalanche" | "snowball") => void;
  projectionBudget: string;
  setProjectionBudget: (value: string) => void;
  loadDebtProjection: () => Promise<void>;
  isLoadingProjection: boolean;
  projection: DebtProjection | null;
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
  isLoadingHandLoans: boolean;
  handLoans: HandLoan[];
  handleDeleteHandLoan: (id: string) => Promise<void>;
};

function DebtSection(props: DebtSectionProps) {
  const {
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
    isLoadingDebts,
    debts,
    handleDeleteDebt,
    projectionStrategy,
    setProjectionStrategy,
    projectionBudget,
    setProjectionBudget,
    loadDebtProjection,
    isLoadingProjection,
    projection,
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
    isLoadingHandLoans,
    handLoans,
    handleDeleteHandLoan,
  } = props;

  return (
    <section className="debt-panel">
      <Card>
        <SectionHeader
          title="Debt Accounts & Hand Loans"
          subtitle="Track balances, APR, and payoff strategy for debts plus personal loans."
        />
        <form className="debt-form" onSubmit={(event) => void handleDebtSubmit(event)}>
          <input type="text" value={debtName} onChange={(event) => setDebtName(event.target.value)} placeholder="Debt name" required />
          <input type="text" value={debtLender} onChange={(event) => setDebtLender(event.target.value)} placeholder="Lender (optional)" />
          <input type="number" value={debtBalance} onChange={(event) => setDebtBalance(event.target.value)} placeholder="Balance" min="0.01" step="0.01" required />
          <input type="number" value={debtApr} onChange={(event) => setDebtApr(event.target.value)} placeholder="APR %" min="0" max="100" step="0.01" required />
          <input type="number" value={debtMinimumPayment} onChange={(event) => setDebtMinimumPayment(event.target.value)} placeholder="Minimum payment" min="0.01" step="0.01" required />
          <input type="number" value={debtDueDay} onChange={(event) => setDebtDueDay(event.target.value)} placeholder="Due day (1-31)" min="1" max="31" required />
          <button type="submit">{editingDebtId ? "Update Debt" : "Add Debt"}</button>
        </form>
      </Card>

      {isLoadingDebts ? (
        <p>Loading debt accounts...</p>
      ) : debts.length === 0 ? (
        <EmptyState message="No debt accounts yet." />
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
        <select value={projectionStrategy} onChange={(event) => setProjectionStrategy(event.target.value as "avalanche" | "snowball")}>
          <option value="avalanche">Avalanche</option>
          <option value="snowball">Snowball</option>
        </select>
        <input type="number" value={projectionBudget} onChange={(event) => setProjectionBudget(event.target.value)} placeholder="Optional monthly budget" min="0.01" step="0.01" />
        <button type="button" onClick={() => void loadDebtProjection()}>
          Refresh Projection
        </button>
      </div>
      {isLoadingProjection ? (
        <p>Calculating projection...</p>
      ) : projection ? (
        <div className="projection-summary">
          <strong>{projection.strategy} payoff projection</strong>
          <StatPill label="Debts" value={String(projection.debtCount)} />
          <StatPill label="Monthly budget" value={formatCurrency(projection.monthlyBudget)} />
          <StatPill label="Months to payoff" value={String(projection.monthsToPayoff)} />
          <StatPill label="Estimated interest" value={formatCurrency(projection.estimatedInterest)} />
          {projection.payoffOrderNames.length > 0 && <span>Payoff order: {projection.payoffOrderNames.join(" -> ")}</span>}
        </div>
      ) : null}

      <form className="hand-loan-form" onSubmit={(event) => void handleHandLoanSubmit(event)}>
        <select value={loanDirection} onChange={(event) => setLoanDirection(event.target.value as "borrowed" | "lent")}>
          <option value="borrowed">Borrowed</option>
          <option value="lent">Lent</option>
        </select>
        <input type="text" value={loanCounterparty} onChange={(event) => setLoanCounterparty(event.target.value)} placeholder="Counterparty" required />
        <input type="number" value={loanPrincipal} onChange={(event) => setLoanPrincipal(event.target.value)} placeholder="Principal" min="0.01" step="0.01" required />
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
        <EmptyState message="No hand loans yet." />
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
  );
}

export default DebtSection;
