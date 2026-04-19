import { demoCases } from "@/lib/demo-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  AdminUserRecord,
  AuditLogRecord,
  CaseRecord,
  DocumentRecord,
  EstimateLineItemRecord,
  EstimateRunRecord,
  IntakeQuestionnaireRecord,
  ChangeEventRecord,
  ProcessingJobRecord,
  ResearchQueryRecord,
  ResearchQueryReviewRecord,
  ResearchAlertRecord,
  RuleCardRecord,
  SourceHealthRecord
} from "@/lib/types";
import { canPreviewInline } from "@/lib/uploads";

function mapDemoCase(caseId?: string): CaseRecord | null {
  const fallback = caseId ? demoCases.find((item) => item.id === caseId) : demoCases[0];
  if (!fallback) return null;

  return {
    id: fallback.id,
    caseNumber: fallback.id.toUpperCase(),
    clientName: fallback.clientName,
    filingStatus: fallback.filingStatus,
    stateOfResidence: fallback.state,
    status: "review_required",
    confidenceBand: fallback.confidence,
    normalizedProfile: null,
    missingDocuments: fallback.missingDocuments,
    nextSteps: fallback.nextSteps,
    warnings: fallback.warnings,
    assumptions: fallback.assumptions,
    documents: fallback.documents.map((doc) => ({
      id: doc.id,
      fileName: doc.name,
      formType: doc.type,
      status: doc.status,
      mimeType: "application/pdf",
      filePath: "",
      extractedFields: doc.extractedValues.map((field, index) => ({
        id: `${doc.id}-${index}`,
        fieldName: field.field,
        fieldValue: field.value,
        sourceLabel: field.source,
        extractionConfidence: 0.84,
        manuallyOverridden: false
      }))
    })),
    notes: fallback.notes.map((note, index) => ({
      id: `${fallback.id}-note-${index}`,
      note: note.text,
      createdAt: note.timestamp,
      internalOnly: true,
      authorName: note.author,
      authorRole: note.role
    })),
    statusHistory: [],
    ruleMatches: [],
    clientInsights: fallback.clientInsights,
    internalInsights: fallback.internalInsights,
    estimateRun: {
      id: `${fallback.id}-estimate`,
      engineVersion: "2025.1-mvp",
      estimatedFederalRefundOrDue: fallback.estimateFederal,
      estimatedStateRefundOrDue: fallback.estimateState,
      confidenceBand: fallback.confidence,
      assumptions: fallback.assumptions,
      missingDataWarnings: fallback.warnings,
      confidenceReasons: fallback.warnings,
      clientInsights: fallback.clientInsights,
      internalInsights: fallback.internalInsights,
      lineItems: fallback.lineItems as EstimateLineItemRecord[],
      humanReviewRequired: true
    }
  };
}

async function buildSignedPreview(document: { file_path: string; mime_type: string }) {
  if (!document.file_path || !canPreviewInline(document.mime_type)) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.storage
    .from("tax-documents")
    .createSignedUrl(document.file_path, 60 * 10);
  return data?.signedUrl ?? null;
}

