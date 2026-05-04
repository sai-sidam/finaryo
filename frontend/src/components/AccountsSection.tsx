import { useState } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { BalanceSheetInsights } from "../types";
import { formatCurrency } from "../utils";

type AccountsSectionProps = {
  insightsMonth: string;
  setInsightsMonth: (value: string) => void;
  loadBalanceSheet: () => Promise<void>;
  isLoadingBalanceSheet: boolean;
  balanceSheet: BalanceSheetInsights | null;
  performDuplicateCleanup: () => Promise<void>;
  isCleaningDuplicates: boolean;
  duplicateCleanupSummary: string | null;
};

function AccountsSection({
  insightsMonth,
  setInsightsMonth,
  loadBalanceSheet,
  isLoadingBalanceSheet,
  balanceSheet,
  performDuplicateCleanup,
  isCleaningDuplicates,
  duplicateCleanupSummary,
}: AccountsSectionProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <Card component="section" variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
      <Typography variant="subtitle1" gutterBottom>
        Month
      </Typography>
      <Stack spacing={2} sx={{ mb: 3, flexDirection: { xs: "column", sm: "row" }, alignItems: { sm: "center" } }}>
        <TextField
          label="Reporting month"
          type="month"
          value={insightsMonth}
          onChange={(event) => setInsightsMonth(event.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          size="small"
        />
        <Button variant="outlined" onClick={() => void loadBalanceSheet()}>
          Refresh accounts
        </Button>
      </Stack>

      {isLoadingBalanceSheet ? (
        <Typography variant="body2">Loading account summary…</Typography>
      ) : !balanceSheet || balanceSheet.accounts.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No account data for the selected month.
        </Typography>
      ) : (
        <Stack spacing={1} sx={{ mb: 3 }}>
          <Typography variant="subtitle2">
            Total net flow: {formatCurrency(balanceSheet.totalNetFlow)}
          </Typography>
          <Paper variant="outlined" sx={{ borderRadius: 2 }}>
            <List dense disablePadding>
              {balanceSheet.accounts.map((account) => (
                <ListItem key={`${account.accountName}-${account.accountType}`} divider sx={{ alignItems: "flex-start" }}>
                  <ListItemText
                    primary={`${account.accountName} (${account.accountType})`}
                    secondary={
                      <>
                        Net {formatCurrency(account.netFlow)} · Income {formatCurrency(account.income)} · Expenses{" "}
                        {formatCurrency(account.expenses)} · Transfers {formatCurrency(account.transfers)}
                      </>
                    }
                    slotProps={{ secondary: { component: "div" } }}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Stack>
      )}

      <Accordion variant="outlined" defaultExpanded={false}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="dup-content" id="dup-header">
          <Typography variant="subtitle2">Advanced — duplicate cleanup</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Permanently removes duplicate imported transaction rows. This cannot be undone.
          </Typography>
          <Button variant="outlined" color="warning" onClick={() => setConfirmOpen(true)} disabled={isCleaningDuplicates}>
            {isCleaningDuplicates ? "Cleaning…" : "Clean up duplicates"}
          </Button>
          {duplicateCleanupSummary && (
            <Typography variant="body2" sx={{ mt: 2 }}>
              {duplicateCleanupSummary}
            </Typography>
          )}
        </AccordionDetails>
      </Accordion>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} aria-labelledby="dup-dialog-title">
        <DialogTitle id="dup-dialog-title">Remove duplicate imports?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This permanently deletes duplicate imported transactions detected in your database. Continue only if you
            understand the impact.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button
            color="warning"
            variant="contained"
            onClick={() => {
              setConfirmOpen(false);
              void performDuplicateCleanup();
            }}
          >
            Remove duplicates
          </Button>
        </DialogActions>
      </Dialog>
      </CardContent>
    </Card>
  );
}

export default AccountsSection;
