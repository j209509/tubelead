import type {
  BestContactMethodValue,
  ContactTypeValue,
  EnrichmentStatusValue,
} from "@/lib/constants";
import type {
  ContactEvidence,
  ExternalScanLogEntry,
  LatestVideoContact,
  SocialLink,
} from "@/lib/channel-types";
import {
  extractContactSignalsFromText,
  extractEmailFromText,
  extractUrlsFromText,
  mergeContactSignals,
} from "@/lib/contact-utils";
import { buildRivalAnalysis, parseDurationSeconds } from "@/lib/rival-analysis";
import { buildMockExternalLog, MOCK_CHANNEL_SEEDS, type MockChannelSeed } from "@/lib/mock-data";
import {
  calcContactabilityScore,
  calcFreshnessScore,
  calcOutreachScore as calculateOutreachScore,
  calcRelevanceScore,
} from "@/lib/scoring";
import { scanExternalSite } from "@/lib/site-scan";
import type { SearchFormInput } from "@/lib/schemas";
import type { SerializedSettings } from "@/lib/settings";
import { normalizeUrl, uniqueStrings } from "@/lib/utils";

export type SearchSource = "youtube-api" | "mock";

export type BaseYoutubeChannel = {
  channelId: string;
  title: string;
  description: string;
  customUrl?: string;
  publishedAt?: string | null;
  country?: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  thumbnailUrl?: string;
  channelUrl: string;
  uploadsPlaylistId?: string;
};

type StageFields = {
  basicFetchedAt: string | null;
  lightEnrichmentStatus: EnrichmentStatusValue;
  lightEnrichmentUpdatedAt: string | null;
  deepEnrichmentStatus: EnrichmentStatusValue;
  deepEnrichmentUpdatedAt: string | null;
};

type AnalysisFields = {
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
  analysisModeUpdatedAt: string | null;
};

export type BasicYoutubeChannel = BaseYoutubeChannel &
  StageFields & {
    sourceQuery: string;
    sourceQueries: string[];
    matchedQueryCount: number;
    regionGuess?: string;
    categoryGuess?: string;
    relevanceScore: number;
    contactabilityScore: number;
    freshnessScore: number;
    outreachScore: number;
  };

export type NormalizedYoutubeChannel = BaseYoutubeChannel &
  StageFields &
  AnalysisFields & {
    sourceQuery: string;
    sourceQueries: string[];
    matchedQueryCount: number;
    contactEmail?: string;
    contactEmails: string[];
    contactFormUrls: string[];
    socialLinks: SocialLink[];
    officialWebsiteUrls: string[];
    externalLinks: string[];
    bestContactMethod: BestContactMethodValue;
    bestContactValue: string | null;
    contactType: ContactTypeValue;
    contactEvidence: ContactEvidence[];
    regionGuess?: string;
    categoryGuess?: string;
    relevanceScore: number;
    contactabilityScore: number;
    freshnessScore: number;
    outreachScore: number;
    latestVideoScanCount: number;
    videoDescriptionContactCount: number;
    externalSiteContactCount: number;
    externalScanStatus: string | null;
    externalScanError: string | null;
    externalScanUpdatedAt: string | null;
    lastVideoPublishedAt: string | null;
    videos: LatestVideoContact[];
    externalScanLogs: ExternalScanLogEntry[];
  };

export type SearchChannelsResult = {
  items: BasicYoutubeChannel[];
  source: SearchSource;
  errors: string[];
  expandedQueries: string[];
  expandedQueryCount: number;
  pagesFetched: number;
  quotaUsed: number;
};

type SearchSettings = Pick<
  SerializedSettings,
  | "searchMaxPages"
  | "searchQuotaBudgetPerRun"
  | "videosPerChannelForContactScan"
  | "externalSiteScanEnabled"
  | "externalSiteMaxUrlsPerChannel"
  | "externalSiteRateLimitMs"
  | "externalSiteTimeoutMs"
>;

const DEFAULT_SEARCH_SETTINGS: SearchSettings = {
  searchMaxPages: 6,
  searchQuotaBudgetPerRun: 600,
  videosPerChannelForContactScan: 3,
  externalSiteScanEnabled: true,
  externalSiteMaxUrlsPerChannel: 2,
  externalSiteRateLimitMs: 1200,
  externalSiteTimeoutMs: 8000,
};

