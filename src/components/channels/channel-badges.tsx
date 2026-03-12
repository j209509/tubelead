import { Badge } from "@/components/ui/badge";
import {
  BEST_CONTACT_METHOD_LABELS,
  CHANNEL_STATUS_LABELS,
  CONTACT_TYPE_LABELS,
  ENRICHMENT_STATUS_LABELS,
  type BestContactMethodValue,
  type ChannelStatusValue,
  type ContactTypeValue,
  type EnrichmentStatusValue,
} from "@/lib/constants";

export function ChannelStatusBadge({ status }: { status: ChannelStatusValue }) {
  const tone =
    status === "CONTACT_CANDIDATE"
      ? "green"
      : status === "EXCLUDED"
        ? "rose"
        : status === "HOLD"
          ? "amber"
          : status === "REVIEWED"
            ? "blue"
            : "slate";

  return <Badge tone={tone}>{CHANNEL_STATUS_LABELS[status]}</Badge>;
}

export function ContactTypeBadge({ contactType }: { contactType: ContactTypeValue }) {
  const tone =
    contactType === "email"
      ? "green"
      : contactType === "form"
        ? "blue"
        : contactType === "social"
          ? "amber"
          : contactType === "link_only"
            ? "blue"
            : "slate";

  return <Badge tone={tone}>{CONTACT_TYPE_LABELS[contactType]}</Badge>;
}

export function BestContactBadge({ method }: { method: BestContactMethodValue }) {
  const tone = method === "email" ? "green" : method === "form" ? "blue" : method === "none" ? "slate" : "amber";
  return <Badge tone={tone}>{BEST_CONTACT_METHOD_LABELS[method]}</Badge>;
}

export function EnrichmentStatusBadge({
  status,
  label,
}: {
  status: string | null | undefined;
  label?: string;
}) {
  const normalized = (status || "IDLE") as EnrichmentStatusValue;
  const tone =
    normalized === "COMPLETED"
      ? "green"
      : normalized === "PROCESSING"
        ? "blue"
        : normalized === "FAILED"
          ? "rose"
          : normalized === "PENDING"
            ? "amber"
            : "slate";

  return <Badge tone={tone}>{label ? `${label}: ${ENRICHMENT_STATUS_LABELS[normalized]}` : ENRICHMENT_STATUS_LABELS[normalized]}</Badge>;
}
