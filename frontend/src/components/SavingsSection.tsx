import type { FormEvent } from "react";
import type { SavingsGoal } from "../types";
import { formatCurrency } from "../utils";
import EmptyState from "./ui/EmptyState";
import SectionHeader from "./ui/SectionHeader";
import Card from "./ui/Card";

type SavingsSectionProps = {
  goalName: string;
  setGoalName: (value: string) => void;
  goalTargetAmount: string;
  setGoalTargetAmount: (value: string) => void;
  goalTargetDate: string;
  setGoalTargetDate: (value: string) => void;
  goalAutoContributePayday: boolean;
  setGoalAutoContributePayday: (value: boolean) => void;
  goalAutoContributePercent: string;
  setGoalAutoContributePercent: (value: string) => void;
  handleCreateSavingsGoal: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  isLoadingSavingsGoals: boolean;
  savingsGoals: SavingsGoal[];
  goalContributionAmount: Record<string, string>;
  setGoalContributionAmount: (
    value: Record<string, string> | ((current: Record<string, string>) => Record<string, string>),
  ) => void;
  handleAddSavingsContribution: (goalId: string) => Promise<void>;
};

function SavingsSection({
  goalName,
  setGoalName,
  goalTargetAmount,
  setGoalTargetAmount,
  goalTargetDate,
  setGoalTargetDate,
  goalAutoContributePayday,
  setGoalAutoContributePayday,
  goalAutoContributePercent,
  setGoalAutoContributePercent,
  handleCreateSavingsGoal,
  isLoadingSavingsGoals,
  savingsGoals,
  goalContributionAmount,
  setGoalContributionAmount,
  handleAddSavingsContribution,
}: SavingsSectionProps) {
  return (
    <section className="savings-panel">
      <Card>
        <SectionHeader title="Savings Goals" subtitle="Create goals, track progress, and add contributions." />
        <form className="savings-form" onSubmit={(event) => void handleCreateSavingsGoal(event)}>
          <input type="text" value={goalName} onChange={(event) => setGoalName(event.target.value)} placeholder="Goal name" required />
          <input type="number" value={goalTargetAmount} onChange={(event) => setGoalTargetAmount(event.target.value)} placeholder="Target amount" min="0.01" step="0.01" required />
          <input type="date" value={goalTargetDate} onChange={(event) => setGoalTargetDate(event.target.value)} />
          <label className="checkbox-line">
            <input type="checkbox" checked={goalAutoContributePayday} onChange={(event) => setGoalAutoContributePayday(event.target.checked)} />
            Auto-contribute from payday
          </label>
          <input
            type="number"
            value={goalAutoContributePercent}
            onChange={(event) => setGoalAutoContributePercent(event.target.value)}
            placeholder="Auto contribution %"
            min="0"
            max="100"
            step="0.01"
          />
          <button type="submit">Create Savings Goal</button>
        </form>
      </Card>
      {isLoadingSavingsGoals ? (
        <p>Loading savings goals...</p>
      ) : savingsGoals.length === 0 ? (
        <EmptyState message="No savings goals yet." />
      ) : (
        <ul className="savings-list">
          {savingsGoals.map((goal) => (
            <li key={goal.id} className="savings-item">
              <div>
                <strong>{goal.name}</strong>
                <small>
                  Saved {formatCurrency(goal.savedAmount)} / {formatCurrency(goal.targetAmount)} | Remaining{" "}
                  {formatCurrency(goal.remainingAmount)}
                </small>
              </div>
              <div className="savings-actions">
                <input
                  type="number"
                  value={goalContributionAmount[goal.id] ?? ""}
                  onChange={(event) =>
                    setGoalContributionAmount((current) => ({ ...current, [goal.id]: event.target.value }))
                  }
                  aria-label={`Contribution amount for ${goal.name}`}
                  placeholder="Contribution"
                  min="0.01"
                  step="0.01"
                />
                <button
                  type="button"
                  aria-label={`Add contribution to ${goal.name}`}
                  onClick={() => void handleAddSavingsContribution(goal.id)}
                >
                  Add
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default SavingsSection;
