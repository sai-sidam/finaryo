import type { BalanceSheetInsights } from "../types";
import { formatCurrency } from "../utils";

type AccountsSectionProps = {
  insightsMonth: string;
  setInsightsMonth: (value: string) => void;
  loadBalanceSheet: () => Promise<void>;
  isLoadingBalanceSheet: boolean;
  balanceSheet: BalanceSheetInsights | null;
  handleCleanupDuplicates: () => Promise<void>;
  isCleaningDuplicates: boolean;
  duplicateCleanupSummary: string | null;
};

function AccountsSection({
  insightsMonth,
  setInsightsMonth,
  loadBalanceSheet,
  isLoadingBalanceSheet,
  balanceSheet,
  handleCleanupDuplicates,
  isCleaningDuplicates,
  duplicateCleanupSummary,
}: AccountsSectionProps) {
  return (
    <section className="accounts-panel">
      <h2>Accounts</h2>
      <p>Track per-account net flow, income, expenses, and transfer movement.</p>
      <div className="insights-controls">
        <input type="month" value={insightsMonth} onChange={(event) => setInsightsMonth(event.target.value)} />
        <button type="button" onClick={() => void loadBalanceSheet()}>
          Refresh Accounts
        </button>
        <button type="button" onClick={() => void handleCleanupDuplicates()} disabled={isCleaningDuplicates}>
          {isCleaningDuplicates ? "Cleaning Duplicates..." : "Cleanup Duplicates"}
        </button>
      </div>
      {duplicateCleanupSummary && <p>{duplicateCleanupSummary}</p>}
      {isLoadingBalanceSheet ? (
        <p>Loading account summary...</p>
      ) : !balanceSheet || balanceSheet.accounts.length === 0 ? (
        <p>No account data for the selected month.</p>
      ) : (
        <div className="upload-summary">
          <strong>Balance Sheet (Net Flow)</strong>
          <span>Total net flow: {formatCurrency(balanceSheet.totalNetFlow)}</span>
          <ul className="upload-invalid-list">
            {balanceSheet.accounts.map((account) => (
              <li key={`${account.accountName}-${account.accountType}`}>
                {account.accountName} ({account.accountType}) | Net: {formatCurrency(account.netFlow)} | Income:{" "}
                {formatCurrency(account.income)} | Expenses: {formatCurrency(account.expenses)} | Transfers:{" "}
                {formatCurrency(account.transfers)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export default AccountsSection;