const REGION_KEYWORDS: Array<{ label: string; keywords: string[] }> = [
  { label: "東京都", keywords: ["東京", "渋谷", "新宿", "港区"] },
  { label: "大阪府", keywords: ["大阪", "梅田", "難波"] },
  { label: "北海道", keywords: ["北海道", "札幌"] },
  { label: "福岡県", keywords: ["福岡", "博多"] },
  { label: "愛知県", keywords: ["愛知", "名古屋"] },
  { label: "京都府", keywords: ["京都", "祇園"] },
  { label: "兵庫県", keywords: ["神戸", "兵庫"] },
  { label: "沖縄県", keywords: ["沖縄"] },
];

const CATEGORY_KEYWORDS: Array<{ label: string; keywords: string[] }> = [
  { label: "ペット", keywords: ["ペット", "pet"] },
  { label: "犬", keywords: ["犬", "dog", "corgi", "コーギー", "柴犬"] },
  { label: "猫", keywords: ["猫", "cat"] },
  { label: "投資", keywords: ["投資", "trading", "funded", "prop"] },
  { label: "FX", keywords: ["fx", "ea", "自動売買", "prop firm"] },
  { label: "美容", keywords: ["美容", "ヘア", "サロン", "美容室", "美容院"] },
  { label: "歯科", keywords: ["歯医者", "歯科", "dental", "clinic"] },
  { label: "飲食", keywords: ["カフェ", "飲食", "restaurant", "food"] },
  { label: "教育", keywords: ["教育", "学習", "study", "解説"] },
  { label: "エンタメ", keywords: ["vlog", "エンタメ", "日常", "channel"] },
];

type SearchListResponse = {
  items?: Array<{
    id?: { channelId?: string };
  }>;
  nextPageToken?: string;
};

type ChannelListResponse = {
  items?: Array<{
    id: string;
    snippet?: {
      title?: string;
      description?: string;
      publishedAt?: string;
      country?: string;
      customUrl?: string;
      thumbnails?: {
        high?: { url?: string };
        medium?: { url?: string };
        default?: { url?: string };
      };
    };
    statistics?: {
      subscriberCount?: string;
      videoCount?: string;
      viewCount?: string;
    };
    contentDetails?: {
      relatedPlaylists?: {
        uploads?: string;
      };
    };
  }>;
};

type PlaylistItemsResponse = {
  items?: Array<{
    snippet?: {
      title?: string;
      description?: string;
      publishedAt?: string;
      resourceId?: { videoId?: string };
    };
    contentDetails?: {
      videoId?: string;
    };
  }>;
};

type VideosListResponse = {
  items?: Array<{
    id: string;
    snippet?: {
      title?: string;
      description?: string;
      publishedAt?: string;
      thumbnails?: {
        high?: { url?: string };
        medium?: { url?: string };
        default?: { url?: string };
      };
    };
    statistics?: {
      viewCount?: string;
      likeCount?: string;
      commentCount?: string;
    };
    contentDetails?: {
      duration?: string;
    };
  }>;
};

function withSearchSettings(settings?: Partial<SearchSettings>): SearchSettings {
  return { ...DEFAULT_SEARCH_SETTINGS, ...settings };
}

function buildStageFields(overrides?: Partial<StageFields>): StageFields {
  return {
    basicFetchedAt: overrides?.basicFetchedAt ?? new Date().toISOString(),
    lightEnrichmentStatus: overrides?.lightEnrichmentStatus ?? "PENDING",
    lightEnrichmentUpdatedAt: overrides?.lightEnrichmentUpdatedAt ?? null,
    deepEnrichmentStatus: overrides?.deepEnrichmentStatus ?? "IDLE",
    deepEnrichmentUpdatedAt: overrides?.deepEnrichmentUpdatedAt ?? null,
  };
}

function emptyAnalysisFields(): AnalysisFields {
  return {
    monthlyViewsEstimate: null,
    estimatedMonthlyIncomeLow: null,
    estimatedMonthlyIncomeBase: null,
    estimatedMonthlyIncomeHigh: null,
    avgViewsLast10: null,
    medianViewsLast10: null,
    postsLast30: null,
    postsLast90: null,
    shortsRatio: null,
    audienceHealthScore: null,
    consistencyScore: null,
    hitDependencyScore: null,
    competitionScore: null,
    growthScore: null,
    opportunityScore: null,
    analysisSummary: null,
    analysisModeUpdatedAt: null,
  };
}

export function guessRegion(text: string) {
  const normalized = text.toLowerCase();
  const matched = REGION_KEYWORDS.find((region) =>
    region.keywords.some((keyword) => normalized.includes(keyword.toLowerCase())),
  );
  return matched?.label;
}

