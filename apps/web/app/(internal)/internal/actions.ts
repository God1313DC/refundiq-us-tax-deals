"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function coerceOverrideValue(raw: string) {
  const trimmed = raw.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  const numeric = Number(trimmed);
  if (!Number.isNaN(numeric) && trimmed !== "") {
    return numeric;
  }
  return trimmed;
}

export async function addReviewNoteAction(formData: FormData) {
  const profile = await requireRole(["preparer", "admin"]);
  const caseId = String(formData.get("caseId") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!caseId || !note) return;

  const admin = createSupabaseAdminClient();
  await admin.from("review_notes").insert({
    case_id: caseId,
    author_id: profile.id,
    note,
    internal_only: true
  });
  await admin.from("audit_logs").insert({
    organization_id: profile.organizationId,
    case_id: caseId,
    actor_id: profile.id,
    action: "review_note_added",
    entity_type: "review_note",
    payload: { note_preview: note.slice(0, 160) }
  });

  revalidatePath(`/internal/cases/${caseId}`);
}

export async function markCaseReviewedAction(formData: FormData) {
  const profile = await requireRole(["preparer", "admin"]);
  const caseId = String(formData.get("caseId") ?? "");
  const readyForEntry = String(formData.get("readyForEntry") ?? "false") === "true";
  if (!caseId) return;

  const admin = createSupabaseAdminClient();
  const { data: currentCase } = await admin.from("cases").select("status").eq("id", caseId).single();
  const newStatus = readyForEntry ? "ready_for_tax_software_entry" : "reviewed";
  await admin
    .from("cases")
    .update({
      status: newStatus,
      preparer_reviewed_at: new Date().toISOString(),
      ready_for_tax_software_entry_at: readyForEntry ? new Date().toISOString() : null
    })
    .eq("id", caseId);
  await admin.from("case_status_history").insert({
    case_id: caseId,
    previous_status: currentCase?.status ?? null,
    new_status: newStatus,
    changed_by: profile.id,
    reason: readyForEntry ? "Marked ready for tax software entry." : "Marked reviewed by preparer."
  });

  await admin.from("audit_logs").insert({
    organization_id: profile.organizationId,
    case_id: caseId,
    actor_id: profile.id,
    action: readyForEntry ? "marked_ready_for_tax_software_entry" : "marked_reviewed_by_preparer",
    entity_type: "case",
    payload: {}
  });

  revalidatePath(`/internal/cases/${caseId}`);
}

export async function overrideExtractedFieldAction(formData: FormData) {
  const profile = await requireRole(["preparer", "admin"]);
  const fieldId = String(formData.get("fieldId") ?? "");
  const caseId = String(formData.get("caseId") ?? "");
  const overrideValue = String(formData.get("overrideValue") ?? "").trim();
  if (!fieldId || !caseId || !overrideValue) return;

  const admin = createSupabaseAdminClient();
  const parsedValue = coerceOverrideValue(overrideValue);
  const { data: fieldRow } = await admin
    .from("extracted_fields")
    .select("normalization_target")
    .eq("id", fieldId)
    .maybeSingle();
  await admin
    .from("extracted_fields")
    .update({
      field_value: { manual_value: parsedValue },
      manually_overridden: true,
      overridden_by: profile.id,
      review_status: "overridden"
    })
    .eq("id", fieldId);

  if (fieldRow?.normalization_target) {
    const { data: taxProfile } = await admin
      .from("tax_profiles")
      .select("id, normalized_json")
      .eq("case_id", caseId)
      .maybeSingle();

    if (taxProfile?.id) {
      const normalizedJson = { ...(taxProfile.normalized_json ?? {}) };
      normalizedJson[fieldRow.normalization_target] = parsedValue;
      await admin
        .from("tax_profiles")
        .update({
          normalized_json: normalizedJson,
          updated_at: new Date().toISOString()
        })
        .eq("id", taxProfile.id);
    }
  }

  await admin.from("audit_logs").insert({
    organization_id: profile.organizationId,
    case_id: caseId,
    actor_id: profile.id,
    action: "extracted_field_overridden",
    entity_type: "extracted_field",
    entity_id: fieldId,
    payload: { override_value: parsedValue }
  });

  revalidatePath(`/internal/cases/${caseId}`);
}

