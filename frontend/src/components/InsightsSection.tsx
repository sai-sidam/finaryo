import type { MonthlyInsights } from "../types";
import { formatCurrency } from "../utils";
import EmptyState from "./ui/EmptyState";
import SectionHeader from "./ui/SectionHeader";
import StatPill from "./ui/StatPill";

type InsightsSectionProps = {
  insightsMonth: string;
  setInsightsMonth: (value: string) => void;
  loadMonthlyInsights: () => Promise<void>;
  isLoadingInsights: boolean;
  insights: MonthlyInsights | null;
};

function InsightsSection({
  insightsMonth,
  setInsightsMonth,
  loadMonthlyInsights,
  isLoadingInsights,
  insights,
}: InsightsSectionProps) {
  return (
    <section className="insights-panel">
      <SectionHeader title="Monthly Insights" />
      <div className="insights-controls">
        <input type="month" value={insightsMonth} onChange={(event) => setInsightsMonth(event.target.value)} />
        <button type="button" onClick={() => void loadMonthlyInsights()}>
          Refresh Insights
        </button>
      </div>
      {isLoadingInsights ? (
        <p>Loading monthly insights...</p>
      ) : insights ? (
        <div className="insights-summary">
          <StatPill label="Income" value={formatCurrency(insights.incomeTotal)} />
          <StatPill label="Expenses" value={formatCurrency(insights.expenseTotal)} />
          <StatPill label="Net" value={formatCurrency(insights.net)} />
          <span>
            Top categories:{" "}
            {insights.topCategories.map((item) => `${item.category} (${formatCurrency(item.amount)})`).join(", ")}
          </span>
        </div>
      ) : (
        <EmptyState message="Choose a month and refresh to see insights." />
      )}
    </section>
  );
}

export default InsightsSection;
