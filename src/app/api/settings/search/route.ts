import { NextResponse } from "next/server";

import { settingsSchema } from "@/lib/schemas";
import { getAppSettings, updateAppSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getAppSettings();
  return NextResponse.json({
    queryExpansionEnabled: settings.queryExpansionEnabled,
    searchMaxPages: settings.searchMaxPages,
    searchQuotaBudgetPerRun: settings.searchQuotaBudgetPerRun,
    videosPerChannelForContactScan: settings.videosPerChannelForContactScan,
    externalSiteScanEnabled: settings.externalSiteScanEnabled,
    externalSiteMaxUrlsPerChannel: settings.externalSiteMaxUrlsPerChannel,
    externalSiteRateLimitMs: settings.externalSiteRateLimitMs,
    externalSiteTimeoutMs: settings.externalSiteTimeoutMs,
  });
}

export async function PATCH(request: Request) {
  const current = await getAppSettings();
  const body = await request.json();
  const parsed = settingsSchema.safeParse({
    ...current,
    ...body,
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message || "検索設定が不正です。",
      },
      { status: 400 },
    );
  }

  const settings = await updateAppSettings(parsed.data);
  return NextResponse.json({
    queryExpansionEnabled: settings.queryExpansionEnabled,
    searchMaxPages: settings.searchMaxPages,
    searchQuotaBudgetPerRun: settings.searchQuotaBudgetPerRun,
    videosPerChannelForContactScan: settings.videosPerChannelForContactScan,
    externalSiteScanEnabled: settings.externalSiteScanEnabled,
    externalSiteMaxUrlsPerChannel: settings.externalSiteMaxUrlsPerChannel,
    externalSiteRateLimitMs: settings.externalSiteRateLimitMs,
    externalSiteTimeoutMs: settings.externalSiteTimeoutMs,
  });
}
