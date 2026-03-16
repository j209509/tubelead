import { NextResponse } from "next/server";

import { getOutreachDraftById, updateOutreachDraft } from "@/lib/outreach";
import { emailDraftUpdateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const draft = await getOutreachDraftById(id);

  if (!draft) {
    return NextResponse.json({ error: "下書きが見つかりません。" }, { status: 404 });
  }

  return NextResponse.json({ draft });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const parsed = emailDraftUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message || "下書き更新データが不正です。",
      },
      { status: 400 },
    );
  }

  const draft = await updateOutreachDraft(id, parsed.data);
  return NextResponse.json({ draft });
}
