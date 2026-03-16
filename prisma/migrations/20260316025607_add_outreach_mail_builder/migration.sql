/*
  Warnings:

  - Added the required column `channelTitle` to the `OutreachDraft` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "OutreachDraft" ADD COLUMN     "channelTitle" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "sourceType" TEXT NOT NULL DEFAULT 'channel_detail',
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'draft',
ADD COLUMN     "templateId" TEXT,
ALTER COLUMN "channelId" DROP NOT NULL;

UPDATE "OutreachDraft" AS draft
SET "channelTitle" = COALESCE(channel."title", 'Unknown Channel')
FROM "Channel" AS channel
WHERE draft."channelId" = channel."id"
  AND draft."channelTitle" IS NULL;

UPDATE "OutreachDraft"
SET "channelTitle" = 'Unknown Channel'
WHERE "channelTitle" IS NULL;

ALTER TABLE "OutreachDraft"
ALTER COLUMN "channelTitle" SET NOT NULL;

-- CreateTable
CREATE TABLE "OutreachTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "basePrompt" TEXT NOT NULL,
    "baseMailText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutreachTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OutreachTemplate_createdAt_idx" ON "OutreachTemplate"("createdAt");

-- CreateIndex
CREATE INDEX "OutreachDraft_templateId_idx" ON "OutreachDraft"("templateId");

-- CreateIndex
CREATE INDEX "OutreachDraft_status_idx" ON "OutreachDraft"("status");

-- AddForeignKey
ALTER TABLE "OutreachDraft" ADD CONSTRAINT "OutreachDraft_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "OutreachTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
