import { NextResponse } from "next/server";

import { generateSalesEmailDraft } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { getOutreachTemplateById } from "@/lib/outreach";
import { emailDraftGenerateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

async function resolveChannelTarget(channelId: string | null | undefined) {
  if (!channelId) {
    return null;
  }

  const select = {
    id: true,
    channelId: true,
    title: true,
    description: true,
    categoryGuess: true,
    regionGuess: true,
    channelUrl: true,
    subscriberCount: true,
    videoCount: true,
    contactEmail: true,
    bestContactValue: true,
  } as const;

  const byInternalId = await prisma.channel.findUnique({
    where: { id: channelId },
    select,
  });

  if (byInternalId) {
    return byInternalId;
  }

  return prisma.channel.findUnique({
    where: { channelId },
    select,
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = emailDraftGenerateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message || "営業メール生成リクエストが不正です。",
      },
      { status: 400 },
    );
  }

  const template = await getOutreachTemplateById(parsed.data.templateId);
  if (!template) {
    return NextResponse.json({ error: "テンプレートが見つかりません。" }, { status: 404 });
  }

  const resolvedChannel = await resolveChannelTarget(parsed.data.target.channelId);
  const target = {
    ...parsed.data.target,
    channelId: resolvedChannel?.id || parsed.data.target.channelId || null,
    title: resolvedChannel?.title || parsed.data.target.title,
    description: resolvedChannel?.description || parsed.data.target.description || "",
    categoryGuess: resolvedChannel?.categoryGuess || parsed.data.target.categoryGuess || null,
    regionGuess: resolvedChannel?.regionGuess || parsed.data.target.regionGuess || null,
    channelUrl: resolvedChannel?.channelUrl || parsed.data.target.channelUrl || null,
    subscriberCount: resolvedChannel?.subscriberCount ?? parsed.data.target.subscriberCount ?? null,
    videoCount: resolvedChannel?.videoCount ?? parsed.data.target.videoCount ?? null,
    email:
      parsed.data.target.email ||
      resolvedChannel?.contactEmail ||
      (resolvedChannel?.bestContactValue?.includes("@") ? resolvedChannel.bestContactValue : "") ||
      "",
  };

  if (!target.email) {
    return NextResponse.json({ error: "対象メールアドレスが見つかりません。" }, { status: 400 });
  }

  const generated = await generateSalesEmailDraft(target, template);
  const usedChannelSignals = [
    `チャンネル名: ${target.title}`,
    `カテゴリ: ${target.categoryGuess || "未設定"}`,
    `地域: ${target.regionGuess || "未設定"}`,
    `概要文あり: ${target.description ? "yes" : "no"}`,
    `登録者数: ${target.subscriberCount ?? 0}`,
    `動画数: ${target.videoCount ?? 0}`,
  ];

  return NextResponse.json({
    draft: {
      channelId: target.channelId,
      channelTitle: target.title,
      email: target.email,
      subject: generated.subject,
      body: generated.body,
      status: "draft",
      sourceType: target.sourceType,
      templateId: template.id,
      customPoint: generated.customPoint,
      rationale: generated.rationale,
      personalizationPoints: generated.customPoint,
      usedChannelSignals,
      confidenceNote: generated.rationale,
    },
  });
}
