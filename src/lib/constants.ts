export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "TubeLead";

export const PLAN_VALUES = ["FREE", "PRO"] as const;
export const MODE_VALUES = ["sales", "rival"] as const;
export const CHANNEL_STATUS_VALUES = [
  "UNREVIEWED",
  "REVIEWED",
  "CONTACT_CANDIDATE",
  "HOLD",
  "EXCLUDED",
] as const;
export const DRAFT_TONE_VALUES = ["POLITE", "FRIENDLY", "CONCISE"] as const;
export const DRAFT_LENGTH_VALUES = ["SHORT", "NORMAL", "LONG"] as const;
export const CONTACT_TYPE_VALUES = ["email", "form", "social", "link_only", "none"] as const;
export const SEARCH_ORDER_VALUES = ["relevance", "date"] as const;
export const CHANNEL_SORT_VALUES = [
  "updated",
  "subscribers",
  "views",
  "videos",
  "score",
  "contactability",
  "freshness",
  "incomeHigh",
  "incomeBase",
  "monthlyViews",
  "avgViews",
  "posts30",
  "latestVideo",
  "competition",
  "growth",
  "opportunity",
] as const;
export const BEST_CONTACT_METHOD_VALUES = [
  "email",
  "form",
  "official_site",
  "instagram",
  "x",
  "tiktok",
  "linktree",
  "none",
] as const;
export const ENRICHMENT_STATUS_VALUES = ["IDLE", "PENDING", "PROCESSING", "COMPLETED", "FAILED"] as const;

export type AppPlanValue = (typeof PLAN_VALUES)[number];
export type AppModeValue = (typeof MODE_VALUES)[number];
export type ChannelStatusValue = (typeof CHANNEL_STATUS_VALUES)[number];
export type DraftToneValue = (typeof DRAFT_TONE_VALUES)[number];
export type DraftLengthValue = (typeof DRAFT_LENGTH_VALUES)[number];
export type ContactTypeValue = (typeof CONTACT_TYPE_VALUES)[number];
export type SearchOrderValue = (typeof SEARCH_ORDER_VALUES)[number];
export type ChannelSortValue = (typeof CHANNEL_SORT_VALUES)[number];
export type BestContactMethodValue = (typeof BEST_CONTACT_METHOD_VALUES)[number];
export type EnrichmentStatusValue = (typeof ENRICHMENT_STATUS_VALUES)[number];

export const MODE_LABELS: Record<AppModeValue, string> = {
  sales: "営業モード",
  rival: "ライバル調査モード",
};

export const CHANNEL_STATUS_LABELS: Record<ChannelStatusValue, string> = {
  UNREVIEWED: "未確認",
  REVIEWED: "確認済み",
  CONTACT_CANDIDATE: "連絡候補",
  HOLD: "保留",
  EXCLUDED: "除外",
};

export const CONTACT_TYPE_LABELS: Record<ContactTypeValue, string> = {
  email: "メール",
  form: "フォーム",
  social: "SNS",
  link_only: "リンクのみ",
  none: "なし",
};

export const BEST_CONTACT_METHOD_LABELS: Record<BestContactMethodValue, string> = {
  email: "メール",
  form: "問い合わせフォーム",
  official_site: "公式サイト",
  instagram: "Instagram",
  x: "X",
  tiktok: "TikTok",
  linktree: "Linktree",
  none: "なし",
};

export const ENRICHMENT_STATUS_LABELS: Record<EnrichmentStatusValue, string> = {
  IDLE: "未開始",
  PENDING: "待機中",
  PROCESSING: "処理中",
  COMPLETED: "完了",
  FAILED: "失敗",
};

export const PLAN_LABELS: Record<AppPlanValue, string> = {
  FREE: "無料版",
  PRO: "Pro",
};

export const TONE_LABELS: Record<DraftToneValue, string> = {
  POLITE: "丁寧",
  FRIENDLY: "親しみ",
  CONCISE: "かなり簡潔",
};

