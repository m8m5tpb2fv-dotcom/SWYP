-- AlterTable
ALTER TABLE "videos" ADD COLUMN     "completedViewsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reportsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "watchTimeSum" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "videos_score_idx" ON "videos"("score");

