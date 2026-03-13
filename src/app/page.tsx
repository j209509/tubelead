import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Clock3,
  ExternalLink,
  Mail,
  Search,
  TrendingUp,
  Users,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardStats, getRecentSearchHistory, type SerializedSearchHistory } from "@/lib/channels";
import { formatDate, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

type IconType = React.ComponentType<{ className?: string }>;

function buildHistoryHref(history: SerializedSearchHistory) {
  return `/search?keyword=${encodeURIComponent(history.conditions.keyword)}&mode=${history.conditions.mode}&minSubscribers=${
    history.conditions.minSubscribers
  }&minVideos=${history.conditions.minVideos}&maxResults=${history.conditions.maxResults}&order=${
    history.conditions.order
  }&hasContactOnly=${history.conditions.hasContactOnly}&preferJapanese=${history.conditions.preferJapanese}`;
}

function ModeCard({
  label,
  title,
  description,
  points,
  href,
  cta,
  icon,
  tone,
}: {
  label: string;
  title: string;
  description: string;
  points: string[];
  href: string;
  cta: string;
  icon: IconType;
  tone: "sales" | "rival";
}) {
  const Icon = icon;
  const styles =
    tone === "sales"
      ? {
          card:
            "border-blue-200 bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(239,246,255,0.82)_100%)] shadow-[0_28px_72px_-56px_rgba(37,99,235,0.42)]",
          hover:
            "group-hover:-translate-y-2 group-hover:scale-[1.01] group-hover:border-blue-300 group-hover:shadow-[0_42px_100px_-48px_rgba(37,99,235,0.62)] group-focus-visible:-translate-y-2 group-focus-visible:scale-[1.01] group-focus-visible:border-blue-300 group-focus-visible:shadow-[0_42px_100px_-48px_rgba(37,99,235,0.62)]",
          orb: "bg-[radial-gradient(circle_at_top_right,rgba(191,219,254,0.55),transparent_42%)]",
          iconWrap: "bg-blue-600 text-white shadow-[0_20px_34px_-20px_rgba(37,99,235,0.9)]",
          label: "text-blue-700",
          bullet: "bg-blue-600",
          button:
            "bg-blue-600 text-white shadow-[0_18px_36px_-22px_rgba(37,99,235,0.75)] group-hover:bg-blue-700 group-focus-visible:bg-blue-700",
        }
      : {
          card:
            "border-fuchsia-200 bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(250,245,255,0.92)_100%)] shadow-[0_28px_72px_-56px_rgba(168,85,247,0.42)]",
          hover:
            "group-hover:-translate-y-2 group-hover:scale-[1.01] group-hover:border-fuchsia-300 group-hover:shadow-[0_42px_100px_-48px_rgba(168,85,247,0.62)] group-focus-visible:-translate-y-2 group-focus-visible:scale-[1.01] group-focus-visible:border-fuchsia-300 group-focus-visible:shadow-[0_42px_100px_-48px_rgba(168,85,247,0.62)]",
          orb: "bg-[radial-gradient(circle_at_top_right,rgba(233,213,255,0.55),transparent_42%)]",
          iconWrap: "bg-fuchsia-600 text-white shadow-[0_20px_34px_-20px_rgba(168,85,247,0.9)]",
          label: "text-fuchsia-700",
          bullet: "bg-fuchsia-600",
          button:
            "bg-fuchsia-600 text-white shadow-[0_18px_36px_-22px_rgba(168,85,247,0.75)] group-hover:bg-fuchsia-700 group-focus-visible:bg-fuchsia-700",
        };

  return (
    <Link
      href={href}
      className="group block h-full rounded-[28px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200/60"
    >
      <Card className={`relative h-full cursor-pointer overflow-hidden rounded-[28px] transition-all duration-300 ${styles.card} ${styles.hover}`}>
        <div className={`absolute inset-0 ${styles.orb}`} />
        <CardContent className="relative flex h-full flex-col p-6 md:p-7">
          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${styles.iconWrap}`}>
            <Icon className="h-6 w-6" />
          </div>

          <div className="mt-6">
            <p className={`text-sm font-medium ${styles.label}`}>{label}</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{title}</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">{description}</p>
          </div>

          <ul className="mt-6 space-y-3 text-sm text-slate-600">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <span className={`mt-2 h-1.5 w-1.5 rounded-full ${styles.bullet}`} />
                <span>{point}</span>
              </li>
            ))}
          </ul>

          <div
            className={`mt-8 flex h-12 items-center justify-center rounded-2xl text-sm font-medium text-white ${styles.button}`}
          >
            <span>{cta}</span>
            <ArrowRight className="ml-2 h-4 w-4 text-white" />
          </div>
        </CardContent>
      </Card>
    </Link>
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
  icon: IconType;
  tone: "slate" | "green" | "violet" | "amber";
}) {
  const Icon = icon;
  const styles =
    tone === "slate"
      ? { iconWrap: "bg-slate-100 text-slate-500", value: "text-slate-950", dot: "bg-slate-300" }
      : tone === "green"
        ? { iconWrap: "bg-emerald-50 text-emerald-600", value: "text-slate-950", dot: "bg-emerald-500" }
        : tone === "violet"
          ? { iconWrap: "bg-violet-50 text-violet-600", value: "text-slate-950", dot: "bg-violet-500" }
          : { iconWrap: "bg-amber-50 text-amber-500", value: "text-slate-950", dot: "bg-amber-500" };

  return (
    <Card className="rounded-[24px] border-slate-200 bg-white shadow-[0_18px_45px_-40px_rgba(15,23,42,0.45)]">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${styles.dot}`} />
              <p className="text-sm text-slate-500">{label}</p>
            </div>
            <p className={`mt-5 text-4xl font-semibold tracking-tight ${styles.value}`}>{formatNumber(value)}</p>
          </div>
          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${styles.iconWrap}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
      </CardContent>
    </Card>
  );
}

