-- DropIndex
DROP INDEX "PostRating_postId_type_idx";

-- CreateIndex
CREATE INDEX "PostRating_postId_type_userId_idx" ON "PostRating"("postId", "type", "userId");