function mapResearchQuery(row: any): ResearchQueryRecord {
  return {
    id: row.id,
    caseId: row.case_id ?? null,
    caseNumber: row.cases?.case_number ?? null,
    askedByName: row.asked_by_user?.full_name ?? null,
    question: row.question,
    answer: row.answer ?? null,
    reviewStatus: row.review_status ?? "open",
    authorityLevel: row.authority_level ?? null,
    answerMode: row.answer_mode ?? null,
    conflictDetected: Boolean(row.conflict_detected),
    humanReviewRequired: Boolean(row.human_review_required),
    createdAt: row.created_at,
    decisionSummary: row.decision_summary ?? null,
    reviewerNote: row.reviewer_note ?? null,
    guidanceLabel: row.guidance_label ?? null,
    escalationReason: row.escalation_reason ?? null,
    draftOnlyWarning: Boolean(row.draft_only_warning),
    rankingExplanation: row.ranking_explanation ?? null,
    conflictSummary: row.conflict_summary ?? null,
    citations: (row.citations ?? []).map((citation: any) => ({
      sourceTitle: citation.source_title ?? "Source",
      sourceUrl: citation.source_url ?? "#",
      sourceAuthority: citation.authority_type ?? "irs",
      excerpt: citation.excerpt ?? null
    })),
    followUpQuestions: row.follow_up_questions ?? [],
    supportingPassages: (row.supporting_passages ?? []).map((passage: any) => ({
      sourceTitle: passage.source_title ?? "Source",
      snippet: passage.snippet ?? "",
      rankingReason: passage.ranking_reason ?? "",
      relevanceScore: Number(passage.relevance_score ?? 0),
      draftOnly: Boolean(passage.draft_only)
    })),
    reviews: (row.research_query_reviews ?? []).map(
      (review: any) =>
        ({
          id: review.id,
          action: review.action,
          reviewStatus: review.review_status,
          note: review.note ?? null,
          decisionSummary: review.decision_summary ?? null,
          escalationReason: review.escalation_reason ?? null,
          guidanceLabel: review.guidance_label ?? null,
          reviewerName: review.reviewer?.full_name ?? "Reviewer",
          createdAt: review.created_at
        }) satisfies ResearchQueryReviewRecord
    )
  };
}

export async function getClientPrimaryCase(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: cases, error } = await supabase
    .from("cases")
    .select(`
      id,
      case_number,
      filing_status,
      state_of_residence,
      status,
      confidence_band,
      users!cases_client_user_id_fkey(full_name),
      estimate_runs(
        id,
        engine_version,
        estimated_federal_refund_or_due,
        estimated_state_refund_or_due,
        confidence_band,
        assumptions,
        missing_data_warnings,
        human_review_required,
        estimate_line_items(label, amount, category, note)
      ),
      documents(id, file_name, form_type, status, mime_type, file_path, checksum),
      insights(id, audience, content),
      case_status_history(id, previous_status, new_status, reason, created_at)
    `)
    .eq("client_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error || !cases?.length) {
    return mapDemoCase();
  }

  const row = cases[0] as any;
  const estimate = row.estimate_runs?.[0];
  const missingWarnings = (estimate?.missing_data_warnings ?? []) as string[];
  const missingDocuments = missingWarnings.filter((item) =>
    /missing|required|upload|1098|w-2|1099/i.test(item)
  );
  const documents: DocumentRecord[] = await Promise.all(
    ((row.documents as any[]) ?? []).map(async (doc) => ({
      id: doc.id,
      fileName: doc.file_name,
      formType: doc.form_type,
      status: doc.status,
      mimeType: doc.mime_type,
      filePath: doc.file_path,
      checksum: doc.checksum,
      previewUrl: await buildSignedPreview(doc),
      extractedFields: []
    }))
  );

  const result: CaseRecord = {
    id: row.id,
    caseNumber: row.case_number,
    clientName: row.users?.full_name ?? "Client",
    filingStatus: row.filing_status,
    stateOfResidence: row.state_of_residence,
    status: row.status,
    confidenceBand: (row.confidence_band ?? estimate?.confidence_band ?? "low") as any,
    normalizedProfile: null,
    missingDocuments: missingDocuments.length ? missingDocuments : [],
    nextSteps: [
      "Upload any remaining missing documents",
      "Confirm details with a preparer",
      "Contact US Tax Deals to finalize and file accurately"
    ],
    warnings: missingWarnings,
    assumptions: [],
    documents,
    notes: [],
    statusHistory: ((row.case_status_history as any[]) ?? []).map((entry) => ({
      id: entry.id,
      previousStatus: entry.previous_status,
      newStatus: entry.new_status,
      reason: entry.reason,
      createdAt: entry.created_at
    })),
    ruleMatches: [],
    clientInsights: ((row.insights as any[]) ?? [])
      .filter((insight) => insight.audience === "client")
      .map((insight) => insight.content),
    internalInsights: ((row.insights as any[]) ?? [])
      .filter((insight) => insight.audience === "internal")
      .map((insight) => insight.content),
    estimateRun: estimate
      ? {
          id: estimate.id,
          engineVersion: estimate.engine_version,
          estimatedFederalRefundOrDue: Number(estimate.estimated_federal_refund_or_due),
          estimatedStateRefundOrDue: Number(estimate.estimated_state_refund_or_due),
          confidenceBand: estimate.confidence_band,
          assumptions: estimate.assumptions ?? [],
          missingDataWarnings: estimate.missing_data_warnings ?? [],
          lineItems: ((estimate.estimate_line_items as any[]) ?? []).map((item) => ({
            label: item.label,
            amount: Number(item.amount),
            category: item.category,
            note: item.note
          })),
          humanReviewRequired: estimate.human_review_required
        }
      : null
  };

  return result;
}

