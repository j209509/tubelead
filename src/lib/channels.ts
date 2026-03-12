import type { Prisma } from "@prisma/client";

import type { AppPlanValue, ChannelSortValue, ChannelStatusValue } from "@/lib/constants";
import type {
  ChannelDetail,
  ChannelDraft,
  ExternalScanLogEntry,
  LatestVideoContact,
  RivalModeSummary,
  SerializedChannel,
} from "@/lib/channel-types";
import { getCurrentPlan, getPlanLimits } from "@/lib/plan";
import { prisma } from "@/lib/prisma";
import { estimateMonthlyIncomeRange } from "@/lib/rival-analysis";
import type { ChannelFiltersInput, ChannelUpdateInput, SearchFormInput } from "@/lib/schemas";
import {
  safeJsonParseArray,
  safeJsonParseObjectArray,
  safeJsonStringify,
  uniqueStrings,
} from "@/lib/utils";
import type { BasicYoutubeChannel, NormalizedYoutubeChannel, SearchChannelsResult } from "@/lib/youtube";

const CHANNEL_PAGE_SIZE = 25;

export type SerializedDraft = ChannelDraft;

export type SerializedSearchHistory = {
  id: string;
  keyword: string;
  conditions: SearchFormInput;
  expandedQueries: string[];
  resultCount: number;
  savedCount: number;
  pagesFetched: number;
  quotaUsed: number;
  executedAt: string;
};

export type DashboardStats = {
  totalChannels: number;
  emailCount: number;
  formCount: number;
  socialCount: number;
  officialSiteCount: number;
  bestEmailCount: number;
  bestFormCount: number;
  candidateCount: number;
};

export type ChannelListResult = {
  items: SerializedChannel[];
  total: number;
  lockedCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  plan: AppPlanValue;
  stats: DashboardStats;
  autoScanIds: string[];
  autoScanStatus: {
    targetCount: number;
    completedCount: number;
    pendingCount: number;
    processingCount: number;
    failedCount: number;
  } | null;
};

function serializeDraft(draft: {
  id: string;
  subject: string;
  body: string;
  customPoint: string | null;
  rationale: string | null;
  createdAt: Date;
  updatedAt: Date;
}): SerializedDraft {
  return {
    id: draft.id,
    subject: draft.subject,
    body: draft.body,
    customPoint: draft.customPoint || "",
    rationale: draft.rationale || "",
    createdAt: draft.createdAt.toISOString(),
    updatedAt: draft.updatedAt.toISOString(),
  };
}

function serializeVideo(video: {
  videoId: string;
  title: string;
  description: string;
  publishedAt: Date | null;
  videoUrl: string;
  viewCount: bigint;
  likeCount: number | null;
  commentCount: number | null;
  durationSec: number | null;
  isShorts: boolean;
  thumbnailUrl: string | null;
  extractedEmails: string | null;
  extractedUrls: string | null;
  socialLinks: string | null;
  officialWebsiteUrls: string | null;
  contactEvidence: string | null;
  createdAt: Date;
  updatedAt: Date;
}): LatestVideoContact {
  return {
    videoId: video.videoId,
    title: video.title,
    description: video.description,
    publishedAt: video.publishedAt?.toISOString() || null,
    videoUrl: video.videoUrl,
    viewCount: Number(video.viewCount),
    likeCount: video.likeCount,
    commentCount: video.commentCount,
    durationSec: video.durationSec,
    isShorts: video.isShorts,
    thumbnailUrl: video.thumbnailUrl,
    extractedEmails: safeJsonParseArray(video.extractedEmails),
    extractedUrls: safeJsonParseArray(video.extractedUrls),
    socialLinks: safeJsonParseObjectArray(video.socialLinks),
    officialWebsiteUrls: safeJsonParseArray(video.officialWebsiteUrls),
    contactEvidence: safeJsonParseObjectArray(video.contactEvidence),
    createdAt: video.createdAt.toISOString(),
    updatedAt: video.updatedAt.toISOString(),
  };
}

