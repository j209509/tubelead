import type { ReactNode } from "react";

import { getCurrentPlan } from "@/lib/plan";

import { TopNav } from "./top-nav";

type AppShellProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function AppShell({ title, description, actions, children }: AppShellProps) {
  const plan = getCurrentPlan();

  return (
    <div className="min-h-screen bg-zinc-50">
      <TopNav plan={plan} />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:px-6">
        {(title || description || actions) && (
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              {title ? <h1 className="truncate text-xl font-semibold text-zinc-900">{title}</h1> : null}
              {description ? <p className="mt-1 text-sm text-zinc-500">{description}</p> : null}
            </div>
            {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
          </header>
        )}
        {children}
      </main>
    </div>
  );
}
