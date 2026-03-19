-- Add the column (Prisma applies each migration once, so no IF EXISTS needed)
ALTER TABLE "Setting" ADD COLUMN "lastEmailDigestAt" TIMESTAMP NULL;

CREATE TABLE IF NOT EXISTS "PushSubscription" (
  "id" TEXT PRIMARY KEY,
  "endpoint" TEXT NOT NULL UNIQUE,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);