function serializeExternalScanLog(log: {
  id: string;
  scannedUrl: string;
  status: string;
  errorMessage: string | null;
  extractedEmails: string | null;
  extractedFormUrls: string | null;
  extractedSocialLinks: string | null;
  companyNameGuess: string | null;
  addressGuess: string | null;
  phoneGuess: string | null;
  robotsAllowed: boolean;
  createdAt: Date;
}): ExternalScanLogEntry {
  return {
    id: log.id,
    scannedUrl: log.scannedUrl,
    status: log.status,
    errorMessage: log.errorMessage,
    extractedEmails: safeJsonParseArray(log.extractedEmails),
    extractedFormUrls: safeJsonParseArray(log.extractedFormUrls),
    extractedSocialLinks: safeJsonParseObjectArray(log.extractedSocialLinks),
    companyNameGuess: log.companyNameGuess,
    addressGuess: log.addressGuess,
    phoneGuess: log.phoneGuess,
    robotsAllowed: log.robotsAllowed,
    createdAt: log.createdAt.toISOString(),
  };
}

export function serializeChannel(
  channel: {
    id: string;
    channelId: string;
    title: string;
    description: string;
    customUrl: string | null;
    publishedAt: Date | null;
    country: string | null;
    subscriberCount: number;
    videoCount: number;
    viewCount: bigint;
    uploadsPlaylistId: string | null;
    thumbnailUrl: string | null;
    channelUrl: string;
    sourceQuery: string;
    sourceQueries: string | null;
    matchedQueryCount: number;
    contactEmail: string | null;
    contactEmails: string | null;
    contactFormUrls: string | null;
    socialLinks: string | null;
    officialWebsiteUrls: string | null;
    externalLinks: string | null;
    bestContactMethod: string | null;
    bestContactValue: string | null;
    contactType: string;
    contactEvidence: string | null;
    regionGuess: string | null;
    categoryGuess: string | null;
    basicFetchedAt: Date | null;
    lightEnrichmentStatus: string;
    lightEnrichmentUpdatedAt: Date | null;
    deepEnrichmentStatus: string;
    deepEnrichmentUpdatedAt: Date | null;
    relevanceScore: number;
    contactabilityScore: number;
    freshnessScore: number;
    outreachScore: number;
    latestVideoScanCount: number;
    videoDescriptionContactCount: number;
    externalSiteContactCount: number;
    externalScanStatus: string | null;
    externalScanError: string | null;
    externalScanUpdatedAt: Date | null;
    lastVideoPublishedAt: Date | null;
    monthlyViewsEstimate: number | null;
    estimatedMonthlyIncomeLow: number | null;
    estimatedMonthlyIncomeBase: number | null;
    estimatedMonthlyIncomeHigh: number | null;
    avgViewsLast10: number | null;
    medianViewsLast10: number | null;
    postsLast30: number | null;
    postsLast90: number | null;
    shortsRatio: number | null;
    audienceHealthScore: number | null;
    consistencyScore: number | null;
    hitDependencyScore: number | null;
    competitionScore: number | null;
    growthScore: number | null;
    opportunityScore: number | null;
    analysisSummary: string | null;
    analysisModeUpdatedAt: Date | null;
    note: string | null;
    tags: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    _count?: { drafts: number };
  },
): SerializedChannel {
  const estimatedIncome =
    channel.monthlyViewsEstimate !== null
      ? estimateMonthlyIncomeRange(channel.monthlyViewsEstimate, channel.shortsRatio)
      : {
          low: channel.estimatedMonthlyIncomeLow,
          base: channel.estimatedMonthlyIncomeBase,
          high: channel.estimatedMonthlyIncomeHigh,
          shortsIncomeAdjustment: null,
        };

  return {
    id: channel.id,
    channelId: channel.channelId,
    title: channel.title,
    description: channel.description,
    customUrl: channel.customUrl,
    publishedAt: channel.publishedAt?.toISOString() || null,
    country: channel.country,
    subscriberCount: channel.subscriberCount,
    videoCount: channel.videoCount,
    viewCount: Number(channel.viewCount),
    uploadsPlaylistId: channel.uploadsPlaylistId,
    thumbnailUrl: channel.thumbnailUrl,
    channelUrl: channel.channelUrl,
    sourceQuery: channel.sourceQuery,
    sourceQueries: safeJsonParseArray(channel.sourceQueries),
    matchedQueryCount: channel.matchedQueryCount,
    contactEmail: channel.contactEmail,
    contactEmails: safeJsonParseArray(channel.contactEmails),
    contactFormUrls: safeJsonParseArray(channel.contactFormUrls),
    socialLinks: safeJsonParseObjectArray(channel.socialLinks),
    officialWebsiteUrls: safeJsonParseArray(channel.officialWebsiteUrls),
    externalLinks: safeJsonParseArray(channel.externalLinks),
    bestContactMethod: (channel.bestContactMethod || "none") as SerializedChannel["bestContactMethod"],
    bestContactValue: channel.bestContactValue,
    contactType: channel.contactType as SerializedChannel["contactType"],
    contactEvidence: safeJsonParseObjectArray(channel.contactEvidence),
    regionGuess: channel.regionGuess,
    categoryGuess: channel.categoryGuess,
    basicFetchedAt: channel.basicFetchedAt?.toISOString() || null,
    lightEnrichmentStatus: channel.lightEnrichmentStatus,
    lightEnrichmentUpdatedAt: channel.lightEnrichmentUpdatedAt?.toISOString() || null,
    deepEnrichmentStatus: channel.deepEnrichmentStatus,
    deepEnrichmentUpdatedAt: channel.deepEnrichmentUpdatedAt?.toISOString() || null,
    relevanceScore: channel.relevanceScore,
    contactabilityScore: channel.contactabilityScore,
    freshnessScore: channel.freshnessScore,
    outreachScore: channel.outreachScore,
    latestVideoScanCount: channel.latestVideoScanCount,
    videoDescriptionContactCount: channel.videoDescriptionContactCount,
    externalSiteContactCount: channel.externalSiteContactCount,
    externalScanStatus: channel.externalScanStatus,
    externalScanError: channel.externalScanError,
    externalScanUpdatedAt: channel.externalScanUpdatedAt?.toISOString() || null,
    lastVideoPublishedAt: channel.lastVideoPublishedAt?.toISOString() || null,
    monthlyViewsEstimate: channel.monthlyViewsEstimate,
    estimatedMonthlyIncomeLow: estimatedIncome.low,
    estimatedMonthlyIncomeBase: estimatedIncome.base,
    estimatedMonthlyIncomeHigh: estimatedIncome.high,
    avgViewsLast10: channel.avgViewsLast10,
    medianViewsLast10: channel.medianViewsLast10,
    postsLast30: channel.postsLast30,
    postsLast90: channel.postsLast90,
    shortsRatio: channel.shortsRatio,
    audienceHealthScore: channel.audienceHealthScore,
    consistencyScore: channel.consistencyScore,
    hitDependencyScore: channel.hitDependencyScore,
    competitionScore: channel.competitionScore,
    growthScore: channel.growthScore,
    opportunityScore: channel.opportunityScore,
    analysisSummary: channel.analysisSummary,
    analysisModeUpdatedAt: channel.analysisModeUpdatedAt?.toISOString() || null,
    note: channel.note || "",
    tags: safeJsonParseArray(channel.tags),
    status: channel.status as ChannelStatusValue,
    createdAt: channel.createdAt.toISOString(),
    updatedAt: channel.updatedAt.toISOString(),
    draftCount: channel._count?.drafts,
  };
}

