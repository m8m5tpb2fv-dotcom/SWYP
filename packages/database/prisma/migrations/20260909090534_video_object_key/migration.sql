-- AlterTable
ALTER TABLE "videos" ADD COLUMN     "objectKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "videos_objectKey_key" ON "videos"("objectKey");

