import { Database, FileLock2, Shield, TimerReset } from "lucide-react";

import {
  reprocessCaseAction,
  rerunEstimateFromAdminAction,
  retryProcessingJobAction,
  runSourceSyncNowAction,
  updateUserRoleAction
} from "@/app/admin/actions";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { getAdminDashboard } from "@/lib/data";

const adminCards = [
  {
    title: "RBAC and row-level security",
    description: "Client, preparer, and admin roles should be enforced through Supabase RLS and service-layer policy checks.",
    icon: Shield
  },
  {
    title: "Retention settings",
    description: "Document retention windows and deletion logging should be configured per policy and case status.",
    icon: TimerReset
  },
  {
    title: "Private file access",
    description: "All uploads belong in a private bucket with signed URL access and audit events for every download.",
    icon: FileLock2
  },
  {
    title: "Operational audit trail",
    description: "Field edits, assumption overrides, exports, and estimate runs should all create durable audit rows.",
    icon: Database
  }
];

export default async function AdminPage({
  searchParams
}: {
  searchParams: Promise<{
    syncStatus?: string;
    jobStatus?: string;
    reprocessStatus?: string;
    roleStatus?: string;
    estimateStatus?: string;
    error?: string;
  }>;
}) {
  await requireRole(["admin"]);
  const params = await searchParams;
  const dashboard = await getAdminDashboard();

  return (
    <DashboardShell
      title="Admin operations"
      subtitle="Operational visibility for source sync, failed jobs, role controls, and live-ready RefundIQ testing."
      role="Admin"
      nav={[{ href: "/admin", label: "Security posture", active: true }]}
    >
      {params.syncStatus || params.jobStatus || params.reprocessStatus || params.roleStatus || params.estimateStatus || params.error ? (
        <Card className="mb-6">
          <CardTitle>Latest admin action</CardTitle>
          <CardDescription className="mt-2">
            {params.error
              ? params.error
              : `Sync: ${params.syncStatus ?? "n/a"} · Job: ${params.jobStatus ?? "n/a"} · Reprocess: ${params.reprocessStatus ?? "n/a"} · Role: ${params.roleStatus ?? "n/a"} · Estimate: ${params.estimateStatus ?? "n/a"}`}
          </CardDescription>
        </Card>
      ) : null}
      <div className="mb-6 flex flex-wrap gap-3">
        <form action={runSourceSyncNowAction}>
          <Button>Run source sync now</Button>
        </form>
      </div>
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardTitle>{dashboard.userCount}</CardTitle>
          <CardDescription className="mt-2">Users with role-aware access</CardDescription>
        </Card>
        <Card>
          <CardTitle>{dashboard.openCases}</CardTitle>
          <CardDescription className="mt-2">Open cases not yet ready for software entry</CardDescription>
        </Card>
        <Card>
          <CardTitle>{dashboard.failedJobs}</CardTitle>
          <CardDescription className="mt-2">Failed processing jobs needing review</CardDescription>
        </Card>
        <Card>
          <CardTitle>{dashboard.sourceJobs}</CardTitle>
          <CardDescription className="mt-2">Tracked source ingestion jobs</CardDescription>
        </Card>
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-3">
        <Card>
          <CardTitle>{dashboard.failedSourceSyncs}</CardTitle>
          <CardDescription className="mt-2">Failed source sync runs</CardDescription>
        </Card>
        <Card>
          <CardTitle>{dashboard.latestSourceSync ?? "Not synced yet"}</CardTitle>
          <CardDescription className="mt-2">Most recent source sync timestamp</CardDescription>
        </Card>
        <Card>
          <CardTitle>{Object.keys(dashboard.sourceTypeCounts).length}</CardTitle>
          <CardDescription className="mt-2">Source types currently tracked</CardDescription>
        </Card>
      </div>
      {dashboard.serviceHealth ? (
        <Card className="mt-6">
          <CardTitle>Service readiness</CardTitle>
          <div className="mt-4 flex flex-wrap gap-3">
            <div className="rounded-full bg-stone-100 px-4 py-2 text-sm">API: {dashboard.serviceHealth.status}</div>
            <div className="rounded-full bg-stone-100 px-4 py-2 text-sm">Redis: {dashboard.serviceHealth.redis}</div>
            <div className="rounded-full bg-stone-100 px-4 py-2 text-sm">
              Supabase configured: {dashboard.serviceHealth.supabase_configured ? "yes" : "no"}
            </div>
            <div className="rounded-full bg-stone-100 px-4 py-2 text-sm">OCR: {dashboard.serviceHealth.ocr_provider}</div>
            <div className="rounded-full bg-stone-100 px-4 py-2 text-sm">
              Scheduler: {dashboard.serviceHealth.scheduler_enabled ? "enabled" : "disabled"}
            </div>
            {dashboard.serviceHealth.queues ? (
              <>
                <div className="rounded-full bg-stone-100 px-4 py-2 text-sm">
                  Doc queue: {dashboard.serviceHealth.queues.document_processing}
                </div>
                <div className="rounded-full bg-stone-100 px-4 py-2 text-sm">
                  Source queue: {dashboard.serviceHealth.queues.source_ingestion}
                </div>
              </>
            ) : null}
          </div>
        </Card>
      ) : null}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {adminCards.map((item) => (
          <Card key={item.title}>
            <item.icon className="h-10 w-10 text-primary" />
            <CardTitle className="mt-5">{item.title}</CardTitle>
            <CardDescription className="mt-3">{item.description}</CardDescription>
          </Card>
        ))}
      </div>
      <Card className="mt-6">
        <CardTitle>Source counts by type</CardTitle>
        <div className="mt-4 flex flex-wrap gap-3">
          {Object.entries(dashboard.sourceTypeCounts).map(([key, value]) => (
            <div key={key} className="rounded-full bg-stone-100 px-4 py-2 text-sm">
              {key}: {value}
            </div>
          ))}
        </div>
      </Card>
      <Card className="mt-6">
        <CardTitle>Recent IRS / rule monitoring alerts</CardTitle>
        <div className="mt-4 space-y-3">
          {dashboard.recentAlerts.map((alert) => (
            <div key={alert.id} className="rounded-2xl bg-stone-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{alert.title}</p>
                <Badge tone={alert.severity === "critical" ? "danger" : alert.severity === "warning" ? "warning" : "info"}>
                  {alert.severity}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-muted">{alert.summary}</p>
            </div>
          ))}
        </div>
      </Card>
      <Card className="mt-6">
        <CardTitle>Recent source changes</CardTitle>
        <div className="mt-4 space-y-3">
          {dashboard.recentChanges.map((change) => (
            <div key={change.id} className="rounded-2xl bg-stone-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{change.title}</p>
                <Badge tone={change.severity === "critical" ? "danger" : change.severity === "warning" ? "warning" : "info"}>
                  {change.severity}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-muted">{change.summary}</p>
              <p className="mt-2 text-xs uppercase tracking-wide text-muted">{change.sourceTitle}</p>
            </div>
          ))}
        </div>
      </Card>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardTitle>Failed and recent processing jobs</CardTitle>
          <div className="mt-4 space-y-3">
            {dashboard.processingJobs.map((job) => (
              <div key={job.id} className="rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{job.documentName ?? "Case processing job"}</p>
                    <p className="text-xs text-muted">Case {job.caseId}</p>
                  </div>
                  <Badge tone={job.status === "failed" ? "danger" : job.status === "completed" ? "success" : "info"}>
                    {job.status}
                  </Badge>
                </div>
                {job.lastError ? <p className="mt-2 text-sm text-rose-700">{job.lastError}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <form action={retryProcessingJobAction}>
                    <input type="hidden" name="jobId" value={job.id} />
                    <input type="hidden" name="caseId" value={job.caseId} />
                    <input type="hidden" name="documentId" value={job.documentId ?? ""} />
                    <Button variant="outline">Retry job</Button>
                  </form>
                  <form action={reprocessCaseAction}>
                    <input type="hidden" name="caseId" value={job.caseId} />
                    <input type="hidden" name="documentId" value={job.documentId ?? ""} />
                    <Button variant="outline">Reprocess case</Button>
                  </form>
                  <form action={rerunEstimateFromAdminAction}>
                    <input type="hidden" name="caseId" value={job.caseId} />
                    <Button variant="outline">Rerun estimate</Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardTitle>Source sync history</CardTitle>
          <div className="mt-4 space-y-3">
            {dashboard.sourceSyncHistory.map((job) => (
              <div key={job.id} className="rounded-2xl bg-stone-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{job.runType}</p>
                  <Badge tone={job.status === "failed" ? "danger" : job.status.includes("completed") ? "success" : "info"}>
                    {job.status}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted">{job.resultSummary ?? "No summary yet."}</p>
                {job.errorMessage ? <p className="mt-2 text-sm text-rose-700">{job.errorMessage}</p> : null}
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card className="mt-6">
        <CardTitle>User and role management</CardTitle>
        <div className="mt-4 space-y-3">
          {dashboard.users.map((user) => (
            <div key={user.id} className="flex flex-col gap-3 rounded-2xl border border-border p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium">{user.fullName ?? "User"}</p>
                <p className="text-sm text-muted">{user.email}</p>
              </div>
              <form action={updateUserRoleAction} className="flex items-center gap-2">
                <input type="hidden" name="userId" value={user.id} />
                <select name="role" defaultValue={user.role} className="h-10 rounded-2xl border border-border px-3 text-sm">
                  <option value="client">client</option>
                  <option value="preparer">preparer</option>
                  <option value="admin">admin</option>
                </select>
                <Button variant="outline">Update role</Button>
              </form>
            </div>
          ))}
        </div>
      </Card>
    </DashboardShell>
  );
}
