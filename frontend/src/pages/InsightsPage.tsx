import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { useSearchParams } from "react-router-dom";
import InsightsSection from "../components/InsightsSection";
import PageHeader from "../components/PageHeader";
import RulesSection from "../components/RulesSection";
import { useFinanceApp } from "../context/FinanceAppContext";
import { toMonthKey } from "../utils";

export default function InsightsPage() {
  const fin = useFinanceApp();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "rules" ? 1 : 0;
  const currentMonthKey = toMonthKey(new Date());
  const isCurrentMonth = fin.insightsMonth === currentMonthKey;

  const handleTabChange = (_event: React.SyntheticEvent, value: number) => {
    if (value === 1) {
      setParams({ tab: "rules" });
    } else {
      setParams({});
    }
  };

  return (
    <>
      <PageHeader title="Insights" subtitle="Monthly trends, automation rules, and recurring detection." />
      {tab === 0 && !isCurrentMonth ? (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => fin.setInsightsMonth(currentMonthKey)}>
              Jump to this month
            </Button>
          }
        >
          Viewing <strong>{fin.insightsMonth}</strong>. Switch to <strong>{currentMonthKey}</strong> for the latest month.
        </Alert>
      ) : null}
      <Tabs value={tab} onChange={handleTabChange} sx={{ mb: 3 }} aria-label="Insights sections">
        <Tab label="Monthly insights" id="insights-tab-0" aria-controls="insights-panel-0" />
        <Tab label="Rules & recurring" id="insights-tab-1" aria-controls="insights-panel-1" />
      </Tabs>
      <div role="tabpanel" hidden={tab !== 0} id="insights-panel-0" aria-labelledby="insights-tab-0">
        {tab === 0 && (
          <InsightsSection
            insightsMonth={fin.insightsMonth}
            setInsightsMonth={fin.setInsightsMonth}
            loadMonthlyInsights={fin.loadMonthlyInsights}
            isLoadingInsights={fin.isLoadingInsights}
            insights={fin.insights}
          />
        )}
      </div>
      <div role="tabpanel" hidden={tab !== 1} id="insights-panel-1" aria-labelledby="insights-tab-1">
        {tab === 1 && (
          <RulesSection
            ruleKeyword={fin.ruleKeyword}
            setRuleKeyword={fin.setRuleKeyword}
            ruleCategory={fin.ruleCategory}
            setRuleCategory={fin.setRuleCategory}
            handleCreateRule={fin.handleCreateRule}
            isLoadingRules={fin.isLoadingRules}
            rules={fin.rules}
            handleDeleteRule={fin.handleDeleteRule}
            loadRecurringCandidates={fin.loadRecurringCandidates}
            isLoadingRecurring={fin.isLoadingRecurring}
            recurringCandidates={fin.recurringCandidates}
          />
        )}
      </div>
    </>
  );
}
