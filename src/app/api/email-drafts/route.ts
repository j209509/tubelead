import { NextResponse } from "next/server";

import { saveOutreachDraftBatch } from "@/lib/outreach";
import { emailDraftBatchSaveSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = emailDraftBatchSaveSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message || "下書き保存データが不正です。",
      },
      { status: 400 },
    );
  }

  const result = await saveOutreachDraftBatch(parsed.data.drafts);

  return NextResponse.json({
    drafts: result.drafts,
    errors: result.errors,
  });
}