function CapabilityCard({
  title,
  description,
  tone,
  items,
}: {
  title: string;
  description: string;
  tone: "sales" | "rival";
  items: Array<{ label: string; value: string }>;
}) {
  const styles =
    tone === "sales"
      ? {
          card: "border-blue-200 bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(239,246,255,0.55)_100%)]",
          label: "text-blue-700",
          tile: "border-blue-100 bg-white",
        }
      : {
          card: "border-fuchsia-200 bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(250,245,255,0.75)_100%)]",
          label: "text-fuchsia-700",
          tile: "border-fuchsia-100 bg-white",
        };

  return (
    <Card className={`rounded-[28px] ${styles.card}`}>
      <CardHeader className="p-6 md:p-7">
        <p className={`text-sm font-medium ${styles.label}`}>{title}</p>
        <CardTitle className="mt-2 text-3xl tracking-tight text-slate-950">{description}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 p-6 pt-0 md:grid-cols-2 md:p-7 md:pt-0">
        {items.map((item) => (
          <div key={item.label} className={`rounded-2xl border p-4 ${styles.tile}`}>
            <p className="text-xs font-medium tracking-[0.08em] text-slate-500 uppercase">{item.label}</p>
            <p className="mt-2 text-sm leading-7 text-slate-700">{item.value}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default async function Home() {
  const [stats, recentHistory] = await Promise.all([getDashboardStats(), getRecentSearchHistory(4)]);

  return (
    <AppShell>
      <div className="space-y-10">
        <section className="rounded-[36px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(248,250,252,0.98)_100%)] px-6 py-10 shadow-[0_28px_80px_-64px_rgba(15,23,42,0.45)] md:px-10 md:py-12">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-600">
              検索・保存・一覧管理・AI文面・ライバル調査
            </div>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-950 md:text-6xl">何を始めますか？</h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
              営業リスト作成か、競合チャンネル分析かを選ぶだけで始められます。YouTubeに慣れた人が、そのまま比較しやすい順で情報を整理します。
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-5xl gap-5 lg:grid-cols-2">
            <ModeCard
              label="営業リスト作成"
              title="営業モードで検索"
              description="YouTubeチャンネルを検索し、メールアドレスや外部リンクを抽出。営業リストを効率的に作成できます。"
              points={[
                "基本情報をすぐ保存して一覧化",
                "タグ・メモ・ステータスで整理",
                "AI文面下書きまで一気に進められる",
              ]}
              href="/search?mode=sales"
              cta="営業モードで検索を始める"
              icon={Search}
              tone="sales"
            />
            <ModeCard
              label="競合チャンネル分析"
              title="ライバル調査を始める"
              description="競合チャンネルの平均再生数、投稿頻度、Shorts比率、想定月収を一覧で比較できます。"
              points={[
                "low / base / high の3段階で想定月収を表示",
                "競合度・成長性・参入魅力度を比較",
                "市場の余白と伸び方を短時間で把握",
              ]}
              href="/search?mode=rival"
              cta="ライバル調査を始める"
              icon={TrendingUp}
              tone="rival"
            />
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Dashboard</p>
            <h2 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">現在の状況</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="総件数"
              value={stats.totalChannels}
              description="保存済みのYouTubeチャンネル数"
              icon={Users}
              tone="slate"
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

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Clock3 className="h-5 w-5 text-slate-500" />
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">最近の検索</h2>
            </div>
            <Link href="/search" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              すべて表示
            </Link>
          </div>

          <Card className="rounded-[28px] border-slate-200 bg-white shadow-[0_18px_45px_-40px_rgba(15,23,42,0.45)]">
            <CardContent className="p-4 md:p-6">
              {recentHistory.length > 0 ? (
                <div className="space-y-3">
                  {recentHistory.map((history) => (
                    <Link
                      key={history.id}
                      href={buildHistoryHref(history)}
                      className="group flex items-center justify-between gap-4 rounded-2xl border border-transparent px-4 py-3 transition hover:border-slate-200 hover:bg-slate-50"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                          <Search className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-slate-950">{history.keyword}</p>
                          <p className="mt-1 text-sm text-slate-500">{formatDate(history.executedAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span className="font-medium">{formatNumber(history.resultCount)}件</span>
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm leading-7 text-slate-500">
                  まだ検索履歴はありません。営業モードまたはライバル調査モードから最初の検索を始めてください。
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <CapabilityCard
            title="営業モードでできること"
            description="検索して、整理して、提案まで進める"
            tone="sales"
            items={[
              { label: "Search", value: "検索後は基本情報をすぐ保存し、一覧画面でそのまま絞り込みに入れます。" },
              { label: "Organize", value: "タグ、メモ、ステータスで見込み度を整理し、営業対象を絞れます。" },
              { label: "Contact", value: "必要な行だけ詳細走査して、連絡先確認とAI文面下書きへつなげられます。" },
              { label: "Fit", value: "実務ツールとしての一覧性を優先し、候補比較がしやすい構成です。" },
            ]}
          />
          <CapabilityCard
            title="ライバル調査モードでできること"
            description="比較して、見極めて、参入余地を探す"
            tone="rival"
            items={[
              { label: "Views", value: "直近動画の平均再生、中央値、再生効率を一覧で比較できます。" },
              { label: "Cadence", value: "投稿頻度、Shorts率、最近の更新状況を見て運用の強さを判断できます。" },
              { label: "Revenue", value: "想定月収を low / base / high で見比べながら市場感を把握できます。" },
              { label: "Opportunity", value: "競合度、成長性、参入魅力度をまとめて見て、狙う余地を探せます。" },
            ]}
          />
        </section>
      </div>
    </AppShell>
  );
}
