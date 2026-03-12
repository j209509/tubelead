import type { SerializedChannel } from "@/lib/channel-types";

const CSV_HEADERS = [
  "channelId",
  "title",
  "subscriberCount",
  "videoCount",
  "viewCount",
  "country",
  "categoryGuess",
  "regionGuess",
  "contactType",
  "contactEmails",
  "contactFormUrls",
  "bestContactMethod",
  "bestContactValue",
  "officialWebsiteUrls",
  "socialLinks",
  "channelUrl",
  "sourceQueries",
  "matchedQueryCount",
  "contactabilityScore",
  "outreachScore",
  "status",
  "tags",
  "note",
];

function escapeCsvCell(value: string | number | null | undefined) {
  const normalized = value === null || value === undefined ? "" : String(value);
  const escaped = normalized.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function buildChannelsCsv(channels: SerializedChannel[]) {
  const rows = channels.map((channel) =>
    [
      channel.channelId,
      channel.title,
      channel.subscriberCount,
      channel.videoCount,
      channel.viewCount,
      channel.country || "",
      channel.categoryGuess || "",
      channel.regionGuess || "",
      channel.contactType,
      channel.contactEmails.join(" | "),
      channel.contactFormUrls.join(" | "),
      channel.bestContactMethod,
      channel.bestContactValue || "",
      channel.officialWebsiteUrls.join(" | "),
      channel.socialLinks.map((link) => `${link.platform}:${link.url}`).join(" | "),
      channel.channelUrl,
      channel.sourceQueries.join(" | "),
      channel.matchedQueryCount,
      channel.contactabilityScore,
      channel.outreachScore,
      channel.status,
      channel.tags.join(" | "),
      channel.note,
    ]
      .map(escapeCsvCell)
      .join(","),
  );

  return `\uFEFF${[CSV_HEADERS.join(","), ...rows].join("\n")}`;
}
