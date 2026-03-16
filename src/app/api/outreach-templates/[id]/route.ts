import { NextResponse } from "next/server";

import { updateOutreachTemplate } from "@/lib/outreach";
import { outreachTemplateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const parsed = outreachTemplateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message || "テンプレート入力が不正です。",
      },
      { status: 400 },
    );
  }

  const template = await updateOutreachTemplate(id, parsed.data);
  return NextResponse.json({ template });
}
