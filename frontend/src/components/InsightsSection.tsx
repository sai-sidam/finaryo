import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { MonthlyInsights } from "../types";
import { formatCurrency } from "../utils";
import EmptyState from "./ui/EmptyState";
import SectionHeader from "./ui/SectionHeader";

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
    <Card component="section" variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
      <SectionHeader title="Monthly insights" />
      <Stack spacing={2} sx={{ mb: 2, flexDirection: { xs: "column", sm: "row" }, alignItems: { sm: "flex-start" } }}>
        <TextField
          label="Month"
          type="month"
          value={insightsMonth}
          onChange={(event) => setInsightsMonth(event.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          size="small"
        />
        <Button variant="contained" onClick={() => void loadMonthlyInsights()} disabled={isLoadingInsights}>
          Refresh insights
        </Button>
      </Stack>
      {isLoadingInsights ? (
        <LinearProgress />
      ) : insights ? (
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
            <Chip label={`Income ${formatCurrency(insights.incomeTotal)}`} variant="outlined" />
            <Chip label={`Expenses ${formatCurrency(insights.expenseTotal)}`} variant="outlined" />
            <Chip
              label={`Net ${formatCurrency(insights.net)}`}
              color={insights.net >= 0 ? "success" : "warning"}
              variant="outlined"
            />
          </Stack>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Top categories
            </Typography>
            {insights.topCategories.length === 0 ? (
              <Typography variant="body2">—</Typography>
            ) : (
              <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", gap: 0.5 }}>
                {insights.topCategories.map((item) => (
                  <Chip
                    key={item.category}
                    size="small"
                    label={`${item.category} (${formatCurrency(item.amount)})`}
                    variant="outlined"
                  />
                ))}
              </Stack>
            )}
          </Box>
        </Stack>
      ) : (
        <EmptyState message="Choose a month and refresh to see insights." />
      )}
      </CardContent>
    </Card>
  );
}

export default InsightsSection;