export async function rerunEstimateAction(formData: FormData) {
  const profile = await requireRole(["preparer", "admin"]);
  const caseId = String(formData.get("caseId") ?? "");
  if (!caseId) return;

  const admin = createSupabaseAdminClient();
  const [{ data: currentCase }, { data: taxProfile }] = await Promise.all([
    admin
      .from("cases")
      .select("status, organization_id")
      .eq("id", caseId)
      .single(),
    admin
      .from("tax_profiles")
      .select("normalized_json")
      .eq("case_id", caseId)
      .maybeSingle()
  ]);

  if (!taxProfile?.normalized_json) return;

  const normalizedProfile = {
    ...taxProfile.normalized_json,
    case_id: caseId
  };

  const response = await fetch(`${process.env.FASTAPI_BASE_URL}/v1/estimates/rerun-from-profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      normalized_profile: normalizedProfile,
      generated_by: profile.id,
      persist_result: true
    }),
    cache: "no-store"
  });

  if (!response.ok) return;

  await admin
    .from("cases")
    .update({
      status: "review_required",
      ready_for_tax_software_entry_at: null
    })
    .eq("id", caseId);
  await admin.from("case_status_history").insert({
    case_id: caseId,
    previous_status: currentCase?.status ?? null,
    new_status: "review_required",
    changed_by: profile.id,
    reason: "Estimate rerun after internal edits."
  });
  await admin.from("audit_logs").insert({
    organization_id: currentCase?.organization_id ?? profile.organizationId,
    case_id: caseId,
    actor_id: profile.id,
    action: "estimate_rerun_requested",
    entity_type: "estimate_run",
    payload: {}
  });

  revalidatePath(`/internal/cases/${caseId}`);
  revalidatePath("/internal");
}

export async function exportCaseAction(formData: FormData) {
  const profile = await requireRole(["preparer", "admin"]);
  const caseId = String(formData.get("caseId") ?? "");
  const exportType = String(formData.get("exportType") ?? "manual_review_queue_adapter");
  if (!caseId) return;

  const response = await fetch(`${process.env.FASTAPI_BASE_URL}/v1/exports/${caseId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      case_id: caseId,
      export_type: exportType,
      requested_by: profile.id
    }),
    cache: "no-store"
  });

  const admin = createSupabaseAdminClient();
  await admin.from("audit_logs").insert({
    organization_id: profile.organizationId,
    case_id: caseId,
    actor_id: profile.id,
    action: "integration_export_requested",
    entity_type: "integration_export",
    payload: {
      export_type: exportType,
      ok: response.ok
    }
  });

  redirect(
    `/internal/cases/${caseId}?export=${encodeURIComponent(exportType)}&exportStatus=${response.ok ? "success" : "failed"}`
  );
}

export async function resolveResearchQueryAction(formData: FormData) {
  const profile = await requireRole(["preparer", "admin"]);
  const queryId = String(formData.get("queryId") ?? "");
  const caseId = String(formData.get("caseId") ?? "");
  const reviewStatus = String(formData.get("reviewStatus") ?? "reviewed");
  const decisionSummary = String(formData.get("decisionSummary") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const escalationReason = String(formData.get("escalationReason") ?? "").trim();
  const guidanceLabel = String(formData.get("guidanceLabel") ?? "").trim();
  if (!queryId) return;

  const admin = createSupabaseAdminClient();
  await admin
    .from("research_queries")
    .update({
      review_status: reviewStatus,
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
      decision_summary: decisionSummary || null,
      reviewer_note: note || null,
      escalation_reason: escalationReason || null,
      guidance_label: guidanceLabel || null,
      resolution_metadata: {
        updated_by_role: profile.role
      }
    })
    .eq("id", queryId);

  await admin.from("research_query_reviews").insert({
    research_query_id: queryId,
    reviewer_id: profile.id,
    action: "resolution_update",
    review_status: reviewStatus,
    note: note || null,
    decision_summary: decisionSummary || null,
    escalation_reason: escalationReason || null,
    guidance_label: guidanceLabel || null,
    metadata: {
      case_id: caseId || null
    }
  });

  await admin.from("audit_logs").insert({
    organization_id: profile.organizationId,
    case_id: caseId || null,
    actor_id: profile.id,
    action: "research_query_resolved",
    entity_type: "research_query",
    entity_id: queryId,
    payload: {
      review_status: reviewStatus,
      guidance_label: guidanceLabel || null
    }
  });

  if (caseId) {
    revalidatePath(`/internal/cases/${caseId}`);
  }
  revalidatePath("/internal/research");
  revalidatePath("/internal/research/history");
  revalidatePath(`/internal/research/history/${queryId}`);
}