export function guessCategory(text: string) {
  const normalized = text.toLowerCase();
  const matched = CATEGORY_KEYWORDS.find((category) =>
    category.keywords.some((keyword) => normalized.includes(keyword.toLowerCase())),
  );
  return matched?.label || "エンタメ";
}

export function calcOutreachScore(
  channel: Pick<
    NormalizedYoutubeChannel,
    "subscriberCount" | "videoCount" | "relevanceScore" | "contactabilityScore" | "freshnessScore"
  >,
) {
  return calculateOutreachScore(channel);
}

async function fetchYoutubeJson<T>(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`YouTube API error (${response.status}): ${text}`);
  }

  return (await response.json()) as T;
}

function buildBaseFromMockSeed(seed: MockChannelSeed): BaseYoutubeChannel {
  return {
    channelId: seed.channelId,
    title: seed.title,
    description: seed.description,
    customUrl: seed.customUrl,
    publishedAt: seed.publishedAt,
    country: seed.country,
    subscriberCount: seed.subscriberCount,
    videoCount: seed.videoCount,
    viewCount: seed.viewCount,
    thumbnailUrl: seed.thumbnailUrl,
    channelUrl: `https://www.youtube.com/channel/${seed.channelId}`,
  };
}

function matchMockSeed(seed: MockChannelSeed, keyword: string) {
  const normalizedKeyword = keyword.toLowerCase();
  const haystack = `${seed.title} ${seed.description} ${seed.seedQueries.join(" ")}`.toLowerCase();

  if (haystack.includes(normalizedKeyword)) {
    return true;
  }

  const tokens = normalizedKeyword.split(/\s+/).filter(Boolean);
  return tokens.every((token) => haystack.includes(token));
}

function normalizeMockVideo(video: MockChannelSeed["latestVideos"][number]): LatestVideoContact {
  const videoUrl = `https://www.youtube.com/watch?v=${video.videoId}`;
  const signals = extractContactSignalsFromText({
    text: video.description,
    sourceType: "video_description",
    sourceUrl: videoUrl,
  });

  return {
    videoId: video.videoId,
    title: video.title,
    description: video.description,
    publishedAt: video.publishedAt,
    videoUrl,
    viewCount: video.viewCount,
    likeCount: video.likeCount ?? null,
    commentCount: video.commentCount ?? null,
    durationSec: video.durationSec,
    isShorts: video.isShorts ?? video.durationSec <= 70,
    thumbnailUrl: video.thumbnailUrl || `https://placehold.co/480x270/e2e8f0/0f172a?text=${video.videoId.slice(-3)}`,
    extractedEmails: signals.emails,
    extractedUrls: signals.urls,
    socialLinks: signals.socialLinks,
    officialWebsiteUrls: signals.officialWebsiteUrls,
    contactEvidence: signals.evidence,
  };
}

function buildExternalSignals(logs: ExternalScanLogEntry[]) {
  const emails = uniqueStrings(logs.flatMap((log) => log.extractedEmails));
  const contactFormUrls = uniqueStrings(logs.flatMap((log) => log.extractedFormUrls));
  const socialLinks = uniqueStrings(
    logs.flatMap((log) => log.extractedSocialLinks.map((link) => JSON.stringify(link))),
  ).map((value) => JSON.parse(value) as SocialLink);

  const evidence: ContactEvidence[] = [
    ...emails.map((email) => ({
      sourceType: "external_site" as const,
      sourceUrl: logs[0]?.scannedUrl || null,
      matchedValue: email,
      field: "email" as const,
      confidence: 0.95,
    })),
    ...contactFormUrls.map((url) => ({
      sourceType: "external_site" as const,
      sourceUrl: logs[0]?.scannedUrl || null,
      matchedValue: url,
      field: "form" as const,
      confidence: 0.92,
    })),
    ...socialLinks.map((link) => ({
      sourceType: "external_site" as const,
      sourceUrl: logs[0]?.scannedUrl || null,
      matchedValue: link.url,
      field: "social" as const,
      confidence: 0.8,
    })),
  ];

  return {
    emails,
    urls: uniqueStrings([...contactFormUrls, ...socialLinks.map((link) => link.url)]),
    socialLinks,
    officialWebsiteUrls: uniqueStrings(logs.map((log) => log.scannedUrl)),
    contactFormUrls,
    evidence,
  };
}

