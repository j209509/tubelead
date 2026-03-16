import { prisma } from "@/lib/prisma";
import { markGmailDraftFailed, markGmailDraftSaved } from "@/lib/outreach";

const GOOGLE_AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GMAIL_DRAFTS_ENDPOINT = "https://gmail.googleapis.com/gmail/v1/users/me/drafts";
const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.compose";

type TokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
};

function getGoogleClientId() {
  const value = process.env.GOOGLE_CLIENT_ID;
  if (!value) {
    throw new Error("GOOGLE_CLIENT_ID is not set.");
  }
  return value;
}

function getGoogleClientSecret() {
  const value = process.env.GOOGLE_CLIENT_SECRET;
  if (!value) {
    throw new Error("GOOGLE_CLIENT_SECRET is not set.");
  }
  return value;
}

export function getGmailRedirectUri(origin: string) {
  return `${origin}/api/gmail/callback`;
}

function encodeState(returnTo: string) {
  return Buffer.from(JSON.stringify({ returnTo }), "utf-8").toString("base64url");
}

function decodeState(value: string | null) {
  if (!value) {
    return { returnTo: "/mail-drafts" };
  }

  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf-8")) as {
      returnTo?: string;
    };
    return {
      returnTo: parsed.returnTo || "/mail-drafts",
    };
  } catch {
    return { returnTo: "/mail-drafts" };
  }
}

async function persistTokens(tokenResponse: TokenResponse) {
  const expiresAt =
    typeof tokenResponse.expires_in === "number"
      ? new Date(Date.now() + tokenResponse.expires_in * 1000)
      : null;

  await prisma.appSetting.upsert({
    where: { id: "default" },
    update: {
      gmailAccessToken: tokenResponse.access_token,
      gmailRefreshToken: tokenResponse.refresh_token || undefined,
      gmailTokenExpiry: expiresAt,
    },
    create: {
      id: "default",
      gmailAccessToken: tokenResponse.access_token,
      gmailRefreshToken: tokenResponse.refresh_token || null,
      gmailTokenExpiry: expiresAt,
    },
  });
}

async function requestToken(params: URLSearchParams) {
  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
    cache: "no-store",
  });

  const data = (await response.json()) as TokenResponse & { error_description?: string };

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || "Google OAuth token exchange failed.");
  }

  return data;
}

export function buildGmailAuthUrl(origin: string, returnTo = "/mail-drafts") {
  const params = new URLSearchParams({
    client_id: getGoogleClientId(),
    redirect_uri: getGmailRedirectUri(origin),
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: GMAIL_SCOPE,
    state: encodeState(returnTo),
  });

  return `${GOOGLE_AUTH_BASE}?${params.toString()}`;
}

export async function exchangeGmailCodeForTokens(code: string, origin: string) {
  const params = new URLSearchParams({
    code,
    client_id: getGoogleClientId(),
    client_secret: getGoogleClientSecret(),
    redirect_uri: getGmailRedirectUri(origin),
    grant_type: "authorization_code",
  });

  const tokenResponse = await requestToken(params);
  await persistTokens(tokenResponse);
}

export async function getGmailConnectionStatus() {
  const settings = await prisma.appSetting.findUnique({
    where: { id: "default" },
    select: {
      gmailAccessToken: true,
      gmailRefreshToken: true,
      gmailTokenExpiry: true,
    },
  });

  return {
    connected: Boolean(settings?.gmailAccessToken || settings?.gmailRefreshToken),
    expiresAt: settings?.gmailTokenExpiry ? settings.gmailTokenExpiry.toISOString() : null,
  };
}

async function refreshGmailAccessToken(refreshToken: string) {
  const params = new URLSearchParams({
    client_id: getGoogleClientId(),
    client_secret: getGoogleClientSecret(),
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const tokenResponse = await requestToken(params);
  await persistTokens({
    ...tokenResponse,
    refresh_token: tokenResponse.refresh_token || refreshToken,
  });

  return tokenResponse.access_token;
}

export async function getValidGmailAccessToken() {
  const settings = await prisma.appSetting.findUnique({
    where: { id: "default" },
    select: {
      gmailAccessToken: true,
      gmailRefreshToken: true,
      gmailTokenExpiry: true,
    },
  });

  const tokenExpiresSoon =
    !settings?.gmailTokenExpiry || settings.gmailTokenExpiry.getTime() <= Date.now() + 60_000;

  if (settings?.gmailAccessToken && !tokenExpiresSoon) {
    return settings.gmailAccessToken;
  }

  if (settings?.gmailRefreshToken) {
    return refreshGmailAccessToken(settings.gmailRefreshToken);
  }

  throw new Error("Gmail is not connected.");
}

function encodeSubject(subject: string) {
  return `=?UTF-8?B?${Buffer.from(subject, "utf-8").toString("base64")}?=`;
}

function buildRawMimeMessage(to: string, subject: string, body: string) {
  const message = [
    `To: ${to}`,
    `Subject: ${encodeSubject(subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    body,
  ].join("\r\n");

  return Buffer.from(message, "utf-8").toString("base64url");
}

export async function saveDraftToGmail(draftId: string) {
  const draft = await prisma.outreachDraft.findUnique({
    where: { id: draftId },
    include: {
      template: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!draft) {
    throw new Error("下書きが見つかりません。");
  }

  if (!draft.email) {
    throw new Error("宛先メールアドレスがありません。");
  }

  try {
    const accessToken = await getValidGmailAccessToken();
    const raw = buildRawMimeMessage(draft.email, draft.subject, draft.body);

    const response = await fetch(GMAIL_DRAFTS_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          raw,
        },
      }),
      cache: "no-store",
    });

    const data = (await response.json()) as { id?: string; error?: { message?: string } };

    if (!response.ok || !data.id) {
      throw new Error(data.error?.message || "Gmail への下書き保存に失敗しました。");
    }

    return markGmailDraftSaved(draft.id, data.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gmail への下書き保存に失敗しました。";
    await markGmailDraftFailed(draft.id, message);
    throw error;
  }
}

export function getReturnToFromState(state: string | null) {
  return decodeState(state).returnTo;
}
