import { getPrismaClient } from "../db.js";
import { roundMoney, sumMoney } from "../utils/money.js";

const prisma = getPrismaClient();

/**
 * Creates debt-account stubs for credit cards seen in imports so the user
 * doesn't have to add them by hand. The "balance" from imported activity is
 * only an estimate (cumulative net flow of the rows we happen to have), so:
 * - accounts the user created or edited manually (autoManaged=false) are
 *   never touched;
 * - only accounts this function created (autoManaged=true) get their
 *   estimated balance refreshed.
 */
export async function reconcileDebtAccountsFromCreditCardImports(userId) {
  const creditCardRows = await prisma.importedTransaction.findMany({
    where: { userId, accountType: "credit_card" },
    orderBy: { date: "asc" },
  });
  const byAccount = new Map();
  for (const row of creditCardRows) {
    const key = row.accountName || "Credit Card";
    if (!byAccount.has(key)) {
      byAccount.set(key, { amounts: [] });
    }
    byAccount.get(key).amounts.push(row.amount);
  }

  for (const [accountName, summary] of byAccount.entries()) {
    const netFlow = sumMoney(summary.amounts);
    const estimatedBalance = Math.max(0, roundMoney(-netFlow));
    const minimumPayment = estimatedBalance > 0 ? Math.max(25, roundMoney(estimatedBalance * 0.03)) : 0;
    const lender = accountName.split(" ")[0] || "Card Issuer";

    const existing = await prisma.debtAccount.findFirst({
      where: { userId, name: accountName },
    });
    if (existing) {
      if (!existing.autoManaged) {
        continue;
      }
      await prisma.debtAccount.update({
        where: { id: existing.id },
        data: {
          balance: estimatedBalance,
          minimumPayment,
          lender: existing.lender || lender,
        },
      });
    } else {
      await prisma.debtAccount.create({
        data: {
          userId,
          name: accountName,
          lender,
          balance: estimatedBalance,
          apr: 0,
          minimumPayment,
          dueDay: 1,
          autoManaged: true,
        },
      });
    }
  }
}

export function calculatePayoffProjection(debts, strategy, monthlyBudgetOverride) {
  if (debts.length === 0) {
    return { strategy, monthlyBudget: 0, monthsToPayoff: 0, estimatedInterest: 0, payoffOrder: [] };
  }

  const monthlyBudget =
    typeof monthlyBudgetOverride === "number"
      ? monthlyBudgetOverride
      : debts.reduce((sum, debt) => sum + debt.minimumPayment, 0);

  const working = debts.map((debt) => ({
    id: debt.id,
    name: debt.name,
    balance: debt.balance,
    apr: debt.apr,
    minimumPayment: debt.minimumPayment,
  }));

  let months = 0;
  let interestPaid = 0;
  const payoffOrder = [];
  const MAX_MONTHS = 600;

  while (working.some((debt) => debt.balance > 0.01) && months < MAX_MONTHS) {
    months += 1;
    for (const debt of working) {
      if (debt.balance <= 0.01) {
        continue;
      }
      const monthlyRate = debt.apr / 100 / 12;
      const monthlyInterest = debt.balance * monthlyRate;
      debt.balance += monthlyInterest;
      interestPaid += monthlyInterest;
    }

    let remainingBudget = monthlyBudget;
    for (const debt of working) {
      if (debt.balance <= 0.01) {
        continue;
      }
      const payment = Math.min(debt.minimumPayment, debt.balance, remainingBudget);
      debt.balance -= payment;
      remainingBudget -= payment;
    }

    const openDebts = working
      .filter((debt) => debt.balance > 0.01)
      .sort((a, b) => {
        if (strategy === "avalanche") {
          return b.apr - a.apr || b.balance - a.balance;
        }
        return a.balance - b.balance || b.apr - a.apr;
      });

    let cursor = 0;
    while (remainingBudget > 0.01 && openDebts.length > 0) {
      const target = openDebts[cursor % openDebts.length];
      const payment = Math.min(target.balance, remainingBudget);
      target.balance -= payment;
      remainingBudget -= payment;
      if (target.balance <= 0.01) {
        target.balance = 0;
        if (!payoffOrder.includes(target.id)) {
          payoffOrder.push(target.id);
        }
        openDebts.splice(cursor % openDebts.length, 1);
      } else {
        cursor += 1;
      }
    }

    for (const debt of working) {
      if (debt.balance <= 0.01 && !payoffOrder.includes(debt.id)) {
        debt.balance = 0;
        payoffOrder.push(debt.id);
      }
    }
  }

  return {
    strategy,
    monthlyBudget: Number(monthlyBudget.toFixed(2)),
    monthsToPayoff: months,
    estimatedInterest: Number(interestPaid.toFixed(2)),
    payoffOrder,
  };
}
