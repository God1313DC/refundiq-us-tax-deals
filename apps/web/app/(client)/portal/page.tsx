import { redirect } from "next/navigation";
import { Mail, PhoneCall } from "lucide-react";

import { ContactCtaForm } from "@/components/client/contact-cta-form";
import { EstimateCard } from "@/components/client/estimate-card";
import { EstimateRefreshNotice } from "@/components/client/estimate-refresh-notice";
import { NextStepsCard } from "@/components/client/next-steps-card";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { getClientIntakeQuestionnaire, getClientPrimaryCase } from "@/lib/data";

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ");
}

function documentSatisfiesChecklistItem(item: string, documents: { fileName: string; formType: string | null }[]) {
  const normalizedItem = normalizeText(item);

  return documents.some((document) => {
    const haystack = `${document.fileName} ${document.formType ?? ""}`;
    const normalizedDocument = normalizeText(haystack);

    if (normalizedItem.includes("w 2")) return /w 2/.test(normalizedDocument);
    if (normalizedItem.includes("1099 nec")) return /1099 nec/.test(normalizedDocument);
    if (normalizedItem.includes("1099 misc")) return /1099 misc/.test(normalizedDocument);
    if (normalizedItem.includes("1099 int")) return /1099 int/.test(normalizedDocument);
    if (normalizedItem.includes("1099 div")) return /1099 div/.test(normalizedDocument);
    if (normalizedItem.includes("1098 t")) return /1098 t|tuition/.test(normalizedDocument);
    if (normalizedItem.includes("1095 a")) return /1095 a/.test(normalizedDocument);
    if (normalizedItem.includes("1099 g")) return /1099 g/.test(normalizedDocument);
    if (normalizedItem.includes("investment")) return /1099 b|brokerage|crypto|coinbase|robinhood/.test(normalizedDocument);
    if (normalizedItem.includes("foreign")) return /foreign|international/.test(normalizedDocument);
    if (normalizedItem.includes("visa") || normalizedItem.includes("immigration")) {
      return /visa|passport|i 20|ds 2019|ead|uscis|resident card|green card/.test(normalizedDocument);
    }
    if (normalizedItem.includes("id")) return /passport|driver|license|id/.test(normalizedDocument);
    if (normalizedItem.includes("prior year")) return /prior|1040|return/.test(normalizedDocument);

    return normalizedDocument.includes(normalizedItem);
  });
}

const checklistEligibleStatuses = new Set(["processed"]);

