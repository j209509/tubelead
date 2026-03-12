import type * as React from "react";

import { cn } from "@/lib/utils";

const palette = {
  slate: "bg-slate-100 text-slate-700",
  blue: "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
  green: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  amber: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
  rose: "bg-rose-50 text-rose-700 ring-1 ring-rose-100",
} as const;

export function Badge({
  className,
  tone = "slate",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof palette }) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", palette[tone], className)}
      {...props}
    />
  );
}
