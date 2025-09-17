-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Contact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "category" TEXT NOT NULL DEFAULT 'FRIEND',
    "intervalDays" INTEGER NOT NULL DEFAULT 30,
    "lastContactedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReminderSentAt" DATETIME,
    "notifyChannel" TEXT NOT NULL DEFAULT 'NONE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT
);
INSERT INTO "new_Contact" ("category", "createdAt", "id", "intervalDays", "isActive", "lastContactedAt", "lastReminderSentAt", "name", "notes", "phone") SELECT "category", "createdAt", "id", "intervalDays", "isActive", "lastContactedAt", "lastReminderSentAt", "name", "notes", "phone" FROM "Contact";
DROP TABLE "Contact";
ALTER TABLE "new_Contact" RENAME TO "Contact";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

