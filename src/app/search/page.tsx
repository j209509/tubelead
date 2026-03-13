import { AppShell } from "@/components/layout/app-shell";
import { SearchFormPanel } from "@/components/search/search-form-panel";
import { getRecentSearchHistory } from "@/lib/channels";
import { searchFormSchema, type SearchFormInput } from "@/lib/schemas";

export const dynamic = "force-dynamic";

const DEFAULT_VALUES: SearchFormInput = {
  keyword: "コーギー",
  mode: "sales",
  minSubscribers: 1000,
  minVideos: 10,
  maxResults: 300,
  order: "relevance",
  hasContactOnly: false,
  preferJapanese: true,
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const parsed = searchFormSchema.safeParse(params);
  const defaults = parsed.success ? parsed.data : DEFAULT_VALUES;
  const recentHistory = await getRecentSearchHistory(6);

  return (
    <AppShell
      title="チャンネル検索"
      description="検索後は基本情報をすぐ一覧化し、動画分析や連絡先補完を順次反映します。"
    >
      <SearchFormPanel
        defaultValues={defaults}
        recentHistory={recentHistory}
        youtubeConfigured={Boolean(process.env.YOUTUBE_API_KEY)}
      />
    </AppShell>
  );
}
