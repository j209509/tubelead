import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number | bigint | null | undefined) {
  if (value === null || value === undefined) {
    return "-";
  }

  const normalized = typeof value === "bigint" ? Number(value) : value;
  return new Intl.NumberFormat("ja-JP").format(normalized);
}

export function formatCompactNumber(value: number | bigint | null | undefined) {
  if (value === null || value === undefined) {
    return "-";
  }

  const normalized = typeof value === "bigint" ? Number(value) : value;
  return new Intl.NumberFormat("ja-JP", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(normalized);
}

export function formatCurrencyYen(value: number | bigint | null | undefined) {
  if (value === null || value === undefined) {
    return "-";
  }

  const normalized = typeof value === "bigint" ? Number(value) : value;
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(normalized);
}

export function formatPercent(value: number | null | undefined, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "-";
  }

  return `${(value * 100).toFixed(digits)}%`;
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) {
    return "-";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) {
    return "-";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function safeJsonParseArray(value: string | null | undefined) {
  if (!value) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function safeJsonParseObjectArray<T>(value: string | null | undefined) {
  if (!value) {
    return [] as T[];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [] as T[];
  }
}

export function safeJsonStringify(value: unknown) {
  return JSON.stringify(value ?? null);
}

export function normalizeLineBreaks(value: string) {
  return value.replace(/\r\n/g, "\n").trim();
}

export function toBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return ["true", "1", "on", "yes"].includes(value.toLowerCase());
  }

  return false;
}

export function truncate(value: string, max = 120) {
  if (value.length <= max) {
    return value;
  }

  return `${value.slice(0, max)}...`;
}

export function uniqueStrings(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))];
}

export function normalizeUrl(url: string) {
  try {
    const parsed = new URL(url.trim());
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return url.trim();
  }
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function calcMedian(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
}

export function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}
