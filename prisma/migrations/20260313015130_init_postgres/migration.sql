-- CreateTable
CREATE TABLE "Channel" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "customUrl" TEXT,
    "publishedAt" TIMESTAMP(3),
    "country" TEXT,
    "subscriberCount" INTEGER NOT NULL DEFAULT 0,
    "videoCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" BIGINT NOT NULL DEFAULT 0,
    "uploadsPlaylistId" TEXT,
    "thumbnailUrl" TEXT,
    "channelUrl" TEXT NOT NULL,
    "sourceQuery" TEXT NOT NULL,
    "sourceQueries" TEXT,
    "matchedQueryCount" INTEGER NOT NULL DEFAULT 0,
    "contactEmail" TEXT,
    "contactEmails" TEXT,
    "contactFormUrls" TEXT,
    "socialLinks" TEXT,
    "officialWebsiteUrls" TEXT,
    "externalLinks" TEXT,
    "bestContactMethod" TEXT,
    "bestContactValue" TEXT,
    "contactEvidence" TEXT,
    "hasExternalLinks" BOOLEAN NOT NULL DEFAULT false,
    "hasContactEmail" BOOLEAN NOT NULL DEFAULT false,
    "hasContactForm" BOOLEAN NOT NULL DEFAULT false,
    "hasSocialLinks" BOOLEAN NOT NULL DEFAULT false,
    "hasOfficialWebsite" BOOLEAN NOT NULL DEFAULT false,
    "contactType" TEXT NOT NULL DEFAULT 'none',
    "regionGuess" TEXT,
    "categoryGuess" TEXT,
    "basicFetchedAt" TIMESTAMP(3),
    "lightEnrichmentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "lightEnrichmentUpdatedAt" TIMESTAMP(3),
    "deepEnrichmentStatus" TEXT NOT NULL DEFAULT 'IDLE',
    "deepEnrichmentUpdatedAt" TIMESTAMP(3),
    "relevanceScore" INTEGER NOT NULL DEFAULT 0,
    "contactabilityScore" INTEGER NOT NULL DEFAULT 0,
    "freshnessScore" INTEGER NOT NULL DEFAULT 0,
    "outreachScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "latestVideoScanCount" INTEGER NOT NULL DEFAULT 0,
    "videoDescriptionContactCount" INTEGER NOT NULL DEFAULT 0,
    "externalSiteContactCount" INTEGER NOT NULL DEFAULT 0,
    "externalScanStatus" TEXT,
    "externalScanError" TEXT,
    "externalScanUpdatedAt" TIMESTAMP(3),
    "lastVideoPublishedAt" TIMESTAMP(3),
    "monthlyViewsEstimate" INTEGER,
    "estimatedMonthlyIncomeLow" INTEGER,
    "estimatedMonthlyIncomeBase" INTEGER,
    "estimatedMonthlyIncomeHigh" INTEGER,
    "avgViewsLast10" INTEGER,
    "medianViewsLast10" INTEGER,
    "postsLast30" INTEGER,
    "postsLast90" INTEGER,
    "shortsRatio" DOUBLE PRECISION,
    "audienceHealthScore" INTEGER,
    "consistencyScore" INTEGER,
    "hitDependencyScore" INTEGER,
    "competitionScore" INTEGER,
    "growthScore" INTEGER,
    "opportunityScore" INTEGER,
    "analysisSummary" TEXT,
    "analysisModeUpdatedAt" TIMESTAMP(3),
    "note" TEXT,
    "tags" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UNREVIEWED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchHistory" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "conditions" TEXT NOT NULL,
    "expandedQueries" TEXT,
    "resultCount" INTEGER NOT NULL,
    "savedCount" INTEGER NOT NULL DEFAULT 0,
    "pagesFetched" INTEGER NOT NULL DEFAULT 0,
    "quotaUsed" INTEGER NOT NULL DEFAULT 0,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutreachDraft" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "customPoint" TEXT,
    "rationale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutreachDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelVideo" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "videoUrl" TEXT NOT NULL,
    "viewCount" BIGINT NOT NULL DEFAULT 0,
    "likeCount" INTEGER,
    "commentCount" INTEGER,
    "durationSec" INTEGER,
    "isShorts" BOOLEAN NOT NULL DEFAULT false,
    "thumbnailUrl" TEXT,
    "extractedEmails" TEXT,
    "extractedUrls" TEXT,
    "socialLinks" TEXT,
    "officialWebsiteUrls" TEXT,
    "contactEvidence" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelVideo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalScanLog" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "scannedUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "extractedEmails" TEXT,
    "extractedFormUrls" TEXT,
    "extractedSocialLinks" TEXT,
    "companyNameGuess" TEXT,
    "addressGuess" TEXT,
    "phoneGuess" TEXT,
    "robotsAllowed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalScanLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelAnalysisSnapshot" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "monthlyViewsEstimate" INTEGER,
    "estimatedMonthlyIncomeLow" INTEGER,
    "estimatedMonthlyIncomeBase" INTEGER,
    "estimatedMonthlyIncomeHigh" INTEGER,
    "avgViewsLast10" INTEGER,
    "medianViewsLast10" INTEGER,
    "postsLast30" INTEGER,
    "postsLast90" INTEGER,
    "shortsRatio" DOUBLE PRECISION,
    "audienceHealthScore" INTEGER,
    "consistencyScore" INTEGER,
    "hitDependencyScore" INTEGER,
    "competitionScore" INTEGER,
    "growthScore" INTEGER,
    "opportunityScore" INTEGER,
    "analysisSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChannelAnalysisSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "currentPlan" TEXT NOT NULL DEFAULT 'FREE',
    "serviceName" TEXT NOT NULL DEFAULT 'TubeLead',
    "serviceDescription" TEXT NOT NULL DEFAULT 'YouTubeチャンネル向けの営業リスト管理サービス',
    "defaultPitch" TEXT NOT NULL DEFAULT 'スポンサー提案や共同企画の営業文面を保存します。',
    "tone" TEXT NOT NULL DEFAULT 'POLITE',
    "lengthPreference" TEXT NOT NULL DEFAULT 'NORMAL',
    "queryExpansionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "searchMaxPages" INTEGER NOT NULL DEFAULT 6,
    "searchQuotaBudgetPerRun" INTEGER NOT NULL DEFAULT 600,
    "videosPerChannelForContactScan" INTEGER NOT NULL DEFAULT 3,
    "externalSiteScanEnabled" BOOLEAN NOT NULL DEFAULT true,
    "externalSiteMaxUrlsPerChannel" INTEGER NOT NULL DEFAULT 2,
    "externalSiteRateLimitMs" INTEGER NOT NULL DEFAULT 1200,
    "externalSiteTimeoutMs" INTEGER NOT NULL DEFAULT 8000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Channel_channelId_key" ON "Channel"("channelId");

