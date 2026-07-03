import { Router } from "express";
import { getDefaultUserIdOrThrow } from "../config/defaultUser.js";
import { runtimeConfig } from "../config/env.js";
import { plaidClient, plaidLinkConfig } from "../config/plaid.js";
import {
  encryptSecret,
  getPlaidAccessToken,
  getPlaidItemId,
  getTransactionsCursor,
  savePlaidAccessToken,
  setTransactionsCursor,
} from "../plaidStore.js";
import { plaidLinkTokenSchema, publicTokenExchangeSchema, transactionsSyncSchema } from "../schemas.js";
import { persistPlaidTransactions } from "../services/plaidSync.js";

const router = Router();

// Statement-only mode: Plaid routes are disabled until credentials are set.
router.use("/api/plaid", (_req, res, next) => {
  if (!plaidClient) {
    return res.status(503).json({
      error: "Plaid is not configured. Set PLAID_CLIENT_ID and PLAID_SECRET to enable bank connections.",
    });
  }
  return next();
});

router.post("/api/plaid/link-token/create", async (req, res, next) => {
  try {
    const payload = plaidLinkTokenSchema.parse(req.body ?? {});
    const userId = payload.userId ?? runtimeConfig.USER_ID;
    const clientName = payload.clientName ?? "Finaryo";

    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: clientName,
      language: "en",
      products: plaidLinkConfig.products,
      country_codes: plaidLinkConfig.countryCodes,
      redirect_uri: runtimeConfig.PLAID_REDIRECT_URI,
    });

    return res.json({
      data: {
        linkToken: response.data.link_token,
        expiration: response.data.expiration,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/api/plaid/public-token/exchange", async (req, res, next) => {
  try {
    const payload = publicTokenExchangeSchema.parse(req.body ?? {});
    const userId = getDefaultUserIdOrThrow();

    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: payload.publicToken,
    });

    const encryptedAccessToken = encryptSecret(exchangeResponse.data.access_token, runtimeConfig.APP_ENCRYPTION_KEY);

    await savePlaidAccessToken({
      userId,
      encryptedAccessToken,
      itemId: exchangeResponse.data.item_id,
    });

    return res.status(201).json({
      data: {
        itemId: exchangeResponse.data.item_id,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/api/plaid/transactions/sync", async (req, res, next) => {
  try {
    const payload = transactionsSyncSchema.parse(req.body ?? {});
    const userId = getDefaultUserIdOrThrow();
    const accessToken = await getPlaidAccessToken({
      userId,
      encryptionSecret: runtimeConfig.APP_ENCRYPTION_KEY,
    });

    if (!accessToken) {
      return res.status(400).json({ error: "No Plaid item connected for this user." });
    }

    const accountsResponse = await plaidClient.accountsGet({ access_token: accessToken });
    const accountsById = new Map(
      accountsResponse.data.accounts.map((account) => [
        account.account_id,
        { name: account.name, type: account.type, subtype: account.subtype },
      ]),
    );

    let cursor = await getTransactionsCursor(userId);
    let hasMore = true;
    let rounds = 0;
    const MAX_ROUNDS = 20;
    const totals = { addedCount: 0, modifiedCount: 0, removedCount: 0 };

    // Persist each page before advancing the stored cursor so an interrupted
    // or truncated sync never skips data: the next sync resumes from the last
    // fully persisted page.
    while (hasMore && rounds < MAX_ROUNDS) {
      rounds += 1;
      const syncResponse = await plaidClient.transactionsSync({
        access_token: accessToken,
        cursor: cursor ?? undefined,
        count: payload.count ?? 100,
      });

      const data = syncResponse.data;
      const pageResult = await persistPlaidTransactions({
        userId,
        added: data.added,
        modified: data.modified,
        removed: data.removed,
        accountsById,
      });
      totals.addedCount += pageResult.addedCount;
      totals.modifiedCount += pageResult.modifiedCount;
      totals.removedCount += pageResult.removedCount;

      cursor = data.next_cursor;
      hasMore = data.has_more;
      await setTransactionsCursor(userId, cursor);
    }

    return res.json({
      data: {
        itemId: await getPlaidItemId(userId),
        addedCount: totals.addedCount,
        modifiedCount: totals.modifiedCount,
        removedCount: totals.removedCount,
        cursor,
        hasMore,
      },
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
