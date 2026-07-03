import type { FormEvent } from "react";
import { useEffect, useRef } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useSearchParams } from "react-router-dom";
import type { Transaction } from "../types";
import MenuItem from "@mui/material/MenuItem";
import { CATEGORIES, formatCurrency, formatDateOnly } from "../utils";

type TransactionsSectionProps = {
  searchText: string;
  setSearchText: (value: string) => void;
  filterCategory: string;
  setFilterCategory: (value: string) => void;
  minAmount: string;
  setMinAmount: (value: string) => void;
  maxAmount: string;
  setMaxAmount: (value: string) => void;
  loadTransactions: () => Promise<void>;
  hasMoreTransactions: boolean;
  isLoadingMoreTransactions: boolean;
  loadMoreTransactions: () => Promise<void>;
  editingTransaction: Transaction | null;
  setEditingTransaction: (
    value: Transaction | null | ((current: Transaction | null) => Transaction | null),
  ) => void;
  handleUpdateTransaction: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  isLoadingTransactions: boolean;
  transactions: Transaction[];
  handleDeleteTransaction: (transaction: Transaction) => Promise<void>;
  reviewTransactions: Transaction[];
  isLoadingReviewTransactions: boolean;
  reviewCategoryEdits: Record<string, string>;
  setReviewCategoryEdits: (
    value: Record<string, string> | ((current: Record<string, string>) => Record<string, string>),
  ) => void;
  handleResolveReviewTransaction: (transactionId: string, applyToSimilar: boolean) => Promise<void>;
};

