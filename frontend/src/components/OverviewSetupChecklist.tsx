import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import RadioButtonUncheckedRoundedIcon from "@mui/icons-material/RadioButtonUncheckedRounded";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";
import { Link as RouterLink } from "react-router-dom";

export type OverviewSetupChecklistProps = {
  /** User has at least one imported bank/CSV transaction */
  hasImportedTransactions: boolean;
  /** No transactions waiting for category review */
  categorizationClear: boolean;
  /** At least one credit card debt or active borrowed hand loan */
  hasDebtsRecorded: boolean;
  /** Monthly insights loaded for the calendar month being viewed */
  insightsCurrentMonth: boolean;
  isLoadingInsights: boolean;
};

function StepIcon({ done }: { done: boolean }) {
  return done ? (
    <CheckCircleOutlineRoundedIcon color="success" fontSize="small" aria-hidden />
  ) : (
    <RadioButtonUncheckedRoundedIcon color="disabled" fontSize="small" aria-hidden />
  );
}

/**
 * Shown on Overview until core setup steps are done: categories, debts, insights.
 * Import-only users get a nudge on categorization; manual-only users skip that path automatically.
 */
export default function OverviewSetupChecklist(props: OverviewSetupChecklistProps) {
  const theme = useTheme();
  const {
    hasImportedTransactions,
    categorizationClear,
    hasDebtsRecorded,
    insightsCurrentMonth,
    isLoadingInsights,
  } = props;

  const categorizationDone = !hasImportedTransactions || categorizationClear;

  const allDone = categorizationDone && hasDebtsRecorded && insightsCurrentMonth && !isLoadingInsights;

  if (allDone) {
    return null;
  }

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 3,
        borderRadius: 2,
        borderColor: alpha(theme.palette.primary.main, 0.35),
        bgcolor: alpha(theme.palette.primary.main, 0.04),
      }}
    >
      <CardContent sx={{ "&:last-child": { pb: 2 } }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
          Finish setting up your picture
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: "72ch" }}>
          Work through these when you can—each step makes income, spending, and obligations easier to trust.
        </Typography>
        <List dense disablePadding sx={{ "& .MuiListItem-root": { alignItems: "flex-start", py: 0.75 } }}>
          <ListItem
            disableGutters
            secondaryAction={
              !categorizationDone ? (
                <Button component={RouterLink} to="/transactions?review=1" size="small" variant="contained">
                  Review
                </Button>
              ) : undefined
            }
          >
            <ListItemIcon sx={{ minWidth: 36, mt: 0.25 }}>
              <StepIcon done={categorizationDone} />
            </ListItemIcon>
            <ListItemText
              primary="Clear categorization review"
              secondary={
                categorizationDone
                  ? hasImportedTransactions
                    ? "Imported transactions are categorized or approved."
                    : "Nothing to review yet—add a bank import when you’re ready."
                  : "Assign categories so spending reports stay accurate."
              }
              slotProps={{
                primary: { variant: "body2", sx: { fontWeight: 600 } },
                secondary: { variant: "caption", component: "span" },
              }}
            />
          </ListItem>

          <ListItem
            disableGutters
            secondaryAction={
              !hasDebtsRecorded ? (
                <Button component={RouterLink} to="/debts" size="small" variant="outlined">
                  Add debts
                </Button>
              ) : undefined
            }
          >
            <ListItemIcon sx={{ minWidth: 36, mt: 0.25 }}>
              <StepIcon done={hasDebtsRecorded} />
            </ListItemIcon>
            <ListItemText
              primary="Record cards & hand loans you owe"
              secondary={
                hasDebtsRecorded
                  ? "Balances are on your radar."
                  : "Credit cards and informal loans you track manually."
              }
              slotProps={{
                primary: { variant: "body2", sx: { fontWeight: 600 } },
                secondary: { variant: "caption", component: "span" },
              }}
            />
          </ListItem>

          <ListItem
            disableGutters
            secondaryAction={
              !insightsCurrentMonth && !isLoadingInsights ? (
                <Button component={RouterLink} to="/insights" size="small" variant="outlined">
                  Open Insights
                </Button>
              ) : undefined
            }
          >
            <ListItemIcon sx={{ minWidth: 36, mt: 0.25 }}>
              <StepIcon done={insightsCurrentMonth && !isLoadingInsights} />
            </ListItemIcon>
            <ListItemText
              primary="See this month in Insights"
              secondary={
                isLoadingInsights
                  ? "Loading…"
                  : insightsCurrentMonth
                    ? "Income and expense totals match the current calendar month."
                    : "Open Insights and align the month selector with today’s month."
              }
              slotProps={{
                primary: { variant: "body2", sx: { fontWeight: 600 } },
                secondary: { variant: "caption", component: "span" },
              }}
            />
          </ListItem>
        </List>
      </CardContent>
    </Card>
  );
}
