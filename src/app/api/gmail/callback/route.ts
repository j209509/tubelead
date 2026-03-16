import { NextResponse } from "next/server";

import { exchangeGmailCodeForTokens, getReturnToFromState } from "@/lib/gmail";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const returnTo = getReturnToFromState(state);

  if (error) {
    return NextResponse.redirect(new URL(`${returnTo}?gmail=error`, url.origin));
  }

  if (!code) {
    return NextResponse.redirect(new URL(`${returnTo}?gmail=missing_code`, url.origin));
  }

  try {
    await exchangeGmailCodeForTokens(code, url.origin);
    return NextResponse.redirect(new URL(`${returnTo}?gmail=connected`, url.origin));
  } catch {
    return NextResponse.redirect(new URL(`${returnTo}?gmail=failed`, url.origin));
  }
}
