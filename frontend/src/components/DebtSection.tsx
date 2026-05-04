import type { FormEvent } from "react";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { DebtAccount, DebtProjection, HandLoan } from "../types";
import { formatCurrency } from "../utils";
import EmptyState from "./ui/EmptyState";
import SectionHeader from "./ui/SectionHeader";
import StatPill from "./ui/StatPill";

type DebtSectionProps = {
  debtName: string;
  setDebtName: (value: string) => void;
  debtLender: string;
  setDebtLender: (value: string) => void;
  debtBalance: string;
  setDebtBalance: (value: string) => void;
  debtApr: string;
  setDebtApr: (value: string) => void;
  debtMinimumPayment: string;
  setDebtMinimumPayment: (value: string) => void;
  debtDueDay: string;
  setDebtDueDay: (value: string) => void;
  editingDebtId: string | null;
  setEditingDebtId: (value: string | null) => void;
  handleDebtSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  isLoadingDebts: boolean;
  debts: DebtAccount[];
  handleDeleteDebt: (id: string) => Promise<void>;
  projectionStrategy: "avalanche" | "snowball";
  setProjectionStrategy: (value: "avalanche" | "snowball") => void;
  projectionBudget: string;
  setProjectionBudget: (value: string) => void;
  loadDebtProjection: () => Promise<void>;
  isLoadingProjection: boolean;
  projection: DebtProjection | null;
  loanDirection: "borrowed" | "lent";
  setLoanDirection: (value: "borrowed" | "lent") => void;
  loanCounterparty: string;
  setLoanCounterparty: (value: string) => void;
  loanPrincipal: string;
  setLoanPrincipal: (value: string) => void;
  loanDueDate: string;
  setLoanDueDate: (value: string) => void;
  loanStatus: "active" | "paid";
  setLoanStatus: (value: "active" | "paid") => void;
  loanNote: string;
  setLoanNote: (value: string) => void;
  editingLoanId: string | null;
  setEditingLoanId: (value: string | null) => void;
  handleHandLoanSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  isLoadingHandLoans: boolean;
  handLoans: HandLoan[];
  handleDeleteHandLoan: (id: string) => Promise<void>;
};

