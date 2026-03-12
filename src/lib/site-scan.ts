import * as cheerio from "cheerio";

import type { ContactEvidence, ExternalScanLogEntry, SocialLink } from "@/lib/channel-types";
import {
  buildSocialLinks,
  dedupeEvidence,
  dedupeSocialLinks,
  extractEmailsFromText,
  isContactFormCandidate,
} from "@/lib/contact-utils";
import { normalizeUrl, uniqueStrings } from "@/lib/utils";

const DEFAULT_MAX_PAGES = 4;
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_RATE_LIMIT_MS = 1200;
const REQUEST_HEADERS = {
  "User-Agent": "TubeLeadBot/1.0 (+local contact discovery)",
  Accept: "text/html,application/xhtml+xml",
};

const hostTimers = new Map<string, number>();

export type ScanExternalSiteOptions = {
  maxPages?: number;
  timeoutMs?: number;
  rateLimitMs?: number;
};

export type ScanExternalSiteResult = {
  status: string;
  errorMessage: string | null;
  siteEmails: string[];
  contactFormUrls: string[];
  socialLinks: SocialLink[];
  officialWebsiteUrls: string[];
  companyNameGuess: string | null;
  addressGuess: string | null;
  phoneGuess: string | null;
  robotsAllowed: boolean;
  evidence: ContactEvidence[];
  logs: ExternalScanLogEntry[];
};

async function wait(ms: number) {
  if (ms <= 0) {
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function limitedFetch(url: string, timeoutMs: number, rateLimitMs: number) {
  const parsed = new URL(url);
  const key = parsed.origin;
  const last = hostTimers.get(key) || 0;
  const delay = Math.max(rateLimitMs - (Date.now() - last), 0);
  await wait(delay);
  hostTimers.set(key, Date.now());

  return fetch(url, {
    headers: REQUEST_HEADERS,
    signal: AbortSignal.timeout(timeoutMs),
    next: { revalidate: 0 },
  });
}

function parseRobotsTxt(text: string, targetPath: string) {
  const lines = text.split(/\r?\n/);
  let currentMatches = false;
  const disallow: string[] = [];
  const allow: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.split("#")[0]?.trim();
    if (!line) {
      continue;
    }

    const [key, ...rest] = line.split(":");
    const value = rest.join(":").trim();
    if (!key || !value) {
      continue;
    }

    if (key.toLowerCase() === "user-agent") {
      currentMatches = value === "*";
      continue;
    }

    if (!currentMatches) {
      continue;
    }

    if (key.toLowerCase() === "disallow") {
      disallow.push(value);
    }

    if (key.toLowerCase() === "allow") {
      allow.push(value);
    }
  }

  const allowed = allow
    .filter((rule) => targetPath.startsWith(rule))
    .sort((a, b) => b.length - a.length)[0];
  const blocked = disallow
    .filter((rule) => rule && targetPath.startsWith(rule))
    .sort((a, b) => b.length - a.length)[0];

  if (!blocked) {
    return true;
  }

  return Boolean(allowed && allowed.length >= blocked.length);
}

async function isRobotsAllowed(url: string, timeoutMs: number, rateLimitMs: number) {
  try {
    const parsed = new URL(url);
    const robotsUrl = `${parsed.origin}/robots.txt`;
    const response = await limitedFetch(robotsUrl, timeoutMs, rateLimitMs);

    if (!response.ok) {
      return true;
    }

    const text = await response.text();
    return parseRobotsTxt(text, parsed.pathname || "/");
  } catch {
    return true;
  }
}

function absoluteUrl(baseUrl: string, value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    return normalizeUrl(new URL(value, baseUrl).toString());
  } catch {
    return null;
  }
}

