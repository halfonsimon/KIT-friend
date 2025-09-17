-- CreateTable
CREATE TABLE "Setting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "upcomingCount" INTEGER NOT NULL DEFAULT 2,
    "defaultFamilyDays" INTEGER NOT NULL DEFAULT 7,
    "defaultFriendDays" INTEGER NOT NULL DEFAULT 30,
    "defaultWorkDays" INTEGER NOT NULL DEFAULT 14,
    "defaultOtherDays" INTEGER NOT NULL DEFAULT 21,
    "sendEmailDigest" BOOLEAN NOT NULL DEFAULT true,
    "sendWhatsappDigest" BOOLEAN NOT NULL DEFAULT false
);
