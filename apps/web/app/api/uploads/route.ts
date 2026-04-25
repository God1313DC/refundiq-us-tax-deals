import { NextResponse } from "next/server";

import { buildCaseProcessingPayload, triggerTaxEngineProcessing } from "@/lib/case-payload";
import { getCurrentUserProfile, isAuthBypassed } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildDocumentStoragePath, checksumBuffer, isAllowedUploadType } from "@/lib/uploads";

function appBaseUrl() {
  return process.env.FRONTEND_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function POST(request: Request) {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "tax-documents";
  const baseUrl = appBaseUrl();
  const profile = isAuthBypassed()
    ? await getCurrentUserProfile("client")
    : await (async () => {
        const supabase = await createSupabaseServerClient();
        const {
          data: { user }
        } = await supabase.auth.getUser();
        return user
          ? {
              id: user.id,
              email: user.email ?? "client@example.local",
              fullName: user.user_metadata?.full_name ?? null,
              role: "client" as const,
              organizationId: null
            }
          : null;
      })();

  if (!profile) {
    return NextResponse.redirect(new URL("/portal/uploads?error=Client%20session%20not%20available", baseUrl));
  }

  const formData = await request.formData();
  const file = formData.get("document");
  const caseId = String(formData.get("caseId") ?? "");
  const documentTypeHint = String(formData.get("documentTypeHint") ?? "").trim() || null;
  const consentAccepted = String(formData.get("consentAccepted") ?? "") === "true";

  if (!(file instanceof File) || !caseId || !consentAccepted) {
    return NextResponse.redirect(new URL("/portal/uploads?error=Missing%20file%20or%20consent", baseUrl));
  }

  if (!isAllowedUploadType(file.name, file.type)) {
    return NextResponse.redirect(new URL("/portal/uploads?error=Unsupported%20file%20type", baseUrl));
  }

  const admin = createSupabaseAdminClient();
  const { data: caseRow } = await admin
    .from("cases")
    .select("id, organization_id, client_user_id, status")
    .eq("id", caseId)
    .single();

  if (!caseRow || caseRow.client_user_id !== profile.id) {
    return NextResponse.redirect(new URL("/portal/uploads?error=Invalid%20case%20access", baseUrl));
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const checksum = checksumBuffer(buffer);
  const filePath = buildDocumentStoragePath(caseId, file.name);
  const duplicateCheck = await admin
    .from("documents")
    .select("id")
    .eq("case_id", caseId)
    .eq("checksum", checksum)
    .limit(1)
    .maybeSingle();

  const { error: uploadError } = await admin.storage.from(bucket).upload(filePath, buffer, {
    upsert: false,
    contentType: file.type
  });

  if (uploadError) {
    return NextResponse.redirect(new URL(`/portal/uploads?error=${encodeURIComponent(uploadError.message)}`, baseUrl));
  }

  const { data: insertedDocument, error: insertError } = await admin
    .from("documents")
    .insert({
      case_id: caseId,
      uploaded_by: profile.id,
      file_name: file.name,
      file_path: filePath,
      preview_path: filePath,
      mime_type: file.type || "application/octet-stream",
      form_type: documentTypeHint,
      status: duplicateCheck.data?.id ? "duplicate" : "uploaded",
      checksum,
      duplicate_of: duplicateCheck.data?.id ?? null,
      encrypted_at_rest: true,
      consent_recorded: true,
      file_size_bytes: buffer.length
    })
    .select("id")
    .single();

  if (insertError || !insertedDocument) {
    return NextResponse.redirect(new URL(`/portal/uploads?error=${encodeURIComponent(insertError?.message ?? "Insert failed")}`, baseUrl));
  }

  await admin.from("document_versions").insert({
    document_id: insertedDocument.id,
    version_number: 1,
    storage_path: filePath,
    checksum,
    created_by: profile.id
  });

  const { data: insertedJob } = await admin
    .from("document_processing_jobs")
    .insert({
      case_id: caseId,
      document_id: insertedDocument.id,
      status: duplicateCheck.data?.id ? "completed" : "queued",
      created_by: profile.id,
      result_payload: duplicateCheck.data?.id ? { duplicate_of: duplicateCheck.data.id } : {}
    })
    .select("id")
    .single();

  await admin.from("audit_logs").insert({
    organization_id: caseRow.organization_id,
    case_id: caseId,
    actor_id: profile.id,
    action: "document_uploaded",
    entity_type: "document",
    entity_id: insertedDocument.id,
    payload: {
      file_name: file.name,
      mime_type: file.type,
      document_type_hint: documentTypeHint,
      duplicate_detected: Boolean(duplicateCheck.data?.id)
    }
  });

  if (!duplicateCheck.data?.id && insertedJob?.id) {
    await admin.from("documents").update({ status: "processing" }).eq("id", insertedDocument.id);
    await admin.from("cases").update({ status: "processing" }).eq("id", caseId);
    await admin.from("case_status_history").insert({
      case_id: caseId,
      previous_status: caseRow.status,
      new_status: "processing",
      changed_by: profile.id,
      reason: "Document upload queued for OCR, extraction, and estimate refresh."
    });
    const payload = await buildCaseProcessingPayload(caseId, profile.id, insertedJob.id);

    try {
      const response = await triggerTaxEngineProcessing(payload);

      if (response.ok) {
        const body = await response.json();
        await admin
          .from("document_processing_jobs")
          .update({
            worker_job_id: body.job_id ?? null,
            status: body.status === "queued" ? "processing" : body.status,
            result_payload: body,
            started_at: new Date().toISOString(),
            last_error: null
          })
          .eq("id", insertedJob.id);
      } else {
        await admin
          .from("document_processing_jobs")
          .update({
            status: "failed",
            result_payload: { error: "Processing request failed" },
            last_error: "Processing request failed",
            completed_at: new Date().toISOString()
          })
          .eq("id", insertedJob.id);
      }
    } catch {
      await admin
        .from("document_processing_jobs")
        .update({
          status: "failed",
          result_payload: { error: "Processing service unavailable" },
          last_error: "Processing service unavailable",
          completed_at: new Date().toISOString()
        })
        .eq("id", insertedJob.id);
    }
  }

  return NextResponse.redirect(new URL("/portal?uploaded=1&processing=1", baseUrl));
}