function collectCandidateLinks($: cheerio.CheerioAPI, pageUrl: string, rootOrigin: string) {
  const anchorCandidates = $("a[href]")
    .toArray()
    .map((element) => {
      const href = $(element).attr("href");
      const text = $(element).text().trim();
      const url = absoluteUrl(pageUrl, href);
      return { href: url, text };
    })
    .filter((item): item is { href: string; text: string } => Boolean(item.href))
    .filter((item) => item.href.startsWith(rootOrigin))
    .filter((item) =>
      ["contact", "about", "company", "inquiry", "お問い合わせ", "会社概要", "運営者情報"].some((keyword) =>
        `${item.href} ${item.text}`.toLowerCase().includes(keyword.toLowerCase()),
      ),
    )
    .map((item) => item.href);

  const fixedCandidates = ["/", "/contact", "/about", "/company", "/inquiry", "/contact-us", "/profile", "/shop"]
    .map((path) => absoluteUrl(rootOrigin, path))
    .filter((value): value is string => Boolean(value));

  return uniqueStrings([...fixedCandidates, ...anchorCandidates]);
}

function extractPhone(text: string) {
  return text.match(/(?:\+?81[-\s]?)?(?:0\d{1,4}[-\s]?\d{1,4}[-\s]?\d{3,4})/)?.[0] || null;
}

function extractAddress(text: string) {
  return (
    text.match(/(?:〒\d{3}-\d{4}\s*)?(東京都|北海道|(?:京都|大阪)府|.{2,3}県).{0,50}/)?.[0]?.trim() || null
  );
}

function extractCompanyName($: cheerio.CheerioAPI) {
  const candidates = [
    $('meta[property="og:site_name"]').attr("content"),
    $("title").first().text(),
    $("h1").first().text(),
  ]
    .map((value) => value?.trim())
    .filter(Boolean);

  return candidates[0] || null;
}

