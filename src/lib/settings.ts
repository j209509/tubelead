import {
  DEFAULT_APP_SETTINGS,
  type AppPlanValue,
  type DraftLengthValue,
  type DraftToneValue,
} from "@/lib/constants";
import { getCurrentPlan } from "@/lib/plan";
import { prisma } from "@/lib/prisma";
import type { SettingsInput } from "@/lib/schemas";

export type SerializedSettings = {
  currentPlan: AppPlanValue;
  serviceName: string;
  serviceDescription: string;
  defaultPitch: string;
  tone: DraftToneValue;
  lengthPreference: DraftLengthValue;
  queryExpansionEnabled: boolean;
  searchMaxPages: number;
  searchQuotaBudgetPerRun: number;
  videosPerChannelForContactScan: number;
  externalSiteScanEnabled: boolean;
  externalSiteMaxUrlsPerChannel: number;
  externalSiteRateLimitMs: number;
  externalSiteTimeoutMs: number;
};

function serializeSettings(row: {
  currentPlan: string;
  serviceName: string;
  serviceDescription: string;
  defaultPitch: string;
  tone: string;
  lengthPreference: string;
  queryExpansionEnabled: boolean;
  searchMaxPages: number;
  searchQuotaBudgetPerRun: number;
  videosPerChannelForContactScan: number;
  externalSiteScanEnabled: boolean;
  externalSiteMaxUrlsPerChannel: number;
  externalSiteRateLimitMs: number;
  externalSiteTimeoutMs: number;
}): SerializedSettings {
  return {
    currentPlan: getCurrentPlan(),
    serviceName: row.serviceName,
    serviceDescription: row.serviceDescription,
    defaultPitch: row.defaultPitch,
    tone: row.tone as DraftToneValue,
    lengthPreference: row.lengthPreference as DraftLengthValue,
    queryExpansionEnabled: row.queryExpansionEnabled,
    searchMaxPages: row.searchMaxPages,
    searchQuotaBudgetPerRun: row.searchQuotaBudgetPerRun,
    videosPerChannelForContactScan: row.videosPerChannelForContactScan,
    externalSiteScanEnabled: row.externalSiteScanEnabled,
    externalSiteMaxUrlsPerChannel: row.externalSiteMaxUrlsPerChannel,
    externalSiteRateLimitMs: row.externalSiteRateLimitMs,
    externalSiteTimeoutMs: row.externalSiteTimeoutMs,
  };
}

export async function getAppSettings() {
  const currentPlan = getCurrentPlan();
  const row = await prisma.appSetting.upsert({
    where: { id: "default" },
    update: {
      currentPlan,
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

  return serializeSettings(row);
}

export async function updateAppSettings(input: SettingsInput) {
  const currentPlan = getCurrentPlan();
  const row = await prisma.appSetting.upsert({
    where: { id: "default" },
    update: {
      currentPlan,
      serviceName: input.serviceName,
      serviceDescription: input.serviceDescription,
      defaultPitch: input.defaultPitch,
      tone: input.tone,
      lengthPreference: input.lengthPreference,
      queryExpansionEnabled: input.queryExpansionEnabled,
      searchMaxPages: input.searchMaxPages,
      searchQuotaBudgetPerRun: input.searchQuotaBudgetPerRun,
      videosPerChannelForContactScan: input.videosPerChannelForContactScan,
      externalSiteScanEnabled: input.externalSiteScanEnabled,
      externalSiteMaxUrlsPerChannel: input.externalSiteMaxUrlsPerChannel,
      externalSiteRateLimitMs: input.externalSiteRateLimitMs,
      externalSiteTimeoutMs: input.externalSiteTimeoutMs,
    },
    create: {
      id: "default",
      currentPlan,
      serviceName: input.serviceName,
      serviceDescription: input.serviceDescription,
      defaultPitch: input.defaultPitch,
      tone: input.tone,
      lengthPreference: input.lengthPreference,
      queryExpansionEnabled: input.queryExpansionEnabled,
      searchMaxPages: input.searchMaxPages,
      searchQuotaBudgetPerRun: input.searchQuotaBudgetPerRun,
      videosPerChannelForContactScan: input.videosPerChannelForContactScan,
      externalSiteScanEnabled: input.externalSiteScanEnabled,
      externalSiteMaxUrlsPerChannel: input.externalSiteMaxUrlsPerChannel,
      externalSiteRateLimitMs: input.externalSiteRateLimitMs,
      externalSiteTimeoutMs: input.externalSiteTimeoutMs,
    },
  });

  return serializeSettings(row);
}
