-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ImportedTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "statementFileName" TEXT NOT NULL,
    "accountName" TEXT NOT NULL DEFAULT 'Primary',
    "accountType" TEXT NOT NULL DEFAULT 'checking',
    "date" DATETIME NOT NULL,
    "description" TEXT NOT NULL,
    "normalizedDescription" TEXT NOT NULL DEFAULT '',
    "amount" REAL NOT NULL,
    "category" TEXT NOT NULL,
    "categorizationSource" TEXT NOT NULL DEFAULT 'ai',
    "categorizationStatus" TEXT NOT NULL DEFAULT 'needs_review',
    "categorizationConfidence" REAL,
    "source" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImportedTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ImportedTransaction" ("amount", "categorizationConfidence", "categorizationSource", "categorizationStatus", "category", "createdAt", "date", "description", "id", "normalizedDescription", "source", "statementFileName", "userId") SELECT "amount", "categorizationConfidence", "categorizationSource", "categorizationStatus", "category", "createdAt", "date", "description", "id", "normalizedDescription", "source", "statementFileName", "userId" FROM "ImportedTransaction";
DROP TABLE "ImportedTransaction";
ALTER TABLE "new_ImportedTransaction" RENAME TO "ImportedTransaction";
CREATE INDEX "ImportedTransaction_userId_date_idx" ON "ImportedTransaction"("userId", "date");
CREATE INDEX "ImportedTransaction_userId_accountName_date_idx" ON "ImportedTransaction"("userId", "accountName", "date");
CREATE INDEX "ImportedTransaction_userId_categorizationStatus_createdAt_idx" ON "ImportedTransaction"("userId", "categorizationStatus", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
