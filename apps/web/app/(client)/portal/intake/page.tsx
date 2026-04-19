import { saveIntakeQuestionnaireAction } from "@/app/(client)/portal/intake/actions";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
      subtitle="Capture the details that help the estimate engine and preparers understand your return. This MVP is limited to common 1040 situations."
      role="Client Portal"
      nav={[
        { href: "/portal", label: "Estimate" },
        { href: "/portal/profile", label: "Profile" },
        { href: "/portal/intake", label: "Intake questionnaire", active: true },
        { href: "/portal/uploads", label: "Uploads" }
      ]}
    >
      <Card>
        <CardTitle>Tax profile</CardTitle>
        <CardDescription className="mt-2">
          Results stay estimated until a preparer reviews all supporting documents.
        </CardDescription>
        <form action={saveIntakeQuestionnaireAction} className="mt-6 space-y-4">
          <input type="hidden" name="caseId" value={taxCase.id} />
          <div className="grid gap-4 md:grid-cols-2">
            <Input name="filingStatus" defaultValue={intake?.filingStatus ?? taxCase.filingStatus ?? ""} placeholder="Filing status (Single, MFJ, HOH, MFS)" />
            <Input name="stateOfResidence" defaultValue={intake?.stateOfResidence ?? taxCase.stateOfResidence ?? ""} placeholder="State of residence" />
            <Input name="dependentsCount" type="number" defaultValue={String(intake?.dependentsCount ?? 0)} placeholder="Number of dependents" />
            <Input
              name="qualifyingChildCount"
              type="number"
              defaultValue={String(intake?.qualifyingChildCount ?? 0)}
              placeholder="Qualifying children"
            />
            <Input
              name="educationExpenses"
              type="number"
              defaultValue={String(intake?.educationExpenses ?? 0)}
              placeholder="Education expenses paid this year?"
            />
            <Input
              name="localTaxJurisdiction"
              defaultValue={intake?.localTaxJurisdiction ?? ""}
              placeholder="Local tax questions / locality"
            />
            <Input
              name="withholdingNotes"
              defaultValue={intake?.withholdingNotes ?? ""}
              placeholder="Any additional withholding detail?"
              className="md:col-span-2"
            />
          </div>
          <div className="grid gap-4 rounded-[24px] bg-stone-50 p-4 md:grid-cols-2">
            <label className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-sm">
              <span>Any self-employment income?</span>
              <input type="checkbox" name="selfEmployment" value="true" defaultChecked={intake?.selfEmployment ?? false} />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-sm">
              <span>Any rental income?</span>
              <input type="checkbox" name="rentalIncome" value="true" defaultChecked={intake?.rentalIncome ?? false} />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-sm">
              <span>Do you have a Form 1098-T?</span>
              <input type="checkbox" name="has1098T" value="true" defaultChecked={intake?.has1098T ?? false} />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-sm">
              <span>I confirm these answers are complete to the best of my knowledge.</span>
              <input type="checkbox" name="consentAccepted" value="true" defaultChecked={intake?.consentAccepted ?? false} />
            </label>
          </div>
          <Button className="mt-2">Save intake answers</Button>
        </form>
      </Card>
    </DashboardShell>
  );
}
