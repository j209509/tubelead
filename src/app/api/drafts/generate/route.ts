import { NextResponse } from "next/server";

import { generateOutreachDraft } from "@/lib/ai";
import { getChannelById } from "@/lib/channels";
import { getCurrentPlan, isDraftGenerationLocked } from "@/lib/plan";
import { prisma } from "@/lib/prisma";
import { draftGenerateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = draftGenerateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message || "下書き生成条件が不正です。",
      },
      { status: 400 },
    );
  }

  const totalDrafts = await prisma.outreachDraft.count();
  const plan = getCurrentPlan();
  if (isDraftGenerationLocked(totalDrafts, plan)) {
    return NextResponse.json(
      {
        error: "無料版では AI 下書き生成は 3 件までです。",
        requiresUpgrade: true,
      },
      { status: 403 },
    );
  }

  const detail = await getChannelById(parsed.data.channelId);
  if (!detail) {
    return NextResponse.json({ error: "対象チャンネルが見つかりません。" }, { status: 404 });
  }

  const generated = await generateOutreachDraft(detail.channel, {
    serviceName: parsed.data.serviceName,
    serviceDescription: parsed.data.serviceDescription,
    defaultPitch: parsed.data.defaultPitch,
    tone: parsed.data.tone,
    lengthPreference: parsed.data.lengthPreference,
  });

  const saved = await prisma.outreachDraft.create({
    data: {
      channelId: parsed.data.channelId,
      subject: generated.subject,
      body: generated.body,
      customPoint: generated.customPoint,
      rationale: generated.rationale,
    },
  });

  return NextResponse.json({
    plan,
    draft: {
      id: saved.id,
      subject: saved.subject,
      body: saved.body,
      customPoint: saved.customPoint || "",
      rationale: saved.rationale || "",
      createdAt: saved.createdAt.toISOString(),
      updatedAt: saved.updatedAt.toISOString(),
    },
  });
}
