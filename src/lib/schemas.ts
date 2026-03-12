import { z } from "zod";

import {
  CHANNEL_SORT_VALUES,
  CHANNEL_STATUS_VALUES,
  DRAFT_LENGTH_VALUES,
  DRAFT_TONE_VALUES,
  MODE_VALUES,
  SEARCH_ORDER_VALUES,
} from "@/lib/constants";

const booleanish = z.preprocess((value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return ["true", "1", "on", "yes"].includes(value.toLowerCase());
  }

  return false;
}, z.boolean());

const optionalNumber = (max: number) =>
  z.preprocess((value) => {
    if (value === "" || value === undefined || value === null) {
      return undefined;
    }

    const numeric = Number(value);
    return Number.isNaN(numeric) ? undefined : numeric;
  }, z.number().int().min(0).max(max).optional());

export const searchFormSchema = z.object({
  keyword: z.string().trim().min(1, "キーワードを入力してください。"),
  mode: z.enum(MODE_VALUES).default("sales"),
  minSubscribers: optionalNumber(50_000_000).default(0),
  minVideos: optionalNumber(10_000_000).default(0),
  maxResults: z.coerce.number().int().min(1).max(5000).default(300),
  order: z.enum(SEARCH_ORDER_VALUES).default("relevance"),
  hasContactOnly: booleanish.default(false),
  preferJapanese: booleanish.default(true),
});

export const channelFiltersSchema = z.object({
  mode: z.enum(MODE_VALUES).default("sales"),
  q: z.string().optional().default(""),
  minSubscribers: optionalNumber(50_000_000).default(0),
  minVideos: optionalNumber(10_000_000).default(0),
  minContactabilityScore: optionalNumber(100).default(0),
  minAvgViewsLast10: optionalNumber(2_000_000_000).default(0),
  minPostsLast30: optionalNumber(1000).default(0),
  minOpportunityScore: optionalNumber(100).default(0),
  minEstimatedMonthlyIncomeBase: optionalNumber(2_000_000_000).default(0),
  maxShortsRatio: optionalNumber(100).default(100),
  publishedWithinDays: optionalNumber(3650).default(0),
  hasEmail: booleanish.default(false),
  hasForm: booleanish.default(false),
  hasSocial: booleanish.default(false),
  hasOfficialSite: booleanish.default(false),
  onlyUnreviewed: booleanish.default(false),
  hasVideoContact: booleanish.default(false),
  hasExternalContact: booleanish.default(false),
  sourceQuery: z.string().optional().default(""),
  sort: z.enum(CHANNEL_SORT_VALUES).default("updated"),
  page: z.coerce.number().int().min(1).default(1),
});

export const channelUpdateSchema = z.object({
  status: z.enum(CHANNEL_STATUS_VALUES),
  note: z.string().max(5000).default(""),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
});

export const draftGenerateSchema = z.object({
  channelId: z.string().min(1),
  serviceName: z.string().trim().min(1).max(80),
  serviceDescription: z.string().trim().min(1).max(1200),
  defaultPitch: z.string().trim().min(1).max(1500),
  tone: z.enum(DRAFT_TONE_VALUES),
  lengthPreference: z.enum(DRAFT_LENGTH_VALUES),
});

export const draftCreateSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(5000),
  customPoint: z.string().trim().max(500).optional().or(z.literal("")),
  rationale: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const settingsSchema = z.object({
  serviceName: z.string().trim().min(1).max(80),
  serviceDescription: z.string().trim().min(1).max(1200),
  defaultPitch: z.string().trim().min(1).max(1500),
  tone: z.enum(DRAFT_TONE_VALUES),
  lengthPreference: z.enum(DRAFT_LENGTH_VALUES),
  queryExpansionEnabled: booleanish.default(false),
  searchMaxPages: z.coerce.number().int().min(1).max(50),
  searchQuotaBudgetPerRun: z.coerce.number().int().min(100).max(10_000),
  videosPerChannelForContactScan: z.coerce.number().int().min(1).max(10),
  externalSiteScanEnabled: booleanish.default(true),
  externalSiteMaxUrlsPerChannel: z.coerce.number().int().min(0).max(10),
  externalSiteRateLimitMs: z.coerce.number().int().min(0).max(10_000),
  externalSiteTimeoutMs: z.coerce.number().int().min(1000).max(30_000),
});

export type SearchFormInput = z.infer<typeof searchFormSchema>;
export type ChannelFiltersInput = z.infer<typeof channelFiltersSchema>;
export type ChannelUpdateInput = z.infer<typeof channelUpdateSchema>;
export type DraftGenerateInput = z.infer<typeof draftGenerateSchema>;
export type DraftCreateInput = z.infer<typeof draftCreateSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
