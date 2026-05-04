import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import LinearProgress from "@mui/material/LinearProgress";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import { useFinanceApp } from "../context/FinanceAppContext";
import { formatCurrency } from "../utils";

export default function ConnectPage() {
  const [invalidOpen, setInvalidOpen] = useState(false);
  const fin = useFinanceApp();
  const {
    requestConnectBank,
    syncPlaidTransactions,
    isCreatingLinkToken,
    isSyncingPlaid,
    isPlaidConnected,
    plaidSummary,
    handleStatementUpload,
    statementFile,
    setStatementFile,
    setUploadResult,
    isUploadingStatement,
    uploadResult,
    balanceSheet,
  } = fin;

  return (
    <>
      <PageHeader
        title="Connect & import"
        subtitle="Bring transactions in from a bank export (CSV or Excel) so every expense is visible. Optional live bank sync via Plaid when available."
      />

      <Stack spacing={3}>
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", mb: 1 }}>
              <Typography variant="subtitle1" component="h2">
                Import from bank export
              </Typography>
              <Chip size="small" label="Primary path" color="primary" variant="outlined" />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: "72ch" }}>
              Download activity from your bank (CSV, XLS, or XLSX) and upload it here. We parse rows into transactions so
              you can categorize spending and see cashflow—no live bank approval required.
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2" component="div">
                Most bank exports upload cleanly when they include:
              </Typography>
              <List dense sx={{ mt: 0.5, pl: 2, listStyleType: "disc" }}>
                <ListItem disablePadding sx={{ display: "list-item", py: 0 }}>
                  <Typography variant="caption">Date (posted/transaction date)</Typography>
                </ListItem>
                <ListItem disablePadding sx={{ display: "list-item", py: 0 }}>
                  <Typography variant="caption">Description or merchant name</Typography>
                </ListItem>
                <ListItem disablePadding sx={{ display: "list-item", py: 0 }}>
                  <Typography variant="caption">Amount (negative for spend, positive for income)</Typography>
                </ListItem>
                <ListItem disablePadding sx={{ display: "list-item", py: 0 }}>
                  <Typography variant="caption">Optional: category column (aligned with your rules)</Typography>
                </ListItem>
              </List>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                Need a reference file? Download a minimal CSV that matches what the parser expects.
              </Typography>
              <Button
                component="a"
                href="/sample-transactions.csv"
                download="finaryo-sample-transactions.csv"
                size="small"
                sx={{ mt: 0.5, alignSelf: "flex-start" }}
              >
                Download sample CSV
              </Button>
            </Alert>
            <Box
              component="form"
              onSubmit={handleStatementUpload}
              sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}
            >
              <Button variant="outlined" component="label">
                Choose file
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  hidden
                  onChange={(event) => {
                    setStatementFile(event.target.files?.[0] ?? null);
                    setUploadResult(null);
                  }}
                />
              </Button>
              <Typography variant="body2" color="text.secondary">
                {statementFile ? statementFile.name : "No file selected"}
              </Typography>
              <Button type="submit" variant="contained" disabled={isUploadingStatement || !statementFile}>
                {isUploadingStatement ? "Uploading…" : "Upload"}
              </Button>
            </Box>
            {isUploadingStatement ? <LinearProgress sx={{ mt: 2 }} /> : null}
            {uploadResult ? (
              <Alert severity="success" sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Import complete
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>{uploadResult.importedCount}</strong> new rows imported ·{" "}
                  <strong>{uploadResult.skippedCount}</strong> skipped (duplicates or filtered)
                  {typeof uploadResult.needsReviewCount === "number" ? (
                    <>
                      {" "}
                      · <strong>{uploadResult.needsReviewCount}</strong> need category review
                    </>
                  ) : null}
                </Typography>
                <Stack spacing={1} sx={{ flexDirection: { xs: "column", sm: "row" }, flexWrap: "wrap", gap: 1 }}>
                  <Button component={RouterLink} to="/transactions" variant="contained" size="small">
                    View transactions
                  </Button>
                  {typeof uploadResult.needsReviewCount === "number" && uploadResult.needsReviewCount > 0 ? (
                    <Button component={RouterLink} to="/transactions?review=1" variant="outlined" color="warning" size="small">
                      Review categorization
                    </Button>
                  ) : null}
                </Stack>
                {uploadResult.invalidRows.length > 0 ? (
                  <Box sx={{ mt: 2 }}>
                    <Button
                      size="small"
                      endIcon={<ExpandMoreIcon sx={{ transform: invalidOpen ? "rotate(180deg)" : "none" }} />}
                      onClick={() => setInvalidOpen((o) => !o)}
                      aria-expanded={invalidOpen}
                    >
                      {uploadResult.invalidRows.length} row{uploadResult.invalidRows.length === 1 ? "" : "s"} could not be
                      parsed
                    </Button>
                    <Collapse in={invalidOpen}>
                      <List dense sx={{ pl: 0, pt: 1 }}>
                        {uploadResult.invalidRows.map((row: { rowNumber: number; reason: string }) => (
                          <ListItem key={`${row.rowNumber}-${row.reason}`} disablePadding sx={{ py: 0.25 }}>
                            <ListItemText primary={`Row ${row.rowNumber}: ${row.reason}`} />
                          </ListItem>
                        ))}
                      </List>
                    </Collapse>
                  </Box>
                ) : null}
              </Alert>
            ) : null}
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" component="h2" gutterBottom>
              Live bank connection (Plaid)
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              Automatic syncing is available when Plaid is enabled for production. Until then, rely on your bank&apos;s
              export and the import above—your data still lands in the same transaction list.
            </Alert>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: "72ch" }}>
              Connect uses a secure hosted flow; credentials stay between your browser and your bank. After linking, sync
              pulls the latest transactions into Finaryo.
            </Typography>
            <Stack spacing={2} sx={{ flexDirection: { xs: "column", sm: "row" } }}>
              <Button variant="outlined" onClick={() => void requestConnectBank()} disabled={isCreatingLinkToken}>
                {isCreatingLinkToken ? "Preparing Link…" : "Connect bank"}
              </Button>
              <Button
                variant="outlined"
                onClick={() => void syncPlaidTransactions()}
                disabled={isSyncingPlaid || !isPlaidConnected}
              >
                {isSyncingPlaid ? "Syncing…" : "Sync transactions"}
              </Button>
            </Stack>
            {isCreatingLinkToken || isSyncingPlaid ? <LinearProgress sx={{ mt: 2 }} /> : null}
            {plaidSummary ? (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2">
                  Last sync: <strong>{plaidSummary.addedCount}</strong> added,{" "}
                  <strong>{plaidSummary.modifiedCount}</strong> updated, <strong>{plaidSummary.removedCount}</strong>{" "}
                  removed.
                </Typography>
                <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.5 }}>
                  Connection reference: {plaidSummary.itemId ?? "—"}
                </Typography>
              </Box>
            ) : null}
          </CardContent>
        </Card>

        {balanceSheet && balanceSheet.accounts.length > 0 && (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Balance sheet preview (net flow)
              </Typography>
              <Typography variant="body2">Total net flow: {formatCurrency(balanceSheet.totalNetFlow)}</Typography>
            </CardContent>
          </Card>
        )}
      </Stack>
    </>
  );
}
