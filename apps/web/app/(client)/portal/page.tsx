import { redirect } from "next/navigation";
import { Mail, PhoneCall } from "lucide-react";

import { ContactCtaForm } from "@/components/client/contact-cta-form";
import { EstimateCard } from "@/components/client/estimate-card";
import { NextStepsCard } from "@/components/client/next-steps-card";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { getClientPrimaryCase } from "@/lib/data";

export default async function ClientPortalPage() {
  const profile = await requireRole(["client"]);
  const clientCase = await getClientPrimaryCase(profile.id);

  if (!clientCase) {
    redirect("/portal/intake");
  }

  return (
    <DashboardShell
      title="Your estimated tax result"
      subtitle="Review your current estimate, missing documents, and next steps. Internal calculation details stay with the preparer team."
      role="Client Portal"
      nav={[
        { href: "/portal", label: "Estimate", active: true },
        { href: "/portal/profile", label: "Profile" },
        { href: "/portal/intake", label: "Intake questionnaire" },
        { href: "/portal/uploads", label: "Uploads" }
      ]}
    >
      <div className="space-y-6">
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