function buildChannelWhere(filters: ChannelFiltersInput): Prisma.ChannelWhereInput {
  const and: Prisma.ChannelWhereInput[] = [];

  if (filters.q) {
    and.push({
      OR: [
        { title: { contains: filters.q } },
        { description: { contains: filters.q } },
        { sourceQuery: { contains: filters.q } },
        { sourceQueries: { contains: filters.q } },
        { categoryGuess: { contains: filters.q } },
        { regionGuess: { contains: filters.q } },
        { bestContactValue: { contains: filters.q } },
        { analysisSummary: { contains: filters.q } },
      ],
    });
  }

  if (filters.sourceQuery) {
    and.push({
      OR: [{ sourceQuery: { contains: filters.sourceQuery } }, { sourceQueries: { contains: filters.sourceQuery } }],
    });
  }

  if (filters.minSubscribers) {
    and.push({ subscriberCount: { gte: filters.minSubscribers } });
  }

  if (filters.minVideos) {
    and.push({ videoCount: { gte: filters.minVideos } });
  }

  if (filters.minContactabilityScore) {
    and.push({ contactabilityScore: { gte: filters.minContactabilityScore } });
  }

  if (filters.minAvgViewsLast10) {
    and.push({ avgViewsLast10: { gte: filters.minAvgViewsLast10 } });
  }

  if (filters.minPostsLast30) {
    and.push({ postsLast30: { gte: filters.minPostsLast30 } });
  }

  if (filters.minOpportunityScore) {
    and.push({ opportunityScore: { gte: filters.minOpportunityScore } });
  }

  if (filters.minEstimatedMonthlyIncomeBase) {
    and.push({ estimatedMonthlyIncomeBase: { gte: filters.minEstimatedMonthlyIncomeBase } });
  }

  if (filters.maxShortsRatio < 100) {
    and.push({ shortsRatio: { lte: filters.maxShortsRatio / 100 } });
  }

  if (filters.publishedWithinDays) {
    const date = new Date();
    date.setDate(date.getDate() - filters.publishedWithinDays);
    and.push({ lastVideoPublishedAt: { gte: date } });
  }

  if (filters.hasEmail) {
    and.push({ hasContactEmail: true });
  }

  if (filters.hasForm) {
    and.push({ hasContactForm: true });
  }

  if (filters.hasSocial) {
    and.push({ hasSocialLinks: true });
  }

  if (filters.hasOfficialSite) {
    and.push({ hasOfficialWebsite: true });
  }

  if (filters.onlyUnreviewed) {
    and.push({ status: "UNREVIEWED" });
  }

  if (filters.hasVideoContact) {
    and.push({ videoDescriptionContactCount: { gt: 0 } });
  }

  if (filters.hasExternalContact) {
    and.push({ externalSiteContactCount: { gt: 0 } });
  }

  return and.length > 0 ? { AND: and } : {};
}

