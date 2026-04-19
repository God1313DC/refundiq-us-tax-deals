import { notFound } from "next/navigation";

import { resolveResearchQueryAction } from "@/app/(internal)/internal/actions";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { getResearchQueryDetail } from "@/lib/data";

export default async function ResearchHistoryDetailPage({
  params
}: {
  params: Promise<{ queryId: string }>;
}) {
  await requireRole(["preparer", "admin"]);
  const { queryId } = await params;
  const item = await getResearchQueryDetail(queryId);

  if (!item) notFound();

  return (
    <DashboardShell
      title="Research answer detail"
      subtitle="Preserved answer evidence, citation trail, and reviewer resolution history."
      role="Internal Staff"
      nav={[
        { href: "/internal", label: "Queue" },
        { href: "/internal/research", label: "Tax research AI" },
        { href: "/internal/research/history", label: "Answer history" },
        { href: `/internal/research/history/${item.id}`, label: "Detail", active: true }
      ]}
    >
      <div className="space-y-6">
        <Card>
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
          <div className="mt-5 rounded-2xl bg-stone-50 p-4 text-sm leading-7">{item.answer ?? "No answer stored."}</div>
          {item.conflictSummary ? (
            <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{item.conflictSummary}</div>
          ) : null}
        </Card>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Card>
            <CardTitle>Supporting passages</CardTitle>
            <div className="mt-4 space-y-3">
              {item.supportingPassages?.map((passage, index) => (
                <div key={`${passage.sourceTitle}-${index}`} className="rounded-2xl border border-border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{passage.sourceTitle}</p>
                    <Badge tone={passage.draftOnly ? "warning" : "info"}>{passage.relevanceScore.toFixed(2)}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-foreground">{passage.snippet}</p>
                  <p className="mt-2 text-xs text-muted">{passage.rankingReason}</p>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <CardTitle>Citations and follow-up questions</CardTitle>
            <div className="mt-4 space-y-4">
              {(item.citations ?? []).map((citation, index) => (
                <div key={`${citation.sourceTitle}-${index}`} className="rounded-2xl bg-stone-50 p-4">
                  <p className="font-medium">{citation.sourceTitle}</p>
                  <p className="mt-1 text-xs text-muted">{citation.sourceAuthority}</p>
                  {citation.excerpt ? <p className="mt-2 text-sm text-foreground">{citation.excerpt}</p> : null}
                </div>
              ))}
              {(item.followUpQuestions ?? []).map((question) => (
                <div key={question} className="rounded-2xl border border-border p-4 text-sm">
                  {question}
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card>
            <CardTitle>Resolution workflow</CardTitle>
            <form action={resolveResearchQueryAction} className="mt-4 space-y-3">
              <input type="hidden" name="queryId" value={item.id} />
              <input type="hidden" name="caseId" value={item.caseId ?? ""} />
              <select name="reviewStatus" defaultValue={item.reviewStatus} className="h-10 w-full rounded-2xl border border-border px-3 text-sm">
                <option value="open">Open</option>
                <option value="reviewed">Reviewed</option>
                <option value="resolved">Resolved</option>
                <option value="escalated">Escalated</option>
              </select>
              <select name="guidanceLabel" defaultValue={item.guidanceLabel ?? "safe_internal_guidance"} className="h-10 w-full rounded-2xl border border-border px-3 text-sm">
                <option value="safe_internal_guidance">Safe internal guidance</option>
                <option value="requires_further_review">Requires further review</option>
                <option value="case_specific_only">Case-specific only</option>
              </select>
              <input type="text" name="decisionSummary" defaultValue={item.decisionSummary ?? ""} placeholder="Decision summary" className="h-10 w-full rounded-2xl border border-border px-3 text-sm" />
              <textarea name="note" defaultValue={item.reviewerNote ?? ""} placeholder="Reviewer note" className="min-h-28 w-full rounded-[20px] border border-border p-3 text-sm" />
              <input type="text" name="escalationReason" defaultValue={item.escalationReason ?? ""} placeholder="Escalation reason" className="h-10 w-full rounded-2xl border border-border px-3 text-sm" />
              <Button>Save resolution</Button>
            </form>
          </Card>
          <Card>
            <CardTitle>Reviewer history</CardTitle>
            <div className="mt-4 space-y-3">
              {(item.reviews ?? []).map((review) => (
                <div key={review.id} className="rounded-2xl border border-border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{review.reviewerName}</p>
                    <Badge tone={review.reviewStatus === "resolved" ? "success" : review.reviewStatus === "escalated" ? "warning" : "info"}>
                      {review.reviewStatus}
                    </Badge>
                  </div>
                  {review.decisionSummary ? <p className="mt-2 text-sm text-foreground">{review.decisionSummary}</p> : null}
                  {review.note ? <p className="mt-2 text-sm text-muted">{review.note}</p> : null}
                  {review.escalationReason ? <p className="mt-2 text-sm text-amber-800">{review.escalationReason}</p> : null}
                  <p className="mt-2 text-xs text-muted">{review.createdAt}</p>
                </div>
              ))}
              {!item.reviews?.length ? <p className="text-sm text-muted">No reviewer actions recorded yet.</p> : null}
            </div>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
