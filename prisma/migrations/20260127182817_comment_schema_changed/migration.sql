-- DropIndex
DROP INDEX "Comment_id_postId_authorId_idx";

-- CreateIndex
CREATE INDEX "Comment_id_postId_authorId_parentId_idx" ON "Comment"("id", "postId", "authorId", "parentId");