export async function getInternalCases() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("cases")
    .select(`
      id,
      case_number,
      status,
      filing_status,
      state_of_residence,
      confidence_band,
      users!cases_client_user_id_fkey(full_name),
      tax_profiles(missing_items, warnings),
      estimate_runs(
        id,
        estimated_federal_refund_or_due,
        estimated_state_refund_or_due,
        confidence_band
      )
    `)
    .order("created_at", { ascending: false });

  if (error || !data?.length) {
    return demoCases.map((item) => mapDemoCase(item.id)).filter(Boolean) as CaseRecord[];
  }

  return data.map((row: any) => {
    const estimate = row.estimate_runs?.[0];
    const profile = row.tax_profiles?.[0];
    return {
      id: row.id,
      caseNumber: row.case_number,
      clientName: row.users?.full_name ?? "Client",
      filingStatus: row.filing_status,
      stateOfResidence: row.state_of_residence,
      status: row.status,
      confidenceBand: (row.confidence_band ?? estimate?.confidence_band ?? "low") as any,
      normalizedProfile: null,
      missingDocuments: profile?.missing_items ?? [],
      nextSteps: [],
      warnings: profile?.warnings ?? [],
      assumptions: [],
      documents: [],
      notes: [],
      statusHistory: [],
      ruleMatches: [],
      clientInsights: [],
      internalInsights: [],
      estimateRun: estimate
        ? {
            id: estimate.id,
            engineVersion: "db",
            estimatedFederalRefundOrDue: Number(estimate.estimated_federal_refund_or_due),
            estimatedStateRefundOrDue: Number(estimate.estimated_state_refund_or_due),
            confidenceBand: estimate.confidence_band,
            assumptions: [],
            missingDataWarnings: profile?.warnings ?? [],
            lineItems: [],
            humanReviewRequired: true
          }
        : null
    } satisfies CaseRecord;
  });
}

export async function getInternalDashboardData() {
  const [cases, research, admin] = await Promise.all([
    getInternalCases(),
    getResearchDashboard(),
    getAdminDashboard()
  ]);

  return {
    cases,
    research,
    stats: {
      openCases: cases.filter((item) => item.status !== "ready_for_tax_software_entry").length,
      reviewReady: cases.filter((item) => ["review_required", "reviewed"].includes(item.status)).length,
      lowConfidence: cases.filter((item) => item.confidenceBand === "low").length,
      exportsPending: admin.openCases
    }
  };
}

