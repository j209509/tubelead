import type { LatestVideoContact, SerializedChannel } from "@/lib/channel-types";
import { average, calcMedian, clamp } from "@/lib/utils";

export type ChannelAnalysisMetrics = {
  monthlyViewsEstimate: number;
  estimatedMonthlyIncomeLow: number;
  estimatedMonthlyIncomeBase: number;
  estimatedMonthlyIncomeHigh: number;
  avgViewsLast10: number;
  medianViewsLast10: number;
  maxViewsLast10: number;
  minViewsLast10: number;
  postsLast30: number;
  postsLast90: number;
  shortsRatio: number;
  audienceHealthScore: number;
  consistencyScore: number;
  hitDependencyScore: number;
  competitionScore: number;
  growthScore: number;
  opportunityScore: number;
  analysisSummary: string;
};

const ESTIMATED_INCOME_PER_VIEW_YEN = {
  low: 0.7,
  base: 1.5,
  high: 3.0,
} as const;

export function parseDurationSeconds(isoDuration: string) {
  const matches = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!matches) {
    return 0;
  }

  const hours = Number(matches[1] || 0);
  const minutes = Number(matches[2] || 0);
  const seconds = Number(matches[3] || 0);
  return hours * 3600 + minutes * 60 + seconds;
}

export function getPostingFrequencyRank(postsLast30: number | null | undefined) {
  const posts = postsLast30 || 0;

  if (posts >= 12) {
    return "かなり高頻度";
  }
  if (posts >= 3) {
    return "高頻度";
  }
  if (posts >= 1) {
    return "中頻度";
  }

  return "低頻度";
}

export function calcViewsPerSubscriberRatio(views: number, subscriberCount: number) {
  if (subscriberCount <= 0) {
    return 0;
  }

  return views / subscriberCount;
}

export function estimateMonthlyIncomeRange(
  monthlyViewsEstimate: number | null | undefined,
  shortsRatio: number | null | undefined,
) {
  if (monthlyViewsEstimate === null || monthlyViewsEstimate === undefined) {
    return {
      low: null,
      base: null,
      high: null,
      shortsIncomeAdjustment: null,
    };
  }

  const normalizedShortsRatio = shortsRatio ?? 0;
  const shortsIncomeAdjustment = clamp(1 - normalizedShortsRatio * 0.35, 0.65, 1);

  return {
    low: Math.round(monthlyViewsEstimate * ESTIMATED_INCOME_PER_VIEW_YEN.low * shortsIncomeAdjustment),
    base: Math.round(monthlyViewsEstimate * ESTIMATED_INCOME_PER_VIEW_YEN.base * shortsIncomeAdjustment),
    high: Math.round(monthlyViewsEstimate * ESTIMATED_INCOME_PER_VIEW_YEN.high * shortsIncomeAdjustment),
    shortsIncomeAdjustment,
  };
}

function daysBetween(date: string | null | undefined) {
  if (!date) {
    return Number.POSITIVE_INFINITY;
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return Number.POSITIVE_INFINITY;
  }

  return (Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24);
}

function buildChannelSummary(params: {
  categoryGuess?: string | null;
  postsLast30: number;
  shortsRatio: number;
  competitionScore: number;
  growthScore: number;
  audienceHealthScore: number;
  hitDependencyScore: number;
}) {
  const lines: string[] = [];

  if (params.postsLast30 >= 3) {
    lines.push("直近30日で継続的に更新されており、十分に動いているチャンネルです。");
  } else if (params.postsLast30 === 0) {
    lines.push("直近30日の更新がなく、参入判断では勢いの見極めに注意が必要です。");
  }

  if (params.shortsRatio >= 0.6) {
    lines.push("Shorts比率が高く、短尺流入を軸に伸ばしている可能性があります。");
  } else if (params.shortsRatio <= 0.2) {
    lines.push("Long動画中心で、企画の深さや検索流入が強みになっていそうです。");
  }

  if (params.audienceHealthScore >= 70) {
    lines.push("登録者に対して再生が強く、視聴者との噛み合いが良い状態です。");
  } else if (params.audienceHealthScore <= 40) {
    lines.push("登録者規模に対して再生が弱めで、直近の企画力にばらつきがあるかもしれません。");
  }

  if (params.hitDependencyScore >= 70) {
    lines.push("一部のヒット動画依存がやや強く、再現性には注意が必要です。");
  } else {
    lines.push("直近動画の再生が比較的そろっており、コンテンツの安定感があります。");
  }

  if (params.competitionScore >= 75) {
    lines.push("このテーマは競合が強く、参入時は企画の差別化が重要です。");
  } else if (params.growthScore >= 70) {
    lines.push("まだ伸びしろを感じやすい領域で、参入余地を検討しやすいです。");
  }

  if (params.categoryGuess) {
    lines.unshift(`${params.categoryGuess}系チャンネルとして見たときの現状分析です。`);
  }

  return lines.join(" ");
}

