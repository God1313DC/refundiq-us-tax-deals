import Link from "next/link";
import { notFound } from "next/navigation";

import {
  addReviewNoteAction,
  exportCaseAction,
  markCaseReviewedAction,
  overrideExtractedFieldAction,
  resolveResearchQueryAction,
  rerunEstimateAction
} from "@/app/(internal)/internal/actions";
import { CaseSummary } from "@/components/internal/case-summary";
import { DocumentReviewTable } from "@/components/internal/document-review-table";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { getInternalCase } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

export default async function InternalCaseDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ caseId: string }>;
  searchParams: Promise<{ export?: string; exportStatus?: string }>;
}) {
  await requireRole(["preparer", "admin"]);
  const { caseId } = await params;
  const query = await searchParams;
  const taxCase = await getInternalCase(caseId);

  if (!taxCase) {
    notFound();
  }

  return (
    <DashboardShell
      title={`Case review · ${taxCase.clientName}`}
      subtitle="Inspect extracted values, deterministic line items, reviewer notes, and next-step recommendations. Client-facing detail remains intentionally simplified."
      role="Internal Staff"
      nav={[
        { href: "/internal", label: "Queue" },
        { href: `/internal/cases/${taxCase.id}`, label: "Case review", active: true },
        { href: "/internal/research", label: "Tax research AI" }
      ]}
    >
      <div className="space-y-6">
        {query.exportStatus ? (
          <Card className={query.exportStatus === "success" ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}>
            <CardTitle>{query.exportStatus === "success" ? "Export prepared" : "Export failed"}</CardTitle>
            <CardDescription className="mt-2">
              {query.exportStatus === "success"
                ? `${query.export ?? "Export"} was generated and logged for internal handoff.`
                : `${query.export ?? "Export"} could not be generated. Review the export log or retry from admin.`}
            </CardDescription>
          </Card>
        ) : null}

        <CaseSummary taxCase={taxCase} />

        {taxCase.ruleMatches?.length ? (
          <Card className="border-amber-200 bg-amber-50">
            <CardTitle>Rule alerts affecting this case</CardTitle>
            <CardDescription className="mt-2">
              Internal-only research-backed warnings linked to current rule cards and source updates.
            </CardDescription>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {taxCase.ruleMatches.map((match) => (
                <div key={match.id} className="rounded-2xl bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{match.ruleTitle}</p>
                    <Badge tone={match.severity === "critical" ? "danger" : match.severity === "warning" ? "warning" : "info"}>
                      {match.severity}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-foreground">{match.explanation}</p>
                  <p className="mt-2 text-xs text-muted">{match.ruleSummary}</p>
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <DocumentReviewTable documents={taxCase.documents} />
          <Card>
            <CardTitle>Confidence and assumptions</CardTitle>
            <div className="mt-5 space-y-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-muted">Assumptions</p>
                <div className="mt-3 space-y-2">
                  {taxCase.assumptions.map((item) => (
                    <div key={item} className="rounded-2xl bg-stone-50 px-4 py-3 text-sm">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-muted">Warnings</p>
                <div className="mt-3 space-y-2">
                  {taxCase.warnings.map((item) => (
                    <div key={item} className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              {taxCase.estimateRun?.confidenceReasons?.length ? (
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-muted">Why confidence is {taxCase.confidenceBand}</p>
                  <div className="mt-3 space-y-2">
                    {taxCase.estimateRun.confidenceReasons.map((item) => (
                      <div key={item} className="rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-900">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-3">
                <form action={rerunEstimateAction}>
                  <input type="hidden" name="caseId" value={taxCase.id} />
                  <Button variant="outline">Rerun estimate from saved profile</Button>
                </form>
                <form action={markCaseReviewedAction}>
                  <input type="hidden" name="caseId" value={taxCase.id} />
                  <Button>Mark reviewed by preparer</Button>
                </form>
                <form action={markCaseReviewedAction}>
                  <input type="hidden" name="caseId" value={taxCase.id} />
                  <input type="hidden" name="readyForEntry" value="true" />
                  <Button variant="outline">Ready for tax software entry</Button>
                </form>
                <form action={exportCaseAction}>
                  <input type="hidden" name="caseId" value={taxCase.id} />
                  <input type="hidden" name="exportType" value="manual_review_queue_adapter" />
                  <Button variant="outline">Create Drake-ready handoff</Button>
                </form>
                <form action={exportCaseAction}>
                  <input type="hidden" name="caseId" value={taxCase.id} />
                  <input type="hidden" name="exportType" value="pdf_workpaper_export_adapter" />
                  <Button variant="outline">Generate internal workpaper</Button>
                </form>
              </div>
              {taxCase.statusHistory?.length ? (
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-muted">Status timeline</p>
                  <div className="mt-3 space-y-2">
                    {taxCase.statusHistory.map((entry) => (
                      <div key={entry.id} className="rounded-2xl bg-stone-50 px-4 py-3 text-sm">
                        <p className="font-medium">
                          {entry.previousStatus ? `${entry.previousStatus} -> ` : ""}
                          {entry.newStatus}
                        </p>
                        {entry.reason ? <p className="mt-1 text-muted">{entry.reason}</p> : null}
                        <p className="mt-1 text-xs text-muted">{entry.createdAt}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card>
            <CardTitle>Document preview</CardTitle>
            <CardDescription className="mt-2">
              Use signed previews and extracted values side by side during review.
            </CardDescription>
            <div className="mt-5 space-y-4">
              {taxCase.documents.map((document) => (
                <div key={document.id} className="rounded-[24px] border border-border p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{document.fileName}</p>
                      <p className="text-sm text-muted">{document.formType ?? "Unclassified"}</p>
                    </div>
                    <Badge
                      tone={
                        document.status === "processed"
                          ? "success"
                          : document.status === "duplicate"
                            ? "warning"
                            : "info"
                      }
                    >
                      {document.status}
                    </Badge>
                  </div>
                  {document.previewUrl ? (
                    <a
                      href={document.previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-block text-sm font-semibold text-primary"
                    >
                      Open signed preview
                    </a>
                  ) : (
                    <p className="mt-3 text-sm text-muted">Preview is unavailable for this file type or storage state.</p>
                  )}
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <CardTitle>Extracted fields</CardTitle>
            <CardDescription className="mt-2">
              Internal-only values can be reviewed, corrected, and audited without exposing them to clients.
            </CardDescription>
            <div className="mt-5 space-y-4">
              {taxCase.documents.map((document) => (
                <div key={document.id} className="rounded-[24px] bg-stone-50 p-4">
                  <p className="font-medium">{document.fileName}</p>
                  <div className="mt-3 space-y-3">
                    {document.extractedFields.length ? (
                      document.extractedFields.map((field) => (
                        <div key={field.id} className="rounded-2xl bg-white p-3">
                          <div className="flex items-center justify-between gap-4">
                            <p className="text-sm font-semibold">{field.fieldName}</p>
                            <Badge tone={field.manuallyOverridden ? "warning" : "info"}>
                              {field.manuallyOverridden ? "overridden" : `${Math.round((field.extractionConfidence ?? 0) * 100)}% confidence`}
                            </Badge>
                          </div>
                          <p className="mt-2 text-sm text-foreground">{field.fieldValue}</p>
                          {field.sourceLabel ? (
                            <p className="mt-2 text-xs text-muted">Source: {field.sourceLabel}</p>
                          ) : null}
                          <form action={overrideExtractedFieldAction} className="mt-3 flex gap-2">
                            <input type="hidden" name="caseId" value={taxCase.id} />
                            <input type="hidden" name="fieldId" value={field.id} />
                            <input
                              type="text"
                              name="overrideValue"
                              placeholder="Override value"
                              className="h-10 flex-1 rounded-2xl border border-border px-3 text-sm"
                            />
                            <Button variant="outline">Save</Button>
                          </form>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted">No extracted fields are available yet.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardTitle>Calculation trace</CardTitle>
            <CardDescription className="mt-2">
              Deterministic line items only. No silent AI-generated tax numbers.
            </CardDescription>
            <Table className="mt-5">
              <THead>
                <TR>
                  <TH>Line item</TH>
                  <TH>Amount</TH>
                  <TH>Note</TH>
                </TR>
              </THead>
              <TBody>
                {(taxCase.estimateRun?.lineItems ?? []).map((item) => (
                  <TR key={item.label}>
                    <TD className="font-medium">{item.label}</TD>
                    <TD>{formatCurrency(item.amount)}</TD>
                    <TD>{item.note}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Card>
          <Card>
            <CardTitle>Insights and notes</CardTitle>
            <div className="mt-5 space-y-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-muted">Internal insights</p>
                <div className="mt-3 space-y-2">
                  {(taxCase.internalInsights.length
                    ? taxCase.internalInsights
                    : ["Internal insights will appear after processing and estimate generation."]).map((insight) => (
                    <div key={insight} className="rounded-2xl bg-stone-50 px-4 py-3 text-sm">
                      {insight}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-muted">Review notes</p>
                <div className="mt-3 space-y-3">
                  {taxCase.notes.map((note) => (
                    <div key={note.id} className="rounded-2xl border border-border p-4">
                      <div className="flex items-center justify-between gap-4">
                        <p className="font-medium">{note.authorName}</p>
                        <Badge tone="info">{note.authorRole}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-foreground">{note.note}</p>
                      <p className="mt-2 text-xs text-muted">{note.createdAt}</p>
                    </div>
                  ))}
                </div>
                <form action={addReviewNoteAction} className="mt-4 space-y-3">
                  <input type="hidden" name="caseId" value={taxCase.id} />
                  <textarea
                    name="note"
                    placeholder="Add an internal review note"
                    className="min-h-28 w-full rounded-[20px] border border-border bg-white p-4 text-sm"
                  />
                  <Button variant="outline">Add internal note</Button>
                </form>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardTitle>Normalized tax profile</CardTitle>
            <CardDescription className="mt-2">
              Canonical reviewer-facing profile used for deterministic reruns, alerts, and handoff exports.
            </CardDescription>
            <pre className="mt-5 overflow-x-auto rounded-[24px] bg-stone-950 p-4 text-xs leading-6 text-stone-100">
              {JSON.stringify(taxCase.normalizedProfile ?? {}, null, 2)}
            </pre>
          </Card>
          <Card>
            <CardTitle>Saved research conclusions</CardTitle>
            <CardDescription className="mt-2">
              Case-specific internal guidance remains attached to preserved research evidence and reviewer decisions.
            </CardDescription>
            <div className="mt-5 space-y-3">
              {(taxCase.researchQueries ?? [])
                .filter((item) => item.decisionSummary || item.guidanceLabel || item.reviewStatus !== "open")
                .map((item) => (
                  <Link key={item.id} href={`/internal/research/history/${item.id}`} className="block rounded-2xl border border-border p-4 hover:bg-stone-50">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{item.question}</p>
                      <Badge tone={item.reviewStatus === "resolved" ? "success" : item.reviewStatus === "escalated" ? "warning" : "info"}>
                        {item.reviewStatus}
                      </Badge>
                    </div>
                    {item.decisionSummary ? <p className="mt-2 text-sm text-foreground">{item.decisionSummary}</p> : null}
                    {item.guidanceLabel ? (
                      <p className="mt-2 text-xs uppercase tracking-wide text-muted">{item.guidanceLabel.replaceAll("_", " ")}</p>
                    ) : null}
                  </Link>
                ))}
              {!(taxCase.researchQueries ?? []).some((item) => item.decisionSummary || item.guidanceLabel || item.reviewStatus !== "open") ? (
                <p className="text-sm text-muted">No saved research conclusions for this case yet.</p>
              ) : null}
            </div>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <Card>
            <CardTitle>Research answer history</CardTitle>
            <CardDescription className="mt-2">
              Internal-only cited research history for this case, including reviewer resolution states and preserved evidence.
            </CardDescription>
            <div className="mt-5 space-y-4">
              {(taxCase.researchQueries?.length ? taxCase.researchQueries : []).map((item) => (
                <div key={item.id} className="rounded-[24px] border border-border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <Link href={`/internal/research/history/${item.id}`} className="font-medium text-primary hover:underline">
                      {item.question}
                    </Link>
                    <Badge tone={item.conflictDetected ? "warning" : "info"}>{item.reviewStatus}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted">{item.answer?.slice(0, 220) ?? "Answer unavailable."}</p>
                  {item.conflictSummary ? <p className="mt-2 text-sm text-amber-800">{item.conflictSummary}</p> : null}
                  <form action={resolveResearchQueryAction} className="mt-4 space-y-3">
                    <input type="hidden" name="queryId" value={item.id} />
                    <input type="hidden" name="caseId" value={taxCase.id} />
                    <div className="grid gap-3 md:grid-cols-2">
                      <select name="reviewStatus" className="h-10 rounded-2xl border border-border px-3 text-sm">
                        <option value="reviewed">Reviewed</option>
                        <option value="resolved">Resolved</option>
                        <option value="escalated">Escalated</option>
                      </select>
                      <select name="guidanceLabel" className="h-10 rounded-2xl border border-border px-3 text-sm">
                        <option value="safe_internal_guidance">Safe internal guidance</option>
                        <option value="requires_further_review">Requires further review</option>
                        <option value="case_specific_only">Case-specific only</option>
                      </select>
                    </div>
                    <input
                      type="text"
                      name="decisionSummary"
                      placeholder="Reviewer decision summary"
                      className="h-10 w-full rounded-2xl border border-border px-3 text-sm"
                    />
                    <textarea
                      name="note"
                      placeholder="Reviewer note"
                      className="min-h-24 w-full rounded-[20px] border border-border p-3 text-sm"
                    />
                    <input
                      type="text"
                      name="escalationReason"
                      placeholder="Escalation reason if needed"
                      className="h-10 w-full rounded-2xl border border-border px-3 text-sm"
                    />
                    <Button variant="outline">Save research resolution</Button>
                  </form>
                </div>
              ))}
              {!taxCase.researchQueries?.length ? (
                <p className="text-sm text-muted">No research answers have been saved for this case yet.</p>
              ) : null}
            </div>
          </Card>
          <Card>
            <CardTitle>Processing and audit trail</CardTitle>
            <CardDescription className="mt-2">
              Internal ops visibility for processing jobs, field overrides, and reviewer actions.
            </CardDescription>
            <div className="mt-5 space-y-4">
              {taxCase.processingJobs?.map((job) => (
                <div key={job.id} className="rounded-2xl bg-stone-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{job.documentName ?? "Case processing job"}</p>
                    <Badge tone={job.status === "failed" ? "danger" : job.status === "completed" ? "success" : "info"}>{job.status}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted">Updated: {job.updatedAt}</p>
                  {job.lastError ? <p className="mt-2 text-sm text-rose-700">{job.lastError}</p> : null}
                </div>
              ))}
              {taxCase.auditLogs?.slice(0, 6).map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-border p-4">
                  <p className="font-medium">{entry.action}</p>
                  <p className="mt-1 text-sm text-muted">{entry.entityType}</p>
                  <p className="mt-1 text-xs text-muted">{entry.createdAt}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
