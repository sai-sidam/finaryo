-- AlterTable
ALTER TABLE "ImportedTransaction" ADD COLUMN "externalId" TEXT;

-- CreateTable
CREATE TABLE "PlaidItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "encryptedAccessToken" TEXT NOT NULL,
    "transactionsCursor" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlaidItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DebtAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lender" TEXT,
    "balance" REAL NOT NULL,
    "apr" REAL NOT NULL,
    "minimumPayment" REAL NOT NULL,
    "dueDay" INTEGER NOT NULL,
    "autoManaged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DebtAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DebtAccount" ("apr", "balance", "createdAt", "dueDay", "id", "lender", "minimumPayment", "name", "updatedAt", "userId") SELECT "apr", "balance", "createdAt", "dueDay", "id", "lender", "minimumPayment", "name", "updatedAt", "userId" FROM "DebtAccount";
DROP TABLE "DebtAccount";
ALTER TABLE "new_DebtAccount" RENAME TO "DebtAccount";
CREATE INDEX "DebtAccount_userId_dueDay_idx" ON "DebtAccount"("userId", "dueDay");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "PlaidItem_userId_key" ON "PlaidItem"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ImportedTransaction_userId_externalId_key" ON "ImportedTransaction"("userId", "externalId");