-- CreateIndex
CREATE INDEX "Channel_status_idx" ON "Channel"("status");

-- CreateIndex
CREATE INDEX "Channel_subscriberCount_idx" ON "Channel"("subscriberCount");

-- CreateIndex
CREATE INDEX "Channel_videoCount_idx" ON "Channel"("videoCount");

-- CreateIndex
CREATE INDEX "Channel_outreachScore_idx" ON "Channel"("outreachScore");

-- CreateIndex
CREATE INDEX "Channel_contactabilityScore_idx" ON "Channel"("contactabilityScore");

-- CreateIndex
CREATE INDEX "Channel_bestContactMethod_idx" ON "Channel"("bestContactMethod");

-- CreateIndex
CREATE INDEX "Channel_estimatedMonthlyIncomeHigh_idx" ON "Channel"("estimatedMonthlyIncomeHigh");

-- CreateIndex
CREATE INDEX "Channel_avgViewsLast10_idx" ON "Channel"("avgViewsLast10");

-- CreateIndex
CREATE INDEX "Channel_competitionScore_idx" ON "Channel"("competitionScore");

-- CreateIndex
CREATE INDEX "Channel_growthScore_idx" ON "Channel"("growthScore");

-- CreateIndex
CREATE INDEX "Channel_opportunityScore_idx" ON "Channel"("opportunityScore");

-- CreateIndex
CREATE INDEX "Channel_updatedAt_idx" ON "Channel"("updatedAt");

-- CreateIndex
CREATE INDEX "OutreachDraft_channelId_idx" ON "OutreachDraft"("channelId");

-- CreateIndex
CREATE INDEX "OutreachDraft_createdAt_idx" ON "OutreachDraft"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelVideo_videoId_key" ON "ChannelVideo"("videoId");

-- CreateIndex
CREATE INDEX "ChannelVideo_channelId_idx" ON "ChannelVideo"("channelId");

-- CreateIndex
CREATE INDEX "ChannelVideo_publishedAt_idx" ON "ChannelVideo"("publishedAt");

-- CreateIndex
CREATE INDEX "ExternalScanLog_channelId_idx" ON "ExternalScanLog"("channelId");

-- CreateIndex
CREATE INDEX "ExternalScanLog_createdAt_idx" ON "ExternalScanLog"("createdAt");

-- CreateIndex
CREATE INDEX "ChannelAnalysisSnapshot_channelId_createdAt_idx" ON "ChannelAnalysisSnapshot"("channelId", "createdAt");

-- AddForeignKey
ALTER TABLE "OutreachDraft" ADD CONSTRAINT "OutreachDraft_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelVideo" ADD CONSTRAINT "ChannelVideo_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalScanLog" ADD CONSTRAINT "ExternalScanLog_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelAnalysisSnapshot" ADD CONSTRAINT "ChannelAnalysisSnapshot_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
