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
    <div className="page-grid min-h-screen">
      <TopNav plan={plan} />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-8">
        {(title || description || actions) && (
          <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              {title ? <h1 className="font-serif text-4xl font-semibold tracking-tight text-slate-950">{title}</h1> : null}
              {description ? <p className="max-w-3xl text-sm leading-7 text-slate-500">{description}</p> : null}
            </div>
            {actions ? <div className="flex shrink-0 items-center gap-3">{actions}</div> : null}
          </section>
        )}
        {children}
      </main>
    </div>
  );
}