export async function getInternalCase(caseId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("cases")
    .select(`
      id,
      case_number,
      status,
      filing_status,
      state_of_residence,
      confidence_band,
      users!cases_client_user_id_fkey(id, full_name),
      tax_profiles(normalized_json, assumptions, missing_items, warnings),
      estimate_runs(
        id,
        engine_version,
        estimated_federal_refund_or_due,
        estimated_state_refund_or_due,
        confidence_band,
        assumptions,
        missing_data_warnings,
        human_review_required,
        confidence_reasons,
        client_insights,
        internal_insights,
        estimate_line_items(id, label, amount, category, note)
      ),
      documents(
        id,
        file_name,
        form_type,
        status,
        mime_type,
        file_path,
        checksum,
        extracted_fields(id, field_name, field_value, source_label, extraction_confidence, manually_overridden, normalization_target)
      ),
      insights(id, audience, content),
      review_notes(id, note, created_at, internal_only, users(full_name, role)),
      case_status_history(id, previous_status, new_status, reason, created_at),
      document_processing_jobs(id, case_id, document_id, status, worker_job_id, last_error, retry_count, created_at, updated_at, completed_at, documents(file_name)),
      research_queries(
        id,
        case_id,
        question,
        answer,
        citations,
        conflict_detected,
        human_review_required,
        created_at,
        review_status,
        authority_level,
        answer_mode,
        ranking_explanation,
        decision_summary,
        reviewer_note,
        guidance_label,
        escalation_reason,
        draft_only_warning,
        follow_up_questions,
        supporting_passages,
        conflict_summary,
        asked_by_user:users!research_queries_asked_by_fkey(full_name),
        research_query_reviews(id, action, review_status, note, decision_summary, escalation_reason, guidance_label, created_at, reviewer:users!research_query_reviews_reviewer_id_fkey(full_name))
      ),
      audit_logs(id, action, entity_type, payload, created_at),
      case_rule_matches(
        id,
        severity,
        explanation,
        status,
        rule_cards(title, summary)
      )
    `)
    .eq("id", caseId)
    .single();

  if (error || !data) {
    return mapDemoCase(caseId);
  }

  const row = data as any;
  const profile = row.tax_profiles?.[0];
  const estimate = row.estimate_runs?.[0];

  const documents: DocumentRecord[] = await Promise.all(
    ((row.documents as any[]) ?? []).map(async (doc) => ({
      id: doc.id,
      fileName: doc.file_name,
      formType: doc.form_type,
      status: doc.status,
      mimeType: doc.mime_type,
      filePath: doc.file_path,
      checksum: doc.checksum,
      previewUrl: await buildSignedPreview(doc),
      extractedFields: ((doc.extracted_fields as any[]) ?? []).map((field) => ({
        id: field.id,
        fieldName: field.field_name,
        fieldValue:
          typeof field.field_value === "object" && field.field_value
            ? String(field.field_value.manual_value ?? field.field_value.value ?? JSON.stringify(field.field_value))
            : String(field.field_value ?? ""),
        sourceLabel: field.source_label,
        extractionConfidence: field.extraction_confidence ? Number(field.extraction_confidence) : null,
        manuallyOverridden: field.manually_overridden,
        normalizationTarget: field.normalization_target
      }))
    }))
  );

  return {
    id: row.id,
    caseNumber: row.case_number,
    clientName: row.users?.full_name ?? "Client",
    filingStatus: row.filing_status,
    stateOfResidence: row.state_of_residence,
    status: row.status,
    confidenceBand: (row.confidence_band ?? estimate?.confidence_band ?? "low") as any,
    normalizedProfile: profile?.normalized_json ?? null,
    missingDocuments: profile?.missing_items ?? [],
    nextSteps: [
      "Review extracted fields",
      "Resolve any missing or conflicting items",
      "Mark reviewed before software entry"
    ],
    warnings: profile?.warnings ?? estimate?.missing_data_warnings ?? [],
    assumptions: profile?.assumptions ?? estimate?.assumptions ?? [],
    documents,
    notes: ((row.review_notes as any[]) ?? []).map((note) => ({
      id: note.id,
      note: note.note,
      createdAt: note.created_at,
      internalOnly: note.internal_only,
      authorName: note.users?.full_name ?? "Reviewer",
      authorRole: note.users?.role ?? "preparer"
    })),
    statusHistory: ((row.case_status_history as any[]) ?? []).map((entry) => ({
      id: entry.id,
      previousStatus: entry.previous_status,
      newStatus: entry.new_status,
      reason: entry.reason,
      createdAt: entry.created_at
    })),
    ruleMatches: ((row.case_rule_matches as any[]) ?? []).map((match) => ({
      id: match.id,
      severity: match.severity,
      explanation: match.explanation,
      status: match.status,
      ruleTitle: match.rule_cards?.title ?? "Rule",
      ruleSummary: match.rule_cards?.summary ?? ""
    })),
    researchQueries: ((row.research_queries as any[]) ?? []).map(mapResearchQuery),
    processingJobs: ((row.document_processing_jobs as any[]) ?? []).map(
      (job) =>
        ({
          id: job.id,
          caseId: job.case_id,
          documentId: job.document_id,
          documentName: job.documents?.file_name ?? null,
          status: job.status,
          workerJobId: job.worker_job_id,
          lastError: job.last_error ?? null,
          retryCount: Number(job.retry_count ?? 0),
          createdAt: job.created_at,
          updatedAt: job.updated_at,
          completedAt: job.completed_at ?? null
        }) satisfies ProcessingJobRecord
    ),
    auditLogs: ((row.audit_logs as any[]) ?? []).map(
      (entry) =>
        ({
          id: entry.id,
          action: entry.action,
          entityType: entry.entity_type,
          createdAt: entry.created_at,
          payload: entry.payload ?? {}
        }) satisfies AuditLogRecord
    ),
    clientInsights:
      estimate?.client_insights ??
      ((row.insights as any[]) ?? [])
        .filter((insight) => insight.audience === "client")
        .map((insight) => insight.content),
    internalInsights:
      estimate?.internal_insights ??
      ((row.insights as any[]) ?? [])
        .filter((insight) => insight.audience === "internal")
        .map((insight) => insight.content),
    estimateRun: estimate
      ? {
          id: estimate.id,
          engineVersion: estimate.engine_version,
          estimatedFederalRefundOrDue: Number(estimate.estimated_federal_refund_or_due),
          estimatedStateRefundOrDue: Number(estimate.estimated_state_refund_or_due),
          confidenceBand: estimate.confidence_band,
          assumptions: estimate.assumptions ?? [],
          missingDataWarnings: estimate.missing_data_warnings ?? [],
          confidenceReasons:
            (estimate.confidence_reasons ?? []).map((item: any) =>
              typeof item === "string" ? item : item.detail ?? item.label ?? JSON.stringify(item)
            ) ?? [],
          clientInsights: estimate.client_insights ?? [],
          internalInsights: estimate.internal_insights ?? [],
          lineItems: ((estimate.estimate_line_items as any[]) ?? []).map((item) => ({
            id: item.id,
            label: item.label,
            amount: Number(item.amount),
            category: item.category,
            note: item.note
          })),
          humanReviewRequired: estimate.human_review_required
        }
      : null
  } satisfies CaseRecord;
}