function buildOrderBy(sort: ChannelSortValue): Prisma.ChannelOrderByWithRelationInput {
  switch (sort) {
    case "subscribers":
      return { subscriberCount: "desc" };
    case "views":
      return { viewCount: "desc" };
    case "videos":
      return { videoCount: "desc" };
    case "score":
      return { outreachScore: "desc" };
    case "contactability":
      return { contactabilityScore: "desc" };
    case "freshness":
      return { freshnessScore: "desc" };
    case "incomeHigh":
      return { estimatedMonthlyIncomeHigh: "desc" };
    case "incomeBase":
      return { estimatedMonthlyIncomeBase: "desc" };
    case "monthlyViews":
      return { monthlyViewsEstimate: "desc" };
    case "avgViews":
      return { avgViewsLast10: "desc" };
    case "posts30":
      return { postsLast30: "desc" };
    case "latestVideo":
      return { lastVideoPublishedAt: "desc" };
    case "competition":
      return { competitionScore: "desc" };
    case "growth":
      return { growthScore: "desc" };
    case "opportunity":
      return { opportunityScore: "desc" };
    case "updated":
    default:
      return { updatedAt: "desc" };
  }
}

function sortSerializedChannels(items: SerializedChannel[], sort: ChannelSortValue) {
  const sorted = [...items];

  const getValue = (channel: SerializedChannel) => {
    switch (sort) {
      case "subscribers":
        return channel.subscriberCount;
      case "views":
        return channel.viewCount;
      case "videos":
        return channel.videoCount;
      case "score":
        return channel.outreachScore;
      case "contactability":
        return channel.contactabilityScore;
      case "freshness":
        return channel.freshnessScore;
      case "incomeHigh":
        return channel.estimatedMonthlyIncomeHigh ?? 0;
      case "incomeBase":
        return channel.estimatedMonthlyIncomeBase ?? 0;
      case "monthlyViews":
        return channel.monthlyViewsEstimate ?? 0;
      case "avgViews":
        return channel.avgViewsLast10 ?? 0;
      case "posts30":
        return channel.postsLast30 ?? 0;
      case "latestVideo":
        return channel.lastVideoPublishedAt ? new Date(channel.lastVideoPublishedAt).getTime() : 0;
      case "competition":
        return channel.competitionScore ?? 0;
      case "growth":
        return channel.growthScore ?? 0;
      case "opportunity":
        return channel.opportunityScore ?? 0;
      case "updated":
      default:
        return new Date(channel.updatedAt).getTime();
    }
  };

  sorted.sort((left, right) => {
    const leftValue = getValue(left);
    const rightValue = getValue(right);

    if (leftValue === rightValue) {
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    }

    return rightValue > leftValue ? 1 : -1;
  });

  return sorted;
}

function mergeSourceQueries(existing: string | null, incoming: string[]) {
  return uniqueStrings([...safeJsonParseArray(existing), ...incoming]);
}

function buildNormalizedChannelData(item: NormalizedYoutubeChannel): Prisma.ChannelUncheckedCreateInput {
  return {
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
    sourceQueries: safeJsonStringify(item.sourceQueries),
    matchedQueryCount: item.matchedQueryCount,
    contactEmail: item.contactEmail || null,
    contactEmails: safeJsonStringify(item.contactEmails),
    contactFormUrls: safeJsonStringify(item.contactFormUrls),
    socialLinks: safeJsonStringify(item.socialLinks),
    officialWebsiteUrls: safeJsonStringify(item.officialWebsiteUrls),
    externalLinks: safeJsonStringify(item.externalLinks),
    bestContactMethod: item.bestContactMethod,
    bestContactValue: item.bestContactValue,
    contactEvidence: safeJsonStringify(item.contactEvidence),
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
  };
}

