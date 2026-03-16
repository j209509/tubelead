import { PrismaClient } from "@prisma/client";

import { DEFAULT_APP_SETTINGS, DEFAULT_SEARCH_HISTORY } from "../src/lib/constants";
import { MOCK_CHANNEL_SEEDS } from "../src/lib/mock-data";
import { normalizeMockSeed } from "../src/lib/youtube";

const prisma = new PrismaClient();

async function persistNormalizedChannel(item: ReturnType<typeof normalizeMockSeed>) {
  const saved = await prisma.channel.upsert({
    where: { channelId: item.channelId },
    update: {
      title: item.title,
      description: item.description,
      customUrl: item.customUrl || null,
      publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
      country: item.country || null,
      subscriberCount: item.subscriberCount,
      videoCount: item.videoCount,
      viewCount: BigInt(item.viewCount),
      uploadsPlaylistId: item.uploadsPlaylistId || null,
      thumbnailUrl: item.thumbnailUrl || null,
      channelUrl: item.channelUrl,
      sourceQuery: item.sourceQuery,
      sourceQueries: JSON.stringify(item.sourceQueries),
      matchedQueryCount: item.matchedQueryCount,
      contactEmail: item.contactEmail || null,
      contactEmails: JSON.stringify(item.contactEmails),
      contactFormUrls: JSON.stringify(item.contactFormUrls),
      socialLinks: JSON.stringify(item.socialLinks),
      officialWebsiteUrls: JSON.stringify(item.officialWebsiteUrls),
      externalLinks: JSON.stringify(item.externalLinks),
      bestContactMethod: item.bestContactMethod,
      bestContactValue: item.bestContactValue,
      contactEvidence: JSON.stringify(item.contactEvidence),
      hasExternalLinks: item.externalLinks.length > 0,
      hasContactEmail: item.contactEmails.length > 0,
      hasContactForm: item.contactFormUrls.length > 0,
      hasSocialLinks: item.socialLinks.length > 0,
      hasOfficialWebsite: item.officialWebsiteUrls.length > 0,
      contactType: item.contactType,
      regionGuess: item.regionGuess || null,
      categoryGuess: item.categoryGuess || null,
      basicFetchedAt: item.basicFetchedAt ? new Date(item.basicFetchedAt) : null,
      lightEnrichmentStatus: item.lightEnrichmentStatus,
      lightEnrichmentUpdatedAt: item.lightEnrichmentUpdatedAt ? new Date(item.lightEnrichmentUpdatedAt) : null,
      deepEnrichmentStatus: item.deepEnrichmentStatus,
      deepEnrichmentUpdatedAt: item.deepEnrichmentUpdatedAt ? new Date(item.deepEnrichmentUpdatedAt) : null,
      relevanceScore: item.relevanceScore,
      contactabilityScore: item.contactabilityScore,
      freshnessScore: item.freshnessScore,
      outreachScore: item.outreachScore,
      latestVideoScanCount: item.latestVideoScanCount,
      videoDescriptionContactCount: item.videoDescriptionContactCount,
      externalSiteContactCount: item.externalSiteContactCount,
      externalScanStatus: item.externalScanStatus,
      externalScanError: item.externalScanError,
      externalScanUpdatedAt: item.externalScanUpdatedAt ? new Date(item.externalScanUpdatedAt) : null,
      lastVideoPublishedAt: item.lastVideoPublishedAt ? new Date(item.lastVideoPublishedAt) : null,
      monthlyViewsEstimate: item.monthlyViewsEstimate,
      estimatedMonthlyIncomeLow: item.estimatedMonthlyIncomeLow,
      estimatedMonthlyIncomeBase: item.estimatedMonthlyIncomeBase,
      estimatedMonthlyIncomeHigh: item.estimatedMonthlyIncomeHigh,
      avgViewsLast10: item.avgViewsLast10,
      medianViewsLast10: item.medianViewsLast10,
      postsLast30: item.postsLast30,
      postsLast90: item.postsLast90,
      shortsRatio: item.shortsRatio,
      audienceHealthScore: item.audienceHealthScore,
      consistencyScore: item.consistencyScore,
      hitDependencyScore: item.hitDependencyScore,
      competitionScore: item.competitionScore,
      growthScore: item.growthScore,
      opportunityScore: item.opportunityScore,
      analysisSummary: item.analysisSummary,
      analysisModeUpdatedAt: item.analysisModeUpdatedAt ? new Date(item.analysisModeUpdatedAt) : null,
    },
    create: {
      channelId: item.channelId,
      title: item.title,
      description: item.description,
      customUrl: item.customUrl || null,
      publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
      country: item.country || null,
      subscriberCount: item.subscriberCount,
      videoCount: item.videoCount,
      viewCount: BigInt(item.viewCount),
      uploadsPlaylistId: item.uploadsPlaylistId || null,
      thumbnailUrl: item.thumbnailUrl || null,
      channelUrl: item.channelUrl,
      sourceQuery: item.sourceQuery,
      sourceQueries: JSON.stringify(item.sourceQueries),
      matchedQueryCount: item.matchedQueryCount,
      contactEmail: item.contactEmail || null,
      contactEmails: JSON.stringify(item.contactEmails),
      contactFormUrls: JSON.stringify(item.contactFormUrls),
      socialLinks: JSON.stringify(item.socialLinks),
      officialWebsiteUrls: JSON.stringify(item.officialWebsiteUrls),
      externalLinks: JSON.stringify(item.externalLinks),
      bestContactMethod: item.bestContactMethod,
      bestContactValue: item.bestContactValue,
      contactEvidence: JSON.stringify(item.contactEvidence),
      hasExternalLinks: item.externalLinks.length > 0,
      hasContactEmail: item.contactEmails.length > 0,
      hasContactForm: item.contactFormUrls.length > 0,
      hasSocialLinks: item.socialLinks.length > 0,
      hasOfficialWebsite: item.officialWebsiteUrls.length > 0,
      contactType: item.contactType,
      regionGuess: item.regionGuess || null,
      categoryGuess: item.categoryGuess || null,
      basicFetchedAt: item.basicFetchedAt ? new Date(item.basicFetchedAt) : null,
      lightEnrichmentStatus: item.lightEnrichmentStatus,
      lightEnrichmentUpdatedAt: item.lightEnrichmentUpdatedAt ? new Date(item.lightEnrichmentUpdatedAt) : null,
      deepEnrichmentStatus: item.deepEnrichmentStatus,
      deepEnrichmentUpdatedAt: item.deepEnrichmentUpdatedAt ? new Date(item.deepEnrichmentUpdatedAt) : null,
      relevanceScore: item.relevanceScore,
      contactabilityScore: item.contactabilityScore,
      freshnessScore: item.freshnessScore,
      outreachScore: item.outreachScore,
      latestVideoScanCount: item.latestVideoScanCount,
      videoDescriptionContactCount: item.videoDescriptionContactCount,
      externalSiteContactCount: item.externalSiteContactCount,
      externalScanStatus: item.externalScanStatus,
      externalScanError: item.externalScanError,
      externalScanUpdatedAt: item.externalScanUpdatedAt ? new Date(item.externalScanUpdatedAt) : null,
      lastVideoPublishedAt: item.lastVideoPublishedAt ? new Date(item.lastVideoPublishedAt) : null,
      monthlyViewsEstimate: item.monthlyViewsEstimate,
      estimatedMonthlyIncomeLow: item.estimatedMonthlyIncomeLow,
      estimatedMonthlyIncomeBase: item.estimatedMonthlyIncomeBase,
      estimatedMonthlyIncomeHigh: item.estimatedMonthlyIncomeHigh,
      avgViewsLast10: item.avgViewsLast10,
      medianViewsLast10: item.medianViewsLast10,
      postsLast30: item.postsLast30,
      postsLast90: item.postsLast90,
      shortsRatio: item.shortsRatio,
      audienceHealthScore: item.audienceHealthScore,
      consistencyScore: item.consistencyScore,
      hitDependencyScore: item.hitDependencyScore,
      competitionScore: item.competitionScore,
      growthScore: item.growthScore,
      opportunityScore: item.opportunityScore,
      analysisSummary: item.analysisSummary,
      analysisModeUpdatedAt: item.analysisModeUpdatedAt ? new Date(item.analysisModeUpdatedAt) : null,
      status: "UNREVIEWED",
    },
    select: { id: true },
  });

  await prisma.channelVideo.deleteMany({
    where: { channelId: saved.id },
  });

  if (item.videos.length > 0) {
    await prisma.channelVideo.createMany({
      data: item.videos.map((video) => ({
        channelId: saved.id,
        videoId: video.videoId,
        title: video.title,
        description: video.description,
        publishedAt: video.publishedAt ? new Date(video.publishedAt) : null,
        videoUrl: video.videoUrl,
        viewCount: BigInt(video.viewCount),
        likeCount: video.likeCount,
        commentCount: video.commentCount,
        durationSec: video.durationSec,
        isShorts: video.isShorts,
        thumbnailUrl: video.thumbnailUrl,
        extractedEmails: JSON.stringify(video.extractedEmails),
        extractedUrls: JSON.stringify(video.extractedUrls),
        socialLinks: JSON.stringify(video.socialLinks),
        officialWebsiteUrls: JSON.stringify(video.officialWebsiteUrls),
        contactEvidence: JSON.stringify(video.contactEvidence),
      })),
    });
  }

  await prisma.externalScanLog.deleteMany({
    where: { channelId: saved.id },
  });

  if (item.externalScanLogs.length > 0) {
    await prisma.externalScanLog.createMany({
      data: item.externalScanLogs.map((log) => ({
        channelId: saved.id,
        scannedUrl: log.scannedUrl,
        status: log.status,
        errorMessage: log.errorMessage,
        extractedEmails: JSON.stringify(log.extractedEmails),
        extractedFormUrls: JSON.stringify(log.extractedFormUrls),
        extractedSocialLinks: JSON.stringify(log.extractedSocialLinks),
        companyNameGuess: log.companyNameGuess,
        addressGuess: log.addressGuess,
        phoneGuess: log.phoneGuess,
        robotsAllowed: log.robotsAllowed,
      })),
    });
  }

  await prisma.channelAnalysisSnapshot.deleteMany({
    where: { channelId: saved.id },
  });

  await prisma.channelAnalysisSnapshot.create({
    data: {
      channelId: saved.id,
      monthlyViewsEstimate: item.monthlyViewsEstimate,
      estimatedMonthlyIncomeLow: item.estimatedMonthlyIncomeLow,
      estimatedMonthlyIncomeBase: item.estimatedMonthlyIncomeBase,
      estimatedMonthlyIncomeHigh: item.estimatedMonthlyIncomeHigh,
      avgViewsLast10: item.avgViewsLast10,
      medianViewsLast10: item.medianViewsLast10,
      postsLast30: item.postsLast30,
      postsLast90: item.postsLast90,
      shortsRatio: item.shortsRatio,
      audienceHealthScore: item.audienceHealthScore,
      consistencyScore: item.consistencyScore,
      hitDependencyScore: item.hitDependencyScore,
      competitionScore: item.competitionScore,
      growthScore: item.growthScore,
      opportunityScore: item.opportunityScore,
      analysisSummary: item.analysisSummary,
    },
  });
}

