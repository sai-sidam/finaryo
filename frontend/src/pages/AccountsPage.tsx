import PageHeader from "../components/PageHeader";
import AccountsSection from "../components/AccountsSection";
import { useFinanceApp } from "../context/FinanceAppContext";

export default function AccountsPage() {
  const fin = useFinanceApp();
  return (
    <>
      <PageHeader title="Accounts" subtitle="Per-account cash flow and duplicate maintenance." />
      <AccountsSection
        insightsMonth={fin.insightsMonth}
        setInsightsMonth={fin.setInsightsMonth}
        loadBalanceSheet={fin.loadBalanceSheet}
        isLoadingBalanceSheet={fin.isLoadingBalanceSheet}
        balanceSheet={fin.balanceSheet}
        performDuplicateCleanup={fin.performDuplicateCleanup}
        isCleaningDuplicates={fin.isCleaningDuplicates}
        duplicateCleanupSummary={fin.duplicateCleanupSummary}
      />
    </>
  );
}