function buildBasicChannel(base: BaseYoutubeChannel, params: SearchFormInput, sourceQueries: string[]): BasicYoutubeChannel {
  const combinedText = `${base.title} ${base.description}`;
  const relevanceScore = calcRelevanceScore({
    query: params.keyword,
    sourceQueries,
    title: base.title,
    description: base.description,
    latestVideoTitles: [],
    matchedQueryCount: sourceQueries.length,
  });
  const freshnessScore = calcFreshnessScore(base.publishedAt || null);
  const contactabilityScore = 0;
  const outreachScore = calculateOutreachScore({
    subscriberCount: base.subscriberCount,
    videoCount: base.videoCount,
    relevanceScore,
    contactabilityScore,
    freshnessScore,
  });

  return {
    ...base,
    sourceQuery: params.keyword,
    sourceQueries,
    matchedQueryCount: sourceQueries.length,
    regionGuess: guessRegion(combinedText),
    categoryGuess: guessCategory(combinedText),
    relevanceScore,
    contactabilityScore,
    freshnessScore,
    outreachScore,
    ...buildStageFields(),
  };
}

function finalizeChannel(
  base: BaseYoutubeChannel,
  params: {
    sourceQuery: string;
    sourceQueries: string[];
    videos: LatestVideoContact[];
    externalScanLogs: ExternalScanLogEntry[];
    lightEnrichmentStatus?: EnrichmentStatusValue;
    lightEnrichmentUpdatedAt?: string | null;
    deepEnrichmentStatus?: EnrichmentStatusValue;
    deepEnrichmentUpdatedAt?: string | null;
    basicFetchedAt?: string | null;
  },
) {
  const channelSignals = extractContactSignalsFromText({
    text: base.description,
    sourceType: "channel_description",
    sourceUrl: base.channelUrl,
  });
  const videoSignals = params.videos.map((video) => ({
    emails: video.extractedEmails,
    urls: video.extractedUrls,
    socialLinks: video.socialLinks,
    officialWebsiteUrls: video.officialWebsiteUrls,
    contactFormUrls: video.contactEvidence
      .filter((evidence) => evidence.field === "form")
      .map((item) => item.matchedValue),
    evidence: video.contactEvidence,
  }));
  const externalSignals = buildExternalSignals(params.externalScanLogs);
  const merged = mergeContactSignals([channelSignals, ...videoSignals, externalSignals]);
  const combinedText = `${base.title} ${base.description} ${params.videos
    .map((video) => `${video.title} ${video.description}`)
    .join(" ")}`;
  const lastVideoPublishedAt =
    params.videos
      .map((video) => video.publishedAt)
      .filter((value): value is string => Boolean(value))
      .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] || null;
  const relevanceScore = calcRelevanceScore({
    query: params.sourceQuery,
    sourceQueries: params.sourceQueries,
    title: base.title,
    description: base.description,
    latestVideoTitles: params.videos.map((video) => video.title),
    matchedQueryCount: params.sourceQueries.length,
  });
  const contactabilityScore = calcContactabilityScore({
    emails: merged.emails,
    contactFormUrls: merged.contactFormUrls,
    officialWebsiteUrls: merged.officialWebsiteUrls,
    socialLinks: merged.socialLinks,
    descriptionLength: base.description.length,
    externalEvidenceCount: externalSignals.evidence.length,
  });
  const freshnessScore = calcFreshnessScore(lastVideoPublishedAt || base.publishedAt);
  const lightCompletedAt = params.lightEnrichmentUpdatedAt ?? new Date().toISOString();
  const analysis = buildRivalAnalysis({
    title: base.title,
    categoryGuess: guessCategory(combinedText),
    subscriberCount: base.subscriberCount,
    lastVideoPublishedAt,
    videos: params.videos,
  });

  return {
    ...base,
    sourceQuery: params.sourceQuery,
    sourceQueries: params.sourceQueries,
    matchedQueryCount: params.sourceQueries.length,
    contactEmail: merged.emails[0],
    contactEmails: merged.emails,
    contactFormUrls: merged.contactFormUrls,
    socialLinks: merged.socialLinks,
    officialWebsiteUrls: merged.officialWebsiteUrls,
    externalLinks: uniqueStrings([
      ...merged.urls,
      ...merged.contactFormUrls,
      ...merged.officialWebsiteUrls,
      ...merged.socialLinks.map((link) => link.url),
    ]),
    bestContactMethod: merged.bestContactMethod,
    bestContactValue: merged.bestContactValue,
    contactType: merged.contactType,
    contactEvidence: merged.evidence,
    regionGuess: guessRegion(combinedText),
    categoryGuess: guessCategory(combinedText),
    basicFetchedAt: params.basicFetchedAt ?? new Date().toISOString(),
    lightEnrichmentStatus: params.lightEnrichmentStatus ?? "COMPLETED",
    lightEnrichmentUpdatedAt: lightCompletedAt,
    deepEnrichmentStatus:
      params.deepEnrichmentStatus ?? (params.externalScanLogs.length > 0 ? "COMPLETED" : "IDLE"),
    deepEnrichmentUpdatedAt:
      params.deepEnrichmentUpdatedAt ??
      (params.externalScanLogs.length > 0 ? new Date().toISOString() : null),
    relevanceScore,
    contactabilityScore,
    freshnessScore,
    outreachScore: calculateOutreachScore({
      subscriberCount: base.subscriberCount,
      videoCount: base.videoCount,
      relevanceScore,
      contactabilityScore,
      freshnessScore,
    }),
    latestVideoScanCount: params.videos.length,
    videoDescriptionContactCount: params.videos.reduce((sum, video) => sum + video.contactEvidence.length, 0),
    externalSiteContactCount: externalSignals.evidence.length,
    externalScanStatus:
      params.externalScanLogs.length > 0
        ? params.externalScanLogs.every((log) => log.status === "success")
          ? "success"
          : "partial"
        : null,
    externalScanError: params.externalScanLogs.find((log) => log.errorMessage)?.errorMessage || null,
    externalScanUpdatedAt: params.externalScanLogs.length > 0 ? new Date().toISOString() : null,
    lastVideoPublishedAt,
    monthlyViewsEstimate: analysis.monthlyViewsEstimate,
    estimatedMonthlyIncomeLow: analysis.estimatedMonthlyIncomeLow,
    estimatedMonthlyIncomeBase: analysis.estimatedMonthlyIncomeBase,
    estimatedMonthlyIncomeHigh: analysis.estimatedMonthlyIncomeHigh,
    avgViewsLast10: analysis.avgViewsLast10,
    medianViewsLast10: analysis.medianViewsLast10,
    postsLast30: analysis.postsLast30,
    postsLast90: analysis.postsLast90,
    shortsRatio: analysis.shortsRatio,
    audienceHealthScore: analysis.audienceHealthScore,
    consistencyScore: analysis.consistencyScore,
    hitDependencyScore: analysis.hitDependencyScore,
    competitionScore: analysis.competitionScore,
    growthScore: analysis.growthScore,
    opportunityScore: analysis.opportunityScore,
    analysisSummary: analysis.analysisSummary,
    analysisModeUpdatedAt: new Date().toISOString(),
    videos: params.videos,
    externalScanLogs: params.externalScanLogs,
  } satisfies NormalizedYoutubeChannel;
}

