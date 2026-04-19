import Link from "next/link";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { getResearchHistory } from "@/lib/data";

export default async function ResearchHistoryPage({
  searchParams
}: {
  searchParams: Promise<{ caseId?: string; reviewStatus?: string; conflict?: string; authority?: string }>;
}) {
  await requireRole(["preparer", "admin"]);
  const filters = await searchParams;
  const history = await getResearchHistory(filters);

  return (
    <DashboardShell
      title="Research answer history"
      subtitle="Saved internal answers, citations, passage evidence, and reviewer resolution states."
      role="Internal Staff"
      nav={[
        { href: "/internal", label: "Queue" },
        { href: "/internal/research", label: "Tax research AI" },
        { href: "/internal/research/history", label: "Answer history", active: true }
      ]}
    >
      <Card>
        <CardTitle>Filters</CardTitle>
        <form className="mt-4 grid gap-3 md:grid-cols-4">
          <input name="caseId" placeholder="Case ID" defaultValue={filters.caseId ?? ""} className="h-10 rounded-2xl border border-border px-3 text-sm" />
          <select name="reviewStatus" defaultValue={filters.reviewStatus ?? "all"} className="h-10 rounded-2xl border border-border px-3 text-sm">
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="reviewed">Reviewed</option>
            <option value="resolved">Resolved</option>
            <option value="escalated">Escalated</option>
          </select>
          <select name="conflict" defaultValue={filters.conflict ?? "all"} className="h-10 rounded-2xl border border-border px-3 text-sm">
            <option value="all">All conflict states</option>
            <option value="yes">Conflict detected</option>
            <option value="no">No conflict</option>
          </select>
          <select name="authority" defaultValue={filters.authority ?? "all"} className="h-10 rounded-2xl border border-border px-3 text-sm">
            <option value="all">All authority tiers</option>
            <option value="1">Tier 1 only</option>
            <option value="3">Tier 1-3</option>
            <option value="6">Tier 1-6</option>
          </select>
          <button className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white md:col-span-4 md:w-fit">Apply filters</button>
        </form>
      </Card>

      <div className="mt-6 space-y-4">
        {history.map((item) => (
          <Link key={item.id} href={`/internal/research/history/${item.id}`}>
            <Card className="transition hover:border-primary/40">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>{item.question}</CardTitle>
                  <CardDescription className="mt-2">
                    {item.caseNumber ? `Case ${item.caseNumber} · ` : ""}
                    {item.answerMode ?? "unknown mode"} · Authority tier {item.authorityLevel ?? "n/a"}
                  </CardDescription>
                </div>
                <Badge tone={item.conflictDetected ? "warning" : item.reviewStatus === "resolved" ? "success" : "info"}>
                  {item.reviewStatus}
                </Badge>
              </div>
              <p className="mt-4 text-sm text-muted">{item.answer?.slice(0, 240) ?? "No answer stored."}</p>
              {item.conflictSummary ? <p className="mt-3 text-sm text-amber-800">{item.conflictSummary}</p> : null}
            </Card>
          </Link>
        ))}
        {!history.length ? <p className="text-sm text-muted">No research answers match the current filters.</p> : null}
      </div>
    </DashboardShell>
  );
}
