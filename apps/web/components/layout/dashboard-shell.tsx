import Link from "next/link";
import { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; active?: boolean };

export function DashboardShell({
  title,
  subtitle,
  role,
  nav,
  children
}: {
  title: string;
  subtitle: string;
  role: string;
  nav: NavItem[];
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <aside className="border-r border-border bg-secondary px-6 py-8 text-white">
          <div className="space-y-2">
            <p className="text-sm text-slate-300">US Tax Deals</p>
            <h1 className="text-2xl font-semibold">RefundIQ</h1>
            <Badge className="mt-2 bg-white/10 text-white" tone="neutral">
              {role}
            </Badge>
          </div>
          <nav className="mt-10 space-y-2">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block rounded-2xl px-4 py-3 text-sm transition",
                  item.active ? "bg-white text-secondary" : "text-slate-300 hover:bg-white/10 hover:text-white"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="px-6 py-8 lg:px-10">
          <div className="mb-8 flex flex-col gap-2">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">
              {role}
            </p>
            <h2 className="text-3xl font-semibold text-foreground">{title}</h2>
            <p className="max-w-3xl text-muted">{subtitle}</p>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
