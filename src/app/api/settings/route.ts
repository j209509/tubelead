import { NextResponse } from "next/server";

import { settingsSchema } from "@/lib/schemas";
import { getAppSettings, updateAppSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getAppSettings();
  return NextResponse.json(settings);
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const parsed = settingsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message || "設定値が不正です。",
      },
      { status: 400 },
    );
  }

  const settings = await updateAppSettings(parsed.data);
  return NextResponse.json(settings);
}
