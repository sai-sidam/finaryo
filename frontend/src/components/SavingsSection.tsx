import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { FormEvent } from "react";
import type { SavingsGoal } from "../types";
import { formatCurrency } from "../utils";
import EmptyState from "./ui/EmptyState";
import SectionHeader from "./ui/SectionHeader";

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
    <Stack component="section" spacing={3}>
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent>
          <SectionHeader title="Savings goals" subtitle="Create goals, track progress, and add contributions." />
          <Box component="form" onSubmit={(event) => void handleCreateSavingsGoal(event)}>
            <Stack spacing={2}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} useFlexGap sx={{ flexWrap: "wrap" }}>
                <TextField
                  label="Goal name"
                  value={goalName}
                  onChange={(event) => setGoalName(event.target.value)}
                  required
                  size="small"
                  sx={{ flex: 1, minWidth: 200 }}
                />
                <TextField
                  label="Target amount"
                  type="number"
                  value={goalTargetAmount}
                  onChange={(event) => setGoalTargetAmount(event.target.value)}
                  required
                  size="small"
                  slotProps={{ htmlInput: { min: "0.01", step: "0.01" } }}
                  sx={{ minWidth: 140 }}
                />
                <TextField
                  label="Target date"
                  type="date"
                  value={goalTargetDate}
                  onChange={(event) => setGoalTargetDate(event.target.value)}
                  size="small"
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{ minWidth: 160 }}
                />
              </Stack>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={goalAutoContributePayday}
                    onChange={(event) => setGoalAutoContributePayday(event.target.checked)}
                  />
                }
                label="Auto-contribute from payday"
              />
              <TextField
                label="Auto contribution %"
                type="number"
                value={goalAutoContributePercent}
                onChange={(event) => setGoalAutoContributePercent(event.target.value)}
                size="small"
                slotProps={{ htmlInput: { min: 0, max: 100, step: "0.01" } }}
                sx={{ maxWidth: 200 }}
              />
              <Button type="submit" variant="contained" sx={{ alignSelf: "flex-start" }}>
                Create savings goal
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>

      {isLoadingSavingsGoals ? (
        <Typography variant="body2">Loading savings goals…</Typography>
      ) : savingsGoals.length === 0 ? (
        <EmptyState message="No savings goals yet." />
      ) : (
        <Stack spacing={2}>
          {savingsGoals.map((goal) => (
            <Paper key={goal.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Stack spacing={1.5}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {goal.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Saved {formatCurrency(goal.savedAmount)} / {formatCurrency(goal.targetAmount)} · Remaining{" "}
                  {formatCurrency(goal.remainingAmount)}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={
                    goal.targetAmount > 0 ? Math.min(100, (goal.savedAmount / goal.targetAmount) * 100) : 0
                  }
                  sx={{ borderRadius: 1 }}
                />
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" } }}>
                  <TextField
                    size="small"
                    label="Contribution"
                    type="number"
                    value={goalContributionAmount[goal.id] ?? ""}
                    onChange={(event) =>
                      setGoalContributionAmount((current) => ({ ...current, [goal.id]: event.target.value }))
                    }
                    slotProps={{ htmlInput: { min: "0.01", step: "0.01" } }}
                    sx={{ maxWidth: 160 }}
                  />
                  <Button type="button" variant="outlined" onClick={() => void handleAddSavingsContribution(goal.id)}>
                    Add
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

export default SavingsSection;
