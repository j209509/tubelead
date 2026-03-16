-- AlterTable
ALTER TABLE "AppSetting"
ADD COLUMN "gmailAccessToken" TEXT,
ADD COLUMN "gmailRefreshToken" TEXT,
ADD COLUMN "gmailTokenExpiry" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "OutreachDraft"
ADD COLUMN "personalizationPoints" TEXT,
ADD COLUMN "usedChannelSignals" TEXT,
ADD COLUMN "confidenceNote" TEXT,
ADD COLUMN "gmailDraftId" TEXT,
ADD COLUMN "gmailSaveStatus" TEXT NOT NULL DEFAULT 'not_saved',
ADD COLUMN "gmailSavedAt" TIMESTAMP(3),
ADD COLUMN "errorMessage" TEXT;

-- CreateIndex
CREATE INDEX "OutreachDraft_gmailSaveStatus_idx" ON "OutreachDraft"("gmailSaveStatus");
