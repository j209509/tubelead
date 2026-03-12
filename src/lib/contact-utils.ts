import type {
  BestContactMethodValue,
  ContactTypeValue,
} from "@/lib/constants";
import type { ContactEvidence, ContactSourceType, SocialLink, SocialPlatform } from "@/lib/channel-types";
import { normalizeUrl, uniqueStrings } from "@/lib/utils";

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const URL_REGEX = /https?:\/\/[^\s<>"')]+/gi;

const CONTACT_PATH_KEYWORDS = [
  "contact",
  "contact-us",
  "inquiry",
  "inquire",
  "about",
  "company",
  "profile",
  "shop",
  "お問い合わせ",
  "会社概要",
  "運営者情報",
  "ご相談",
];

const SOCIAL_HOSTS: Array<{ platform: SocialPlatform; includes: string[] }> = [
  { platform: "instagram", includes: ["instagram.com"] },
  { platform: "x", includes: ["x.com", "twitter.com"] },
  { platform: "tiktok", includes: ["tiktok.com"] },
  { platform: "linktree", includes: ["linktr.ee", "linktree"] },
  { platform: "facebook", includes: ["facebook.com", "fb.com"] },
  { platform: "youtube", includes: ["youtube.com", "youtu.be"] },
];

export type ContactSignals = {
  emails: string[];
  urls: string[];
  socialLinks: SocialLink[];
  officialWebsiteUrls: string[];
  contactFormUrls: string[];
  evidence: ContactEvidence[];
};

export function extractEmailsFromText(text: string) {
  return uniqueStrings((text.match(EMAIL_REGEX) || []).map((item) => item.toLowerCase()));
}

export function extractEmailFromText(text: string) {
  return extractEmailsFromText(text)[0];
}

export function extractUrlsFromText(text: string) {
  return uniqueStrings(
    (text.match(URL_REGEX) || []).map((item) => item.replace(/[),.;!?]+$/, "")).map(normalizeUrl),
  );
}

export function classifySocialPlatform(url: string): SocialPlatform | null {
  try {
    const host = new URL(url).hostname.toLowerCase();
    const matched = SOCIAL_HOSTS.find((entry) => entry.includes.some((token) => host.includes(token)));
    return matched?.platform || null;
  } catch {
    return null;
  }
}

export function isContactFormCandidate(url: string) {
  const normalized = url.toLowerCase();
  return CONTACT_PATH_KEYWORDS.some((keyword) => normalized.includes(keyword.toLowerCase()));
}

export function isOfficialWebsiteCandidate(url: string) {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return false;
    }

    const platform = classifySocialPlatform(url);
    return !platform || platform === "youtube";
  } catch {
    return false;
  }
}

export function buildSocialLinks(urls: string[], sourceType: ContactSourceType, sourceUrl?: string | null) {
  const links: SocialLink[] = [];

  for (const url of urls) {
    const platform = classifySocialPlatform(url);
    if (!platform || platform === "youtube") {
      continue;
    }

    links.push({
      platform,
      url: normalizeUrl(url),
      sourceType,
      sourceUrl,
    });
  }

  return dedupeSocialLinks(links);
}

