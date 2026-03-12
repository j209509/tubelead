import { NextResponse } from "next/server";

import { ENRICHMENT_STATUS_VALUES, type EnrichmentStatusValue } from "@/lib/constants";
import {
  getChannelById,
  markLightEnrichmentStatus,
  upsertNormalizedChannel,
} from "@/lib/channels";
import type { SerializedChannel } from "@/lib/channel-types";
import { getAppSettings } from "@/lib/settings";
import { getChannelsByIds, rebuildNormalizedChannel, scanChannelVideos, type BaseYoutubeChannel } from "@/lib/youtube";

export const dynamic = "force-dynamic";

function toStatus(value: string | null | undefined, fallback: EnrichmentStatusValue): EnrichmentStatusValue {
  return ENRICHMENT_STATUS_VALUES.includes(value as EnrichmentStatusValue)
    ? (value as EnrichmentStatusValue)
    : fallback;
}

function buildFallbackBase(detail: SerializedChannel): BaseYoutubeChannel {
  return {
    channelId: detail.channelId,
    title: detail.title,
    description: detail.description,
    customUrl: detail.customUrl || undefined,
    publishedAt: detail.publishedAt || undefined,
    country: detail.country || undefined,
    subscriberCount: detail.subscriberCount,
    videoCount: detail.videoCount,
    viewCount: detail.viewCount,
    uploadsPlaylistId: detail.uploadsPlaylistId || undefined,
    thumbnailUrl: detail.thumbnailUrl || undefined,
    channelUrl: detail.channelUrl,
  };
}

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [detail, settings] = await Promise.all([getChannelById(id), getAppSettings()]);

  if (!detail) {
    return NextResponse.json({ error: "チャンネルが見つかりません。" }, { status: 404 });
  }

  await markLightEnrichmentStatus(id, "PROCESSING");

  try {
    const needsRefreshBase = !detail.channel.uploadsPlaylistId && Boolean(process.env.YOUTUBE_API_KEY);
    const [freshBase] = needsRefreshBase ? await getChannelsByIds([detail.channel.channelId]) : [];
    const base = freshBase || buildFallbackBase(detail.channel);
    const videos = await scanChannelVideos(base, settings);
    const rebuilt = rebuildNormalizedChannel({
      base,
      sourceQuery: detail.channel.sourceQuery,
      sourceQueries: detail.channel.sourceQueries,
      videos,
      externalScanLogs: detail.externalScanLogs,
      basicFetchedAt: detail.channel.basicFetchedAt,
      lightEnrichmentStatus: "COMPLETED",
      lightEnrichmentUpdatedAt: new Date().toISOString(),
      deepEnrichmentStatus: toStatus(detail.channel.deepEnrichmentStatus, "IDLE"),
      deepEnrichmentUpdatedAt: detail.channel.deepEnrichmentUpdatedAt,
    });

    await upsertNormalizedChannel(rebuilt);
    const refreshed = await getChannelById(id);

    return NextResponse.json({
      ok: true,
      videosScanned: videos.length,
      channel: refreshed?.channel || null,
    });
  } catch (error) {
    await markLightEnrichmentStatus(id, "FAILED");

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "動画概要欄の走査に失敗しました。",
      },
      { status: 500 },
    );
  }
}
