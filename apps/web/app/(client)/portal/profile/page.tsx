import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { getClientPrimaryCase } from "@/lib/data";

export default async function ClientProfilePage() {
  const profile = await requireRole(["client"]);
  const clientCase = await getClientPrimaryCase(profile.id);

  return (
    <DashboardShell
      title="Profile and review status"
      subtitle="Your account details, current case status, and client-safe workflow summary."
      role="Client Portal"
      nav={[
        { href: "/portal", label: "Estimate" },
        { href: "/portal/profile", label: "Profile", active: true },
        { href: "/portal/intake", label: "Intake questionnaire" },
        { href: "/portal/uploads", label: "Uploads" }
      ]}
    >
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardTitle>{profile.fullName ?? "Client profile"}</CardTitle>
          <CardDescription className="mt-2">{profile.email}</CardDescription>
          <div className="mt-4 space-y-2 text-sm text-muted">
            <p>Case number: {clientCase?.caseNumber ?? "Pending"}</p>
            <p>Status: {clientCase?.status ?? "intake_in_progress"}</p>
            <p>Confidence band: {clientCase?.confidenceBand ?? "low"}</p>
          </div>
        </Card>
        <Card>
          <CardTitle>Important reminder</CardTitle>
          <CardDescription className="mt-2">
            RefundIQ provides an estimate for review purposes only and is not a substitute for a final tax return prepared and reviewed by a qualified tax professional.
          </CardDescription>
          <div className="mt-4 space-y-2 text-sm text-muted">
            <p>Upload any missing documents to improve estimate confidence.</p>
            <p>Internal preparers review extracted details before any final filing workflow begins.</p>
            <p>To finalize and file accurately, contact US Tax Deals.</p>
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