function DebtSection(props: DebtSectionProps) {
  const {
    debtName,
    setDebtName,
    debtLender,
    setDebtLender,
    debtBalance,
    setDebtBalance,
    debtApr,
    setDebtApr,
    debtMinimumPayment,
    setDebtMinimumPayment,
    debtDueDay,
    setDebtDueDay,
    editingDebtId,
    setEditingDebtId,
    handleDebtSubmit,
    isLoadingDebts,
    debts,
    handleDeleteDebt,
    projectionStrategy,
    setProjectionStrategy,
    projectionBudget,
    setProjectionBudget,
    loadDebtProjection,
    isLoadingProjection,
    projection,
    loanDirection,
    setLoanDirection,
    loanCounterparty,
    setLoanCounterparty,
    loanPrincipal,
    setLoanPrincipal,
    loanDueDate,
    setLoanDueDate,
    loanStatus,
    setLoanStatus,
    loanNote,
    setLoanNote,
    editingLoanId,
    setEditingLoanId,
    handleHandLoanSubmit,
    isLoadingHandLoans,
    handLoans,
    handleDeleteHandLoan,
  } = props;

  return (
    <Stack component="section" spacing={3}>
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent>
          <SectionHeader
            title="Debt accounts & hand loans"
            subtitle="Track balances, APR, and payoff strategy for debts plus personal loans."
          />
          <Box component="form" onSubmit={(event) => void handleDebtSubmit(event)}>
            <Stack spacing={2}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} useFlexGap sx={{ flexWrap: "wrap" }}>
                <TextField label="Debt name" value={debtName} onChange={(e) => setDebtName(e.target.value)} required size="small" sx={{ flex: 1, minWidth: 160 }} />
                <TextField label="Lender (optional)" value={debtLender} onChange={(e) => setDebtLender(e.target.value)} size="small" sx={{ flex: 1, minWidth: 160 }} />
                <TextField label="Balance" type="number" value={debtBalance} onChange={(e) => setDebtBalance(e.target.value)} required size="small" slotProps={{ htmlInput: { min: "0.01", step: "0.01" } }} sx={{ minWidth: 120 }} />
                <TextField label="APR %" type="number" value={debtApr} onChange={(e) => setDebtApr(e.target.value)} required size="small" slotProps={{ htmlInput: { min: 0, max: 100, step: "0.01" } }} sx={{ minWidth: 100 }} />
                <TextField label="Minimum payment" type="number" value={debtMinimumPayment} onChange={(e) => setDebtMinimumPayment(e.target.value)} required size="small" slotProps={{ htmlInput: { min: "0.01", step: "0.01" } }} sx={{ minWidth: 140 }} />
                <TextField label="Due day (1–31)" type="number" value={debtDueDay} onChange={(e) => setDebtDueDay(e.target.value)} required size="small" slotProps={{ htmlInput: { min: 1, max: 31 } }} sx={{ minWidth: 120 }} />
              </Stack>
              <Button type="submit" variant="contained" sx={{ alignSelf: "flex-start" }}>
                {editingDebtId ? "Update debt" : "Add debt"}
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>

      {isLoadingDebts ? (
        <Typography variant="body2">Loading debt accounts…</Typography>
      ) : debts.length === 0 ? (
        <EmptyState message="No debt accounts yet." />
      ) : (
        <Stack spacing={1.5}>
          {debts.map((debt) => (
            <Paper key={debt.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Stack spacing={1}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {debt.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  APR {debt.apr}% · Min {formatCurrency(debt.minimumPayment)} · Due day {debt.dueDay}
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
                  <Typography variant="body1" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                    {formatCurrency(debt.balance)}
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        setEditingDebtId(debt.id);
                        setDebtName(debt.name);
                        setDebtLender(debt.lender ?? "");
                        setDebtBalance(String(debt.balance));
                        setDebtApr(String(debt.apr));
                        setDebtMinimumPayment(String(debt.minimumPayment));
                        setDebtDueDay(String(debt.dueDay));
                      }}
                    >
                      Edit
                    </Button>
                    <Button size="small" color="error" variant="outlined" onClick={() => void handleDeleteDebt(debt.id)}>
                      Delete
                    </Button>
                  </Stack>
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      <Accordion variant="outlined" sx={{ borderRadius: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="proj-content" id="proj-header">
          <Typography variant="subtitle2">Payoff projection</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" } }}>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel id="strategy-label">Strategy</InputLabel>
                <Select
                  labelId="strategy-label"
                  label="Strategy"
                  value={projectionStrategy}
                  onChange={(event) => setProjectionStrategy(event.target.value as "avalanche" | "snowball")}
                >
                  <MenuItem value="avalanche">Avalanche</MenuItem>
                  <MenuItem value="snowball">Snowball</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Optional monthly budget"
                type="number"
                value={projectionBudget}
                onChange={(event) => setProjectionBudget(event.target.value)}
                size="small"
                slotProps={{ htmlInput: { min: "0.01", step: "0.01" } }}
                sx={{ minWidth: 200 }}
              />
              <Button type="button" variant="outlined" onClick={() => void loadDebtProjection()}>
                Refresh projection
              </Button>
            </Stack>
            {isLoadingProjection ? (
              <Typography variant="body2">Calculating projection…</Typography>
            ) : projection ? (
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {projection.strategy} payoff projection
                </Typography>
                <Stack direction="row" spacing={1} useFlexGap sx={{ mb: 1, flexWrap: "wrap" }}>
                  <StatPill label="Debts" value={String(projection.debtCount)} />
                  <StatPill label="Monthly budget" value={formatCurrency(projection.monthlyBudget)} />
                  <StatPill label="Months to payoff" value={String(projection.monthsToPayoff)} />
                  <StatPill label="Estimated interest" value={formatCurrency(projection.estimatedInterest)} />
                </Stack>
                {projection.payoffOrderNames.length > 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Payoff order: {projection.payoffOrderNames.join(" → ")}
                  </Typography>
                ) : null}
              </Paper>
            ) : null}
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
            Hand loans
          </Typography>
          <Box component="form" onSubmit={(event) => void handleHandLoanSubmit(event)}>
            <Stack spacing={2}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} useFlexGap sx={{ flexWrap: "wrap" }}>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel id="loan-dir-label">Direction</InputLabel>
                  <Select
                    labelId="loan-dir-label"
                    label="Direction"
                    value={loanDirection}
                    onChange={(event) => setLoanDirection(event.target.value as "borrowed" | "lent")}
                  >
                    <MenuItem value="borrowed">Borrowed</MenuItem>
                    <MenuItem value="lent">Lent</MenuItem>
                  </Select>
                </FormControl>
                <TextField label="Counterparty" value={loanCounterparty} onChange={(e) => setLoanCounterparty(e.target.value)} required size="small" sx={{ flex: 1, minWidth: 160 }} />
                <TextField label="Principal" type="number" value={loanPrincipal} onChange={(e) => setLoanPrincipal(e.target.value)} required size="small" slotProps={{ htmlInput: { min: "0.01", step: "0.01" } }} sx={{ minWidth: 120 }} />
                <TextField label="Due date" type="date" value={loanDueDate} onChange={(e) => setLoanDueDate(e.target.value)} size="small" slotProps={{ inputLabel: { shrink: true } }} sx={{ minWidth: 160 }} />
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel id="loan-status-label">Status</InputLabel>
                  <Select
                    labelId="loan-status-label"
                    label="Status"
                    value={loanStatus}
                    onChange={(event) => setLoanStatus(event.target.value as "active" | "paid")}
                  >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="paid">Paid</MenuItem>
                  </Select>
                </FormControl>
                <TextField label="Note (optional)" value={loanNote} onChange={(e) => setLoanNote(e.target.value)} size="small" sx={{ flex: 1, minWidth: 200 }} />
              </Stack>
              <Button type="submit" variant="contained" sx={{ alignSelf: "flex-start" }}>
                {editingLoanId ? "Update hand loan" : "Add hand loan"}
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>

      {isLoadingHandLoans ? (
        <Typography variant="body2">Loading hand loans…</Typography>
      ) : handLoans.length === 0 ? (
        <EmptyState message="No hand loans yet." />
      ) : (
        <Stack spacing={1.5}>
          {handLoans.map((loan) => (
            <Paper key={loan.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Stack spacing={1}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {loan.direction} · {loan.counterparty}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {loan.status}
                  {loan.dueDate ? ` · Due ${new Date(loan.dueDate).toLocaleDateString()}` : ""}
                  {loan.note ? ` · ${loan.note}` : ""}
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
                  <Typography sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{formatCurrency(loan.principal)}</Typography>
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        setEditingLoanId(loan.id);
                        setLoanDirection(loan.direction);
                        setLoanCounterparty(loan.counterparty);
                        setLoanPrincipal(String(loan.principal));
                        setLoanDueDate(loan.dueDate ? loan.dueDate.slice(0, 10) : "");
                        setLoanStatus(loan.status);
                        setLoanNote(loan.note ?? "");
                      }}
                    >
                      Edit
                    </Button>
                    <Button size="small" color="error" variant="outlined" onClick={() => void handleDeleteHandLoan(loan.id)}>
                      Delete
                    </Button>
                  </Stack>
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

export default DebtSection;
