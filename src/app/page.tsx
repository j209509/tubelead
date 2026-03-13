import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Clock3,
  ExternalLink,
  Mail,
  Search,
  Sparkles,
  Users,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardStats, getRecentSearchHistory, type SerializedSearchHistory } from "@/lib/channels";
import { formatDate, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

function buildHistoryHref(history: SerializedSearchHistory) {
  return `/search?keyword=${encodeURIComponent(history.conditions.keyword)}&mode=${history.conditions.mode}&minSubscribers=${
    history.conditions.minSubscribers
  }&minVideos=${history.conditions.minVideos}&maxResults=${history.conditions.maxResults}&order=${
    history.conditions.order
  }&hasContactOnly=${history.conditions.hasContactOnly}&preferJapanese=${history.conditions.preferJapanese}`;
}

function MetricCard({
  label,
  value,
  description,
  icon,
  tone = "default",
}: {
  label: string;
  value: number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "primary" | "success" | "accent" | "warning";
}) {
  const Icon = icon;
  const styles =
    tone === "primary"
      ? {
          card: "border-slate-900 bg-slate-950 text-white shadow-[0_28px_64px_-40px_rgba(15,23,42,0.8)]",
          iconWrap: "bg-white/10 text-white",
          label: "text-slate-300",
          value: "text-white",
          description: "text-slate-400",
        }
      : tone === "success"
        ? {
            card: "border-emerald-100 bg-white",
            iconWrap: "bg-emerald-50 text-emerald-600",
            label: "text-slate-500",
            value: "text-slate-950",
            description: "text-slate-500",
          }
        : tone === "accent"
          ? {
              card: "border-blue-100 bg-white",
              iconWrap: "bg-blue-50 text-blue-600",
              label: "text-slate-500",
              value: "text-slate-950",
              description: "text-slate-500",
            }
          : tone === "warning"
            ? {
                card: "border-amber-100 bg-white",
                iconWrap: "bg-amber-50 text-amber-500",
                label: "text-slate-500",
                value: "text-slate-950",
                description: "text-slate-500",
              }
            : {
                card: "border-slate-200 bg-white",
                iconWrap: "bg-slate-100 text-slate-600",
                label: "text-slate-500",
                value: "text-slate-950",
                description: "text-slate-500",
              };

  return (
    <Card className={styles.card}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={`text-sm ${styles.label}`}>{label}</p>
            <p className={`mt-4 text-4xl font-semibold tracking-tight ${styles.value}`}>{formatNumber(value)}</p>
          </div>
          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${styles.iconWrap}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <p className={`mt-3 text-sm leading-6 ${styles.description}`}>{description}</p>
      </CardContent>
    </Card>
  );
}

export default async function Home() {
  const [stats, recentHistory] = await Promise.all([getDashboardStats(), getRecentSearchHistory(4)]);
  const quickHistory = recentHistory.slice(0, 3);

  return (
    <AppShell>
      <div className="space-y-8">
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.8fr)]">
          <Card className="relative overflow-hidden border-slate-200 bg-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(15,23,42,0.08),transparent_32%)]" />
            <CardContent className="relative p-8 md:p-10">
              <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                検索・保存・一覧管理・AI文面・ライバル調査
              </div>

              <div className="mt-6 max-w-4xl">
                <p className="text-sm font-medium text-slate-500">YouTube 営業リスト / 競合分析ツール</p>
                <h1 className="mt-4 max-w-4xl font-serif text-5xl leading-[1.06] tracking-tight text-slate-950 md:text-6xl">
                  YouTube専用の営業リスト作成と、競合チャンネル分析を一つの画面で。
                </h1>
                <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600">
                  TubeLead は YouTube Data API v3 を使って関連チャンネルを収集し、営業リスト化とライバル分析を切り替えて使えるローカル
                  MVP です。検索直後は基本情報をすぐ表示し、動画分析や連絡先補完は後から順次反映されます。
                </p>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="h-12 rounded-2xl px-6 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.75)]">
                  <Link href="/search?mode=sales">
                    営業モードで検索
                    <Search className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="secondary" className="h-12 rounded-2xl px-6">
                  <Link href="/search?mode=rival">
                    ライバル調査を始める
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {[
                  "検索後は基本情報を即保存",
                  "営業 / 競合モードをすぐ切替",
                  "AI 文面下書きまで一気通し",
                ].map((item) => (
                  <div key={item} className="rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm text-slate-600">
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-10 grid gap-4 md:grid-cols-2">
                <div className="rounded-[28px] border border-blue-100 bg-blue-50/40 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
                      <Search className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-950">営業モード</p>
                      <p className="text-sm text-slate-500">検索・保存・タグ管理・AI文面</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-slate-600">
                    連絡先候補を整理しながら、必要な行だけ詳細走査できます。実務で使う一覧の見やすさを優先した構成です。
                  </p>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
                      <BarChart3 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-950">ライバル調査モード</p>
                      <p className="text-sm text-slate-500">平均再生・投稿頻度・想定月収を比較</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-slate-600">
                    直近動画の強さ、Shorts 比率、参入魅力度まで見ながら、競合の密度と勝ち筋を短時間で把握できます。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(248,250,252,0.92)_100%)]">
            <CardHeader className="p-7 pb-4">
              <div className="flex items-center gap-2 text-slate-950">
                <Clock3 className="h-4 w-4 text-slate-500" />
                <CardTitle>すぐ確認できること</CardTitle>
              </div>
              <CardDescription>最近の検索履歴から、そのまま再検索できます。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-7 pt-0">
              {quickHistory.length > 0 ? (
                quickHistory.map((history) => (
                  <Link
                    key={history.id}
                    href={buildHistoryHref(history)}
                    className="group flex items-center justify-between gap-4 rounded-[26px] border border-slate-200 bg-white px-5 py-4 transition hover:border-slate-300 hover:shadow-[0_20px_40px_-34px_rgba(15,23,42,0.45)]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-slate-950">{history.keyword}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatNumber(history.resultCount)} 件 / {formatDate(history.executedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-slate-400 transition group-hover:text-slate-700">
                      <span className="text-sm font-medium text-slate-500">再検索</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </Link>
                ))
              ) : (
                <div className="rounded-[26px] border border-dashed border-slate-200 bg-white/80 px-5 py-6 text-sm leading-7 text-slate-500">
                  まだ検索履歴はありません。営業モードまたはライバル調査モードから最初の検索を始めてください。
                </div>
              )}

              <div className="grid gap-3 rounded-[26px] border border-slate-200 bg-white/80 p-5 text-sm text-slate-600">
                <div className="flex items-center gap-2 text-slate-950">
                  <Sparkles className="h-4 w-4 text-slate-500" />
                  <span className="font-medium">今の使いどころ</span>
                </div>
                <p>最近の検索を起点に、そのまま一覧管理へ移動して絞り込みや再比較に入れます。</p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="総件数"
            value={stats.totalChannels}
            description="保存済みの YouTube チャンネル数"
            icon={Users}
            tone="primary"
          />
          <MetricCard
            label="メールあり件数"
            value={stats.emailCount}
            description="説明欄からメールアドレスを抽出できた件数"
            icon={Mail}
            tone="success"
          />
          <MetricCard
            label="外部リンクあり件数"
            value={stats.officialSiteCount}
            description="公式サイトや外部リンクを確認できた件数"
            icon={ExternalLink}
            tone="accent"
          />
          <MetricCard
            label="連絡候補件数"
            value={stats.candidateCount}
            description="ステータスが連絡候補の件数"
            icon={BarChart3}
            tone="warning"
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-200 bg-white">
            <CardHeader className="p-7">
              <CardTitle className="text-2xl">営業モードでできること</CardTitle>
              <CardDescription>最初に理解する → 次に整理する → 最後に行動する流れを短くまとめています。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-7 pt-0 text-sm leading-7 text-slate-600">
              <p>検索後は基本情報をすぐ保存し、一覧に表示します。</p>
              <p>その後に動画概要欄の補完が順次進み、必要な行だけ外部サイトの詳細走査を実行できます。</p>
              <p>タグ、メモ、ステータス管理と AI 営業文面の下書き生成まで一続きで行えます。</p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white">
            <CardHeader className="p-7">
              <CardTitle className="text-2xl">ライバル調査モードでできること</CardTitle>
              <CardDescription>比較しやすい指標だけを前に出して、判断に必要な情報を先に見せます。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-7 pt-0 text-sm leading-7 text-slate-600">
              <p>直近動画の平均再生、投稿頻度、Shorts率、再生効率を一覧で比較できます。</p>
              <p>想定月収は low / base / high の 3 段階で表示し、一覧でも詳細でも見比べられます。</p>
              <p>競合度、成長性、参入魅力度を見ながら、参入余地のあるジャンルを探せます。</p>
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
