import Link from "next/link";
import { ArrowRight, FileSearch, ShieldAlert } from "lucide-react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { getInternalDashboardData } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

export default async function InternalDashboardPage() {
  await requireRole(["preparer", "admin"]);
  const { cases, research, stats } = await getInternalDashboardData();
  const firstCaseHref = cases[0] ? `/internal/cases/${cases[0].id}` : "/internal/research";

  return (
    <DashboardShell
      title="Internal preparer dashboard"
      subtitle="Review extracted fields, confidence, missing documents, and calculation trace before sending cases into tax software."
      role="Internal Staff"
      nav={[
        { href: "/internal", label: "Queue", active: true },
        { href: firstCaseHref, label: "Case review" },
        { href: "/internal/research", label: "Tax research AI" }
      ]}
    >
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardTitle>{stats.openCases}</CardTitle>
          <CardDescription className="mt-2">Open client cases</CardDescription>
        </Card>
        <Card>
          <CardTitle>{stats.reviewReady}</CardTitle>
          <CardDescription className="mt-2">Ready for preparer review</CardDescription>
        </Card>
        <Card>
          <CardTitle>{stats.lowConfidence}</CardTitle>
          <CardDescription className="mt-2">Low-confidence estimates</CardDescription>
        </Card>
        <Card>
          <CardTitle>{stats.exportsPending}</CardTitle>
          <CardDescription className="mt-2">Exports pending workpaper prep</CardDescription>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Review queue</CardTitle>
              <CardDescription className="mt-2">
                Internal users can inspect OCR results, normalized values, assumptions, and edit history.
              </CardDescription>
            </div>
            <Badge tone="warning">human review required</Badge>
          </div>
          <div className="mt-6 space-y-4">
            {cases.map((taxCase) => (
              <div key={taxCase.id} className="rounded-[24px] border border-border bg-stone-50 p-5">
                <div className="flex flex-col justify-between gap-4 md:flex-row">
                  <div>
                    <p className="text-lg font-semibold">{taxCase.clientName}</p>
                    <p className="text-sm text-muted">
                      {taxCase.filingStatus} · {taxCase.stateOfResidence} · {taxCase.caseNumber}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {taxCase.warnings.map((warning) => (
                        <Badge key={warning} tone="warning">
                          {warning}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted">Estimated result</p>
                    <p className="text-2xl font-semibold">
                      {formatCurrency(
                        (taxCase.estimateRun?.estimatedFederalRefundOrDue ?? 0) +
                          (taxCase.estimateRun?.estimatedStateRefundOrDue ?? 0)
                      )}
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted">
                    <ShieldAlert className="h-4 w-4 text-accent" />
                    Confidence: {taxCase.confidenceBand}
                  </div>
                  <Link href={`/internal/cases/${taxCase.id}`}>
                    <Button variant="outline">
                      Open case <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <FileSearch className="h-5 w-5 text-primary" />
            <CardTitle>Operational recommendations</CardTitle>
          </div>
          <div className="mt-5 space-y-3">
            <div className="rounded-2xl bg-stone-50 px-4 py-3 text-sm">
              Route low-confidence cases with incomplete W-2 or 1099 coverage to manual review first.
            </div>
            <div className="rounded-2xl bg-stone-50 px-4 py-3 text-sm">
              Export copy-ready summaries only after extracted fields and assumptions are reviewed.
            </div>
            <div className="rounded-2xl bg-stone-50 px-4 py-3 text-sm">
              Keep client-facing explanations short and reserve raw calculations for internal reviewers.
            </div>
            <div className="rounded-2xl bg-stone-50 px-4 py-3">
              <p className="text-sm font-semibold">Recent IRS updates</p>
              <div className="mt-3 space-y-2">
                {research.alerts.slice(0, 2).map((alert) => (
                  <div key={alert.id} className="text-sm text-muted">
                    {alert.title}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-stone-50 px-4 py-3">
              <p className="text-sm font-semibold">Rule changes affecting live cases</p>
              <div className="mt-3 space-y-2">
                {research.changes.slice(0, 2).map((change) => (
                  <div key={change.id} className="text-sm text-muted">
                    {change.title}
                  </div>
                ))}
              </div>
            </div>
            <Link href="/internal/research" className="inline-block pt-2 text-sm font-semibold text-primary">
              Open Ask Tax Research AI
            </Link>
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