export async function getResearchDashboard() {
  const supabase = await createSupabaseServerClient();
  const [{ data: alerts }, { data: rules }, { data: changes }, { data: sources }] = await Promise.all([
    supabase
      .from("research_alerts")
      .select("id, title, severity, summary, effective_date, impacted_case_types")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("rule_cards")
      .select(`
        id,
        title,
        summary,
        scope_tag,
        authority_level,
        citations(
          source_versions(
            source_documents(title, source_url, authority_type)
          ),
          excerpt
        )
      `)
      .order("updated_at", { ascending: false })
      .limit(6),
    supabase
      .from("change_events")
      .select(`
        id,
        title,
        summary,
        severity,
        effective_date,
        diff_summary,
        source_documents(title)
      `)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("source_documents")
      .select("id, title, source_type, authority_type, draft_only, last_status, last_synced_at, last_success_at, last_error")
      .order("priority_order", { ascending: true })
      .limit(8)
  ]);

  const mappedAlerts: ResearchAlertRecord[] =
    alerts?.map((item: any) => ({
      id: item.id,
      title: item.title,
      severity: item.severity,
      summary: item.summary,
      effectiveDate: item.effective_date
    })) ?? [];

  const mappedRules: RuleCardRecord[] =
    rules?.map((rule: any) => ({
      id: rule.id,
      title: rule.title,
      summary: rule.summary,
      scopeTag: rule.scope_tag,
      authorityLevel: rule.authority_level,
      citations:
        rule.citations?.map((citation: any) => ({
          sourceTitle: citation.source_versions?.source_documents?.title ?? "Source",
          sourceUrl: citation.source_versions?.source_documents?.source_url ?? "#",
          sourceAuthority: citation.source_versions?.source_documents?.authority_type ?? "irs",
          excerpt: citation.excerpt
        })) ?? []
    })) ?? [];

  const mappedChanges: ChangeEventRecord[] =
    changes?.map((change: any) => ({
      id: change.id,
      title: change.title,
      summary: change.summary,
      severity: change.severity,
      effectiveDate: change.effective_date,
      sourceTitle: change.source_documents?.title ?? "Source",
      diffSummary: change.diff_summary
    })) ?? [];

  const mappedSources: SourceHealthRecord[] =
    sources?.map((source: any) => ({
      id: source.id,
      title: source.title,
      sourceType: source.source_type,
      authorityType: source.authority_type,
      draftOnly: source.draft_only,
      lastStatus: source.last_status,
      lastSyncedAt: source.last_synced_at,
      lastSuccessAt: source.last_success_at,
      lastError: source.last_error
    })) ?? [];

  return {
    alerts: mappedAlerts,
    rules: mappedRules,
    changes: mappedChanges,
    sources: mappedSources
  };
}

