import { saveIntakeQuestionnaireAction } from "@/app/(client)/portal/intake/actions";
import { GuidedIntakeForm } from "@/components/client/guided-intake-form";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { getClientIntakeQuestionnaire, getClientPrimaryCase } from "@/lib/data";

export default async function IntakePage() {
  const profile = await requireRole(["client"]);
  const taxCase = await getClientPrimaryCase(profile.id);

  if (!taxCase) return null;

  const intake = await getClientIntakeQuestionnaire(taxCase.id);

  return (
    <DashboardShell
      title="Guided intake questionnaire"
      subtitle="Capture the details that help the estimate engine and preparers understand your return. The result remains estimated until a preparer reviews your documents."
      role="Client Portal"
      nav={[
        { href: "/portal", label: "Estimate" },
        { href: "/portal/profile", label: "Profile" },
        { href: "/portal/intake", label: "Intake questionnaire", active: true },
        { href: "/portal/uploads", label: "Uploads" }
      ]}
    >
      <Card>
        <CardTitle>Structured intake flow</CardTitle>
        <CardDescription className="mt-2">
          Follow the intake in order. We will use your answers to guide document requests, review flags, and your current estimated result.
        </CardDescription>
      </Card>
      <GuidedIntakeForm caseId={taxCase.id} intake={intake} action={saveIntakeQuestionnaireAction} />
    </DashboardShell>
  );
}
