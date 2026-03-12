/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { notFound } from "next/navigation";

import {
  BestContactBadge,
  ChannelStatusBadge,
  ContactTypeBadge,
  EnrichmentStatusBadge,
} from "@/components/channels/channel-badges";
import { ChannelDetailEditor } from "@/components/channels/channel-detail-editor";
import { RivalAnalysisCommentCard } from "@/components/channels/rival-analysis-comment";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getChannelById } from "@/lib/channels";
import { BEST_CONTACT_METHOD_LABELS, MODE_LABELS, type AppModeValue } from "@/lib/constants";
import { getPostingFrequencyRank } from "@/lib/rival-analysis";
import { getAppSettings } from "@/lib/settings";
import {
  formatCurrencyYen,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

function EvidenceList({
  title,
  items,
}: {
  title: string;
  items: Array<{ sourceType: string; matchedValue: string; sourceUrl?: string | null; confidence: number; field: string }>;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
      <p className="text-sm font-medium text-slate-900">{title}</p>
      <div className="mt-3 grid gap-2">
        {items.length > 0 ? (
          items.map((item, index) => (
            <div key={`${item.matchedValue}-${index}`} className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
              <p className="font-medium text-slate-900">{item.matchedValue}</p>
              <p className="mt-1 text-xs text-slate-500">
                {item.field} / confidence {item.confidence}
                {item.sourceUrl ? ` / ${item.sourceUrl}` : ""}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">該当なし</p>
        )}
      </div>
    </div>
  );
}

function ModeTabs({ id, mode }: { id: string; mode: AppModeValue }) {
  return (
    <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1">
      {(["sales", "rival"] as const).map((value) => {
        const active = value === mode;
        return (
          <Link
            key={value}
            href={`/channels/${id}?mode=${value}`}
            className={
              active
                ? "rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                : "rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            }
          >
            {MODE_LABELS[value]}
          </Link>
        );
      })}
    </div>
  );
}

export default async function ChannelDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, rawSearchParams, settings] = await Promise.all([params, searchParams, getAppSettings()]);
  const mode = (typeof rawSearchParams.mode === "string" && rawSearchParams.mode === "rival" ? "rival" : "sales") as AppModeValue;
  const detail = await getChannelById(id);

  if (!detail) {
    notFound();
  }

  const { channel, drafts, videos, externalScanLogs } = detail;
  const channelEvidence = channel.contactEvidence.filter((item) => item.sourceType === "channel_description");
  const videoEvidence = channel.contactEvidence.filter((item) => item.sourceType === "video_description");
  const externalEvidence = channel.contactEvidence.filter((item) => item.sourceType === "external_site");
  const recentVideos = videos.slice(0, 10);
  const topVideoViews = recentVideos.map((video) => video.viewCount);
  const maxViews = topVideoViews.length > 0 ? Math.max(...topVideoViews) : 0;
  const minViews = topVideoViews.length > 0 ? Math.min(...topVideoViews) : 0;
  const viewsPerSubscriber =
    channel.subscriberCount > 0 && channel.avgViewsLast10 ? channel.avgViewsLast10 / channel.subscriberCount : 0;

  return (
    <AppShell
      title={channel.title}
      description={
        mode === "rival"
          ? "想定月収、直近動画の強さ、Shorts比率、参入魅力度を中心に見られる分析ページです。"
          : "営業向けの連絡先、補完状況、外部サイト走査の結果を確認できる詳細ページです。"
      }
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <ModeTabs id={channel.id} mode={mode} />
          <Button asChild variant="secondary">
            <a href={channel.channelUrl} target="_blank" rel="noreferrer">
              YouTubeで開く
            </a>
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.92fr)]">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <img
                    src={channel.thumbnailUrl || "https://placehold.co/96x96/e2e8f0/0f172a?text=TL"}
                    alt={channel.title}
                    className="h-20 w-20 rounded-3xl object-cover"
                  />
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <ChannelStatusBadge status={channel.status} />
                      <ContactTypeBadge contactType={channel.contactType} />
                      <BestContactBadge method={channel.bestContactMethod} />
                      <EnrichmentStatusBadge status={channel.lightEnrichmentStatus} label="動画走査" />
                      <EnrichmentStatusBadge status={channel.deepEnrichmentStatus} label="外部走査" />
                      {channel.categoryGuess ? <Badge tone="blue">{channel.categoryGuess}</Badge> : null}
                      {channel.regionGuess ? <Badge tone="amber">{channel.regionGuess}</Badge> : null}
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-slate-500">チャンネルURL</p>
                      <a href={channel.channelUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-700 hover:underline">
                        {channel.channelUrl}
                      </a>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-slate-50 p-4 text-center">
                    <p className="text-xs text-slate-500">登録者数</p>
                    <p className="mt-2 font-semibold text-slate-950">{formatNumber(channel.subscriberCount)}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-center">
                    <p className="text-xs text-slate-500">総動画数</p>
                    <p className="mt-2 font-semibold text-slate-950">{formatNumber(channel.videoCount)}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 text-center">
                    <p className="text-xs text-slate-500">総再生数</p>
                    <p className="mt-2 font-semibold text-slate-950">{formatNumber(channel.viewCount)}</p>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className={mode === "rival" ? "border-slate-900/15" : undefined}>
            <CardHeader>
              <CardTitle>想定月収と分析サマリー</CardTitle>
              <CardDescription>推定値であり、実収益を保証するものではありません。</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">推定月間再生数</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{formatNumber(channel.monthlyViewsEstimate)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">想定月収 low</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{formatCurrencyYen(channel.estimatedMonthlyIncomeLow)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">想定月収 base</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{formatCurrencyYen(channel.estimatedMonthlyIncomeBase)}</p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs text-emerald-700">想定月収 high</p>
                  <p className="mt-2 text-2xl font-semibold text-emerald-900">{formatCurrencyYen(channel.estimatedMonthlyIncomeHigh)}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                  <p className="text-xs text-slate-500">投稿頻度</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">
                    {getPostingFrequencyRank(channel.postsLast30)} / 30日で {channel.postsLast30 || 0} 本
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                  <p className="text-xs text-slate-500">Shorts率</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">{formatPercent(channel.shortsRatio, 0)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                  <p className="text-xs text-slate-500">再生/登録者比</p>
                  <p className="mt-2 text-sm font-medium text-slate-900">{viewsPerSubscriber ? `${viewsPerSubscriber.toFixed(2)}x` : "-"}</p>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white/80 p-5 text-sm leading-7 text-slate-700">
                {channel.analysisSummary || "直近動画分析の補完待ちです。動画走査が完了するとサマリーが表示されます。"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>主要指標</CardTitle>
              <CardDescription>直近10本の動画を基準に算出しています。</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                <p className="text-xs text-slate-500">直近10本平均再生</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{formatNumber(channel.avgViewsLast10)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                <p className="text-xs text-slate-500">直近10本中央値</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{formatNumber(channel.medianViewsLast10)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                <p className="text-xs text-slate-500">直近30日投稿</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{formatNumber(channel.postsLast30)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                <p className="text-xs text-slate-500">直近90日投稿</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{formatNumber(channel.postsLast90)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                <p className="text-xs text-slate-500">audienceHealthScore</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{formatNumber(channel.audienceHealthScore)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                <p className="text-xs text-slate-500">consistencyScore</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{formatNumber(channel.consistencyScore)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                <p className="text-xs text-slate-500">hitDependencyScore</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{formatNumber(channel.hitDependencyScore)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                <p className="text-xs text-slate-500">最新投稿日</p>
                <p className="mt-2 text-sm font-medium text-slate-950">{formatDate(channel.lastVideoPublishedAt)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                <p className="text-xs text-slate-500">競合度スコア</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{formatNumber(channel.competitionScore)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                <p className="text-xs text-slate-500">成長性スコア</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{formatNumber(channel.growthScore)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                <p className="text-xs text-slate-500">参入魅力度スコア</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{formatNumber(channel.opportunityScore)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                <p className="text-xs text-slate-500">bestContactMethod</p>
                <p className="mt-2 text-sm font-medium text-slate-950">{BEST_CONTACT_METHOD_LABELS[channel.bestContactMethod]}</p>
              </div>
            </CardContent>
          </Card>

          {mode === "rival" ? (
            <RivalAnalysisCommentCard
              channelId={channel.id}
              initialSummary={channel.analysisSummary || "分析コメントは未生成です。"}
            />
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>直近動画一覧</CardTitle>
              <CardDescription>
                平均 {formatNumber(channel.avgViewsLast10)} / 中央値 {formatNumber(channel.medianViewsLast10)} / 最大{" "}
                {formatNumber(maxViews)} / 最小 {formatNumber(minViews)}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {recentVideos.length > 0 ? (
                recentVideos.map((video) => (
                  <div key={video.videoId} className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-slate-900">{video.title}</p>
                          {video.isShorts ? <Badge tone="amber">Shorts</Badge> : <Badge tone="slate">Long</Badge>}
                        </div>
                        <p className="text-xs text-slate-500">{formatDate(video.publishedAt)}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-[11px] text-slate-500">再生数</p>
                          <p className="font-medium text-slate-950">{formatNumber(video.viewCount)}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-[11px] text-slate-500">尺</p>
                          <p className="font-medium text-slate-950">{video.durationSec ? `${video.durationSec}s` : "-"}</p>
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">{video.description}</p>
                    <div className="mt-4 grid gap-2 text-sm text-slate-700">
                      <p>メール: {video.extractedEmails.join(" / ") || "-"}</p>
                      <p>URL: {video.extractedUrls.join(" / ") || "-"}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">まだ動画分析は完了していません。</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>チャンネル概要</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap break-words rounded-3xl border border-slate-200 bg-white/80 p-5 text-sm leading-7 text-slate-700">
                {channel.description || "概要欄は取得できませんでした。"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>連絡先と出所</CardTitle>
              <CardDescription>営業モードでの確認向けに、抽出元ごとの証跡をまとめています。</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <EvidenceList title="チャンネル概要欄から抽出" items={channelEvidence} />
                <EvidenceList title="最新動画概要欄から抽出" items={videoEvidence} />
              </div>
              <EvidenceList title="外部サイトから抽出" items={externalEvidence} />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                  <p className="text-sm font-medium text-slate-900">メール一覧</p>
                  <div className="mt-3 grid gap-2">
                    {channel.contactEmails.length > 0 ? (
                      channel.contactEmails.map((email) => (
                        <p key={email} className="break-all text-sm text-slate-700">
                          {email}
                        </p>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">メールは未取得です。</p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                  <p className="text-sm font-medium text-slate-900">フォーム / 公式サイト</p>
                  <div className="mt-3 grid gap-2">
                    {[...channel.contactFormUrls, ...channel.officialWebsiteUrls].length > 0 ? (
                      [...channel.contactFormUrls, ...channel.officialWebsiteUrls].map((url) => (
                        <a key={url} href={url} target="_blank" rel="noreferrer" className="break-all text-sm text-blue-700 hover:underline">
                          {url}
                        </a>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">外部リンクは未取得です。</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>外部サイト走査ログ</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              {externalScanLogs.length > 0 ? (
                externalScanLogs.map((log) => (
                  <div key={`${log.scannedUrl}-${log.createdAt || log.status}`} className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-medium text-slate-900">{log.scannedUrl}</p>
                      <p className="text-xs text-slate-500">
                        {log.status} / {formatDateTime(log.createdAt)}
                      </p>
                    </div>
                    {log.errorMessage ? <p className="mt-2 text-sm text-rose-600">{log.errorMessage}</p> : null}
                    <div className="mt-3 grid gap-2 text-sm text-slate-700">
                      <p>emails: {log.extractedEmails.join(" / ") || "-"}</p>
                      <p>forms: {log.extractedFormUrls.join(" / ") || "-"}</p>
                      <p>company: {log.companyNameGuess || "-"}</p>
                      <p>address: {log.addressGuess || "-"}</p>
                      <p>phone: {log.phoneGuess || "-"}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">外部サイト詳細走査はまだ実行されていません。</p>
              )}
            </CardContent>
          </Card>
        </div>

        <ChannelDetailEditor channel={channel} drafts={drafts} settings={settings} mode={mode} />
      </div>
    </AppShell>
  );
}