function TransactionsSection({
  searchText,
  setSearchText,
  filterCategory,
  setFilterCategory,
  minAmount,
  setMinAmount,
  maxAmount,
  setMaxAmount,
  loadTransactions,
  hasMoreTransactions,
  isLoadingMoreTransactions,
  loadMoreTransactions,
  editingTransaction,
  setEditingTransaction,
  handleUpdateTransaction,
  isLoadingTransactions,
  transactions,
  handleDeleteTransaction,
  reviewTransactions,
  isLoadingReviewTransactions,
  reviewCategoryEdits,
  setReviewCategoryEdits,
  handleResolveReviewTransaction,
}: TransactionsSectionProps) {
  const reviewAnchorRef = useRef<HTMLDivElement | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("review") !== "1") {
      return;
    }
    const t = window.setTimeout(() => {
      reviewAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      const next = new URLSearchParams(searchParams);
      next.delete("review");
      setSearchParams(next, { replace: true });
    }, 0);
    return () => window.clearTimeout(t);
  }, [searchParams, setSearchParams]);

  return (
    <Card component="section" variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
      <Typography variant="subtitle1" gutterBottom>
        Filters
      </Typography>
      <Box
        component="form"
        onSubmit={(event) => {
          event.preventDefault();
          void loadTransactions();
        }}
        sx={{ mb: 3 }}
      >
        <Stack
          spacing={2}
          sx={{ flexDirection: { xs: "column", md: "row" }, flexWrap: "wrap", columnGap: 2, rowGap: 2 }}
        >
          <TextField
            label="Search description"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            size="small"
          />
          <TextField
            label="Category"
            value={filterCategory}
            onChange={(event) => setFilterCategory(event.target.value)}
            size="small"
          />
          <TextField
            label="Min amount"
            type="number"
            value={minAmount}
            onChange={(event) => setMinAmount(event.target.value)}
            slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
            size="small"
          />
          <TextField
            label="Max amount"
            type="number"
            value={maxAmount}
            onChange={(event) => setMaxAmount(event.target.value)}
            slotProps={{ htmlInput: { min: 0, step: "0.01" } }}
            size="small"
          />
          <Button type="submit" variant="contained">
            Apply filters
          </Button>
        </Stack>
      </Box>

      <Box ref={reviewAnchorRef}>
        {reviewTransactions.length > 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Resolve low-confidence categories below before they affect insights.
          </Alert>
        )}
        <Typography variant="h6" gutterBottom>
          Needs review
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Low-confidence AI categorization suggestions appear here first.
        </Typography>
        {isLoadingReviewTransactions ? (
          <Typography variant="body2">Loading review queue…</Typography>
        ) : reviewTransactions.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            No transactions need review.
          </Typography>
        ) : (
          <TableContainer sx={{ mb: 4 }}>
            <Table size="small" stickyHeader>
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
                  <TableCell component="th" scope="col">
                    Suggested
                  </TableCell>
                  <TableCell component="th" scope="col">
                    Category
                  </TableCell>
                  <TableCell component="th" scope="col" align="right">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reviewTransactions.map((transaction) => (
                  <TableRow key={`review-${transaction.id}`}>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell>{formatDateOnly(transaction.date)}</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                      {formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell>
                      {transaction.category}{" "}
                      {transaction.categorizationConfidence != null
                        ? `(${Math.round(transaction.categorizationConfidence * 100)}%)`
                        : ""}
                    </TableCell>
                    <TableCell sx={{ minWidth: 160 }}>
                      <TextField
                        size="small"
                        select
                        fullWidth
                        value={reviewCategoryEdits[transaction.id] ?? transaction.category}
                        onChange={(event) =>
                          setReviewCategoryEdits((current) => ({
                            ...current,
                            [transaction.id]: event.target.value,
                          }))
                        }
                      >
                        {CATEGORIES.map((option) => (
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
                        <Button size="small" onClick={() => void handleResolveReviewTransaction(transaction.id, false)}>
                          Approve
                        </Button>
                        <Button size="small" onClick={() => void handleResolveReviewTransaction(transaction.id, true)}>
                          Similar
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      <Dialog
        open={Boolean(editingTransaction)}
        onClose={() => setEditingTransaction(null)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="edit-transaction-title"
      >
        {editingTransaction ? (
          <Box component="form" onSubmit={(event) => void handleUpdateTransaction(event)}>
            <DialogTitle id="edit-transaction-title">Edit transaction</DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ pt: 1 }}>
                <TextField
                  label="Description"
                  value={editingTransaction.description}
                  onChange={(event) =>
                    setEditingTransaction((current) =>
                      current ? { ...current, description: event.target.value } : current,
                    )
                  }
                  required
                  size="small"
                  fullWidth
                />
                <TextField
                  label="Amount"
                  type="number"
                  value={editingTransaction.amount}
                  onChange={(event) =>
                    setEditingTransaction((current) =>
                      current ? { ...current, amount: Number(event.target.value) } : current,
                    )
                  }
                  helperText="Negative for spending, positive for income"
                  slotProps={{ htmlInput: { step: "0.01" } }}
                  required
                  size="small"
                  fullWidth
                />
                <TextField
                  label="Category"
                  select
                  value={CATEGORIES.includes(editingTransaction.category as (typeof CATEGORIES)[number]) ? editingTransaction.category : "Uncategorized"}
                  onChange={(event) =>
                    setEditingTransaction((current) =>
                      current ? { ...current, category: event.target.value } : current,
                    )
                  }
                  required
                  size="small"
                  fullWidth
                >
                  {CATEGORIES.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Date"
                  type="date"
                  value={editingTransaction.date.slice(0, 10)}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (!value) return;
                    // Store as UTC midnight to match how the backend keeps
                    // day-granular dates; avoids off-by-one-day shifts.
                    setEditingTransaction((current) =>
                      current ? { ...current, date: `${value}T00:00:00.000Z` } : current,
                    );
                  }}
                  slotProps={{ inputLabel: { shrink: true } }}
                  required
                  size="small"
                  fullWidth
                />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button type="button" onClick={() => setEditingTransaction(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="contained">
                Save changes
              </Button>
            </DialogActions>
          </Box>
        ) : null}
      </Dialog>

      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        All transactions
      </Typography>
      {isLoadingTransactions ? (
        <Typography variant="body2">Loading transactions…</Typography>
      ) : transactions.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No transactions match your filters.
        </Typography>
      ) : (
        <TableContainer>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell component="th" scope="col">
                  Description
                </TableCell>
                <TableCell component="th" scope="col">
                  Date
                </TableCell>
                <TableCell component="th" scope="col">
                  Category
                </TableCell>
                <TableCell component="th" scope="col">
                  Source
                </TableCell>
                <TableCell component="th" scope="col" align="right">
                  Amount
                </TableCell>
                <TableCell component="th" scope="col" align="right">
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={`${transaction.sourceType}-${transaction.id}`}>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell>{formatDateOnly(transaction.date)}</TableCell>
                  <TableCell>{transaction.category}</TableCell>
                  <TableCell>
                    {transaction.sourceType}
                    {transaction.accountName ? ` · ${transaction.accountName}` : ""}
                  </TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: "tabular-nums" }}>
                    {formatCurrency(transaction.amount)}
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
                      <Button size="small" onClick={() => setEditingTransaction(transaction)}>
                        Edit
                      </Button>
                      <Button size="small" color="error" onClick={() => void handleDeleteTransaction(transaction)}>
                        Delete
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {hasMoreTransactions ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 1.5 }}>
              <Button size="small" onClick={() => void loadMoreTransactions()} disabled={isLoadingMoreTransactions}>
                {isLoadingMoreTransactions ? "Loading…" : "Load more"}
              </Button>
            </Box>
          ) : null}
        </TableContainer>
      )}
      </CardContent>
    </Card>
  );
}

export default TransactionsSection;
