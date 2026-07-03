import { getPrismaClient } from "../db.js";
import { roundMoney } from "../utils/money.js";
import { normalizeDescriptionForMemory } from "../utils/text.js";
import { buildTransactionFingerprint, resolveCategorizationDecision } from "./categorization.js";

const prisma = getPrismaClient();

export const PLAID_ACCOUNT_TYPE_MAP = {
  "credit card": "credit_card",
  checking: "checking",
  savings: "savings",
  loan: "loan",
  cash: "cash",
};

export function mapPlaidAccountType(subtype, type) {
  const normalized = String(subtype ?? type ?? "").toLowerCase();
  return PLAID_ACCOUNT_TYPE_MAP[normalized] ?? (type === "credit" ? "credit_card" : "checking");
}

export async function persistPlaidTransactions({ userId, added, modified, removed, accountsById }) {
  let addedCount = 0;
  let modifiedCount = 0;
  let removedCount = 0;

  for (const plaidTx of added) {
    const account = accountsById.get(plaidTx.account_id);
    const accountName = account?.name ?? "Plaid Account";
    const accountType = mapPlaidAccountType(account?.subtype, account?.type);
    // Plaid: positive amount = money out. App convention: negative = spend.
    const amount = roundMoney(-plaidTx.amount);
    const date = new Date(`${plaidTx.date}T00:00:00.000Z`);
    const description = plaidTx.merchant_name || plaidTx.name || "Plaid transaction";
    const fallbackCategory =
      plaidTx.personal_finance_category?.primary?.replaceAll("_", " ") ?? "Uncategorized";
    const categorization = await resolveCategorizationDecision({
      userId,
      description,
      amount,
      fallbackCategory,
    });
    const transactionFingerprint = buildTransactionFingerprint({
      date,
      description,
      amount,
      accountName,
      accountType,
    });
    await prisma.importedTransaction.upsert({
      where: { userId_externalId: { userId, externalId: plaidTx.transaction_id } },
      update: {},
      create: {
        userId,
        externalId: plaidTx.transaction_id,
        statementFileName: "plaid-sync",
        accountName,
        accountType,
        date,
        description,
        normalizedDescription: categorization.normalizedDescription,
        transactionFingerprint,
        amount,
        category: categorization.category,
        categorizationSource: categorization.source,
        categorizationStatus: categorization.status,
        categorizationConfidence: categorization.confidence,
        source: "plaid",
      },
    });
    addedCount += 1;
  }

  for (const plaidTx of modified) {
    const account = accountsById.get(plaidTx.account_id);
    const accountName = account?.name ?? "Plaid Account";
    const accountType = mapPlaidAccountType(account?.subtype, account?.type);
    const amount = roundMoney(-plaidTx.amount);
    const date = new Date(`${plaidTx.date}T00:00:00.000Z`);
    const description = plaidTx.merchant_name || plaidTx.name || "Plaid transaction";
    const transactionFingerprint = buildTransactionFingerprint({
      date,
      description,
      amount,
      accountName,
      accountType,
    });
    const result = await prisma.importedTransaction.updateMany({
      where: { userId, externalId: plaidTx.transaction_id },
      data: {
        accountName,
        accountType,
        date,
        description,
        normalizedDescription: normalizeDescriptionForMemory(description),
        transactionFingerprint,
        amount,
      },
    });
    modifiedCount += result.count;
  }

  for (const removedTx of removed) {
    const result = await prisma.importedTransaction.deleteMany({
      where: { userId, externalId: removedTx.transaction_id },
    });
    removedCount += result.count;
  }

  return { addedCount, modifiedCount, removedCount };
}
