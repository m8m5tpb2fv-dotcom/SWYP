-- CreateTable
CREATE TABLE "user_category_scores" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_category_scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_category_scores_userId_idx" ON "user_category_scores"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_category_scores_userId_category_key" ON "user_category_scores"("userId", "category");

-- AddForeignKey
ALTER TABLE "user_category_scores" ADD CONSTRAINT "user_category_scores_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
