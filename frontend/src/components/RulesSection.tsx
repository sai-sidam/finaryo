import type { FormEvent } from "react";
import type { CategorizationRule, RecurringCandidate } from "../types";
import { formatCurrency } from "../utils";

type RulesSectionProps = {
  ruleKeyword: string;
  setRuleKeyword: (value: string) => void;
  ruleCategory: string;
  setRuleCategory: (value: string) => void;
  handleCreateRule: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  isLoadingRules: boolean;
  rules: CategorizationRule[];
  handleDeleteRule: (id: string) => Promise<void>;
  loadRecurringCandidates: () => Promise<void>;
  isLoadingRecurring: boolean;
  recurringCandidates: RecurringCandidate[];
};

function RulesSection({
  ruleKeyword,
  setRuleKeyword,
  ruleCategory,
  setRuleCategory,
  handleCreateRule,
  isLoadingRules,
  rules,
  handleDeleteRule,
  loadRecurringCandidates,
  isLoadingRecurring,
  recurringCandidates,
}: RulesSectionProps) {
  return (
    <section className="rules-panel">
      <h2>Auto-Categorization & Recurring</h2>
      <form className="rules-form" onSubmit={(event) => void handleCreateRule(event)}>
        <input
          type="text"
          value={ruleKeyword}
          onChange={(event) => setRuleKeyword(event.target.value)}
          placeholder="Keyword"
          required
        />
        <input
          type="text"
          value={ruleCategory}
          onChange={(event) => setRuleCategory(event.target.value)}
          placeholder="Category"
          required
        />
        <button type="submit">Add Rule</button>
      </form>
      {isLoadingRules ? (
        <p>Loading rules...</p>
      ) : rules.length === 0 ? (
        <p>No categorization rules yet.</p>
      ) : (
        <ul className="rules-list">
          {rules.map((rule) => (
            <li key={rule.id} className="rules-item">
              <span>
                "{rule.keyword}" to {rule.category}
              </span>
              <button type="button" onClick={() => void handleDeleteRule(rule.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" onClick={() => void loadRecurringCandidates()}>
        Refresh Recurring Candidates
      </button>
      {isLoadingRecurring ? (
        <p>Detecting recurring transactions...</p>
      ) : recurringCandidates.length === 0 ? (
        <p>No recurring candidates detected yet.</p>
      ) : (
        <ul className="rules-list">
          {recurringCandidates.map((candidate) => (
            <li key={candidate.description} className="rules-item">
              <span>
                {candidate.description} | {candidate.count} occurrences | Avg{" "}
                {formatCurrency(candidate.averageAmount)} | ~{candidate.averageGapDays} days
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default RulesSection;
