import { NextResponse } from "next/server";

import { generateRivalAnalysisComment } from "@/lib/ai";
import { getChannelById } from "@/lib/channels";

export const dynamic = "force-dynamic";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getChannelById(id);

  if (!detail) {
    return NextResponse.json({ error: "チャンネルが見つかりません。" }, { status: 404 });
  }

  const comment = await generateRivalAnalysisComment(detail.channel, detail.videos);

  return NextResponse.json({
    ok: true,
    comment,
  });
}
