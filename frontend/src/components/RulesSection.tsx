import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { FormEvent } from "react";
import type { CategorizationRule, RecurringCandidate } from "../types";
import { formatCurrency } from "../utils";
import EmptyState from "./ui/EmptyState";
import SectionHeader from "./ui/SectionHeader";

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
    <Card component="section" variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <SectionHeader title="Auto-Categorization & Recurring" />
        <Box component="form" onSubmit={(event) => void handleCreateRule(event)} sx={{ mb: 3 }}>
          <Stack spacing={2} direction={{ xs: "column", sm: "row" }} useFlexGap sx={{ flexWrap: "wrap" }}>
            <TextField
              label="Keyword"
              value={ruleKeyword}
              onChange={(event) => setRuleKeyword(event.target.value)}
              required
              size="small"
              sx={{ minWidth: { sm: 200 } }}
            />
            <TextField
              label="Category"
              value={ruleCategory}
              onChange={(event) => setRuleCategory(event.target.value)}
              required
              size="small"
              sx={{ minWidth: { sm: 200 } }}
            />
            <Button type="submit" variant="contained">
              Add Rule
            </Button>
          </Stack>
        </Box>
        {isLoadingRules ? (
          <Typography variant="body2">Loading rules…</Typography>
        ) : rules.length === 0 ? (
          <EmptyState message="No categorization rules yet." />
        ) : (
          <Stack spacing={1.5} sx={{ mb: 3 }}>
            {rules.map((rule) => (
              <Paper key={rule.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
                  <Typography variant="body2">
                    &quot;{rule.keyword}&quot; → {rule.category}
                  </Typography>
                  <Button type="button" size="small" color="error" onClick={() => void handleDeleteRule(rule.id)}>
                    Delete
                  </Button>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
        <Button type="button" variant="outlined" onClick={() => void loadRecurringCandidates()} sx={{ mb: 2 }}>
          Refresh recurring candidates
        </Button>
        {isLoadingRecurring ? (
          <Typography variant="body2">Detecting recurring transactions…</Typography>
        ) : recurringCandidates.length === 0 ? (
          <EmptyState message="No recurring candidates detected yet." />
        ) : (
          <Stack spacing={1.5}>
            {recurringCandidates.map((candidate) => (
              <Paper key={candidate.description} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                <Typography variant="body2">
                  {candidate.description} · {candidate.count} occurrences · Avg {formatCurrency(candidate.averageAmount)} ·
                  ~{candidate.averageGapDays} days apart
                </Typography>
              </Paper>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

export default RulesSection;
