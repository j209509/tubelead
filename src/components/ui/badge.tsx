import type * as React from "react";

import { cn } from "@/lib/utils";

const palette = {
  slate: "bg-zinc-100 text-zinc-600",
  blue: "bg-blue-50 text-blue-700",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  rose: "bg-red-50 text-red-700",
} as const;

export function Badge({
  className,
  tone = "slate",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof palette }) {
  return (
    <span
      className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium", palette[tone], className)}
      {...props}
    />
  );
}
