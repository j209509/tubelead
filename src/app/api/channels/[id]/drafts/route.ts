import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { draftCreateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const drafts = await prisma.outreachDraft.findMany({
    where: { channelId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    drafts: drafts.map((draft) => ({
      id: draft.id,
      channelId: draft.channelId,
      channelTitle: draft.channelTitle,
      email: draft.email,
      subject: draft.subject,
      body: draft.body,
      status: draft.status,
      sourceType: draft.sourceType,
      templateId: draft.templateId,
      customPoint: draft.customPoint || "",
      rationale: draft.rationale || "",
      createdAt: draft.createdAt.toISOString(),
      updatedAt: draft.updatedAt.toISOString(),
    })),
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const parsed = draftCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message || "下書き内容が不正です。",
      },
      { status: 400 },
    );
  }

  const channel = await prisma.channel.findUnique({
    where: { id },
    select: {
      title: true,
      contactEmail: true,
      bestContactValue: true,
    },
  });

  if (!channel) {
    return NextResponse.json({ error: "チャンネルが見つかりません。" }, { status: 404 });
  }

  const draft = await prisma.outreachDraft.create({
    data: {
      channelId: id,
      channelTitle: channel.title,
      email:
        channel.contactEmail ||
        (channel.bestContactValue?.includes("@") ? channel.bestContactValue : null),
      subject: parsed.data.subject,
      body: parsed.data.body,
      status: "draft",
      sourceType: "channel_detail",
      customPoint: parsed.data.customPoint || "",
      rationale: parsed.data.rationale || "",
    },
  });

  return NextResponse.json({
    draft: {
      id: draft.id,
      channelId: draft.channelId,
      channelTitle: draft.channelTitle,
      email: draft.email,
      subject: draft.subject,
      body: draft.body,
      status: draft.status,
      sourceType: draft.sourceType,
      templateId: draft.templateId,
      customPoint: draft.customPoint || "",
      rationale: draft.rationale || "",
      createdAt: draft.createdAt.toISOString(),
      updatedAt: draft.updatedAt.toISOString(),
    },
  });
}
