-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,
    "refreshToken" TEXT,
    "refreshTokenExpires" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Manager" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "orderNotifications" BOOLEAN NOT NULL DEFAULT true,
    "customerNotifications" BOOLEAN NOT NULL DEFAULT true,
    "newsletterNotifications" BOOLEAN NOT NULL DEFAULT true,
    "productNotifications" BOOLEAN NOT NULL DEFAULT true,
    "contactNotifications" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Manager_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationHistory" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "notificationType" TEXT NOT NULL,
    "resourceId" TEXT,
    "resourceName" TEXT,
    "managerId" TEXT,
    "managerEmail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Manager_shop_email_key" ON "Manager"("shop", "email");

-- CreateIndex
CREATE INDEX "NotificationHistory_shop_idx" ON "NotificationHistory"("shop");

-- CreateIndex
CREATE INDEX "NotificationHistory_shop_notificationType_idx" ON "NotificationHistory"("shop", "notificationType");

-- CreateIndex
CREATE INDEX "NotificationHistory_shop_createdAt_idx" ON "NotificationHistory"("shop", "createdAt");
