-- DropForeignKey
ALTER TABLE "PostAttachment" DROP CONSTRAINT "PostAttachment_postId_fkey";

-- AddForeignKey
ALTER TABLE "PostAttachment" ADD CONSTRAINT "PostAttachment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
