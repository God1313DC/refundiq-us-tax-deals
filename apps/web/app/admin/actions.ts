"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { buildCaseProcessingPayload, triggerTaxEngineProcessing } from "@/lib/case-payload";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

async function createRetryJob(caseId: string, requestedBy: string, documentId?: string, retryOfJobId?: string) {
  const admin = createSupabaseAdminClient();
  const { data: job } = await admin
    .from("document_processing_jobs")
    .insert({
      case_id: caseId,
      document_id: documentId ?? null,
      status: "queued",
      created_by: requestedBy,
      retry_of_job_id: retryOfJobId ?? null,
      retry_count: retryOfJobId ? 1 : 0,
      result_payload: { initiated_by: "admin_action" }
    })
    .select("id")
    .single();

  return job?.id ?? null;
}

export async function runSourceSyncNowAction() {
  const profile = await requireRole(["admin"]);
  const admin = createSupabaseAdminClient();
  const response = await fetch(`${process.env.FASTAPI_BASE_URL}/v1/research/ingestion/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      run_type: "manual",
      limit: Number(process.env.ADMIN_SYNC_LIMIT ?? "10")
    }),
    cache: "no-store"
  });

  await admin.from("audit_logs").insert({
    organization_id: profile.organizationId,
    case_id: null,
    actor_id: profile.id,
    action: "source_sync_triggered",
    entity_type: "source_ingestion_job",
    payload: { ok: response.ok }
  });

  revalidatePath("/internal");
  revalidatePath("/internal/research");
  redirect(`/admin?syncStatus=${response.ok ? "started" : "failed"}`);
}

export async function retryProcessingJobAction(formData: FormData) {
  const profile = await requireRole(["admin"]);
  const jobId = String(formData.get("jobId") ?? "");
  const caseId = String(formData.get("caseId") ?? "");
  const documentId = String(formData.get("documentId") ?? "");
  if (!jobId || !caseId) return;

  const admin = createSupabaseAdminClient();
  const retryJobId = await createRetryJob(caseId, profile.id, documentId || undefined, jobId);
  const { data: currentCase } = await admin.from("cases").select("status").eq("id", caseId).maybeSingle();
  await admin.from("cases").update({ status: "processing" }).eq("id", caseId);
  if (documentId) {
    await admin.from("documents").update({ status: "processing" }).eq("id", documentId);
  }
  await admin.from("case_status_history").insert({
    case_id: caseId,
    previous_status: currentCase?.status ?? null,
    new_status: "processing",
    changed_by: profile.id,
    reason: "Admin retried a failed processing job."
  });
  const payload = await buildCaseProcessingPayload(caseId, profile.id, retryJobId);
  const response = await triggerTaxEngineProcessing(payload);
  const body = response.ok ? await response.json() : null;

  await admin
    .from("document_processing_jobs")
    .update({
      status: response.ok ? "processing" : "failed",
      worker_job_id: body?.job_id ?? null,
      started_at: new Date().toISOString(),
      last_error: response.ok ? null : "Retry processing request failed",
      result_payload: body ?? { error: "Retry processing request failed" }
    })
    .eq("id", retryJobId);

  await admin.from("audit_logs").insert({
    organization_id: profile.organizationId,
    case_id: caseId,
    actor_id: profile.id,
    action: "processing_job_retried",
    entity_type: "document_processing_job",
    entity_id: retryJobId ?? undefined,
    payload: {
      retry_of_job_id: jobId
    }
  });

  revalidatePath(`/internal/cases/${caseId}`);
  redirect(`/admin?jobStatus=${response.ok ? "retried" : "failed"}`);
}

export async function reprocessCaseAction(formData: FormData) {
  const profile = await requireRole(["admin"]);
  const caseId = String(formData.get("caseId") ?? "");
  const documentId = String(formData.get("documentId") ?? "");
  if (!caseId) return;

  const admin = createSupabaseAdminClient();
  const jobId = await createRetryJob(caseId, profile.id, documentId || undefined);
  const { data: currentCase } = await admin.from("cases").select("status").eq("id", caseId).maybeSingle();
  await admin.from("cases").update({ status: "processing" }).eq("id", caseId);
  if (documentId) {
    await admin.from("documents").update({ status: "processing" }).eq("id", documentId);
  }
  await admin.from("case_status_history").insert({
    case_id: caseId,
    previous_status: currentCase?.status ?? null,
    new_status: "processing",
    changed_by: profile.id,
    reason: "Admin manually reprocessed the case."
  });
  const payload = await buildCaseProcessingPayload(caseId, profile.id, jobId);
  const response = await triggerTaxEngineProcessing(payload);
  const body = response.ok ? await response.json() : null;

  await admin
    .from("document_processing_jobs")
    .update({
      status: response.ok ? "processing" : "failed",
      worker_job_id: body?.job_id ?? null,
      started_at: new Date().toISOString(),
      last_error: response.ok ? null : "Manual reprocess request failed",
      result_payload: body ?? { error: "Manual reprocess request failed" }
    })
    .eq("id", jobId);

  await admin.from("audit_logs").insert({
    organization_id: profile.organizationId,
    case_id: caseId,
    actor_id: profile.id,
    action: "case_reprocess_requested",
    entity_type: "case",
    entity_id: caseId,
    payload: {
      document_id: documentId || null
    }
  });

  revalidatePath(`/internal/cases/${caseId}`);
  redirect(`/admin?reprocessStatus=${response.ok ? "started" : "failed"}`);
}

export async function updateUserRoleAction(formData: FormData) {
  const profile = await requireRole(["admin"]);
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "client");
  if (!userId) return;

  const admin = createSupabaseAdminClient();
  await admin.from("users").update({ role }).eq("id", userId);
  await admin.from("audit_logs").insert({
    organization_id: profile.organizationId,
    case_id: null,
    actor_id: profile.id,
    action: "user_role_updated",
    entity_type: "user",
    entity_id: userId,
    payload: { role }
  });

  redirect("/admin?roleStatus=updated");
}

export async function rerunEstimateFromAdminAction(formData: FormData) {
  const profile = await requireRole(["admin"]);
  const caseId = String(formData.get("caseId") ?? "");
  if (!caseId) return;

  const admin = createSupabaseAdminClient();
  const { data: taxProfile } = await admin
    .from("tax_profiles")
    .select("normalized_json")
    .eq("case_id", caseId)
    .maybeSingle();

  if (!taxProfile?.normalized_json) {
    redirect(`/admin?error=No%20normalized%20profile%20available%20for%20case%20${encodeURIComponent(caseId)}`);
  }

  await fetch(`${process.env.FASTAPI_BASE_URL}/v1/estimates/rerun-from-profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      normalized_profile: {
        ...taxProfile.normalized_json,
        case_id: caseId
      },
      generated_by: profile.id,
      persist_result: true
    }),
    cache: "no-store"
  });

  await admin.from("audit_logs").insert({
    organization_id: profile.organizationId,
    case_id: caseId,
    actor_id: profile.id,
    action: "estimate_rerun_requested_by_admin",
    entity_type: "estimate_run",
    payload: {}
  });

  revalidatePath(`/internal/cases/${caseId}`);
  redirect("/admin?estimateStatus=rerun");
}
