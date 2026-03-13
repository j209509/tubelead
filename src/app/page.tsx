import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Clock3,
  ExternalLink,
  Mail,
  Search,
  Sparkles,
  TrendingUp,
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

function ModeCard({
  title,
  subtitle,
  description,
  points,
  href,
  cta,
  icon,
  theme,
}: {
  title: string;
  subtitle: string;
  description: string;
  points: string[];
  href: string;
  cta: string;
  icon: React.ComponentType<{ className?: string }>;
  theme: "sales" | "rival";
}) {
  const Icon = icon;
  const styles =
    theme === "sales"
      ? {
          card:
            "border-blue-200 bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(239,246,255,0.72)_100%)] shadow-[0_36px_90px_-62px_rgba(37,99,235,0.55)]",
          orb: "bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.2),transparent_42%)]",
          iconWrap: "bg-blue-600 text-white shadow-[0_16px_32px_-20px_rgba(37,99,235,0.8)]",
          button: "bg-blue-600 hover:bg-blue-700 text-white",
          bullet: "bg-blue-600",
          accent: "text-blue-700",
        }
      : {
          card:
            "border-fuchsia-200 bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(250,245,255,0.9)_100%)] shadow-[0_36px_90px_-62px_rgba(168,85,247,0.55)]",
          orb: "bg-[radial-gradient(circle_at_top_right,rgba(216,180,254,0.2),transparent_42%)]",
          iconWrap: "bg-fuchsia-600 text-white shadow-[0_16px_32px_-20px_rgba(168,85,247,0.8)]",
          button: "bg-fuchsia-600 hover:bg-fuchsia-700 text-white",
          bullet: "bg-fuchsia-600",
          accent: "text-fuchsia-700",
        };

  return (
    <Card className={`relative overflow-hidden rounded-[30px] ${styles.card}`}>
      <div className={`absolute inset-0 ${styles.orb}`} />
      <CardContent className="relative flex h-full flex-col p-7">
        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${styles.iconWrap}`}>
          <Icon className="h-6 w-6" />
        </div>

        <div className="mt-7 space-y-3">
          <div>
            <p className={`text-sm font-medium ${styles.accent}`}>{subtitle}</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{title}</h2>
          </div>
          <p className="text-sm leading-7 text-slate-600">{description}</p>
        </div>

        <ul className="mt-6 space-y-3 text-sm text-slate-600">
          {points.map((point) => (
            <li key={point} className="flex items-start gap-3">
              <span className={`mt-2 h-1.5 w-1.5 rounded-full ${styles.bullet}`} />
              <span>{point}</span>
            </li>
          ))}
        </ul>

        <Button asChild size="lg" className={`mt-8 h-12 rounded-2xl text-sm font-medium ${styles.button}`}>
          <Link href={href}>
            {cta}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function MetricCard({
  label,
  value,
  description,
  icon,
  tone,
}: {
  label: string;
  value: number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "dark" | "green" | "violet" | "amber";
}) {
  const Icon = icon;
  const styles =
    tone === "dark"
      ? {
          card: "border-slate-900 bg-slate-950 text-white shadow-[0_30px_70px_-48px_rgba(15,23,42,0.9)]",
          iconWrap: "bg-white/10 text-white",
          label: "text-slate-300",
          value: "text-white",
          description: "text-slate-400",
        }
      : tone === "green"
        ? {
            card: "border-emerald-200 bg-white",
            iconWrap: "bg-emerald-50 text-emerald-600",
            label: "text-slate-500",
            value: "text-slate-950",
            description: "text-slate-500",
          }
        : tone === "violet"
          ? {
              card: "border-violet-200 bg-white",
              iconWrap: "bg-violet-50 text-violet-600",
              label: "text-slate-500",
              value: "text-slate-950",
              description: "text-slate-500",
            }
          : {
              card: "border-amber-200 bg-white",
              iconWrap: "bg-amber-50 text-amber-500",
              label: "text-slate-500",
              value: "text-slate-950",
              description: "text-slate-500",
            };

  return (
    <Card className={`rounded-[28px] ${styles.card}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={`text-sm ${styles.label}`}>{label}</p>
            <p className={`mt-5 text-4xl font-semibold tracking-tight ${styles.value}`}>{formatNumber(value)}</p>
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

  return (
    <AppShell>
      <div className="space-y-10">
        <section className="rounded-[36px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(248,250,252,0.96)_100%)] px-6 py-8 shadow-[0_30px_90px_-72px_rgba(15,23,42,0.45)] md:px-8 md:py-10">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
              検索・保存・一覧管理・AI文面・ライバル調査
            </div>
            <h1 className="mt-6 font-serif text-4xl leading-[1.08] tracking-tight text-slate-950 md:text-6xl">
              何を始めますか？
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
              営業リスト作成か、競合チャンネル分析かを選ぶだけで始められます。TubeLead は YouTube に慣れた人が、そのまま判断しやすい並びで情報を整理します。
            </p>
          </div>

          <div className="mt-10 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="grid gap-5 lg:grid-cols-2">
              <ModeCard
                title="営業モードで検索"
                subtitle="営業リスト作成"
                description="YouTubeチャンネルを検索し、メールアドレスや外部リンクを抽出。営業リストを効率的に作成できます。"
                points={[
                  "基本情報をすぐ保存して一覧化",
                  "タグ・メモ・ステータスで整理",
                  "AI文面下書きまで一気に進められる",
                ]}
                href="/search?mode=sales"
                cta="営業モードで検索を始める"
                icon={Search}
                theme="sales"
              />
              <ModeCard
                title="ライバル調査を始める"
                subtitle="競合チャンネル分析"
                description="競合チャンネルの平均再生数、投稿頻度、Shorts比率、想定月収を一覧で比較できます。"
                points={[
                  "low / base / high の3段階で想定月収を表示",
                  "競合度・成長性・参入魅力度を比較",
                  "市場の余白と伸び方を短時間で把握",
                ]}
                href="/search?mode=rival"
                cta="ライバル調査を始める"
                icon={TrendingUp}
                theme="rival"
              />
            </div>

            <Card className="rounded-[30px] border-slate-200 bg-white">
              <CardHeader className="p-6 pb-4">
                <div className="flex items-center gap-2 text-slate-950">
                  <Clock3 className="h-4 w-4 text-slate-500" />
                  <CardTitle className="text-2xl">すぐ確認できること</CardTitle>
                </div>
                <CardDescription>最近の検索履歴から、そのまま再検索できます。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-6 pt-0">
                {recentHistory.length > 0 ? (
                  recentHistory.map((history) => (
                    <Link
                      key={history.id}
                      href={buildHistoryHref(history)}
                      className="group block rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-4 transition hover:border-slate-300 hover:bg-white"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-lg font-semibold text-slate-950">{history.keyword}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {formatNumber(history.resultCount)} 件 / {formatDate(history.executedAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-500 transition group-hover:text-slate-950">
                          再検索
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-5 text-sm leading-7 text-slate-500">
                    まだ検索履歴はありません。営業モードまたはライバル調査モードから最初の検索を始めてください。
                  </div>
                )}

                <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-950">
                    <Sparkles className="h-4 w-4 text-slate-500" />
                    今の使いどころ
                  </div>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    最近の検索からすぐ再開し、そのまま一覧管理や比較へ進めます。履歴は補助導線としてまとめ、主役は検索開始カードに寄せています。
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-slate-500">Dashboard</p>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-950">現在の状況</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="総件数"
              value={stats.totalChannels}
              description="保存済みの YouTube チャンネル数"
              icon={Users}
              tone="dark"
            />
            <MetricCard
              label="メールあり件数"
              value={stats.emailCount}
              description="説明欄からメールアドレスを抽出できた件数"
              icon={Mail}
              tone="green"
            />
            <MetricCard
              label="外部リンクあり件数"
              value={stats.officialSiteCount}
              description="公式サイトや外部リンクを確認できた件数"
              icon={ExternalLink}
              tone="violet"
            />
            <MetricCard
              label="連絡候補件数"
              value={stats.candidateCount}
              description="ステータスが連絡候補の件数"
              icon={BarChart3}
              tone="amber"
            />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-[30px] border-slate-200 bg-white">
            <CardHeader className="p-7">
              <CardTitle className="text-3xl tracking-tight text-slate-950">営業モードでできること</CardTitle>
              <CardDescription className="text-sm leading-7">
                最初に理解する → 次に整理する → 最後に行動する、の流れに沿って短く読める構成にしています。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-7 pt-0 text-sm leading-7 text-slate-600">
              <p>検索後は基本情報をすぐ保存し、一覧に表示します。</p>
              <p>その後に動画概要欄の補完が順次進み、必要な行だけ外部サイトの詳細走査を実行できます。</p>
              <p>タグ、メモ、ステータス管理と AI 営業文面の下書き生成まで一続きで行えます。</p>
            </CardContent>
          </Card>

          <Card className="rounded-[30px] border-slate-200 bg-white">
            <CardHeader className="p-7">
              <CardTitle className="text-3xl tracking-tight text-slate-950">ライバル調査モードでできること</CardTitle>
              <CardDescription className="text-sm leading-7">
                比較しやすい指標だけを前に出し、参入判断に必要な情報を最短で読めるようにしています。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-7 pt-0 text-sm leading-7 text-slate-600">
              <p>直近動画の平均再生、投稿頻度、Shorts率、再生効率を一覧で比較できます。</p>
              <p>想定月収は low / base / high の3段階で表示し、一覧でも詳細でも比較できます。</p>
              <p>競合度、成長性、参入魅力度を見ながら、参入余地のあるジャンルを探せます。</p>
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