function passesBasicFilters(channel: BasicYoutubeChannel, params: SearchFormInput) {
  return channel.subscriberCount >= params.minSubscribers && channel.videoCount >= params.minVideos;
}

function sortBasicChannels(items: BasicYoutubeChannel[], params: SearchFormInput) {
  return [...items].sort((left, right) => {
    if (params.preferJapanese && left.country !== right.country) {
      if (left.country === "JP") return -1;
      if (right.country === "JP") return 1;
    }

    if (params.order === "date") {
      return new Date(right.publishedAt || 0).getTime() - new Date(left.publishedAt || 0).getTime();
    }

    if (right.relevanceScore !== left.relevanceScore) {
      return right.relevanceScore - left.relevanceScore;
    }

    if (right.subscriberCount !== left.subscriberCount) {
      return right.subscriberCount - left.subscriberCount;
    }

    return right.outreachScore - left.outreachScore;
  });
}

async function fetchLatestVideosForChannel(channel: BaseYoutubeChannel, settings: SearchSettings) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey || !channel.uploadsPlaylistId) {
    const mockSeed = MOCK_CHANNEL_SEEDS.find((seed) => seed.channelId === channel.channelId);
    return mockSeed
      ? mockSeed.latestVideos.slice(0, settings.videosPerChannelForContactScan).map(normalizeMockVideo)
      : [];
  }

  const playlistParams = new URLSearchParams({
    part: "snippet,contentDetails",
    playlistId: channel.uploadsPlaylistId,
    maxResults: String(Math.min(settings.videosPerChannelForContactScan, 10)),
    key: apiKey,
  });
  const playlistData = await fetchYoutubeJson<PlaylistItemsResponse>(
    `https://www.googleapis.com/youtube/v3/playlistItems?${playlistParams.toString()}`,
  );
  const videoIds = uniqueStrings(
    (playlistData.items || [])
      .map((item) => item.contentDetails?.videoId || item.snippet?.resourceId?.videoId)
      .filter(Boolean),
  );

  if (videoIds.length === 0) {
    return [];
  }

  const videosParams = new URLSearchParams({
    part: "snippet,statistics,contentDetails",
    id: videoIds.join(","),
    key: apiKey,
  });
  const videosData = await fetchYoutubeJson<VideosListResponse>(
    `https://www.googleapis.com/youtube/v3/videos?${videosParams.toString()}`,
  );

  return (videosData.items || []).map((video) => {
    const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;
    const signals = extractContactSignalsFromText({
      text: video.snippet?.description || "",
      sourceType: "video_description",
      sourceUrl: videoUrl,
    });
    const durationSec = parseDurationSeconds(video.contentDetails?.duration || "");
    const title = video.snippet?.title || "最新動画";
    const description = video.snippet?.description || "";
    const isShorts = durationSec > 0 ? durationSec <= 70 : /#shorts/i.test(`${title} ${description}`);

    return {
      videoId: video.id,
      title,
      description,
      publishedAt: video.snippet?.publishedAt || null,
      videoUrl,
      viewCount: Number(video.statistics?.viewCount ?? 0),
      likeCount: video.statistics?.likeCount ? Number(video.statistics.likeCount) : null,
      commentCount: video.statistics?.commentCount ? Number(video.statistics.commentCount) : null,
      durationSec: durationSec || null,
      isShorts,
      thumbnailUrl:
        video.snippet?.thumbnails?.high?.url ||
        video.snippet?.thumbnails?.medium?.url ||
        video.snippet?.thumbnails?.default?.url ||
        null,
      extractedEmails: signals.emails,
      extractedUrls: signals.urls,
      socialLinks: signals.socialLinks,
      officialWebsiteUrls: signals.officialWebsiteUrls,
      contactEvidence: signals.evidence,
    } satisfies LatestVideoContact;
  });
}

