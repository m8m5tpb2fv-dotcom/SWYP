-- CreateEnum
CREATE TYPE "GiftTransactionStatus" AS ENUM ('pending_payment', 'delivered', 'failed_refunded');

-- CreateTable
CREATE TABLE "gift_transactions" (
    "id" TEXT NOT NULL,
    "purchaserId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "videoId" TEXT,
    "telegramGiftId" TEXT NOT NULL,
    "starCount" INTEGER NOT NULL,
    "status" "GiftTransactionStatus" NOT NULL DEFAULT 'pending_payment',
    "telegramChargeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gift_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gift_transactions_purchaserId_idx" ON "gift_transactions"("purchaserId");

-- CreateIndex
CREATE INDEX "gift_transactions_recipientId_idx" ON "gift_transactions"("recipientId");

-- AddForeignKey
ALTER TABLE "gift_transactions" ADD CONSTRAINT "gift_transactions_purchaserId_fkey" FOREIGN KEY ("purchaserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_transactions" ADD CONSTRAINT "gift_transactions_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gift_transactions" ADD CONSTRAINT "gift_transactions_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
