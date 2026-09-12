-- AlterTable
ALTER TABLE "videos" ADD COLUMN     "isAdult" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "adult_publish_payments" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "priceStars" INTEGER NOT NULL,
    "telegramChargeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adult_publish_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "adult_publish_payments_videoId_key" ON "adult_publish_payments"("videoId");

-- CreateIndex
CREATE UNIQUE INDEX "adult_publish_payments_telegramChargeId_key" ON "adult_publish_payments"("telegramChargeId");

-- AddForeignKey
ALTER TABLE "adult_publish_payments" ADD CONSTRAINT "adult_publish_payments_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adult_publish_payments" ADD CONSTRAINT "adult_publish_payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

