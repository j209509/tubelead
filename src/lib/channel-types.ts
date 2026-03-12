import type {
  AppModeValue,
  BestContactMethodValue,
  ChannelStatusValue,
  ContactTypeValue,
  DraftLengthValue,
  DraftToneValue,
} from "@/lib/constants";

export type ContactSourceType = "channel_description" | "video_description" | "external_site";

export type SocialPlatform =
  | "instagram"
  | "x"
  | "tiktok"
  | "linktree"
  | "facebook"
  | "youtube"
  | "other";

export type SocialLink = {
  platform: SocialPlatform;
  url: string;
  sourceType: ContactSourceType;
  sourceUrl?: string | null;
};

export type ContactEvidence = {
  sourceType: ContactSourceType;
  sourceUrl?: string | null;
  matchedValue: string;
  field: "email" | "form" | "social" | "official_site" | "url" | "phone" | "address";
  confidence: number;
};

export type LatestVideoContact = {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string | null;
  videoUrl: string;
  viewCount: number;
  likeCount: number | null;
  commentCount: number | null;
  durationSec: number | null;
  isShorts: boolean;
  thumbnailUrl: string | null;
  extractedEmails: string[];
  extractedUrls: string[];
  socialLinks: SocialLink[];
  officialWebsiteUrls: string[];
  contactEvidence: ContactEvidence[];
  createdAt?: string;
  updatedAt?: string;
};

export type ExternalScanLogEntry = {
  id?: string;
  scannedUrl: string;
  status: string;
  errorMessage: string | null;
  extractedEmails: string[];
  extractedFormUrls: string[];
  extractedSocialLinks: SocialLink[];
  companyNameGuess: string | null;
  addressGuess: string | null;
  phoneGuess: string | null;
  robotsAllowed: boolean;
  createdAt?: string;
};

export type ChannelDraft = {
  id: string;
  subject: string;
  body: string;
  customPoint: string;
  rationale: string;
  createdAt: string;
  updatedAt: string;
};

export type RivalAnalysisComment = {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  audienceFit: string;
  opportunity: string;
  ideas: string[];
};

export type SerializedChannel = {
  id: string;
  channelId: string;
  title: string;
  description: string;
  customUrl: string | null;
  publishedAt: string | null;
  country: string | null;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  uploadsPlaylistId: string | null;
  thumbnailUrl: string | null;
  channelUrl: string;
  sourceQuery: string;
  sourceQueries: string[];
  matchedQueryCount: number;
  contactEmail: string | null;
  contactEmails: string[];
  contactFormUrls: string[];
  socialLinks: SocialLink[];
  officialWebsiteUrls: string[];
  externalLinks: string[];
  bestContactMethod: BestContactMethodValue;
  bestContactValue: string | null;
  contactType: ContactTypeValue;
  contactEvidence: ContactEvidence[];
  regionGuess: string | null;
  categoryGuess: string | null;
  basicFetchedAt: string | null;
  lightEnrichmentStatus: string | null;
  lightEnrichmentUpdatedAt: string | null;
  deepEnrichmentStatus: string | null;
  deepEnrichmentUpdatedAt: string | null;
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
  note: string;
  tags: string[];
  status: ChannelStatusValue;
  createdAt: string;
  updatedAt: string;
  draftCount?: number;
};

export type ChannelDetail = {
  channel: SerializedChannel;
  drafts: ChannelDraft[];
  videos: LatestVideoContact[];
  externalScanLogs: ExternalScanLogEntry[];
};

export type DraftGenerationSettings = {
  serviceName: string;
  serviceDescription: string;
  defaultPitch: string;
  tone: DraftToneValue;
  lengthPreference: DraftLengthValue;
};

export type RivalModeSummary = {
  totalChannels: number;
  medianMonthlyIncomeBase: number;
  highPostingCount: number;
  shortsHeavyCount: number;
  highOpportunityCount: number;
  topIncomeChannels: Array<{
    id: string;
    title: string;
    estimatedMonthlyIncomeHigh: number;
  }>;
};

export type ModeTab = {
  value: AppModeValue;
  label: string;
  description: string;
};
