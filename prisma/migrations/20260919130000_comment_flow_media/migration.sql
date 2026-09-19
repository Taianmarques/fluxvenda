-- AlterTable: escopa uma condição de comentário a um post/reel específico (null = qualquer post)
ALTER TABLE "InstagramCommentFlow" ADD COLUMN "mediaId" TEXT;
ALTER TABLE "InstagramCommentFlow" ADD COLUMN "mediaThumbnailUrl" TEXT;
ALTER TABLE "InstagramCommentFlow" ADD COLUMN "mediaPermalink" TEXT;