export function dedupeSocialLinks(links: SocialLink[]) {
  const seen = new Set<string>();
  return links.filter((link) => {
    const key = `${link.platform}:${normalizeUrl(link.url)}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function dedupeEvidence(items: ContactEvidence[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.sourceType}:${item.sourceUrl || ""}:${item.field}:${item.matchedValue}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function extractContactSignalsFromText({
  text,
  sourceType,
  sourceUrl,
}: {
  text: string;
  sourceType: ContactSourceType;
  sourceUrl?: string | null;
}): ContactSignals {
  const emails = extractEmailsFromText(text);
  const urls = extractUrlsFromText(text);
  const socialLinks = buildSocialLinks(urls, sourceType, sourceUrl);
  const officialWebsiteUrls = uniqueStrings(
    urls.filter((url) => isOfficialWebsiteCandidate(url) && classifySocialPlatform(url) !== "youtube"),
  );
  const contactFormUrls = uniqueStrings(urls.filter(isContactFormCandidate));

  const evidence: ContactEvidence[] = [
    ...emails.map((email) => ({
      sourceType,
      sourceUrl,
      matchedValue: email,
      field: "email" as const,
      confidence: sourceType === "external_site" ? 0.95 : 0.85,
    })),
    ...contactFormUrls.map((url) => ({
      sourceType,
      sourceUrl,
      matchedValue: url,
      field: "form" as const,
      confidence: sourceType === "external_site" ? 0.9 : 0.72,
    })),
    ...socialLinks.map((link) => ({
      sourceType,
      sourceUrl,
      matchedValue: link.url,
      field: "social" as const,
      confidence: sourceType === "external_site" ? 0.78 : 0.65,
    })),
    ...officialWebsiteUrls.map((url) => ({
      sourceType,
      sourceUrl,
      matchedValue: url,
      field: "official_site" as const,
      confidence: sourceType === "external_site" ? 0.88 : 0.7,
    })),
  ];

  return {
    emails,
    urls,
    socialLinks,
    officialWebsiteUrls,
    contactFormUrls,
    evidence: dedupeEvidence(evidence),
  };
}

export function mergeContactSignals(collections: ContactSignals[]) {
  const emails = uniqueStrings(collections.flatMap((item) => item.emails));
  const urls = uniqueStrings(collections.flatMap((item) => item.urls));
  const socialLinks = dedupeSocialLinks(collections.flatMap((item) => item.socialLinks));
  const officialWebsiteUrls = uniqueStrings(collections.flatMap((item) => item.officialWebsiteUrls));
  const contactFormUrls = uniqueStrings(collections.flatMap((item) => item.contactFormUrls));
  const evidence = dedupeEvidence(collections.flatMap((item) => item.evidence));
  const { bestContactMethod, bestContactValue } = pickBestContactMethod({
    emails,
    contactFormUrls,
    officialWebsiteUrls,
    socialLinks,
  });

  return {
    emails,
    urls,
    socialLinks,
    officialWebsiteUrls,
    contactFormUrls,
    evidence,
    bestContactMethod,
    bestContactValue,
    contactType: deriveContactType({
      emails,
      contactFormUrls,
      officialWebsiteUrls,
      socialLinks,
    }),
  };
}

export function pickBestContactMethod({
  emails,
  contactFormUrls,
  officialWebsiteUrls,
  socialLinks,
}: {
  emails: string[];
  contactFormUrls: string[];
  officialWebsiteUrls: string[];
  socialLinks: SocialLink[];
}) {
  if (emails.length > 0) {
    return {
      bestContactMethod: "email" as BestContactMethodValue,
      bestContactValue: emails[0],
    };
  }

  if (contactFormUrls.length > 0) {
    return {
      bestContactMethod: "form" as BestContactMethodValue,
      bestContactValue: contactFormUrls[0],
    };
  }

  if (officialWebsiteUrls.length > 0) {
    return {
      bestContactMethod: "official_site" as BestContactMethodValue,
      bestContactValue: officialWebsiteUrls[0],
    };
  }

  for (const platform of ["instagram", "x", "tiktok", "linktree"] as const) {
    const matched = socialLinks.find((link) => link.platform === platform);
    if (matched) {
      return {
        bestContactMethod: platform as BestContactMethodValue,
        bestContactValue: matched.url,
      };
    }
  }

  return {
    bestContactMethod: "none" as BestContactMethodValue,
    bestContactValue: null,
  };
}

export function deriveContactType({
  emails,
  contactFormUrls,
  officialWebsiteUrls,
  socialLinks,
}: {
  emails: string[];
  contactFormUrls: string[];
  officialWebsiteUrls: string[];
  socialLinks: SocialLink[];
}) {
  if (emails.length > 0) {
    return "email" as ContactTypeValue;
  }

  if (contactFormUrls.length > 0) {
    return "form" as ContactTypeValue;
  }

  if (socialLinks.length > 0) {
    return "social" as ContactTypeValue;
  }

  if (officialWebsiteUrls.length > 0) {
    return "link_only" as ContactTypeValue;
  }

  return "none" as ContactTypeValue;
}

export function normalizeLegacyContactType(value: string | null | undefined): ContactTypeValue {
  switch ((value || "").toLowerCase()) {
    case "email":
      return "email";
    case "form":
      return "form";
    case "social":
      return "social";
    case "link":
    case "link_only":
      return "link_only";
    default:
      return "none";
  }
}
