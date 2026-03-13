import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { getLatestSearchInputByKeyword, saveSearchResults } from "@/lib/channels";
import { prisma } from "@/lib/prisma";
import { getAppSettings } from "@/lib/settings";
import { searchChannels } from "@/lib/youtube";

export const dynamic = "force-dynamic";

const expandSearchSchema = z.object({
  keyword: z.string().trim().min(1),
  mode: z.literal("sales").default("sales"),
  currentTotal: z.coerce.number().int().min(0).default(0),
  targetEmails: z.coerce.number().int().min(1).max(1000).default(100),
});

const SALES_EXPAND_STEP = 250;
const SALES_EXPAND_MAX_RESULTS = 1500;

function buildSourceQueryWhere(keyword: string) {
  return {
    OR: [{ sourceQuery: keyword }, { sourceQueries: { contains: keyword } }],
  } satisfies Prisma.ChannelWhereInput;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = expandSearchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "検索拡張の条件が不正です。" },
        { status: 400 },
      );
    }

    const { keyword, currentTotal, targetEmails } = parsed.data;
    const baseInput = await getLatestSearchInputByKeyword(keyword, "sales");

    if (!baseInput) {
      return NextResponse.json(
        { error: "元の検索条件が見つかりませんでした。検索ページからやり直してください。" },
        { status: 404 },
      );
    }

    const beforeCounts = await prisma.channel.aggregate({
      where: buildSourceQueryWhere(keyword),
      _count: { _all: true },
    });
    const nextMaxResults = Math.min(
      SALES_EXPAND_MAX_RESULTS,
      Math.max(baseInput.maxResults, currentTotal) + SALES_EXPAND_STEP,
    );

    if (nextMaxResults <= Math.max(baseInput.maxResults, currentTotal)) {
      return NextResponse.json({
        ok: true,
        exhausted: true,
        newChannelsAdded: 0,
      });
    }

    const settings = await getAppSettings();
    const pagesNeeded = Math.ceil(nextMaxResults / 50) + 2;
    const searchResult = await searchChannels(
      {
        ...baseInput,
        keyword,
        maxResults: nextMaxResults,
      },
      {
        ...settings,
        searchMaxPages: Math.max(settings.searchMaxPages, Math.min(30, pagesNeeded)),
        searchQuotaBudgetPerRun: Math.max(settings.searchQuotaBudgetPerRun, Math.min(3000, pagesNeeded * 100)),
      },
    );

    await saveSearchResults(
      {
        ...baseInput,
        keyword,
        maxResults: nextMaxResults,
      },
      searchResult,
      { recordHistory: false },
    );

    const [afterTotal, emailCount] = await Promise.all([
      prisma.channel.count({ where: buildSourceQueryWhere(keyword) }),
      prisma.channel.count({
        where: {
          AND: [buildSourceQueryWhere(keyword), { hasContactEmail: true }],
        },
      }),
    ]);

    const newChannelsAdded = afterTotal - (beforeCounts._count._all || 0);
    const exhausted =
      nextMaxResults >= SALES_EXPAND_MAX_RESULTS ||
      newChannelsAdded <= 0 ||
      searchResult.items.length < Math.min(nextMaxResults, SALES_EXPAND_MAX_RESULTS);

    return NextResponse.json({
      ok: true,
      fetchedCount: searchResult.items.length,
      newChannelsAdded,
      totalCount: afterTotal,
      emailCount,
      goalReached: emailCount >= targetEmails,
      exhausted,
      pagesFetched: searchResult.pagesFetched,
      quotaUsed: searchResult.quotaUsed,
      errors: searchResult.errors,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "検索拡張に失敗しました。",
      },
      { status: 500 },
    );
  }
}
