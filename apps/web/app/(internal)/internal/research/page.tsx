import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ResearchConsole } from "@/components/internal/research-console";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { getResearchDashboard } from "@/lib/data";

export default async function ResearchPage() {
  await requireRole(["preparer", "admin"]);
  const { alerts, rules, changes, sources } = await getResearchDashboard();

  return (
    <DashboardShell
      title="Tax research intelligence"
      subtitle="Internal-only cited research workspace using official IRS materials and controlled rule-card summaries."
      role="Internal Staff"
      nav={[
        { href: "/internal", label: "Queue" },
        { href: "/internal/research", label: "Tax research AI", active: true },
        { href: "/internal/research/history", label: "Answer history" }
      ]}
    >
      <div className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <Card>
            <CardTitle>Recent IRS updates</CardTitle>
            <CardDescription className="mt-2">
              Internal alerts should be reviewed before estimate logic is changed.
            </CardDescription>
            <div className="mt-5 space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className="rounded-2xl bg-stone-50 p-4">
                  <p className="font-medium">{alert.title}</p>
                  <p className="mt-2 text-sm text-muted">{alert.summary}</p>
                  {alert.effectiveDate ? (
                    <p className="mt-2 text-xs uppercase tracking-wide text-muted">
                      Effective {alert.effectiveDate}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <CardTitle>Rule cards</CardTitle>
            <CardDescription className="mt-2">
              These cards translate official guidance into controlled internal summaries.
            </CardDescription>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {rules.map((rule) => (
                <div key={rule.id} className="rounded-[24px] border border-border p-4">
                  <p className="text-sm font-semibold uppercase tracking-wide text-primary">{rule.scopeTag}</p>
                  <h3 className="mt-2 font-semibold">{rule.title}</h3>
                  <p className="mt-2 text-sm text-muted">{rule.summary}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <Card>
            <CardTitle>Recent change events</CardTitle>
            <CardDescription className="mt-2">
              Versioned source changes are tracked so preparers can see what moved and why alerts were generated.
            </CardDescription>
            <div className="mt-5 space-y-3">
              {changes.map((change) => (
                <div key={change.id} className="rounded-2xl bg-stone-50 p-4">
                  <p className="font-medium">{change.title}</p>
                  <p className="mt-2 text-sm text-muted">{change.summary}</p>
                  <p className="mt-2 text-xs uppercase tracking-wide text-muted">{change.sourceTitle}</p>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <CardTitle>Source health</CardTitle>
            <CardDescription className="mt-2">
              Draft sources stay clearly marked and should not be treated as final authority.
            </CardDescription>
            <div className="mt-5 space-y-3">
              {sources.map((source) => (
                <div key={source.id} className="rounded-2xl border border-border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{source.title}</p>
                    <span className="text-xs uppercase tracking-wide text-muted">{source.lastStatus}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    {source.sourceType} · {source.authorityType}
                  </p>
                  {source.draftOnly ? <p className="mt-2 text-xs text-amber-700">Draft only; not final authority.</p> : null}
                </div>
              ))}
            </div>
          </Card>
        </div>
        <ResearchConsole />
      </div>
    </DashboardShell>
  );
}