export function buildRivalAnalysis(params: {
  title: string;
  categoryGuess?: string | null;
  subscriberCount: number;
  lastVideoPublishedAt?: string | null;
  videos: LatestVideoContact[];
}) {
  const recentVideos = [...params.videos]
    .sort((left, right) => new Date(right.publishedAt || 0).getTime() - new Date(left.publishedAt || 0).getTime())
    .slice(0, 10);

  const viewCounts = recentVideos.map((video) => video.viewCount || 0);
  const avgViewsLast10 = average(viewCounts);
  const medianViewsLast10 = calcMedian(viewCounts);
  const maxViewsLast10 = viewCounts.length > 0 ? Math.max(...viewCounts) : 0;
  const minViewsLast10 = viewCounts.length > 0 ? Math.min(...viewCounts) : 0;

  const postsLast30 = recentVideos.filter((video) => daysBetween(video.publishedAt) <= 30).length;
  const postsLast90 = recentVideos.filter((video) => daysBetween(video.publishedAt) <= 90).length;
  const viewsLast30 = recentVideos
    .filter((video) => daysBetween(video.publishedAt) <= 30)
    .reduce((sum, video) => sum + (video.viewCount || 0), 0);
  const shortsCount = recentVideos.filter((video) => video.isShorts).length;
  const shortsRatio = recentVideos.length > 0 ? shortsCount / recentVideos.length : 0;

  const estimatedMonthlyPostingPace = Math.max(postsLast30, Math.round(postsLast90 / 3), recentVideos.length > 0 ? 1 : 0);
  const fallbackMonthlyViews = avgViewsLast10 * estimatedMonthlyPostingPace;
  const monthlyViewsEstimate =
    postsLast30 >= 2 ? viewsLast30 : Math.round(viewsLast30 * 0.6 + fallbackMonthlyViews * 0.4);

  const ratioAvg = calcViewsPerSubscriberRatio(avgViewsLast10, params.subscriberCount);
  const ratioMedian = calcViewsPerSubscriberRatio(medianViewsLast10, params.subscriberCount);
  const newestStrength = recentVideos[0] ? calcViewsPerSubscriberRatio(recentVideos[0].viewCount, params.subscriberCount) : 0;

  const freshnessBoost = (() => {
    const days = daysBetween(params.lastVideoPublishedAt || recentVideos[0]?.publishedAt);
    if (days <= 7) return 100;
    if (days <= 14) return 80;
    if (days <= 30) return 65;
    if (days <= 60) return 45;
    return 20;
  })();

  const stabilityRatio = avgViewsLast10 > 0 ? medianViewsLast10 / avgViewsLast10 : 0;
  const hitDependencyScore = clamp(
    Math.round(
      (1 - stabilityRatio) * 100 +
        (maxViewsLast10 > 0 ? (maxViewsLast10 / Math.max(avgViewsLast10, 1) - 1) * 18 : 0),
    ),
    0,
    100,
  );
  const audienceHealthScore = clamp(
    Math.round(ratioAvg * 90 + ratioMedian * 70 + (freshnessBoost - 40) * 0.15 + Math.min(postsLast30, 8) * 2),
    0,
    100,
  );
  const consistencyScore = clamp(
    Math.round(stabilityRatio * 72 + Math.min(postsLast30, 10) * 2.6 + (freshnessBoost - 20) * 0.18),
    0,
    100,
  );
  const competitionScore = clamp(
    Math.round(
      Math.log10(Math.max(params.subscriberCount, 1)) * 18 +
        Math.log10(Math.max(avgViewsLast10, 1)) * 22 +
        Math.min(postsLast30, 12) * 2.1 +
        freshnessBoost * 0.22,
    ),
    0,
    100,
  );
  const growthScore = clamp(
    Math.round(ratioAvg * 85 + newestStrength * 55 + Math.min(postsLast30, 10) * 2.4 + freshnessBoost * 0.3),
    0,
    100,
  );
  const opportunityScore = clamp(
    Math.round(growthScore * 0.46 + audienceHealthScore * 0.22 + consistencyScore * 0.18 + (100 - competitionScore) * 0.14),
    0,
    100,
  );

  const estimatedIncome = estimateMonthlyIncomeRange(monthlyViewsEstimate, shortsRatio);
  const estimatedMonthlyIncomeLow = estimatedIncome.low ?? 0;
  const estimatedMonthlyIncomeBase = estimatedIncome.base ?? 0;
  const estimatedMonthlyIncomeHigh = estimatedIncome.high ?? 0;

  const analysisSummary = buildChannelSummary({
    categoryGuess: params.categoryGuess,
    postsLast30,
    shortsRatio,
    competitionScore,
    growthScore,
    audienceHealthScore,
    hitDependencyScore,
  });

  return {
    monthlyViewsEstimate,
    estimatedMonthlyIncomeLow,
    estimatedMonthlyIncomeBase,
    estimatedMonthlyIncomeHigh,
    avgViewsLast10,
    medianViewsLast10,
    maxViewsLast10,
    minViewsLast10,
    postsLast30,
    postsLast90,
    shortsRatio,
    audienceHealthScore,
    consistencyScore,
    hitDependencyScore,
    competitionScore,
    growthScore,
    opportunityScore,
    analysisSummary,
  } satisfies ChannelAnalysisMetrics;
}

