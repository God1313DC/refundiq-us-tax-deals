import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseWorkflowNotes } from "@/lib/intake-workflow";

async function loadDocumentText(filePath: string | null | undefined, mimeType: string | null | undefined) {
  if (!filePath || !mimeType?.startsWith("text/")) return null;

  const admin = createSupabaseAdminClient();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "tax-documents";
  const { data, error } = await admin.storage.from(bucket).download(filePath);

  if (error || !data) return null;

  try {
    return await data.text();
  } catch {
    return null;
  }
}

export async function buildCaseProcessingPayload(caseId: string, requestedByUserId: string, processingJobId?: string | null) {
  const admin = createSupabaseAdminClient();
  const [{ data: caseDetail }, { data: documents }, { data: intake }] = await Promise.all([
    admin
      .from("cases")
      .select("id, tax_year, users!cases_client_user_id_fkey(full_name)")
      .eq("id", caseId)
      .single(),
    admin
      .from("documents")
      .select("id, file_name, form_type, mime_type, checksum, file_path")
      .eq("case_id", caseId),
    admin
      .from("intake_questionnaires")
      .select(
        "filing_status, dependents_count, qualifying_child_count, education_expenses, self_employment, rental_income, state_of_residence, local_tax_jurisdiction, withholding_notes, has_1098_t, consent_accepted"
      )
      .eq("case_id", caseId)
      .maybeSingle()
  ]);

  const parsedNotes = parseWorkflowNotes(intake?.withholding_notes ?? null);

  return {
    case_id: caseId,
    client_name: caseDetail?.users?.full_name ?? "Client",
    tax_year: caseDetail?.tax_year ?? new Date().getFullYear(),
    processing_job_id: processingJobId ?? null,
    requested_by_user_id: requestedByUserId,
    intake: {
      filing_status: intake?.filing_status ?? "single",
      dependents_count: intake?.dependents_count ?? 0,
      qualifying_child_count: intake?.qualifying_child_count ?? 0,
      education_expenses: Number(intake?.education_expenses ?? 0),
      self_employment: intake?.self_employment ?? false,
      rental_income: intake?.rental_income ?? false,
      state_of_residence: intake?.state_of_residence ?? "Unknown",
      local_tax_jurisdiction: intake?.local_tax_jurisdiction ?? null,
      withholding_notes: parsedNotes.freeText || null,
      has_1098_t: intake?.has_1098_t ?? false,
      consent_accepted: intake?.consent_accepted ?? true,
      residency_status: parsedNotes.workflowProfile.residencyStatus,
      taxpayer_category: parsedNotes.workflowProfile.taxpayerCategory,
      student_status: parsedNotes.workflowProfile.studentStatus,
      school_name: parsedNotes.workflowProfile.schoolName || null,
      first_year_in_us: parsedNotes.workflowProfile.firstYearInUs,
      lived_in_us_full_year: parsedNotes.workflowProfile.livedInUsFullYear,
      spouse_has_different_residency: parsedNotes.workflowProfile.spouseHasDifferentResidency,
      changed_immigration_status_this_year: parsedNotes.workflowProfile.changedImmigrationStatusThisYear,
      has_spouse_or_dependent_without_ssn: parsedNotes.workflowProfile.hasSpouseOrDependentWithoutSsn,
      can_be_claimed_dependent: parsedNotes.workflowProfile.canBeClaimedDependent,
      employment_situation: parsedNotes.workflowProfile.employmentSituation,
      expects_w2: parsedNotes.workflowProfile.expectsW2,
      expects_1099_nec: parsedNotes.workflowProfile.expects1099Nec,
      expects_1099_misc: parsedNotes.workflowProfile.expects1099Misc,
      expects_1099_int: parsedNotes.workflowProfile.expects1099Int,
      expects_1099_div: parsedNotes.workflowProfile.expects1099Div,
      prior_year_filed_in_us: parsedNotes.workflowProfile.priorYearFiledInUs,
      needs_education_review: parsedNotes.workflowProfile.needsEducationReview,
      has_scholarships_or_grants: parsedNotes.workflowProfile.hasScholarshipsOrGrants,
      has_on_campus_job: parsedNotes.workflowProfile.hasOnCampusJob,
      received_opt_cpt_income: parsedNotes.workflowProfile.receivedOptCptIncome,
      received_unemployment_income: parsedNotes.workflowProfile.receivedUnemploymentIncome,
      sold_stocks_or_crypto: parsedNotes.workflowProfile.soldStocksOrCrypto,
      had_marketplace_insurance: parsedNotes.workflowProfile.hadMarketplaceInsurance,
      had_multiple_states: parsedNotes.workflowProfile.hadMultipleStates,
      has_foreign_income_or_accounts: parsedNotes.workflowProfile.hasForeignIncomeOrAccounts,
      workflow_document_checklist: parsedNotes.workflowProfile.documentChecklist,
      additional_context: parsedNotes.workflowProfile.additionalContext || null,
    },
    documents:
      documents
        ? await Promise.all(
            documents.map(async (document) => ({
              document_id: document.id,
              file_name: document.file_name,
              declared_form_type: document.form_type ?? null,
              mime_type: document.mime_type,
              uploaded_by: "client",
              checksum: document.checksum,
              storage_path: document.file_path,
              content_text: await loadDocumentText(document.file_path, document.mime_type)
            }))
          )
        : []
  };
}

export async function triggerTaxEngineProcessing(payload: Record<string, unknown>) {
  const response = await fetch(`${process.env.FASTAPI_BASE_URL}/v1/documents/process`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    cache: "no-store"
  });

  return response;
}
