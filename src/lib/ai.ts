import OpenAI from "openai";

import type {
  DraftGenerationSettings,
  LatestVideoContact,
  RivalAnalysisComment,
  SerializedChannel,
} from "@/lib/channel-types";
import { BEST_CONTACT_METHOD_LABELS, LENGTH_LABELS, TONE_LABELS } from "@/lib/constants";
import { buildRivalFallbackComment } from "@/lib/rival-analysis";
import { normalizeLineBreaks } from "@/lib/utils";

export type GeneratedDraft = {
  subject: string;
  body: string;
  customPoint: string;
  rationale: string;
};

function extractJsonPayload<T>(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("JSON を抽出できませんでした。");
  }

  return JSON.parse(text.slice(start, end + 1)) as T;
}

export function fallbackGenerateDraft(channel: SerializedChannel, settings: DraftGenerationSettings): GeneratedDraft {
  const subject = `${channel.title} さまへのご提案 | ${settings.serviceName}`;
  const customPoint = `${channel.categoryGuess || "YouTube運用"} の発信と、${channel.regionGuess || "既存の視聴者層"} に合う形で提案内容を整えています。`;
  const body = normalizeLineBreaks(`
${channel.title} ご担当者さま

突然のご連絡失礼いたします。${settings.serviceName} を運営しております。
チャンネル概要と公開情報を拝見し、${channel.categoryGuess || "発信テーマ"} との相性が高いと感じてご連絡しました。

${settings.serviceDescription}

今回ご提案したい内容:
${settings.defaultPitch}

公開情報上では ${BEST_CONTACT_METHOD_LABELS[channel.bestContactMethod]} が確認できたため、まずは無理のない範囲でご相談できればと思っています。
ご興味があれば一度だけでもお話の機会をいただけますと幸いです。
  `);

  const rationale = `${TONE_LABELS[settings.tone]} / ${LENGTH_LABELS[settings.lengthPreference]} を基準に、カテゴリ・地域・連絡可能性を反映した下書きです。`;

  return {
    subject,
    body,
    customPoint,
    rationale,
  };
}

export async function generateOutreachDraft(
  channel: SerializedChannel,
  settings: DraftGenerationSettings,
): Promise<GeneratedDraft> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return fallbackGenerateDraft(channel, settings);
  }

  try {
    const client = new OpenAI({ apiKey });
    const prompt = `
以下のチャンネル情報に合わせて、日本語の営業メッセージ下書きを JSON で返してください。
チャンネル名: ${channel.title}
概要欄: ${channel.description}
カテゴリ推定: ${channel.categoryGuess || "不明"}
地域推定: ${channel.regionGuess || "不明"}
登録者数: ${channel.subscriberCount}
bestContactMethod: ${BEST_CONTACT_METHOD_LABELS[channel.bestContactMethod]}
bestContactValue: ${channel.bestContactValue || "未取得"}
外部リンク数: ${channel.externalLinks.length}

自社サービス名: ${settings.serviceName}
自社サービス説明: ${settings.serviceDescription}
提案したい内容: ${settings.defaultPitch}
文体: ${TONE_LABELS[settings.tone]}
文字数感: ${LENGTH_LABELS[settings.lengthPreference]}

返却する JSON:
{
  "subject": "件名候補",
  "body": "本文",
  "customPoint": "一言カスタムポイント",
  "rationale": "なぜこの文面にしたか"
}
    `.trim();

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
      instructions:
        "あなたは日本語の営業文面を作るアシスタントです。過度に誇張せず、チャンネル特性に寄せた自然な文章を JSON のみで返してください。",
      input: prompt,
    });

    const outputText = response.output_text?.trim();
    if (!outputText) {
      throw new Error("OpenAI から本文を取得できませんでした。");
    }

    const parsed = extractJsonPayload<GeneratedDraft>(outputText);
    return {
      subject: parsed.subject,
      body: normalizeLineBreaks(parsed.body),
      customPoint: parsed.customPoint,
      rationale: parsed.rationale,
    };
  } catch {
    return fallbackGenerateDraft(channel, settings);
  }
}

export async function generateRivalAnalysisComment(
  channel: SerializedChannel,
  videos: LatestVideoContact[],
): Promise<RivalAnalysisComment> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return buildRivalFallbackComment(channel, videos);
  }

  try {
    const client = new OpenAI({ apiKey });
    const prompt = `
以下の YouTube チャンネル情報を分析し、日本語で JSON を返してください。
チャンネル名: ${channel.title}
カテゴリ推定: ${channel.categoryGuess || "不明"}
登録者数: ${channel.subscriberCount}
直近10本平均再生: ${channel.avgViewsLast10 || 0}
直近10本中央値: ${channel.medianViewsLast10 || 0}
直近30日投稿本数: ${channel.postsLast30 || 0}
Shorts率: ${channel.shortsRatio || 0}
推定月間再生数: ${channel.monthlyViewsEstimate || 0}
想定月収 base: ${channel.estimatedMonthlyIncomeBase || 0}
競合度スコア: ${channel.competitionScore || 0}
成長性スコア: ${channel.growthScore || 0}
参入魅力度スコア: ${channel.opportunityScore || 0}
概要欄: ${channel.description}
直近動画:
${videos
  .slice(0, 10)
  .map((video) => `- ${video.title} / ${video.viewCount} views / shorts=${video.isShorts}`)
  .join("\n")}

返却する JSON:
{
  "summary": "このチャンネルの特徴",
  "strengths": ["強み1", "強み2"],
  "weaknesses": ["弱み1", "弱み2"],
  "audienceFit": "どの層に刺さっていそうか",
  "opportunity": "参入余地があるか",
  "ideas": ["勝ちやすそうな企画1", "勝ちやすそうな企画2"]
}
    `.trim();

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
      instructions:
        "あなたは YouTube の競合分析アシスタントです。実収益の断定は避け、推定値として扱ってください。JSON のみで返してください。",
      input: prompt,
    });

    const outputText = response.output_text?.trim();
    if (!outputText) {
      throw new Error("OpenAI から分析コメントを取得できませんでした。");
    }

    return extractJsonPayload<RivalAnalysisComment>(outputText);
  } catch {
    return buildRivalFallbackComment(channel, videos);
  }
}