export async function scanExternalSite(url: string, options: ScanExternalSiteOptions = {}): Promise<ScanExternalSiteResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const rateLimitMs = options.rateLimitMs ?? DEFAULT_RATE_LIMIT_MS;
  const maxPages = options.maxPages ?? DEFAULT_MAX_PAGES;
  const normalizedTarget = normalizeUrl(url);

  let parsed: URL;
  try {
    parsed = new URL(normalizedTarget);
  } catch {
    return {
      status: "invalid_url",
      errorMessage: "URL が不正です。",
      siteEmails: [],
      contactFormUrls: [],
      socialLinks: [],
      officialWebsiteUrls: [],
      companyNameGuess: null,
      addressGuess: null,
      phoneGuess: null,
      robotsAllowed: false,
      evidence: [],
      logs: [
        {
          scannedUrl: normalizedTarget,
          status: "invalid_url",
          errorMessage: "URL が不正です。",
          extractedEmails: [],
          extractedFormUrls: [],
          extractedSocialLinks: [],
          companyNameGuess: null,
          addressGuess: null,
          phoneGuess: null,
          robotsAllowed: false,
        },
      ],
    };
  }

  const robotsAllowed = await isRobotsAllowed(normalizedTarget, timeoutMs, rateLimitMs);
  if (!robotsAllowed) {
    return {
      status: "blocked_by_robots",
      errorMessage: "robots.txt により巡回を中止しました。",
      siteEmails: [],
      contactFormUrls: [],
      socialLinks: [],
      officialWebsiteUrls: [parsed.origin],
      companyNameGuess: null,
      addressGuess: null,
      phoneGuess: null,
      robotsAllowed: false,
      evidence: [],
      logs: [
        {
          scannedUrl: normalizedTarget,
          status: "blocked_by_robots",
          errorMessage: "robots.txt により巡回を中止しました。",
          extractedEmails: [],
          extractedFormUrls: [],
          extractedSocialLinks: [],
          companyNameGuess: null,
          addressGuess: null,
          phoneGuess: null,
          robotsAllowed: false,
        },
      ],
    };
  }

  const queue = [normalizeUrl(parsed.origin)];
  if (normalizedTarget !== normalizeUrl(parsed.origin)) {
    queue.unshift(normalizedTarget);
  }

  const visited = new Set<string>();
  const emails: string[] = [];
  const forms: string[] = [];
  const socialLinks: SocialLink[] = [];
  const evidence: ContactEvidence[] = [];
  const logs: ExternalScanLogEntry[] = [];
  let companyNameGuess: string | null = null;
  let addressGuess: string | null = null;
  let phoneGuess: string | null = null;
  let overallStatus = "success";
  let overallError: string | null = null;

  while (queue.length > 0 && visited.size < maxPages) {
    const pageUrl = queue.shift();
    if (!pageUrl || visited.has(pageUrl)) {
      continue;
    }

    visited.add(pageUrl);

    try {
      const response = await limitedFetch(pageUrl, timeoutMs, rateLimitMs);
      if (!response.ok) {
        logs.push({
          scannedUrl: pageUrl,
          status: `http_${response.status}`,
          errorMessage: `HTTP ${response.status}`,
          extractedEmails: [],
          extractedFormUrls: [],
          extractedSocialLinks: [],
          companyNameGuess: null,
          addressGuess: null,
          phoneGuess: null,
          robotsAllowed: true,
        });
        overallStatus = "partial";
        overallError = overallError || `HTTP ${response.status}`;
        continue;
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      const bodyText = $.text();
      const pageEmails = extractEmailsFromText(bodyText);
      const pageLinks = $("a[href]")
        .toArray()
        .map((element) => absoluteUrl(pageUrl, $(element).attr("href")))
        .filter((value): value is string => Boolean(value));
      const pageForms = uniqueStrings(
        [
          ...$("form[action]")
            .toArray()
            .map((element) => absoluteUrl(pageUrl, $(element).attr("action")))
            .filter((value): value is string => Boolean(value)),
          ...pageLinks.filter(isContactFormCandidate),
        ].filter(Boolean) as string[],
      );
      const pageSocialLinks = buildSocialLinks(pageLinks, "external_site", pageUrl);

      emails.push(...pageEmails);
      forms.push(...pageForms);
      socialLinks.push(...pageSocialLinks);

      evidence.push(
        ...pageEmails.map((email) => ({
          sourceType: "external_site" as const,
          sourceUrl: pageUrl,
          matchedValue: email,
          field: "email" as const,
          confidence: 0.96,
        })),
      );
      evidence.push(
        ...pageForms.map((formUrl) => ({
          sourceType: "external_site" as const,
          sourceUrl: pageUrl,
          matchedValue: formUrl,
          field: "form" as const,
          confidence: 0.91,
        })),
      );
      evidence.push(
        ...pageSocialLinks.map((link) => ({
          sourceType: "external_site" as const,
          sourceUrl: pageUrl,
          matchedValue: link.url,
          field: "social" as const,
          confidence: 0.78,
        })),
      );

      companyNameGuess = companyNameGuess || extractCompanyName($);
      addressGuess = addressGuess || extractAddress(bodyText);
      phoneGuess = phoneGuess || extractPhone(bodyText);

      logs.push({
        scannedUrl: pageUrl,
        status: "success",
        errorMessage: null,
        extractedEmails: pageEmails,
        extractedFormUrls: pageForms,
        extractedSocialLinks: pageSocialLinks,
        companyNameGuess,
        addressGuess,
        phoneGuess,
        robotsAllowed: true,
      });

      for (const candidate of collectCandidateLinks($, pageUrl, parsed.origin)) {
        if (!visited.has(candidate)) {
          queue.push(candidate);
        }
      }
    } catch (error) {
      logs.push({
        scannedUrl: pageUrl,
        status: "error",
        errorMessage: error instanceof Error ? error.message : "ページ取得に失敗しました。",
        extractedEmails: [],
        extractedFormUrls: [],
        extractedSocialLinks: [],
        companyNameGuess: null,
        addressGuess: null,
        phoneGuess: null,
        robotsAllowed: true,
      });
      overallStatus = "partial";
      overallError = overallError || (error instanceof Error ? error.message : "ページ取得に失敗しました。");
    }
  }

  return {
    status: overallStatus,
    errorMessage: overallError,
    siteEmails: uniqueStrings(emails),
    contactFormUrls: uniqueStrings(forms),
    socialLinks: dedupeSocialLinks(socialLinks),
    officialWebsiteUrls: [normalizeUrl(parsed.origin)],
    companyNameGuess,
    addressGuess,
    phoneGuess,
    robotsAllowed: true,
    evidence: dedupeEvidence(evidence),
    logs,
  };
}