function pickExternalSiteCandidates(channel: BaseYoutubeChannel, videos: LatestVideoContact[], limit: number) {
  const channelSignals = extractContactSignalsFromText({
    text: channel.description,
    sourceType: "channel_description",
    sourceUrl: channel.channelUrl,
  });
  const videoUrls = videos.flatMap((video) => video.officialWebsiteUrls);

  return uniqueStrings([...channelSignals.officialWebsiteUrls, ...videoUrls])
    .map((value) => {
      try {
        return normalizeUrl(new URL(value).origin);
      } catch {
        return normalizeUrl(value);
      }
    })
    .slice(0, limit);
}

async function fetchExternalLogsForChannel(
  channel: BaseYoutubeChannel,
  videos: LatestVideoContact[],
  settings: SearchSettings,
  cache?: Map<string, Awaited<ReturnType<typeof scanExternalSite>>>,
) {
  if (!settings.externalSiteScanEnabled) {
    return { logs: [] as ExternalScanLogEntry[], scannedCount: 0 };
  }

  if (!process.env.YOUTUBE_API_KEY) {
    const mockSeed = MOCK_CHANNEL_SEEDS.find((seed) => seed.channelId === channel.channelId);
    const logs = mockSeed ? buildMockExternalLog(mockSeed) : [];
    return { logs, scannedCount: logs.length > 0 ? 1 : 0 };
  }

  const candidates = pickExternalSiteCandidates(channel, videos, settings.externalSiteMaxUrlsPerChannel);
  const logs: ExternalScanLogEntry[] = [];
  let scannedCount = 0;
  const localCache = cache ?? new Map<string, Awaited<ReturnType<typeof scanExternalSite>>>();

  for (const candidate of candidates) {
    let result = localCache.get(candidate);
    if (!result) {
      result = await scanExternalSite(candidate, {
        maxPages: 4,
        rateLimitMs: settings.externalSiteRateLimitMs,
        timeoutMs: settings.externalSiteTimeoutMs,
      });
      localCache.set(candidate, result);
      scannedCount += 1;
    }

    logs.push(...result.logs);
  }

  return { logs, scannedCount };
}

export async function getChannelsByIds(ids: string[]) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey || ids.length === 0) {
    return [];
  }

  const results: BaseYoutubeChannel[] = [];

  for (let index = 0; index < ids.length; index += 50) {
    const chunk = ids.slice(index, index + 50);
    const params = new URLSearchParams({
      part: "snippet,statistics,contentDetails",
      id: chunk.join(","),
      key: apiKey,
    });

    const data = await fetchYoutubeJson<ChannelListResponse>(
      `https://www.googleapis.com/youtube/v3/channels?${params.toString()}`,
    );

    for (const item of data.items || []) {
      results.push({
        channelId: item.id,
        title: item.snippet?.title || "チャンネル名未取得",
        description: item.snippet?.description || "",
        customUrl: item.snippet?.customUrl,
        publishedAt: item.snippet?.publishedAt || null,
        country: item.snippet?.country,
        subscriberCount: Number(item.statistics?.subscriberCount ?? 0),
        videoCount: Number(item.statistics?.videoCount ?? 0),
        viewCount: Number(item.statistics?.viewCount ?? 0),
        thumbnailUrl:
          item.snippet?.thumbnails?.high?.url ||
          item.snippet?.thumbnails?.medium?.url ||
          item.snippet?.thumbnails?.default?.url,
        channelUrl: `https://www.youtube.com/channel/${item.id}`,
        uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads,
      });
    }
  }

  return results;
}