export function buildRivalFallbackComment(channel: SerializedChannel, videos: LatestVideoContact[]) {
  const points: string[] = [];

  if ((channel.avgViewsLast10 || 0) >= 100_000) {
    points.push("直近平均再生が強く、テーマ需要がはっきり見えます。");
  }
  if ((channel.shortsRatio || 0) >= 0.5) {
    points.push("Shorts経由の伸びが強いため、Long動画との差分設計が重要です。");
  }
  if ((channel.postsLast30 || 0) === 0) {
    points.push("直近30日で更新が止まっており、勢いの判断には慎重さが必要です。");
  }
  if ((channel.opportunityScore || 0) >= 70) {
    points.push("参入魅力度が高く、切り口次第で勝負しやすいテーマです。");
  }

  const topVideo = [...videos].sort((left, right) => right.viewCount - left.viewCount)[0];
  const summary =
    channel.analysisSummary ||
    "直近動画の数値から、投稿頻度・再生の安定性・Shorts比率を見て簡易分析しています。";

  return {
    summary,
    strengths: [
      channel.avgViewsLast10
        ? `直近10本平均は ${channel.avgViewsLast10.toLocaleString("ja-JP")} 再生で、基礎体力があります。`
        : "直近動画の平均再生はまだ算出前です。",
      `${channel.postsLast30 || 0} 本 / 30日で、${getPostingFrequencyRank(channel.postsLast30)}の投稿ペースです。`,
    ],
    weaknesses: [
      `${channel.hitDependencyScore || 0} 点で、ヒット依存は${(channel.hitDependencyScore || 0) >= 70 ? "強め" : "比較的おだやか"}です。`,
      channel.shortsRatio !== null
        ? `Shorts比率は ${Math.round((channel.shortsRatio || 0) * 100)}% です。`
        : "Shorts比率はまだ算出前です。",
    ],
    audienceFit: `再生/登録者比は ${channel.subscriberCount > 0 ? ((channel.avgViewsLast10 || 0) / channel.subscriberCount).toFixed(2) : "0.00"}x で、${
      (channel.audienceHealthScore || 0) >= 60 ? "視聴者との噛み合いが比較的良い" : "改善余地がありそう"
    }状態です。`,
    opportunity:
      points.join(" ") || "新規参入を考えるなら、既存の強みを崩さず差別化ポイントを足せるかが鍵になりそうです。",
    ideas: [
      topVideo
        ? `直近で最も伸びている動画は「${topVideo.title}」です。近い企画を丸写しせず、切り口を変えて検証する価値があります。`
        : "直近動画の一覧から、当たり企画の型をもう少し見ていく余地があります。",
      "Shortsで入口を作りつつ、Long動画で深掘りする構成にすると再生の安定化を狙いやすいです。",
    ],
  };
}
