import { NextResponse } from "next/server";

import { getChannelList } from "@/lib/channels";
import { channelFiltersSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = channelFiltersSchema.safeParse(Object.fromEntries(searchParams.entries()));

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message || "一覧フィルタが不正です。",
      },
      { status: 400 },
    );
  }

  const data = await getChannelList(parsed.data, { includeAutoScanIds: true });
  return NextResponse.json(data);
}
