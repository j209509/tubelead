import type { SocialLink } from "@/lib/channel-types";
import { clamp } from "@/lib/utils";

export function calcRelevanceScore(params: {
  query: string;
  sourceQueries: string[];
  title: string;
  description: string;
  latestVideoTitles: string[];
  matchedQueryCount: number;
}) {
  const haystack = `${params.title} ${params.description} ${params.latestVideoTitles.join(" ")}`.toLowerCase();
  const baseTokens = params.query.toLowerCase().split(/\s+/).filter(Boolean);

  let score = params.matchedQueryCount * 12;

  for (const token of baseTokens) {
    if (params.title.toLowerCase().includes(token)) {
      score += 18;
    } else if (haystack.includes(token)) {
      score += 8;
    }
  }

  for (const expanded of params.sourceQueries) {
    if (expanded !== params.query && haystack.includes(expanded.toLowerCase())) {
      score += 4;
    }
  }

  return clamp(Math.round(score), 0, 100);
}

export function calcContactabilityScore(params: {
  emails: string[];
  contactFormUrls: string[];
  officialWebsiteUrls: string[];
  socialLinks: SocialLink[];
  descriptionLength: number;
  externalEvidenceCount: number;
}) {
  if (params.emails.length > 0) {
    return 100;
  }

  let score = 0;

  if (params.contactFormUrls.length > 0) {
    score += 28;
  }

  if (params.officialWebsiteUrls.length > 0) {
    score += 12;
  }

  if (params.socialLinks.length > 0) {
    score += Math.min(18, params.socialLinks.length * 6);
  }

  if (params.descriptionLength >= 120) {
    score += 8;
  } else if (params.descriptionLength >= 60) {
    score += 4;
  }

  if (params.externalEvidenceCount > 0) {
    score += 8;
  }

  return clamp(Math.round(score), 0, 100);
}

export function calcFreshnessScore(lastVideoPublishedAt: string | Date | null | undefined) {
  if (!lastVideoPublishedAt) {
    return 0;
  }

  const date = lastVideoPublishedAt instanceof Date ? lastVideoPublishedAt : new Date(lastVideoPublishedAt);
  if (Number.isNaN(date.getTime())) {
    return 0;
  }

  const days = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);

  if (days <= 14) return 100;
  if (days <= 30) return 85;
  if (days <= 90) return 65;
  if (days <= 180) return 45;
  if (days <= 365) return 25;
  return 10;
}

export function calcOutreachScore(params: {
  subscriberCount: number;
  videoCount: number;
  relevanceScore: number;
  contactabilityScore: number;
  freshnessScore: number;
}) {
  let scale = 0;

  if (params.subscriberCount >= 1_000 && params.subscriberCount <= 200_000) {
    scale += 14;
  } else if (params.subscriberCount > 200_000) {
    scale += 10;
  } else {
    scale += 8;
  }

  if (params.videoCount >= 50) {
    scale += 10;
  } else if (params.videoCount >= 10) {
    scale += 6;
  } else {
    scale += 3;
  }

  const weighted =
    params.relevanceScore * 0.32 +
    params.contactabilityScore * 0.43 +
    params.freshnessScore * 0.15 +
    scale;

  return clamp(Math.round(weighted), 0, 100);
}
