import { getAllChannelsForExport } from "@/lib/channels";
import { buildChannelsCsv } from "@/lib/csv";
import { channelFiltersSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = channelFiltersSchema.safeParse(Object.fromEntries(searchParams.entries()));

  if (!parsed.success) {
    return new Response("CSV 出力条件が不正です。", { status: 400 });
  }

  const rows = await getAllChannelsForExport(parsed.data);
  const csv = buildChannelsCsv(rows);

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tubelead-channels-${Date.now()}.csv"`,
    },
  });
}
