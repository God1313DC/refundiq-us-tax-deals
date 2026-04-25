"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { DEFAULT_WORKFLOW_PROFILE, serializeWorkflowNotes } from "@/lib/intake-workflow";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function saveIntakeQuestionnaireAction(formData: FormData) {
  const profile = await requireRole(["client"]);
  const caseId = String(formData.get("caseId") ?? "");
  if (!caseId) return;

  const admin = createSupabaseAdminClient();
  const filingStatus = String(formData.get("filingStatus") ?? "").trim() || null;
  const stateOfResidence = String(formData.get("stateOfResidence") ?? "").trim() || null;
  const dependentsCount = Number(formData.get("dependentsCount") ?? 0);
  const qualifyingChildCount = Number(formData.get("qualifyingChildCount") ?? 0);
  const educationExpenses = Number(formData.get("educationExpenses") ?? 0);
  const localTaxJurisdiction = String(formData.get("localTaxJurisdiction") ?? "").trim() || null;
  const withholdingNotes = String(formData.get("withholdingNotes") ?? "").trim() || null;
  const workflowProfile = {
    ...DEFAULT_WORKFLOW_PROFILE,
    residencyStatus: String(formData.get("residencyStatus") ?? DEFAULT_WORKFLOW_PROFILE.residencyStatus),
    taxpayerCategory: String(formData.get("taxpayerCategory") ?? DEFAULT_WORKFLOW_PROFILE.taxpayerCategory),
    studentStatus: formData.get("studentStatus") === "true",
    schoolName: String(formData.get("schoolName") ?? "").trim(),
    firstYearInUs: formData.get("firstYearInUs") === "true",
    livedInUsFullYear: formData.get("livedInUsFullYear") === "true",
    spouseHasDifferentResidency: formData.get("spouseHasDifferentResidency") === "true",
    changedImmigrationStatusThisYear: formData.get("changedImmigrationStatusThisYear") === "true",
    hasSpouseOrDependentWithoutSsn: formData.get("hasSpouseOrDependentWithoutSsn") === "true",
    canBeClaimedDependent: formData.get("canBeClaimedDependent") === "true",
    employmentSituation: String(formData.get("employmentSituation") ?? DEFAULT_WORKFLOW_PROFILE.employmentSituation),
    expectsW2: formData.get("expectsW2") === "true",
    expects1099Nec: formData.get("expects1099Nec") === "true",
    expects1099Misc: formData.get("expects1099Misc") === "true",
    expects1099Int: formData.get("expects1099Int") === "true",
    expects1099Div: formData.get("expects1099Div") === "true",
    priorYearFiledInUs: formData.get("priorYearFiledInUs") === "true",
    needsEducationReview: formData.get("needsEducationReview") === "true",
    hasScholarshipsOrGrants: formData.get("hasScholarshipsOrGrants") === "true",
    hasOnCampusJob: formData.get("hasOnCampusJob") === "true",
    receivedOptCptIncome: formData.get("receivedOptCptIncome") === "true",
    receivedUnemploymentIncome: formData.get("receivedUnemploymentIncome") === "true",
    soldStocksOrCrypto: formData.get("soldStocksOrCrypto") === "true",
    hadMarketplaceInsurance: formData.get("hadMarketplaceInsurance") === "true",
    hadMultipleStates: formData.get("hadMultipleStates") === "true",
    hasForeignIncomeOrAccounts: formData.get("hasForeignIncomeOrAccounts") === "true",
    documentChecklist: formData
      .getAll("documentChecklist")
      .map((item) => String(item).trim())
      .filter(Boolean),
    additionalContext: String(formData.get("additionalContext") ?? "").trim(),
  } as const;
  const selfEmployment = formData.get("selfEmployment") === "true";
  const rentalIncome = formData.get("rentalIncome") === "true";
  const has1098T = formData.get("has1098T") === "true";
  const consentAccepted = formData.get("consentAccepted") === "true";

  const { data: caseRow } = await admin
    .from("cases")
    .select("id, organization_id, client_user_id")
    .eq("id", caseId)
    .maybeSingle();

  if (!caseRow || caseRow.client_user_id !== profile.id) return;

  await admin.from("intake_questionnaires").upsert(
    {
      case_id: caseId,
      filing_status: filingStatus,
      dependents_count: dependentsCount,
      qualifying_child_count: qualifyingChildCount,
      education_expenses: educationExpenses,
      self_employment: selfEmployment,
      rental_income: rentalIncome,
      state_of_residence: stateOfResidence,
      local_tax_jurisdiction: localTaxJurisdiction,
      withholding_notes: serializeWorkflowNotes(withholdingNotes, workflowProfile),
      has_1098_t: has1098T,
      consent_accepted: consentAccepted,
      completed_at: new Date().toISOString()
    },
    { onConflict: "case_id" }
  );

  await admin
    .from("cases")
    .update({
      filing_status: filingStatus,
      state_of_residence: stateOfResidence
    })
    .eq("id", caseId);

  await admin.from("audit_logs").insert({
    organization_id: caseRow.organization_id,
    case_id: caseId,
    actor_id: profile.id,
    action: "intake_questionnaire_saved",
    entity_type: "intake_questionnaire",
    payload: {
      filing_status: filingStatus,
      state_of_residence: stateOfResidence
    }
  });

  revalidatePath("/portal/intake");
  revalidatePath("/portal");
}
