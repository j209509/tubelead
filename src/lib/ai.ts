import OpenAI from "openai";

import type {
  DraftGenerationSettings,
  EmailGenerationTarget,
  LatestVideoContact,
  OutreachTemplateItem,
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

function buildTargetSnapshot(target: EmailGenerationTarget) {
  return [
    `チャンネル名: ${target.title}`,
    `メール: ${target.email}`,
    `カテゴリ: ${target.categoryGuess || "不明"}`,
    `地域: ${target.regionGuess || "不明"}`,
    `登録者数: ${target.subscriberCount || 0}`,
    `動画数: ${target.videoCount || 0}`,
    `URL: ${target.channelUrl || "不明"}`,
    `概要: ${target.description || "情報なし"}`,
  ].join("\n");
}

function extractJsonPayload<T>(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("JSON を抽出できませんでした。");
  }

  return JSON.parse(text.slice(start, end + 1)) as T;
}

export function fallbackGenerateDraft(channel: SerializedChannel, settings: DraftGenerationSettings): GeneratedDraft {
  const subject = `${channel.title} 様へご提案 | ${settings.serviceName}`;
  const customPoint = `${channel.categoryGuess || "YouTube運営"} 分野の発信と、${channel.regionGuess || "既存の活動内容"} に触れた一言を入れています。`;
  const body = normalizeLineBreaks(`
${channel.title} 様

はじめまして。${settings.serviceName} を運営しております。
チャンネル内容を拝見し、${channel.categoryGuess || "YouTube運営"}との相性が高いと感じたためご連絡しました。

${settings.serviceDescription}

今回ご提案したい内容:
${settings.defaultPitch}

突然のご連絡失礼しました。もしご関心があれば、一度だけでもお話しできればうれしいです。
どうぞよろしくお願いいたします。
  `);

  const rationale = `${TONE_LABELS[settings.tone]} / ${LENGTH_LABELS[settings.lengthPreference]} を前提に、カテゴリ・地域・連絡先情報を反映したフォールバック文面です。`;

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
以下のチャンネル情報に合わせて、日本語の営業メッセージ下書きを JSON で生成してください。
丁寧で自然な文面にしつつ、チャンネルを見た印象が伝わるようにしてください。

チャンネル名: ${channel.title}
概要: ${channel.description}
カテゴリ推定: ${channel.categoryGuess || "不明"}
地域推定: ${channel.regionGuess || "不明"}
登録者数: ${channel.subscriberCount}
bestContactMethod: ${BEST_CONTACT_METHOD_LABELS[channel.bestContactMethod]}
bestContactValue: ${channel.bestContactValue || "未設定"}
外部リンク数: ${channel.externalLinks.length}

自社サービス名: ${settings.serviceName}
自社サービス説明: ${settings.serviceDescription}
提案したい内容: ${settings.defaultPitch}
文体: ${TONE_LABELS[settings.tone]}
文字数感: ${LENGTH_LABELS[settings.lengthPreference]}

以下の JSON 形式で返してください:
{
  "subject": "件名",
  "body": "本文",
  "customPoint": "一言のカスタムポイント",
  "rationale": "この文面にした理由"
}
    `.trim();

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
      instructions:
        "日本語で、丁寧かつ自然な営業文を作成してください。JSON 以外は返さないでください。",
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

export function fallbackGenerateSalesEmailDraft(
  target: EmailGenerationTarget,
  template: OutreachTemplateItem,
): GeneratedDraft {
  const category = target.categoryGuess || "YouTubeチャンネル";
  const customPoint = `${target.title} を${category}分野のチャンネルとして拝見し、その印象が伝わる一文を入れています。`;
  const subject = `${target.title} 様へ | ご提案のご相談`;
  const body = normalizeLineBreaks(`
${target.title} 様

はじめまして。チャンネルの内容を拝見し、ご連絡しました。
${customPoint}

以下、今回のご提案のベース文です。
${template.baseMailText}

もし少しでもご興味がありましたら、一度だけでもお話しできればうれしいです。
どうぞよろしくお願いいたします。
  `);

  return {
    subject,
    body,
    customPoint,
    rationale: "OpenAI 未設定時のフォールバック文面です。チャンネル名、カテゴリ、概要欄の要素を使って最低限の個別化を行っています。",
  };
}

export async function generateSalesEmailDraft(
  target: EmailGenerationTarget,
  template: OutreachTemplateItem,
): Promise<GeneratedDraft> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return fallbackGenerateSalesEmailDraft(target, template);
  }

  try {
    const client = new OpenAI({ apiKey });
    const prompt = `
あなたは、YouTube チャンネル運営者向けの営業メール作成アシスタントです。
ベース文面をもとに、対象チャンネルごとに個別最適化した営業メールを書いてください。
失礼になりにくい丁寧な日本語で、相手のチャンネルを見た印象が自然に伝わるようにしてください。
誇張しすぎず、突然送られても違和感の少ない文面にしてください。

テンプレート名:
${template.name}

テンプレートの指示:
${template.basePrompt}

営業メールの大本:
${template.baseMailText}

対象チャンネル情報:
${buildTargetSnapshot(target)}

以下の JSON 形式で返してください:
{
  "subject": "件名",
  "body": "本文",
  "customPoint": "チャンネルに合わせて入れた一言",
  "rationale": "この文面にした理由"
}
    `.trim();

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
      instructions:
        "日本語で、丁寧かつ自然な営業メールを作成してください。対象チャンネルに触れた個別化を必ず入れ、JSON 以外は返さないでください。",
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
    return fallbackGenerateSalesEmailDraft(target, template);
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
以下の YouTube チャンネル情報と直近動画を分析し、日本語の分析コメントを JSON で返してください。

チャンネル名: ${channel.title}
カテゴリ推定: ${channel.categoryGuess || "不明"}
登録者数: ${channel.subscriberCount}
直近10本平均再生: ${channel.avgViewsLast10 || 0}
直近10本中央値: ${channel.medianViewsLast10 || 0}
直近30日投稿数: ${channel.postsLast30 || 0}
Shorts比率: ${channel.shortsRatio || 0}
推定月間再生数: ${channel.monthlyViewsEstimate || 0}
想定月収 base: ${channel.estimatedMonthlyIncomeBase || 0}
競合度スコア: ${channel.competitionScore || 0}
成長性スコア: ${channel.growthScore || 0}
参入魅力度スコア: ${channel.opportunityScore || 0}
概要: ${channel.description}
直近動画:
${videos
  .slice(0, 10)
  .map((video) => `- ${video.title} / ${video.viewCount} views / shorts=${video.isShorts}`)
  .join("\n")}

以下の JSON 形式で返してください:
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
        "YouTube の競合分析アシスタントとして、日本語で簡潔かつ具体的に分析してください。JSON 以外は返さないでください。",
      input: prompt,
    });

    const outputText = response.output_text?.trim();
    if (!outputText) {
      throw new Error("OpenAI から分析結果を取得できませんでした。");
    }

    return extractJsonPayload<RivalAnalysisComment>(outputText);
  } catch {
    return buildRivalFallbackComment(channel, videos);
  }
}
