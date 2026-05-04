import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import LinearProgress from "@mui/material/LinearProgress";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Link as RouterLink } from "react-router-dom";
import OverviewSetupChecklist from "../components/OverviewSetupChecklist";
import PageHeader from "../components/PageHeader";
import SectionCard from "../components/SectionCard";
import { useFinanceApp } from "../context/FinanceAppContext";
import type { DebtAccount, Expense, HandLoan, Transaction } from "../types";
import { formatCurrency, toMonthKey } from "../utils";

function StatBlock({ label, value, emphasize }: { label: string; value: string; emphasize?: "positive" | "negative" | "neutral" }) {
  const color =
    emphasize === "positive" ? "success.main" : emphasize === "negative" ? "error.main" : "text.primary";
  return (
    <Box sx={{ minWidth: { xs: "45%", sm: 120 } }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.25, letterSpacing: "0.06em", textTransform: "uppercase", fontSize: "0.65rem" }}>
        {label}
      </Typography>
      <Typography variant="h6" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 700, color, letterSpacing: "-0.02em" }}>
        {value}
      </Typography>
    </Box>
  );
}

export default function OverviewPage() {
  const fin = useFinanceApp();
  const {
    transactions,
    expenses,
    reviewTransactions,
    insights,
    insightsMonth,
    isLoadingInsights,
    total,
    name,
    setName,
    amount,
    setAmount,
    category,
    setCategory,
    handleSubmit,
    isSubmitting,
    isLoading,
    debts,
    handLoans,
    isLoadingDebts,
    isLoadingHandLoans,
  } = fin;

  const borrowedActiveLoans = handLoans.filter((l: HandLoan) => l.direction === "borrowed" && l.status === "active");
  const cardBalanceTotal = debts.reduce((sum: number, d: DebtAccount) => sum + d.balance, 0);
  const handBorrowedTotal = borrowedActiveLoans.reduce((sum: number, l: HandLoan) => sum + l.principal, 0);
  const totalOwed = cardBalanceTotal + handBorrowedTotal;
  const obligationsLoading = isLoadingDebts || isLoadingHandLoans;

  const needsAttention = reviewTransactions.length > 0;
  const currentMonthKey = toMonthKey(new Date());
  const snapshotMatchesMonth = insightsMonth === currentMonthKey;
  const hasAnyData = transactions.length > 0 || expenses.length > 0;
  const hasImportedTransactions = transactions.some((t: Transaction) => t.sourceType === "imported");
  const hasDebtsRecorded = debts.length > 0 || borrowedActiveLoans.length > 0;
  const recent = transactions.slice(0, 8);

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle="See money in, money out, and what you still owe—starting with this month."
      />

      {needsAttention && (
        <Alert severity="warning" sx={{ mb: 3 }} action={
          <Button component={RouterLink} to="/transactions?review=1" color="inherit" size="small">
            Review now
          </Button>
        }>
          {reviewTransactions.length} transaction{reviewTransactions.length === 1 ? "" : "s"} need categorization review.
        </Alert>
      )}

      {hasAnyData ? (
        <OverviewSetupChecklist
          hasImportedTransactions={hasImportedTransactions}
          categorizationClear={reviewTransactions.length === 0}
          hasDebtsRecorded={hasDebtsRecorded}
          insightsCurrentMonth={Boolean(insights && snapshotMatchesMonth)}
          isLoadingInsights={isLoadingInsights}
        />
      ) : null}

      <Stack spacing={2.5} sx={{ mb: 3, flexDirection: { xs: "column", md: "row" } }}>
        <Card variant="outlined" sx={{ flex: 1, borderRadius: 2 }}>
          <CardContent sx={{ "&:last-child": { pb: 2 } }}>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: "0.08em" }}>
              Month snapshot · {insightsMonth}
            </Typography>
            {isLoadingInsights ? (
              <LinearProgress sx={{ mt: 2 }} />
            ) : insights && snapshotMatchesMonth ? (
              <Stack direction="row" spacing={2} useFlexGap sx={{ mt: 2, flexWrap: "wrap" }}>
                <StatBlock label="Income" value={formatCurrency(insights.incomeTotal)} />
                <StatBlock label="Expenses" value={formatCurrency(insights.expenseTotal)} />
                <StatBlock
                  label="Net"
                  value={formatCurrency(insights.net)}
                  emphasize={insights.net >= 0 ? "positive" : "negative"}
                />
              </Stack>
            ) : (
              <Typography variant="body2" sx={{ mt: 2 }}>
                Open{" "}
                <RouterLink to="/insights" style={{ color: "inherit", fontWeight: 600 }}>
                  Insights
                </RouterLink>{" "}
                and refresh to load this month, or confirm the month selector matches today&apos;s month.
              </Typography>
            )}
            <Button component={RouterLink} to="/insights" size="small" sx={{ mt: 2 }} variant="outlined">
              Full insights
            </Button>
            <Button component={RouterLink} to="/cashflow" size="small" sx={{ mt: 1, display: "block" }} variant="text">
              Cashflow & paydays
            </Button>
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ flex: 1, borderRadius: 2 }}>
          <CardContent sx={{ "&:last-child": { pb: 2 } }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
              Quick paths
            </Typography>
            <Stack spacing={1.25}>
              <Button variant="contained" component={RouterLink} to="/connect" fullWidth size="large">
                Connect or import data
              </Button>
              <Button variant="outlined" component={RouterLink} to="/transactions" fullWidth>
                All transactions
              </Button>
              <Button variant="outlined" component={RouterLink} to="/debts" fullWidth>
                Debts & hand loans
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      <Card variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent>
          <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: "0.08em" }}>
            What you owe
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2, maxWidth: "72ch" }}>
            Credit card balances and active hand loans you&apos;ve marked as borrowed. Mortgages and other bank-linked
            loans aren&apos;t connected yet.
          </Typography>
          {obligationsLoading ? (
            <LinearProgress sx={{ maxWidth: 360 }} />
          ) : debts.length === 0 && borrowedActiveLoans.length === 0 ? (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Add your cards and informal loans to see what&apos;s still outstanding.
              </Typography>
              <Button component={RouterLink} to="/debts" variant="outlined" size="small">
                Set up debts
              </Button>
            </>
          ) : (
            <>
              <Stack direction="row" spacing={2} useFlexGap sx={{ mt: 1, flexWrap: "wrap" }}>
                <StatBlock label="Credit cards" value={formatCurrency(cardBalanceTotal)} />
                <StatBlock label="Hand loans (borrowed)" value={formatCurrency(handBorrowedTotal)} />
                <StatBlock
                  label="Total owed"
                  value={formatCurrency(totalOwed)}
                  emphasize={totalOwed > 0 ? "negative" : "neutral"}
                />
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
                {debts.length} card account{debts.length === 1 ? "" : "s"} · {borrowedActiveLoans.length} active borrowed
                loan{borrowedActiveLoans.length === 1 ? "" : "s"}
              </Typography>
              <Button component={RouterLink} to="/debts" size="small" sx={{ mt: 2 }} variant="contained">
                Manage debts
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {!hasAnyData ? (
        <Card variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
              Get started
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Start with a CSV or Excel export from your bank (recommended while live sync is rolling out), or log a
              manual expense below. Unsure about columns? Grab the sample file—same format as on Connect.
            </Typography>
            <Stack spacing={1} sx={{ flexDirection: { xs: "column", sm: "row" }, flexWrap: "wrap" }}>
              <Button component={RouterLink} to="/connect" variant="contained">
                Import or connect
              </Button>
              <Button component={RouterLink} to="/transactions" variant="outlined">
                Browse transactions
              </Button>
              <Button
                component="a"
                href="/sample-transactions.csv"
                download="finaryo-sample-transactions.csv"
                variant="outlined"
              >
                Download sample CSV
              </Button>
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      <Stack spacing={3}>
        <SectionCard title="Quick expense" description="Log a one-off expense without linking an account.">
          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2} sx={{ flexDirection: { xs: "column", sm: "row" }, alignItems: { sm: "flex-start" } }}>
              <TextField
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                slotProps={{ htmlInput: { maxLength: 80 } }}
                size="small"
                fullWidth
                sx={{ flex: 1 }}
              />
              <TextField
                label="Amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                slotProps={{ htmlInput: { step: "0.01", min: "0.01" } }}
                size="small"
                sx={{ minWidth: { sm: 140 } }}
              />
              <TextField
                label="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                slotProps={{ htmlInput: { maxLength: 80 } }}
                size="small"
                sx={{ flex: 1 }}
              />
              <Button type="submit" variant="contained" disabled={isSubmitting} sx={{ mt: { sm: 0.5 }, minWidth: 140 }}>
                {isSubmitting ? "Saving…" : "Add expense"}
              </Button>
            </Stack>
          </Box>
        </SectionCard>

        <SectionCard title="Manual expenses" description="Running total from expenses you entered manually on this overview.">
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "baseline", mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Total
            </Typography>
            <Typography variant="h5" component="p" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>
              {formatCurrency(total)}
            </Typography>
          </Stack>
          <Divider sx={{ mb: 2 }} />
          {isLoading ? (
            <Typography variant="body2">Loading expenses…</Typography>
          ) : expenses.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No manual expenses yet.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell component="th" scope="col">
                      Name
                    </TableCell>
                    <TableCell component="th" scope="col">
                      Category
                    </TableCell>
                    <TableCell component="th" scope="col" align="right">
                      Amount
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {expenses.slice(0, 6).map((expense: Expense) => (
                    <TableRow key={expense.id} hover>
                      <TableCell>{expense.name}</TableCell>
                      <TableCell>{expense.category}</TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                        {formatCurrency(expense.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </SectionCard>

        <SectionCard title="Recent transactions" description="Latest activity across connected accounts and imports.">
          {recent.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No transactions yet. Use{" "}
              <RouterLink to="/connect" style={{ color: "inherit", fontWeight: 600 }}>
                Connect & import
              </RouterLink>
              .
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell component="th" scope="col">
                      Description
                    </TableCell>
                    <TableCell component="th" scope="col">
                      Date
                    </TableCell>
                    <TableCell component="th" scope="col" align="right">
                      Amount
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recent.map((t: Transaction) => (
                    <TableRow key={`${t.sourceType}-${t.id}`} hover>
                      <TableCell>{t.description}</TableCell>
                      <TableCell>{new Date(t.date).toLocaleDateString()}</TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                        {formatCurrency(t.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </SectionCard>
      </Stack>
    </>
  );
}
