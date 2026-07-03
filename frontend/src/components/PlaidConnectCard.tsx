import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { usePlaidLink } from "react-plaid-link";
import { useFinanceApp } from "../context/FinanceAppContext";
import type { PlaidSyncSummary } from "../types";

/**
 * Owns the whole Plaid Link flow so the Plaid SDK only loads on the Connect
 * page (this component is lazy-loaded) instead of in the root provider.
 */
export default function PlaidConnectCard() {
  const { API_BASE_URL, setError, showSnackbar, refreshAfterImport } = useFinanceApp();
  const [plaidLinkToken, setPlaidLinkToken] = useState<string | null>(null);
  const [isCreatingLinkToken, setIsCreatingLinkToken] = useState(false);
  const [isSyncingPlaid, setIsSyncingPlaid] = useState(false);
  const [isPlaidConnected, setIsPlaidConnected] = useState(false);
  const [plaidSummary, setPlaidSummary] = useState<PlaidSyncSummary | null>(null);
  const [pendingPlaidOpen, setPendingPlaidOpen] = useState(false);

  const { open: openPlaid, ready: isPlaidReady } = usePlaidLink({
    token: plaidLinkToken,
    onSuccess: async (publicToken) => {
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/api/plaid/public-token/exchange`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ publicToken }),
        });
        const payload = (await response.json()) as { error?: string; data?: { itemId?: string } };
        if (!response.ok) {
          throw new Error(payload.error ?? "Plaid token exchange failed.");
        }
        setIsPlaidConnected(Boolean(payload.data?.itemId));
        showSnackbar("Bank connected.");
      } catch (exchangeError) {
        setError(exchangeError instanceof Error ? exchangeError.message : "Plaid token exchange failed.");
      }
    },
    onExit: (plaidError) => {
      if (plaidError?.error_message) {
        setError(plaidError.error_message);
      }
    },
  });

  useEffect(() => {
    if (pendingPlaidOpen && plaidLinkToken && isPlaidReady) {
      setPendingPlaidOpen(false);
      openPlaid();
    }
  }, [pendingPlaidOpen, plaidLinkToken, isPlaidReady, openPlaid]);

  async function createPlaidLinkToken() {
    setError(null);
    setIsCreatingLinkToken(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/plaid/link-token/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ clientName: "Finaryo MVP" }),
      });
      const payload = (await response.json()) as {
        error?: string;
        data?: { linkToken?: string };
      };

      if (!response.ok || !payload.data?.linkToken) {
        throw new Error(payload.error ?? "Failed to create Plaid link token.");
      }

      setPlaidLinkToken(payload.data.linkToken);
    } catch (linkTokenError) {
      setError(linkTokenError instanceof Error ? linkTokenError.message : "Failed to create Plaid link token.");
    } finally {
      setIsCreatingLinkToken(false);
    }
  }

  async function requestConnectBank() {
    setError(null);
    if (!plaidLinkToken) {
      await createPlaidLinkToken();
    }
    setPendingPlaidOpen(true);
  }

  async function syncPlaidTransactions() {
    setError(null);
    setIsSyncingPlaid(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/plaid/transactions/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const payload = (await response.json()) as {
        error?: string;
        data?: PlaidSyncSummary;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "Plaid transaction sync failed.");
      }
      setPlaidSummary(payload.data);
      setIsPlaidConnected(true);
      await refreshAfterImport();
      showSnackbar("Transactions synced.");
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Plaid transaction sync failed.");
    } finally {
      setIsSyncingPlaid(false);
    }
  }

  return (
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
  );
}
