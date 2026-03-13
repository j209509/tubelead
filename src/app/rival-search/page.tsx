import { AppShell } from "@/components/layout/app-shell";
import { RivalSearchPanel } from "@/components/search/rival-search-panel";
import { getRecentSearchHistory } from "@/lib/channels";
import { searchFormSchema, type SearchFormInput } from "@/lib/schemas";

export const dynamic = "force-dynamic";

const DEFAULT_VALUES: SearchFormInput = {
  keyword: "コーギー",
  mode: "rival",
  minSubscribers: 0,
  minVideos: 0,
  maxResults: 50,
  order: "relevance",
  hasContactOnly: false,
  preferJapanese: true,
};

export default async function RivalSearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const parsed = searchFormSchema.safeParse(params);
  const defaults = parsed.success
    ? {
        ...parsed.data,
        mode: "rival" as const,
        hasContactOnly: false,
      }
    : DEFAULT_VALUES;
  const recentHistory = await getRecentSearchHistory(6);

  return (
    <AppShell>
      <RivalSearchPanel defaultValues={defaults} recentHistory={recentHistory} />
    </AppShell>
  );
}