export const LENGTH_LABELS: Record<DraftLengthValue, string> = {
  SHORT: "短め",
  NORMAL: "普通",
  LONG: "長め",
};

export const CHANNEL_SORT_LABELS: Record<ChannelSortValue, string> = {
  updated: "更新順",
  subscribers: "登録者数順",
  views: "総再生数順",
  videos: "総動画数順",
  score: "営業スコア順",
  contactability: "連絡可能性順",
  freshness: "鮮度順",
  incomeHigh: "想定月収 high 順",
  incomeBase: "想定月収 base 順",
  monthlyViews: "推定月間再生数順",
  avgViews: "直近平均再生順",
  posts30: "直近30日投稿順",
  latestVideo: "最新投稿日順",
  competition: "競合度順",
  growth: "成長性順",
  opportunity: "参入魅力度順",
};

export const FREE_PLAN_LIMITS = {
  visibleChannels: 10,
  csvExportRows: 10,
  aiDrafts: 3,
} as const;

export const DEFAULT_APP_SETTINGS = {
  serviceName: "TubeLead",
  serviceDescription:
    "YouTubeチャンネル向けの営業候補を整理し、提案文の下書きまで管理できるローカルSaaSです。",
  defaultPitch:
    "スポンサー提案やコラボ提案などの営業文面を、チャンネル情報に合わせて整えるためのテンプレートです。",
  tone: "POLITE" as const,
  lengthPreference: "NORMAL" as const,
  queryExpansionEnabled: false,
  searchMaxPages: 6,
  searchQuotaBudgetPerRun: 600,
  videosPerChannelForContactScan: 3,
  externalSiteScanEnabled: true,
  externalSiteMaxUrlsPerChannel: 2,
  externalSiteRateLimitMs: 1200,
  externalSiteTimeoutMs: 8000,
};

export const DEFAULT_SEARCH_HISTORY = [
  {
    keyword: "コーギー",
    resultCount: 16,
    savedCount: 16,
    pagesFetched: 2,
    quotaUsed: 200,
    expandedQueries: ["コーギー"],
    conditions: {
      keyword: "コーギー",
      mode: "sales" as const,
      minSubscribers: 1000,
      minVideos: 10,
      maxResults: 120,
      order: "relevance" as const,
      hasContactOnly: false,
      preferJapanese: true,
    },
  },
  {
    keyword: "FX EA 作り方",
    resultCount: 12,
    savedCount: 12,
    pagesFetched: 2,
    quotaUsed: 200,
    expandedQueries: ["FX EA 作り方"],
    conditions: {
      keyword: "FX EA 作り方",
      mode: "sales" as const,
      minSubscribers: 3000,
      minVideos: 20,
      maxResults: 150,
      order: "relevance" as const,
      hasContactOnly: true,
      preferJapanese: true,
    },
  },
  {
    keyword: "美容室",
    resultCount: 11,
    savedCount: 11,
    pagesFetched: 1,
    quotaUsed: 100,
    expandedQueries: ["美容室"],
    conditions: {
      keyword: "美容室",
      mode: "rival" as const,
      minSubscribers: 500,
      minVideos: 10,
      maxResults: 120,
      order: "date" as const,
      hasContactOnly: false,
      preferJapanese: true,
    },
  },
] as const;

export const HOME_METRICS = [
  {
    key: "totalChannels",
    label: "総件数",
    description: "保存済みの YouTube チャンネル数",
  },
  {
    key: "emailCount",
    label: "メールあり件数",
    description: "説明欄からメールアドレスを抽出できた件数",
  },
  {
    key: "officialSiteCount",
    label: "外部リンクあり件数",
    description: "公式サイトや外部リンクを確認できた件数",
  },
  {
    key: "candidateCount",
    label: "連絡候補件数",
    description: "ステータスが連絡候補の件数",
  },
] as const;
