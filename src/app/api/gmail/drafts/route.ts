import { NextResponse } from "next/server";

import { saveDraftToGmail } from "@/lib/gmail";
import { gmailDraftBatchSaveSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = gmailDraftBatchSaveSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message || "Gmail 下書き保存データが不正です。",
      },
      { status: 400 },
    );
  }

  const drafts = [];
  const errors = [];

  for (const draftId of parsed.data.draftIds) {
    try {
      const draft = await saveDraftToGmail(draftId);
      drafts.push(draft);
    } catch (error) {
      errors.push({
        draftId,
        error: error instanceof Error ? error.message : "Gmail への下書き保存に失敗しました。",
      });
    }
  }

  return NextResponse.json({
    drafts,
    errors,
  });
}
