-- CreateTable
CREATE TABLE "PostAttachment" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "postId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostAttachment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PostAttachment" ADD CONSTRAINT "PostAttachment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