async function searchMockChannels(params: SearchFormInput): Promise<SearchChannelsResult> {
  const keywordOnly = [params.keyword];
  const items = MOCK_CHANNEL_SEEDS.flatMap((seed) => {
    if (!matchMockSeed(seed, params.keyword)) {
      return [] as BasicYoutubeChannel[];
    }

    const basic = buildBasicChannel(buildBaseFromMockSeed(seed), params, keywordOnly);
    return passesBasicFilters(basic, params) ? [basic] : [];
  });

  return {
    items: sortBasicChannels(items, params).slice(0, params.maxResults),
    source: "mock",
    errors: [],
    expandedQueries: keywordOnly,
    expandedQueryCount: keywordOnly.length,
    pagesFetched: 0,
    quotaUsed: 0,
  };
}

export async function searchChannels(
  params: SearchFormInput,
  settings?: Partial<SearchSettings>,
): Promise<SearchChannelsResult> {
  const searchSettings = withSearchSettings(settings);
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return searchMockChannels(params);
  }

  const keywordOnly = [params.keyword];
  const errors: string[] = [];
  const channelIds = new Set<string>();
  let nextPageToken: string | undefined;
  let pagesFetched = 0;
  let quotaUsed = 0;

  while (
    pagesFetched < searchSettings.searchMaxPages &&
    quotaUsed + 100 <= searchSettings.searchQuotaBudgetPerRun &&
    channelIds.size < params.maxResults
  ) {
    try {
      const query = new URLSearchParams({
        part: "snippet",
        type: "channel",
        q: params.keyword,
        maxResults: "50",
        order: params.order,
        key: apiKey,
      });

      if (params.preferJapanese) {
        query.set("regionCode", "JP");
        query.set("relevanceLanguage", "ja");
      }

      if (nextPageToken) {
        query.set("pageToken", nextPageToken);
      }

      const response = await fetchYoutubeJson<SearchListResponse>(
        `https://www.googleapis.com/youtube/v3/search?${query.toString()}`,
      );

      pagesFetched += 1;
      quotaUsed += 100;

      for (const item of response.items || []) {
        const channelId = item.id?.channelId;
        if (channelId) {
          channelIds.add(channelId);
        }
      }

      nextPageToken = response.nextPageToken;
      if (!nextPageToken) {
        break;
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "YouTube検索でエラーが発生しました。");
      break;
    }
  }

  if (channelIds.size === 0) {
    return {
      items: [],
      source: "youtube-api",
      errors,
      expandedQueries: keywordOnly,
      expandedQueryCount: keywordOnly.length,
      pagesFetched,
      quotaUsed,
    };
  }

  const detailedChannels = await getChannelsByIds([...channelIds]);
  quotaUsed += Math.ceil(channelIds.size / 50);

  const items: BasicYoutubeChannel[] = [];
  for (const channel of detailedChannels) {
    const basic = buildBasicChannel(channel, params, keywordOnly);
    if (passesBasicFilters(basic, params)) {
      items.push(basic);
    }
  }

  return {
    items: sortBasicChannels(items, params).slice(0, params.maxResults),
    source: "youtube-api",
    errors,
    expandedQueries: keywordOnly,
    expandedQueryCount: keywordOnly.length,
    pagesFetched,
    quotaUsed,
  };
}

export async function scanChannelVideos(channel: BaseYoutubeChannel, settings?: Partial<SearchSettings>) {
  return fetchLatestVideosForChannel(channel, withSearchSettings(settings));
}

