import { NextResponse } from "next/server";

import { saveSearchResults } from "@/lib/channels";
import { searchFormSchema } from "@/lib/schemas";
import { getAppSettings } from "@/lib/settings";
import { searchChannels } from "@/lib/youtube";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = searchFormSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message || "検索条件が不正です。",
        },
        { status: 400 },
      );
    }

    const settings = await getAppSettings();
    const searchResult = await searchChannels(parsed.data, settings);
    const saveResult = await saveSearchResults(parsed.data, searchResult);

    return NextResponse.json({
      ok: true,
      source: searchResult.source,
      fetchedCount: searchResult.items.length,
      savedCount: saveResult.savedCount,
      expandedQueries: searchResult.expandedQueries,
      expandedQueryCount: searchResult.expandedQueryCount,
      pagesFetched: searchResult.pagesFetched,
      quotaUsed: searchResult.quotaUsed,
      errors: [...searchResult.errors, ...saveResult.errors],
      nextPath: `/channels?mode=${parsed.data.mode}&sourceQuery=${encodeURIComponent(parsed.data.keyword)}`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "検索中にエラーが発生しました。",
      },
      { status: 500 },
    );
  }
}