async function main() {
  const currentPlan = process.env.APP_PLAN === "PRO" ? "PRO" : "FREE";

  await prisma.appSetting.upsert({
    where: { id: "default" },
    update: {
      currentPlan,
      queryExpansionEnabled: DEFAULT_APP_SETTINGS.queryExpansionEnabled,
    },
    create: {
      id: "default",
      currentPlan,
      serviceName: DEFAULT_APP_SETTINGS.serviceName,
      serviceDescription: DEFAULT_APP_SETTINGS.serviceDescription,
      defaultPitch: DEFAULT_APP_SETTINGS.defaultPitch,
      tone: DEFAULT_APP_SETTINGS.tone,
      lengthPreference: DEFAULT_APP_SETTINGS.lengthPreference,
      queryExpansionEnabled: DEFAULT_APP_SETTINGS.queryExpansionEnabled,
      searchMaxPages: DEFAULT_APP_SETTINGS.searchMaxPages,
      searchQuotaBudgetPerRun: DEFAULT_APP_SETTINGS.searchQuotaBudgetPerRun,
      videosPerChannelForContactScan: DEFAULT_APP_SETTINGS.videosPerChannelForContactScan,
      externalSiteScanEnabled: DEFAULT_APP_SETTINGS.externalSiteScanEnabled,
      externalSiteMaxUrlsPerChannel: DEFAULT_APP_SETTINGS.externalSiteMaxUrlsPerChannel,
      externalSiteRateLimitMs: DEFAULT_APP_SETTINGS.externalSiteRateLimitMs,
      externalSiteTimeoutMs: DEFAULT_APP_SETTINGS.externalSiteTimeoutMs,
    },
  });

  const templateCount = await prisma.outreachTemplate.count();
  if (templateCount === 0) {
    await prisma.outreachTemplate.create({
      data: {
        name: "標準テンプレート",
        basePrompt:
          "YouTubeチャンネルごとに自然で丁寧な営業メールへ書き換えてください。相手のチャンネル名、説明文、カテゴリ、地域、連絡先を踏まえて、そのチャンネルを見た印象が伝わる文面にしてください。",
        baseMailText:
          "はじめまして。チャンネルの発信内容を拝見しました。\nYouTubeでの企画や運営に役立つご提案ができると感じ、ご連絡しました。\nもしご興味があれば、一度だけでもお話の機会をいただけますと幸いです。",
      },
    });
  }

  for (const seed of MOCK_CHANNEL_SEEDS) {
    const normalized = normalizeMockSeed(seed, seed.seedQueries[0], seed.seedQueries, 5);
    await persistNormalizedChannel(normalized);
  }

  const historyCount = await prisma.searchHistory.count();
  if (historyCount === 0) {
    await prisma.searchHistory.createMany({
      data: DEFAULT_SEARCH_HISTORY.map((item) => ({
        keyword: item.keyword,
        conditions: JSON.stringify(item.conditions),
        expandedQueries: JSON.stringify(item.expandedQueries),
        resultCount: item.resultCount,
        savedCount: item.savedCount,
        pagesFetched: item.pagesFetched,
        quotaUsed: item.quotaUsed,
      })),
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
