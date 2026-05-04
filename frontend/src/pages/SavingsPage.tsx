import PageHeader from "../components/PageHeader";
import SavingsSection from "../components/SavingsSection";
import { useFinanceApp } from "../context/FinanceAppContext";

export default function SavingsPage() {
  const fin = useFinanceApp();
  return (
    <>
      <PageHeader title="Savings" subtitle="Goals, contributions, and payday automation." />
      <SavingsSection
        goalName={fin.goalName}
        setGoalName={fin.setGoalName}
        goalTargetAmount={fin.goalTargetAmount}
        setGoalTargetAmount={fin.setGoalTargetAmount}
        goalTargetDate={fin.goalTargetDate}
        setGoalTargetDate={fin.setGoalTargetDate}
        goalAutoContributePayday={fin.goalAutoContributePayday}
        setGoalAutoContributePayday={fin.setGoalAutoContributePayday}
        goalAutoContributePercent={fin.goalAutoContributePercent}
        setGoalAutoContributePercent={fin.setGoalAutoContributePercent}
        handleCreateSavingsGoal={fin.handleCreateSavingsGoal}
        isLoadingSavingsGoals={fin.isLoadingSavingsGoals}
        savingsGoals={fin.savingsGoals}
        goalContributionAmount={fin.goalContributionAmount}
        setGoalContributionAmount={fin.setGoalContributionAmount}
        handleAddSavingsContribution={fin.handleAddSavingsContribution}
      />
    </>
  );
}