export async function getClientIntakeQuestionnaire(caseId: string): Promise<IntakeQuestionnaireRecord | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("intake_questionnaires")
    .select(
      "filing_status, dependents_count, qualifying_child_count, education_expenses, self_employment, rental_income, state_of_residence, local_tax_jurisdiction, withholding_notes, has_1098_t, consent_accepted"
    )
    .eq("case_id", caseId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    filingStatus: data.filing_status,
    dependentsCount: data.dependents_count,
    qualifyingChildCount: data.qualifying_child_count,
    educationExpenses: Number(data.education_expenses ?? 0),
    selfEmployment: data.self_employment,
    rentalIncome: data.rental_income,
    stateOfResidence: data.state_of_residence,
    localTaxJurisdiction: data.local_tax_jurisdiction,
    withholdingNotes: data.withholding_notes,
    has1098T: data.has_1098_t,
    consentAccepted: data.consent_accepted
  };
}

export async function getAdminDashboard() {
  const supabase = await createSupabaseServerClient();
  const serviceHealthPromise = fetch(`${process.env.FASTAPI_BASE_URL}/health`, { cache: "no-store" })
    .then((response) => (response.ok ? response.json() : null))
    .catch(() => null);
  const [
    { count: userCount },
    { count: openCases },
    { count: failedJobs },
    { data: recentAlerts },
    { count: sourceJobs },
    { count: failedSourceSyncs },
    { data: sourceTypes },
    { data: recentChanges },
    { data: processingJobs },
    { data: sourceSyncHistory },
    { data: users },
    serviceHealth
  ] =
    await Promise.all([
      supabase.from("users").select("*", { count: "exact", head: true }),
      supabase.from("cases").select("*", { count: "exact", head: true }).neq("status", "ready_for_tax_software_entry"),
      supabase.from("document_processing_jobs").select("*", { count: "exact", head: true }).eq("status", "failed"),
      supabase.from("research_alerts").select("id, title, severity, summary").order("created_at", { ascending: false }).limit(5),
      supabase.from("source_ingestion_jobs").select("*", { count: "exact", head: true }),
      supabase.from("source_ingestion_jobs").select("*", { count: "exact", head: true }).eq("status", "failed"),
      supabase.from("source_documents").select("id, source_type, last_status, last_synced_at, title"),
      supabase
        .from("change_events")
        .select("id, title, severity, summary, effective_date, source_documents(title)")
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("document_processing_jobs")
        .select("id, case_id, document_id, status, worker_job_id, last_error, retry_count, created_at, updated_at, completed_at, documents(file_name)")
        .order("updated_at", { ascending: false })
        .limit(8),
      supabase
        .from("source_ingestion_jobs")
        .select("id, status, run_type, result_summary, source_count, success_count, failed_count, run_started_at, completed_at, error_message")
        .order("updated_at", { ascending: false })
        .limit(8),
      supabase
        .from("users")
        .select("id, full_name, email, role, organization_id")
        .order("created_at", { ascending: false })
        .limit(10),
      serviceHealthPromise
    ]);

  const sourceTypeCounts = (sourceTypes ?? []).reduce<Record<string, number>>((acc, item: any) => {
    const key = item.source_type ?? "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const latestSync = (sourceTypes ?? [])
    .map((item: any) => item.last_synced_at)
    .filter(Boolean)
    .sort()
    .reverse()[0] ?? null;

  return {
    userCount: userCount ?? 0,
    openCases: openCases ?? 0,
    failedJobs: failedJobs ?? 0,
    sourceJobs: sourceJobs ?? 0,
    failedSourceSyncs: failedSourceSyncs ?? 0,
    latestSourceSync: latestSync,
    sourceTypeCounts,
    recentAlerts:
      recentAlerts?.map((alert: any) => ({
        id: alert.id,
        title: alert.title,
        severity: alert.severity,
        summary: alert.summary
      })) ?? [],
    recentChanges:
      recentChanges?.map((change: any) => ({
        id: change.id,
        title: change.title,
        severity: change.severity,
        summary: change.summary,
        effectiveDate: change.effective_date,
        sourceTitle: change.source_documents?.title ?? "Source"
      })) ?? [],
    processingJobs:
      processingJobs?.map((job: any) => ({
        id: job.id,
        caseId: job.case_id,
        documentId: job.document_id,
        documentName: job.documents?.file_name ?? null,
        status: job.status,
        workerJobId: job.worker_job_id,
        lastError: job.last_error ?? null,
        retryCount: Number(job.retry_count ?? 0),
        createdAt: job.created_at,
        updatedAt: job.updated_at,
        completedAt: job.completed_at ?? null
      })) ?? [],
    sourceSyncHistory:
      sourceSyncHistory?.map((job: any) => ({
        id: job.id,
        status: job.status,
        runType: job.run_type,
        resultSummary: job.result_summary,
        sourceCount: job.source_count,
        successCount: job.success_count,
        failedCount: job.failed_count,
        runStartedAt: job.run_started_at,
        completedAt: job.completed_at,
        errorMessage: job.error_message
      })) ?? [],
    users:
      users?.map(
        (user: any) =>
          ({
            id: user.id,
            fullName: user.full_name,
            email: user.email,
            role: user.role,
            organizationId: user.organization_id
          }) satisfies AdminUserRecord
      ) ?? [],
    serviceHealth: serviceHealth ?? null
  };
}

export async function getResearchHistory(filters?: {
  caseId?: string;
  reviewStatus?: string;
  conflict?: string;
  authority?: string;
}) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("research_queries")
    .select(
      `
        id,
        case_id,
        question,
        answer,
        citations,
        conflict_detected,
        human_review_required,
        created_at,
        review_status,
        authority_level,
        answer_mode,
        ranking_explanation,
        decision_summary,
        reviewer_note,
        guidance_label,
        escalation_reason,
        draft_only_warning,
        follow_up_questions,
        supporting_passages,
        conflict_summary,
        asked_by_user:users!research_queries_asked_by_fkey(full_name),
        cases(case_number),
        research_query_reviews(id, action, review_status, note, decision_summary, escalation_reason, guidance_label, created_at, reviewer:users!research_query_reviews_reviewer_id_fkey(full_name))
      `
    )
    .order("created_at", { ascending: false })
    .limit(40);

  if (filters?.caseId) query = query.eq("case_id", filters.caseId);
  if (filters?.reviewStatus && filters.reviewStatus !== "all") query = query.eq("review_status", filters.reviewStatus);
  if (filters?.conflict === "yes") query = query.eq("conflict_detected", true);
  if (filters?.conflict === "no") query = query.eq("conflict_detected", false);
  if (filters?.authority && filters.authority !== "all") query = query.lte("authority_level", Number(filters.authority));

  const { data, error } = await query;
  if (error) return [];
  return (data ?? []).map(mapResearchQuery);
}

export async function getResearchQueryDetail(queryId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("research_queries")
    .select(
      `
        id,
        case_id,
        question,
        answer,
        citations,
        conflict_detected,
        human_review_required,
        created_at,
        review_status,
        authority_level,
        answer_mode,
        ranking_explanation,
        decision_summary,
        reviewer_note,
        guidance_label,
        escalation_reason,
        draft_only_warning,
        follow_up_questions,
        supporting_passages,
        conflict_summary,
        asked_by_user:users!research_queries_asked_by_fkey(full_name),
        cases(case_number),
        research_query_reviews(id, action, review_status, note, decision_summary, escalation_reason, guidance_label, created_at, reviewer:users!research_query_reviews_reviewer_id_fkey(full_name))
      `
    )
    .eq("id", queryId)
    .maybeSingle();

  if (error || !data) return null;
  return mapResearchQuery(data);
}
