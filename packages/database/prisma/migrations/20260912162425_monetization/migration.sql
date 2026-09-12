-- AlterTable
ALTER TABLE "users" ADD COLUMN     "subscriptionPriceStars" INTEGER;

-- AlterTable
ALTER TABLE "videos" ADD COLUMN     "isPremium" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "priceStars" INTEGER;

-- CreateTable
CREATE TABLE "video_unlocks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "priceStars" INTEGER NOT NULL,
    "telegramChargeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_unlocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_subscriptions" (
    "id" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "priceStars" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "telegramChargeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creator_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "video_unlocks_videoId_idx" ON "video_unlocks"("videoId");

-- CreateIndex
CREATE UNIQUE INDEX "video_unlocks_userId_videoId_key" ON "video_unlocks"("userId", "videoId");

-- CreateIndex
CREATE INDEX "creator_subscriptions_subscriberId_idx" ON "creator_subscriptions"("subscriberId");

-- CreateIndex
CREATE INDEX "creator_subscriptions_creatorId_idx" ON "creator_subscriptions"("creatorId");

-- AddForeignKey
ALTER TABLE "video_unlocks" ADD CONSTRAINT "video_unlocks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_unlocks" ADD CONSTRAINT "video_unlocks_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_subscriptions" ADD CONSTRAINT "creator_subscriptions_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_subscriptions" ADD CONSTRAINT "creator_subscriptions_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
