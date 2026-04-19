import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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
      .select("id, file_name, mime_type, checksum, file_path")
      .eq("case_id", caseId),
    admin
      .from("intake_questionnaires")
      .select(
        "filing_status, dependents_count, qualifying_child_count, education_expenses, self_employment, rental_income, state_of_residence, local_tax_jurisdiction, withholding_notes, has_1098_t, consent_accepted"
      )
      .eq("case_id", caseId)
      .maybeSingle()
  ]);

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
      withholding_notes: intake?.withholding_notes ?? null,
      has_1098_t: intake?.has_1098_t ?? false,
      consent_accepted: intake?.consent_accepted ?? true
    },
    documents:
      documents?.map((document) => ({
        document_id: document.id,
        file_name: document.file_name,
        mime_type: document.mime_type,
        uploaded_by: "client",
        checksum: document.checksum,
        storage_path: document.file_path,
        content_text: null
      })) ?? []
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