async function replaceChannelArtifacts(channelDbId: string, item: NormalizedYoutubeChannel) {
  await prisma.channelVideo.deleteMany({
    where: { channelId: channelDbId },
  });

  if (item.videos.length > 0) {
    await prisma.channelVideo.createMany({
      data: item.videos.map((video) => ({
        channelId: channelDbId,
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
        extractedEmails: safeJsonStringify(video.extractedEmails),
        extractedUrls: safeJsonStringify(video.extractedUrls),
        socialLinks: safeJsonStringify(video.socialLinks),
        officialWebsiteUrls: safeJsonStringify(video.officialWebsiteUrls),
        contactEvidence: safeJsonStringify(video.contactEvidence),
      })),
    });
  }

  await prisma.externalScanLog.deleteMany({
    where: { channelId: channelDbId },
  });

  if (item.externalScanLogs.length > 0) {
    await prisma.externalScanLog.createMany({
      data: item.externalScanLogs.map((log) => ({
        channelId: channelDbId,
        scannedUrl: log.scannedUrl,
        status: log.status,
        errorMessage: log.errorMessage,
        extractedEmails: safeJsonStringify(log.extractedEmails),
        extractedFormUrls: safeJsonStringify(log.extractedFormUrls),
        extractedSocialLinks: safeJsonStringify(log.extractedSocialLinks),
        companyNameGuess: log.companyNameGuess,
        addressGuess: log.addressGuess,
        phoneGuess: log.phoneGuess,
        robotsAllowed: log.robotsAllowed,
      })),
    });
  }

  await prisma.channelAnalysisSnapshot.deleteMany({
    where: { channelId: channelDbId },
  });

  if (item.analysisModeUpdatedAt || item.monthlyViewsEstimate !== null) {
    await prisma.channelAnalysisSnapshot.create({
      data: {
        channelId: channelDbId,
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
}

export async function getDashboardStats(where?: Prisma.ChannelWhereInput): Promise<DashboardStats> {
  const scoped = where || {};

  const [totalChannels, emailCount, formCount, socialCount, officialSiteCount, bestEmailCount, bestFormCount, candidateCount] =
    await Promise.all([
      prisma.channel.count({ where: scoped }),
      prisma.channel.count({ where: { ...scoped, hasContactEmail: true } }),
      prisma.channel.count({ where: { ...scoped, hasContactForm: true } }),
      prisma.channel.count({ where: { ...scoped, hasSocialLinks: true } }),
      prisma.channel.count({ where: { ...scoped, hasOfficialWebsite: true } }),
      prisma.channel.count({ where: { ...scoped, bestContactMethod: "email" } }),
      prisma.channel.count({ where: { ...scoped, bestContactMethod: "form" } }),
      prisma.channel.count({ where: { ...scoped, status: "CONTACT_CANDIDATE" } }),
    ]);

  return {
    totalChannels,
    emailCount,
    formCount,
    socialCount,
    officialSiteCount,
    bestEmailCount,
    bestFormCount,
    candidateCount,
  };
}

export async function getRivalDashboardSummary(filters: ChannelFiltersInput): Promise<RivalModeSummary> {
  const where = buildChannelWhere(filters);
  const rows = await prisma.channel.findMany({
    where,
    select: {
      id: true,
      title: true,
      monthlyViewsEstimate: true,
      postsLast30: true,
      shortsRatio: true,
      opportunityScore: true,
    },
  });

  const incomeRows = rows.map((row) => {
    const estimatedIncome = estimateMonthlyIncomeRange(row.monthlyViewsEstimate, row.shortsRatio);
    return {
      ...row,
      estimatedMonthlyIncomeBase: estimatedIncome.base ?? 0,
      estimatedMonthlyIncomeHigh: estimatedIncome.high ?? 0,
    };
  });

  const baseIncomeValues = incomeRows
    .map((row) => row.estimatedMonthlyIncomeBase)
    .filter((value): value is number => value !== null)
    .sort((left, right) => left - right);
  const medianMonthlyIncomeBase =
    baseIncomeValues.length === 0
      ? 0
      : baseIncomeValues.length % 2 === 0
        ? Math.round(
            (baseIncomeValues[baseIncomeValues.length / 2 - 1] + baseIncomeValues[baseIncomeValues.length / 2]) / 2,
          )
        : baseIncomeValues[Math.floor(baseIncomeValues.length / 2)];

  return {
    totalChannels: incomeRows.length,
    medianMonthlyIncomeBase,
    highPostingCount: incomeRows.filter((row) => (row.postsLast30 || 0) >= 3).length,
    shortsHeavyCount: incomeRows.filter((row) => (row.shortsRatio || 0) >= 0.5).length,
    highOpportunityCount: incomeRows.filter((row) => (row.opportunityScore || 0) >= 70).length,
    topIncomeChannels: [...incomeRows]
      .sort((left, right) => (right.estimatedMonthlyIncomeHigh || 0) - (left.estimatedMonthlyIncomeHigh || 0))
      .slice(0, 3)
      .map((row) => ({
        id: row.id,
        title: row.title,
        estimatedMonthlyIncomeHigh: row.estimatedMonthlyIncomeHigh || 0,
      })),
  };
}

export async function getRecentSearchHistory(limit = 6): Promise<SerializedSearchHistory[]> {
  const rows = await prisma.searchHistory.findMany({
    orderBy: { executedAt: "desc" },
    take: limit,
  });

  return rows.map((row) => {
    const rawConditions = JSON.parse(row.conditions) as Partial<SearchFormInput>;

    return {
      id: row.id,
      keyword: row.keyword,
      conditions: {
        mode: "sales",
        minSubscribers: 0,
        minVideos: 0,
        maxResults: 300,
        order: "relevance",
        hasContactOnly: false,
        preferJapanese: true,
        ...rawConditions,
        keyword: rawConditions.keyword || row.keyword,
      } as SearchFormInput,
      expandedQueries: safeJsonParseArray(row.expandedQueries),
      resultCount: row.resultCount,
      savedCount: row.savedCount,
      pagesFetched: row.pagesFetched,
      quotaUsed: row.quotaUsed,
      executedAt: row.executedAt.toISOString(),
    };
  });
}

export async function getChannelList(
  filters: ChannelFiltersInput,
  options?: { includeAutoScanIds?: boolean },
): Promise<ChannelListResult> {
  const plan = getCurrentPlan();
  const where = buildChannelWhere(filters);
  const stats = await getDashboardStats(where);
  const total = await prisma.channel.count({ where });
  const orderBy = buildOrderBy(filters.sort);
  const autoScanIds =
    filters.mode === "rival" && options?.includeAutoScanIds
      ? (
          await prisma.channel.findMany({
            where: {
              AND: [where, { lightEnrichmentStatus: { not: "COMPLETED" } }],
            },
            select: { id: true },
            orderBy: { updatedAt: "desc" },
          })
        ).map((row) => row.id)
      : [];
  const autoScanStatus =
    filters.mode === "rival" && options?.includeAutoScanIds
      ? await (async () => {
          const [targetCount, completedCount, pendingCount, processingCount, failedCount] = await Promise.all([
            prisma.channel.count({ where }),
            prisma.channel.count({ where: { AND: [where, { lightEnrichmentStatus: "COMPLETED" }] } }),
            prisma.channel.count({ where: { AND: [where, { lightEnrichmentStatus: "PENDING" }] } }),
            prisma.channel.count({ where: { AND: [where, { lightEnrichmentStatus: "PROCESSING" }] } }),
            prisma.channel.count({ where: { AND: [where, { lightEnrichmentStatus: "FAILED" }] } }),
          ]);

          return {
            targetCount,
            completedCount,
            pendingCount,
            processingCount,
            failedCount,
          };
        })()
      : null;

  if (filters.mode === "rival") {
    const rows = await prisma.channel.findMany({
      where,
      include: {
        _count: {
          select: { drafts: true },
        },
      },
    });
    const sortedItems = sortSerializedChannels(rows.map(serializeChannel), filters.sort);

    if (plan === "FREE") {
      const visibleLimit = getPlanLimits(plan).visibleChannels;

      return {
        items: sortedItems.slice(0, visibleLimit),
        total,
        lockedCount: Math.max(total - visibleLimit, 0),
        page: 1,
        pageSize: visibleLimit,
        totalPages: 1,
        plan,
        stats,
        autoScanIds,
        autoScanStatus,
      };
    }

    const page = filters.page;
    const totalPages = Math.max(1, Math.ceil(total / CHANNEL_PAGE_SIZE));
    const startIndex = (page - 1) * CHANNEL_PAGE_SIZE;

    return {
      items: sortedItems.slice(startIndex, startIndex + CHANNEL_PAGE_SIZE),
      total,
      lockedCount: 0,
      page,
      pageSize: CHANNEL_PAGE_SIZE,
      totalPages,
      plan,
      stats,
      autoScanIds,
      autoScanStatus,
    };
  }

  if (plan === "FREE") {
    const visibleLimit = getPlanLimits(plan).visibleChannels;
    const rows = await prisma.channel.findMany({
      where,
      orderBy,
      take: visibleLimit,
      include: {
        _count: {
          select: { drafts: true },
        },
      },
    });

    return {
      items: rows.map(serializeChannel),
      total,
      lockedCount: Math.max(total - visibleLimit, 0),
      page: 1,
      pageSize: visibleLimit,
      totalPages: 1,
      plan,
      stats,
      autoScanIds,
      autoScanStatus,
    };
  }

  const page = filters.page;
  const totalPages = Math.max(1, Math.ceil(total / CHANNEL_PAGE_SIZE));
  const rows = await prisma.channel.findMany({
    where,
    orderBy,
    skip: (page - 1) * CHANNEL_PAGE_SIZE,
    take: CHANNEL_PAGE_SIZE,
    include: {
      _count: {
        select: { drafts: true },
      },
    },
  });

  return {
    items: rows.map(serializeChannel),
    total,
    lockedCount: 0,
    page,
    pageSize: CHANNEL_PAGE_SIZE,
    totalPages,
    plan,
    stats,
    autoScanIds,
    autoScanStatus,
  };
}

export async function getAllChannelsForExport(filters: ChannelFiltersInput) {
  const plan = getCurrentPlan();
  const where = buildChannelWhere(filters);
  const orderBy = buildOrderBy(filters.sort);
  const limit = getPlanLimits(plan).csvExportRows;

  const rows = await prisma.channel.findMany({
    where,
    orderBy,
    ...(Number.isFinite(limit) ? { take: limit } : {}),
  });

  return rows.map(serializeChannel);
}

export async function getChannelById(id: string): Promise<ChannelDetail | null> {
  const channel = await prisma.channel.findUnique({
    where: { id },
    include: {
      drafts: {
        orderBy: { createdAt: "desc" },
      },
      videos: {
        orderBy: { publishedAt: "desc" },
      },
      externalScanLogs: {
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: { drafts: true },
      },
    },
  });

  if (!channel) {
    return null;
  }

  return {
    channel: serializeChannel(channel),
    drafts: channel.drafts.map(serializeDraft),
    videos: channel.videos.map(serializeVideo),
    externalScanLogs: channel.externalScanLogs.map(serializeExternalScanLog),
  };
}

export async function updateChannelMeta(id: string, input: ChannelUpdateInput) {
  const updated = await prisma.channel.update({
    where: { id },
    data: {
      status: input.status,
      note: input.note,
      tags: safeJsonStringify(input.tags),
    },
    include: {
      _count: {
        select: { drafts: true },
      },
    },
  });

  return serializeChannel(updated);
}

export async function markLightEnrichmentStatus(id: string, status: string) {
  const updated = await prisma.channel.update({
    where: { id },
    data: {
      lightEnrichmentStatus: status,
      lightEnrichmentUpdatedAt: new Date(),
    },
    include: {
      _count: {
        select: { drafts: true },
      },
    },
  });

  return serializeChannel(updated);
}

export async function markDeepEnrichmentStatus(id: string, status: string, errorMessage?: string | null) {
  const updated = await prisma.channel.update({
    where: { id },
    data: {
      deepEnrichmentStatus: status,
      deepEnrichmentUpdatedAt: new Date(),
      ...(errorMessage !== undefined ? { externalScanError: errorMessage } : {}),
    },
    include: {
      _count: {
        select: { drafts: true },
      },
    },
  });

  return serializeChannel(updated);
}

export async function upsertBasicChannel(item: BasicYoutubeChannel) {
  const existing = await prisma.channel.findUnique({
    where: { channelId: item.channelId },
    select: {
      id: true,
      sourceQueries: true,
      lightEnrichmentStatus: true,
      lightEnrichmentUpdatedAt: true,
      deepEnrichmentStatus: true,
      deepEnrichmentUpdatedAt: true,
    },
  });

  const mergedSourceQueries = mergeSourceQueries(existing?.sourceQueries || null, item.sourceQueries);

  if (existing) {
    await prisma.channel.update({
      where: { channelId: item.channelId },
      data: {
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
        sourceQueries: safeJsonStringify(mergedSourceQueries),
        matchedQueryCount: mergedSourceQueries.length,
        regionGuess: item.regionGuess || null,
        categoryGuess: item.categoryGuess || null,
        relevanceScore: item.relevanceScore,
        freshnessScore: item.freshnessScore,
        outreachScore: item.outreachScore,
        basicFetchedAt: item.basicFetchedAt ? new Date(item.basicFetchedAt) : new Date(),
        lightEnrichmentStatus: existing.lightEnrichmentStatus === "PROCESSING" ? "PROCESSING" : "PENDING",
        lightEnrichmentUpdatedAt: existing.lightEnrichmentUpdatedAt,
        deepEnrichmentStatus: existing.deepEnrichmentStatus || "IDLE",
        deepEnrichmentUpdatedAt: existing.deepEnrichmentUpdatedAt,
      },
    });

    return existing.id;
  }

  const created = await prisma.channel.create({
    data: {
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
      sourceQueries: safeJsonStringify(item.sourceQueries),
      matchedQueryCount: item.matchedQueryCount,
      contactEmails: safeJsonStringify([]),
      contactFormUrls: safeJsonStringify([]),
      socialLinks: safeJsonStringify([]),
      officialWebsiteUrls: safeJsonStringify([]),
      externalLinks: safeJsonStringify([]),
      contactEvidence: safeJsonStringify([]),
      hasExternalLinks: false,
      hasContactEmail: false,
      hasContactForm: false,
      hasSocialLinks: false,
      hasOfficialWebsite: false,
      contactType: "none",
      bestContactMethod: "none",
      bestContactValue: null,
      regionGuess: item.regionGuess || null,
      categoryGuess: item.categoryGuess || null,
      basicFetchedAt: item.basicFetchedAt ? new Date(item.basicFetchedAt) : new Date(),
      lightEnrichmentStatus: "PENDING",
      lightEnrichmentUpdatedAt: null,
      deepEnrichmentStatus: "IDLE",
      deepEnrichmentUpdatedAt: null,
      relevanceScore: item.relevanceScore,
      contactabilityScore: item.contactabilityScore,
      freshnessScore: item.freshnessScore,
      outreachScore: item.outreachScore,
      latestVideoScanCount: 0,
      videoDescriptionContactCount: 0,
      externalSiteContactCount: 0,
      externalScanStatus: null,
      externalScanError: null,
      externalScanUpdatedAt: null,
      lastVideoPublishedAt: null,
      status: "UNREVIEWED",
    },
    select: { id: true },
  });

  return created.id;
}

export async function upsertNormalizedChannel(item: NormalizedYoutubeChannel) {
  const existing = await prisma.channel.findUnique({
    where: { channelId: item.channelId },
    select: { id: true, sourceQueries: true, status: true, note: true, tags: true },
  });
  const mergedSourceQueries = mergeSourceQueries(existing?.sourceQueries || null, item.sourceQueries);

  const payload = buildNormalizedChannelData({
    ...item,
    sourceQueries: mergedSourceQueries,
    matchedQueryCount: mergedSourceQueries.length,
  });
  const updatePayload = { ...payload };
  delete updatePayload.status;

  const saved = existing
    ? await prisma.channel.update({
        where: { channelId: item.channelId },
        data: updatePayload,
        select: { id: true },
      })
    : await prisma.channel.create({
        data: payload,
        select: { id: true },
      });

  await replaceChannelArtifacts(saved.id, {
    ...item,
    sourceQueries: mergedSourceQueries,
    matchedQueryCount: mergedSourceQueries.length,
  });

  return saved.id;
}

export async function saveSearchResults(input: SearchFormInput, result: SearchChannelsResult) {
  let savedCount = 0;
  const errors: string[] = [];

  for (const item of result.items) {
    try {
      await upsertBasicChannel(item);
      savedCount += 1;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `Channel ${item.channelId} could not be saved.`);
    }
  }

  await prisma.searchHistory.create({
    data: {
      keyword: input.keyword,
      conditions: JSON.stringify(input),
      expandedQueries: JSON.stringify(result.expandedQueries),
      resultCount: result.items.length,
      savedCount,
      pagesFetched: result.pagesFetched,
      quotaUsed: result.quotaUsed,
    },
  });

  return {
    savedCount,
    errors,
  };
}
