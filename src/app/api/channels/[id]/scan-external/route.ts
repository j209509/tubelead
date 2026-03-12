import { NextResponse } from "next/server";

import { ENRICHMENT_STATUS_VALUES, type EnrichmentStatusValue } from "@/lib/constants";
import {
  getChannelById,
  markDeepEnrichmentStatus,
  upsertNormalizedChannel,
} from "@/lib/channels";
import type { SerializedChannel } from "@/lib/channel-types";
import { getAppSettings } from "@/lib/settings";
import { getChannelsByIds, rebuildNormalizedChannel, scanChannelExternalSites, type BaseYoutubeChannel } from "@/lib/youtube";

export const dynamic = "force-dynamic";

function toStatus(value: string | null | undefined, fallback: EnrichmentStatusValue): EnrichmentStatusValue {
  return ENRICHMENT_STATUS_VALUES.includes(value as EnrichmentStatusValue)
    ? (value as EnrichmentStatusValue)
    : fallback;
}

function buildFallbackBase(channel: SerializedChannel): BaseYoutubeChannel {
  return {
    channelId: channel.channelId,
    title: channel.title,
    description: channel.description,
    customUrl: channel.customUrl || undefined,
    publishedAt: channel.publishedAt || undefined,
    country: channel.country || undefined,
    subscriberCount: channel.subscriberCount,
    videoCount: channel.videoCount,
    viewCount: channel.viewCount,
    uploadsPlaylistId: channel.uploadsPlaylistId || undefined,
    thumbnailUrl: channel.thumbnailUrl || undefined,
    channelUrl: channel.channelUrl,
  };
}

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [detail, settings] = await Promise.all([getChannelById(id), getAppSettings()]);

  if (!detail) {
    return NextResponse.json({ error: "チャンネルが見つかりません。" }, { status: 404 });
  }

  await markDeepEnrichmentStatus(id, "PROCESSING", null);

  try {
    const needsRefreshBase = !detail.channel.uploadsPlaylistId && Boolean(process.env.YOUTUBE_API_KEY);
    const [freshBase] = needsRefreshBase ? await getChannelsByIds([detail.channel.channelId]) : [];
    const base = freshBase || buildFallbackBase(detail.channel);
    const { logs, scannedCount } = await scanChannelExternalSites(base, detail.videos, settings);
    const rebuilt = rebuildNormalizedChannel({
      base,
      sourceQuery: detail.channel.sourceQuery,
      sourceQueries: detail.channel.sourceQueries,
      videos: detail.videos,
      externalScanLogs: logs,
      basicFetchedAt: detail.channel.basicFetchedAt,
      lightEnrichmentStatus: toStatus(detail.channel.lightEnrichmentStatus, "COMPLETED"),
      lightEnrichmentUpdatedAt: detail.channel.lightEnrichmentUpdatedAt,
      deepEnrichmentStatus: "COMPLETED",
      deepEnrichmentUpdatedAt: new Date().toISOString(),
    });

    await upsertNormalizedChannel(rebuilt);
    const refreshed = await getChannelById(id);

    return NextResponse.json({
      ok: true,
      externalScans: scannedCount,
      channel: refreshed?.channel || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "外部サイトの走査に失敗しました。";
    await markDeepEnrichmentStatus(id, "FAILED", message);

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 },
    );
  }
}
