import { NextResponse } from "next/server";

import { createOutreachTemplate, getOutreachTemplates } from "@/lib/outreach";
import { outreachTemplateSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function GET() {
  const templates = await getOutreachTemplates();
  return NextResponse.json({ templates });
}

export async function POST(request: Request) {
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

  const template = await createOutreachTemplate(parsed.data);
  return NextResponse.json({ template });
}