export default async function ClientPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ uploaded?: string; processing?: string }>;
}) {
  const params = await searchParams;
  const profile = await requireRole(["client"]);
  const clientCase = await getClientPrimaryCase(profile.id);

  if (!clientCase) {
    redirect("/portal/intake");
  }

  const intake = await getClientIntakeQuestionnaire(clientCase.id);
  const workflowChecklist = intake?.workflowProfile?.documentChecklist ?? [];
  const usableDocuments = clientCase.documents.filter((document) => checklistEligibleStatuses.has(document.status));
  const completedChecklist = workflowChecklist.filter((item) => documentSatisfiesChecklistItem(item, usableDocuments));
  const pendingChecklist = workflowChecklist.filter((item) => !documentSatisfiesChecklistItem(item, usableDocuments));
  const hasProcessingDocuments = clientCase.documents.some((document) => ["uploaded", "queued", "processing"].includes(document.status));
  const reviewNeededDocuments = clientCase.documents.filter((document) => ["review_needed", "unreadable", "conflicting", "duplicate"].includes(document.status));
  const showRefreshNotice = params.processing === "1" || hasProcessingDocuments;

  return (
    <DashboardShell
      title="Your current estimated result"
      subtitle="Review the current estimate, the facts used to build it, missing documents, and the next steps before preparer review."
      role="Client Portal"
      nav={[
        { href: "/portal", label: "Estimate", active: true },
        { href: "/portal/profile", label: "Profile" },
        { href: "/portal/intake", label: "Intake questionnaire" },
        { href: "/portal/uploads", label: "Uploads" }
      ]}
    >
      <div className="space-y-6">
        <EstimateRefreshNotice active={showRefreshNotice} />
        {params.uploaded === "1" ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
            Your document was uploaded successfully. We are reviewing it now and will refresh the estimate as processing finishes.
          </div>
        ) : null}
        {reviewNeededDocuments.length ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
            {reviewNeededDocuments.length === 1
              ? "One uploaded document still needs OCR or reviewer confirmation, so the estimate may not have changed yet."
              : `${reviewNeededDocuments.length} uploaded documents still need OCR or reviewer confirmation, so the estimate may not reflect all uploads yet.`}
          </div>
        ) : null}
        <EstimateCard
          federal={clientCase.estimateRun?.estimatedFederalRefundOrDue ?? 0}
          state={clientCase.estimateRun?.estimatedStateRefundOrDue ?? 0}
          confidence={clientCase.confidenceBand}
        />
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <NextStepsCard
            missingDocuments={clientCase.missingDocuments}
            nextSteps={clientCase.nextSteps}
          />
          <Card>
            <CardTitle>Plain-English insights</CardTitle>
            <div className="mt-4 space-y-3">
              {(clientCase.clientInsights.length
                ? clientCase.clientInsights
                : [
                    "Your estimate will be stronger once all required documents are uploaded.",
                    "A preparer will confirm the final result before filing."
                  ]).map((insight) => (
                <div key={insight} className="rounded-2xl bg-stone-50 px-4 py-3 text-sm">
                  {insight}
                </div>
              ))}
            </div>
            <CardDescription className="mt-5">
              Final result depends on complete documents and preparer review.
            </CardDescription>
          </Card>
        </div>
        <Card>
          <CardTitle>Progress on your intake and document checklist</CardTitle>
          <CardDescription className="mt-2">
            This shows what is already covered and what still looks incomplete based on your intake answers and uploaded files.
          </CardDescription>
          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-foreground">Completed</p>
              <div className="mt-3 space-y-3">
                {(completedChecklist.length ? completedChecklist : ["No intake-linked document matches yet."]).map((item) => (
                  <div key={item} className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Still needed</p>
              <div className="mt-3 space-y-3">
                {(pendingChecklist.length ? pendingChecklist : ["No pending checklist items from the guided intake right now."]).map((item) => (
                  <div key={item} className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <CardTitle>Return profile used for this estimate</CardTitle>
          <CardDescription className="mt-2">
            This summary comes from your guided intake answers and uploaded documents.
          </CardDescription>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-stone-50 p-4 text-sm">
              <p className="text-xs uppercase tracking-wide text-muted">Residency</p>
              <p className="mt-2 font-medium">{intake?.workflowProfile?.residencyStatus?.replaceAll("_", " ") ?? "Not provided"}</p>
            </div>
            <div className="rounded-2xl bg-stone-50 p-4 text-sm">
              <p className="text-xs uppercase tracking-wide text-muted">Taxpayer type</p>
              <p className="mt-2 font-medium">{intake?.workflowProfile?.taxpayerCategory?.replaceAll("_", " ") ?? "Not provided"}</p>
            </div>
            <div className="rounded-2xl bg-stone-50 p-4 text-sm">
              <p className="text-xs uppercase tracking-wide text-muted">Employment</p>
              <p className="mt-2 font-medium">{intake?.workflowProfile?.employmentSituation?.replaceAll("_", " ") ?? "Not provided"}</p>
            </div>
            <div className="rounded-2xl bg-stone-50 p-4 text-sm">
              <p className="text-xs uppercase tracking-wide text-muted">Student review</p>
              <p className="mt-2 font-medium">{intake?.workflowProfile?.studentStatus ? "Yes" : "No"}</p>
            </div>
          </div>
        </Card>
        <Card>
          <CardTitle>Review status timeline</CardTitle>
          <CardDescription className="mt-2">
            This timeline shows high-level case progress only. Internal review logic remains with the preparer team.
          </CardDescription>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {(clientCase.statusHistory?.length
              ? clientCase.statusHistory
              : [
                  {
                    id: "status-current",
                    previousStatus: null,
                    newStatus: clientCase.status,
                    reason: "Current case status",
                    createdAt: "Latest"
                  }
                ]).map((entry) => (
              <div key={entry.id} className="rounded-2xl bg-stone-50 p-4 text-sm">
                <p className="font-medium">{entry.newStatus.replaceAll("_", " ")}</p>
                {entry.reason ? <p className="mt-2 text-muted">{entry.reason}</p> : null}
                <p className="mt-2 text-xs text-muted">{entry.createdAt}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="grid gap-6 md:grid-cols-2">
          <div>
            <CardTitle>Ready to file?</CardTitle>
            <CardDescription className="mt-2">
              To finalize and file accurately, contact US Tax Deals.
            </CardDescription>
            <div className="mt-5 space-y-3 text-sm">
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                support@ustaxdeals.com
              </p>
              <p className="flex items-center gap-2">
                <PhoneCall className="h-4 w-4 text-primary" />
                Call booking link placeholder
              </p>
            </div>
          </div>
          <ContactCtaForm name={profile.fullName ?? "Client"} email={profile.email} />
        </Card>
      </div>
    </DashboardShell>
  );
}
