import type { MonthlyInsights } from "../types";
import { formatCurrency } from "../utils";

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
      <h2>Monthly Insights</h2>
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
          <span>Income: {formatCurrency(insights.incomeTotal)}</span>
          <span>Expenses: {formatCurrency(insights.expenseTotal)}</span>
          <span>Net: {formatCurrency(insights.net)}</span>
          <span>
            Top categories:{" "}
            {insights.topCategories.map((item) => `${item.category} (${formatCurrency(item.amount)})`).join(", ")}
          </span>
        </div>
      ) : null}
    </section>
  );
}

export default InsightsSection;
