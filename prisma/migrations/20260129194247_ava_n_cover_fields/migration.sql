-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" TEXT NOT NULL DEFAULT '/avatars/no-avatar.jpg',
ADD COLUMN     "coverUrl" TEXT NOT NULL DEFAULT '/covers/no-cover.jpg';
