import { NextResponse } from "next/server";

import { buildGmailAuthUrl } from "@/lib/gmail";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = url.searchParams.get("returnTo") || "/mail-drafts";
  const redirectUrl = buildGmailAuthUrl(url.origin, returnTo);

  return NextResponse.redirect(redirectUrl);
}
