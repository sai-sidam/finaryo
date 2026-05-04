import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { Link as RouterLink } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import TransactionsSection from "../components/TransactionsSection";
import { useFinanceApp } from "../context/FinanceAppContext";

export default function TransactionsPage() {
  const fin = useFinanceApp();
  return (
    <>
      <PageHeader
        title="Transactions"
        subtitle="Filter your ledger, edit rows, and resolve the review queue."
      />
      {fin.transactions.length === 0 && !fin.isLoadingTransactions ? (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          action={
            <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", flexWrap: "wrap" }}>
              <Button component={RouterLink} to="/connect" color="inherit" size="small">
                Import data
              </Button>
              <Button
                component="a"
                href="/sample-transactions.csv"
                download="finaryo-sample-transactions.csv"
                color="inherit"
                size="small"
              >
                Sample CSV
              </Button>
            </Stack>
          }
        >
          No transactions yet. Import a CSV/Excel bank export from Connect, or try the sample file to verify the format.
        </Alert>
      ) : null}
      {fin.transactions.length > 0 && fin.reviewTransactions.length === 0 && !fin.isLoadingReviewTransactions ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          Review queue is clear. New imports appear here, and only uncategorized rows return to review.
        </Alert>
      ) : null}
      <TransactionsSection
        searchText={fin.searchText}
        setSearchText={fin.setSearchText}
        filterCategory={fin.filterCategory}
        setFilterCategory={fin.setFilterCategory}
        minAmount={fin.minAmount}
        setMinAmount={fin.setMinAmount}
        maxAmount={fin.maxAmount}
        setMaxAmount={fin.setMaxAmount}
        loadTransactions={fin.loadTransactions}
        editingTransaction={fin.editingTransaction}
        setEditingTransaction={fin.setEditingTransaction}
        handleUpdateTransaction={fin.handleUpdateTransaction}
        isLoadingTransactions={fin.isLoadingTransactions}
        transactions={fin.transactions}
        handleDeleteTransaction={fin.handleDeleteTransaction}
        reviewTransactions={fin.reviewTransactions}
        isLoadingReviewTransactions={fin.isLoadingReviewTransactions}
        reviewCategoryEdits={fin.reviewCategoryEdits}
        setReviewCategoryEdits={fin.setReviewCategoryEdits}
        handleResolveReviewTransaction={fin.handleResolveReviewTransaction}
      />
    </>
  );
}
