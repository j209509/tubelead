import { NextResponse } from "next/server";

import { getChannelById, updateChannelMeta } from "@/lib/channels";
import { channelUpdateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getChannelById(id);

  if (!detail) {
    return NextResponse.json({ error: "チャンネルが見つかりません。" }, { status: 404 });
  }

  return NextResponse.json(detail);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const parsed = channelUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message || "更新内容が不正です。",
      },
      { status: 400 },
    );
  }

  const channel = await updateChannelMeta(id, parsed.data);
  return NextResponse.json({ channel });
}
