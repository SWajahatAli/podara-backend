-- CreateEnum
CREATE TYPE "Role" AS ENUM ('LISTENER', 'CREATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "EpisodeStatus" AS ENUM ('UPLOADING', 'PROCESSING', 'LIVE', 'FAILED', 'DRAFT', 'SCHEDULED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'PAST_DUE', 'INCOMPLETE', 'TRIALING', 'PAUSED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('NEW_EPISODE', 'NEW_SUBSCRIBER', 'PAYMENT_RECEIVED', 'PAYMENT_FAILED', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'INAPPROPRIATE_CONTENT', 'COPYRIGHT_VIOLATION', 'HARASSMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'LISTENER',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "bannedAt" TIMESTAMP(3),
    "bannedReason" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "deviceInfo" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verifications" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_resets" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creators" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "bannerUrl" TEXT,
    "websiteUrl" TEXT,
    "twitterHandle" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "stripeAccountId" TEXT,
    "stripeOnboardingDone" BOOLEAN NOT NULL DEFAULT false,
    "monthlyPrice" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "totalEpisodes" INTEGER NOT NULL DEFAULT 0,
    "totalSubscribers" INTEGER NOT NULL DEFAULT 0,
    "totalPlays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listeners" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listeners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "iconUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_categories" (
    "creatorId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "creator_categories_pkey" PRIMARY KEY ("creatorId","categoryId")
);

-- CreateTable
CREATE TABLE "episode_categories" (
    "episodeId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "episode_categories_pkey" PRIMARY KEY ("episodeId","categoryId")
);

-- CreateTable
CREATE TABLE "episodes" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "showNotes" TEXT,
    "audioUrl" TEXT,
    "hlsManifestUrl" TEXT,
    "hlsBaseUrl" TEXT,
    "audioDurationMs" INTEGER,
    "audioFileSizeBytes" BIGINT,
    "audioMimeType" TEXT,
    "thumbnailUrl" TEXT,
    "transcript" JSONB,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "status" "EpisodeStatus" NOT NULL DEFAULT 'UPLOADING',
    "processingError" TEXT,
    "publishedAt" TIMESTAMP(3),
    "scheduledAt" TIMESTAMP(3),
    "seasonNumber" INTEGER,
    "episodeNumber" INTEGER,
    "totalPlays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "episodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "listenerId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT,
    "stripeCustomerId" TEXT,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "priceAtSubscription" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plays" (
    "id" TEXT NOT NULL,
    "listenerId" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "durationPlayedMs" INTEGER NOT NULL,
    "completionRate" DOUBLE PRECISION,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookmarks" (
    "id" TEXT NOT NULL,
    "listenerId" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queue_items" (
    "id" TEXT NOT NULL,
    "listenerId" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "queue_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "stripePayoutId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "platformFee" DECIMAL(10,2) NOT NULL,
    "netAmount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "reportedById" TEXT NOT NULL,
    "episodeId" TEXT,
    "reason" "ReportReason" NOT NULL,
    "description" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_actions" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_tokenHash_idx" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "email_verifications_token_key" ON "email_verifications"("token");

-- CreateIndex
CREATE INDEX "email_verifications_token_idx" ON "email_verifications"("token");

-- CreateIndex
CREATE INDEX "email_verifications_email_idx" ON "email_verifications"("email");

-- CreateIndex
CREATE UNIQUE INDEX "password_resets_token_key" ON "password_resets"("token");

-- CreateIndex
CREATE INDEX "password_resets_token_idx" ON "password_resets"("token");

-- CreateIndex
CREATE UNIQUE INDEX "creators_userId_key" ON "creators"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "creators_slug_key" ON "creators"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "creators_stripeAccountId_key" ON "creators"("stripeAccountId");

-- CreateIndex
CREATE INDEX "creators_slug_idx" ON "creators"("slug");

-- CreateIndex
CREATE INDEX "creators_isVerified_idx" ON "creators"("isVerified");

-- CreateIndex
CREATE INDEX "creators_totalSubscribers_idx" ON "creators"("totalSubscribers");

-- CreateIndex
CREATE INDEX "creators_createdAt_idx" ON "creators"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "listeners_userId_key" ON "listeners"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "listeners_username_key" ON "listeners"("username");

-- CreateIndex
CREATE INDEX "listeners_username_idx" ON "listeners"("username");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "episodes_creatorId_idx" ON "episodes"("creatorId");

-- CreateIndex
CREATE INDEX "episodes_status_idx" ON "episodes"("status");

-- CreateIndex
CREATE INDEX "episodes_isPremium_idx" ON "episodes"("isPremium");

-- CreateIndex
CREATE INDEX "episodes_publishedAt_idx" ON "episodes"("publishedAt");

-- CreateIndex
CREATE INDEX "episodes_createdAt_idx" ON "episodes"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "episodes_creatorId_slug_key" ON "episodes"("creatorId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripeSubscriptionId_key" ON "subscriptions"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "subscriptions_listenerId_idx" ON "subscriptions"("listenerId");

-- CreateIndex
CREATE INDEX "subscriptions_creatorId_idx" ON "subscriptions"("creatorId");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "subscriptions_currentPeriodEnd_idx" ON "subscriptions"("currentPeriodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_listenerId_creatorId_key" ON "subscriptions"("listenerId", "creatorId");

-- CreateIndex
CREATE INDEX "plays_listenerId_idx" ON "plays"("listenerId");

-- CreateIndex
CREATE INDEX "plays_episodeId_idx" ON "plays"("episodeId");

-- CreateIndex
CREATE INDEX "plays_createdAt_idx" ON "plays"("createdAt");

-- CreateIndex
CREATE INDEX "bookmarks_listenerId_idx" ON "bookmarks"("listenerId");

-- CreateIndex
CREATE UNIQUE INDEX "bookmarks_listenerId_episodeId_key" ON "bookmarks"("listenerId", "episodeId");

-- CreateIndex
CREATE INDEX "queue_items_listenerId_position_idx" ON "queue_items"("listenerId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "queue_items_listenerId_episodeId_key" ON "queue_items"("listenerId", "episodeId");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "payouts_stripePayoutId_key" ON "payouts"("stripePayoutId");

-- CreateIndex
CREATE INDEX "payouts_creatorId_idx" ON "payouts"("creatorId");

-- CreateIndex
CREATE INDEX "payouts_status_idx" ON "payouts"("status");

-- CreateIndex
CREATE INDEX "payouts_createdAt_idx" ON "payouts"("createdAt");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "reports_createdAt_idx" ON "reports"("createdAt");

-- CreateIndex
CREATE INDEX "admin_actions_adminId_idx" ON "admin_actions"("adminId");

-- CreateIndex
CREATE INDEX "admin_actions_targetType_targetId_idx" ON "admin_actions"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "admin_actions_createdAt_idx" ON "admin_actions"("createdAt");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creators" ADD CONSTRAINT "creators_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listeners" ADD CONSTRAINT "listeners_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_categories" ADD CONSTRAINT "creator_categories_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_categories" ADD CONSTRAINT "creator_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episode_categories" ADD CONSTRAINT "episode_categories_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "episodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episode_categories" ADD CONSTRAINT "episode_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_listenerId_fkey" FOREIGN KEY ("listenerId") REFERENCES "listeners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plays" ADD CONSTRAINT "plays_listenerId_fkey" FOREIGN KEY ("listenerId") REFERENCES "listeners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plays" ADD CONSTRAINT "plays_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "episodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_listenerId_fkey" FOREIGN KEY ("listenerId") REFERENCES "listeners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "episodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_items" ADD CONSTRAINT "queue_items_listenerId_fkey" FOREIGN KEY ("listenerId") REFERENCES "listeners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_items" ADD CONSTRAINT "queue_items_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "episodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "episodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_actions" ADD CONSTRAINT "admin_actions_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