export async function enrichChannelLight(params: {
  base: BaseYoutubeChannel;
  sourceQuery: string;
  sourceQueries: string[];
  deepEnrichmentStatus?: EnrichmentStatusValue;
  deepEnrichmentUpdatedAt?: string | null;
  basicFetchedAt?: string | null;
  settings?: Partial<SearchSettings>;
}) {
  const videos = await fetchLatestVideosForChannel(params.base, withSearchSettings(params.settings));

  return finalizeChannel(params.base, {
    sourceQuery: params.sourceQuery,
    sourceQueries: params.sourceQueries,
    videos,
    externalScanLogs: [],
    basicFetchedAt: params.basicFetchedAt ?? new Date().toISOString(),
    lightEnrichmentStatus: "COMPLETED",
    lightEnrichmentUpdatedAt: new Date().toISOString(),
    deepEnrichmentStatus: params.deepEnrichmentStatus ?? "IDLE",
    deepEnrichmentUpdatedAt: params.deepEnrichmentUpdatedAt ?? null,
  });
}

export async function scanChannelExternalSites(
  channel: BaseYoutubeChannel,
  videos: LatestVideoContact[],
  settings?: Partial<SearchSettings>,
) {
  const siteScanCache = new Map<string, Awaited<ReturnType<typeof scanExternalSite>>>();
  return fetchExternalLogsForChannel(channel, videos, withSearchSettings(settings), siteScanCache);
}

export { extractEmailFromText, extractUrlsFromText };

export function rebuildNormalizedChannel(params: {
  base: BaseYoutubeChannel;
  sourceQuery: string;
  sourceQueries: string[];
  videos: LatestVideoContact[];
  externalScanLogs: ExternalScanLogEntry[];
  basicFetchedAt?: string | null;
  lightEnrichmentStatus?: EnrichmentStatusValue;
  lightEnrichmentUpdatedAt?: string | null;
  deepEnrichmentStatus?: EnrichmentStatusValue;
  deepEnrichmentUpdatedAt?: string | null;
}) {
  return finalizeChannel(params.base, {
    sourceQuery: params.sourceQuery,
    sourceQueries: params.sourceQueries,
    videos: params.videos,
    externalScanLogs: params.externalScanLogs,
    basicFetchedAt: params.basicFetchedAt,
    lightEnrichmentStatus: params.lightEnrichmentStatus,
    lightEnrichmentUpdatedAt: params.lightEnrichmentUpdatedAt,
    deepEnrichmentStatus: params.deepEnrichmentStatus,
    deepEnrichmentUpdatedAt: params.deepEnrichmentUpdatedAt,
  });
}

export function normalizeMockSeed(
  seed: MockChannelSeed,
  sourceQuery: string,
  matchedQueries = seed.seedQueries,
  videosToScan = DEFAULT_SEARCH_SETTINGS.videosPerChannelForContactScan,
) {
  const base = buildBaseFromMockSeed(seed);
  const videos = seed.latestVideos.slice(0, videosToScan).map(normalizeMockVideo);
  const externalScanLogs = buildMockExternalLog(seed);

  return finalizeChannel(base, {
    sourceQuery,
    sourceQueries: matchedQueries,
    videos,
    externalScanLogs,
    basicFetchedAt: new Date().toISOString(),
    lightEnrichmentStatus: "COMPLETED",
    lightEnrichmentUpdatedAt: new Date().toISOString(),
    deepEnrichmentStatus: externalScanLogs.length > 0 ? "COMPLETED" : "IDLE",
    deepEnrichmentUpdatedAt: externalScanLogs.length > 0 ? new Date().toISOString() : null,
  });
}

export function buildEmptyAnalysis(base: BaseYoutubeChannel, sourceQuery: string, sourceQueries: string[]) {
  return {
    ...base,
    sourceQuery,
    sourceQueries,
    matchedQueryCount: sourceQueries.length,
    contactEmail: undefined,
    contactEmails: [],
    contactFormUrls: [],
    socialLinks: [],
    officialWebsiteUrls: [],
    externalLinks: [],
    bestContactMethod: "none" as BestContactMethodValue,
    bestContactValue: null,
    contactType: "none" as ContactTypeValue,
    contactEvidence: [],
    regionGuess: guessRegion(`${base.title} ${base.description}`),
    categoryGuess: guessCategory(`${base.title} ${base.description}`),
    relevanceScore: 0,
    contactabilityScore: 0,
    freshnessScore: calcFreshnessScore(base.publishedAt),
    outreachScore: 0,
    latestVideoScanCount: 0,
    videoDescriptionContactCount: 0,
    externalSiteContactCount: 0,
    externalScanStatus: null,
    externalScanError: null,
    externalScanUpdatedAt: null,
    lastVideoPublishedAt: null,
    videos: [],
    externalScanLogs: [],
    ...buildStageFields(),
    ...emptyAnalysisFields(),
  } satisfies NormalizedYoutubeChannel;
}
