from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


ConfidenceBand = Literal["high", "medium", "low"]
RoleType = Literal["client", "preparer", "admin"]


class UploadedDocument(BaseModel):
    document_id: str
    file_name: str
    declared_form_type: str | None = None
    mime_type: str
    uploaded_by: RoleType
    checksum: str | None = None
    storage_path: str | None = None
    content_text: str | None = None


class IntakeAnswers(BaseModel):
    filing_status: Literal["single", "married_filing_jointly", "married_filing_separately", "head_of_household"]
    dependents_count: int = 0
    qualifying_child_count: int = 0
    education_expenses: float = 0
    self_employment: bool = False
    rental_income: bool = False
    state_of_residence: str
    local_tax_jurisdiction: str | None = None
    withholding_notes: str | None = None
    has_1098_t: bool = False
    consent_accepted: bool = False
    residency_status: str | None = None
    taxpayer_category: str | None = None
    student_status: bool = False
    school_name: str | None = None
    first_year_in_us: bool = False
    lived_in_us_full_year: bool = True
    spouse_has_different_residency: bool = False
    changed_immigration_status_this_year: bool = False
    has_spouse_or_dependent_without_ssn: bool = False
    can_be_claimed_dependent: bool = False
    employment_situation: str | None = None
    expects_w2: bool = False
    expects_1099_nec: bool = False
    expects_1099_misc: bool = False
    expects_1099_int: bool = False
    expects_1099_div: bool = False
    prior_year_filed_in_us: bool = False
    needs_education_review: bool = False
    has_scholarships_or_grants: bool = False
    has_on_campus_job: bool = False
    received_opt_cpt_income: bool = False
    received_unemployment_income: bool = False
    sold_stocks_or_crypto: bool = False
    had_marketplace_insurance: bool = False
    had_multiple_states: bool = False
    has_foreign_income_or_accounts: bool = False
    workflow_document_checklist: list[str] = Field(default_factory=list)
    additional_context: str | None = None


class CasePayload(BaseModel):
    case_id: str
    client_name: str
    tax_year: int = 2025
    processing_job_id: str | None = None
    requested_by_user_id: str | None = None
    intake: IntakeAnswers
    documents: list[UploadedDocument] = Field(default_factory=list)


class ExtractedField(BaseModel):
    name: str
    value: str | float | int | bool | None
    source_document_id: str
    source_label: str
    confidence: float = 0.0
    normalization_target: str | None = None


class ClassifiedDocument(BaseModel):
    document_id: str
    file_name: str
    form_type: str
    confidence: float
    status: Literal["processed", "review_needed", "unreadable", "duplicate", "conflicting", "queued"]
    extracted_fields: list[ExtractedField]
    duplicate_of: str | None = None
    conflicts_with: list[str] = Field(default_factory=list)
    unreadable_reason: str | None = None


class AssumptionRecord(BaseModel):
    code: str
    label: str
    detail: str


class WarningRecord(BaseModel):
    code: str
    severity: Literal["info", "warning", "critical"]
    message: str
    action: str | None = None


class ConfidenceReason(BaseModel):
    label: str
    impact: Literal["positive", "neutral", "negative"]
    detail: str


class CitationRecord(BaseModel):
    source_title: str
    source_url: str
    authority_type: str
    excerpt: str | None = None
    authority_tier: int | None = None
    revision_date: str | None = None
    effective_date: str | None = None
    draft_only: bool = False
    source_document_id: str | None = None
    source_version_id: str | None = None


class NormalizedTaxProfile(BaseModel):
    case_id: str
    tax_year: int
    filing_status: str
    state_of_residence: str
    wages: float = 0
    federal_withholding: float = 0
    state_withholding: float = 0
    interest_income: float = 0
    dividend_income: float = 0
    misc_income: float = 0
    nonemployee_compensation: float = 0
    self_employment_expenses: float = 0
    tuition_paid: float = 0
    scholarships: float = 0
    mortgage_interest: float = 0
    has_1098_t_support: bool = False
    dependents_count: int = 0
    qualifying_child_count: int = 0
    assumptions: list[str] = Field(default_factory=list)
    assumptions_detail: list[AssumptionRecord] = Field(default_factory=list)
    missing_items: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    warning_details: list[WarningRecord] = Field(default_factory=list)
    source_map: dict[str, list[ExtractedField]] = Field(default_factory=dict)


class EstimateLineItem(BaseModel):
    label: str
    amount: float
    category: Literal["income", "deduction", "tax", "withholding", "credit", "adjustment"]
    note: str


class EstimateResult(BaseModel):
    case_id: str
    engine_version: str
    generated_at: datetime
    estimated_federal_refund_or_due: float
    estimated_state_refund_or_due: float
    confidence: ConfidenceBand
    assumptions: list[str]
    assumptions_detail: list[AssumptionRecord]
    missing_data_warnings: list[str]
    warning_details: list[WarningRecord]
    confidence_reasons: list[ConfidenceReason]
    human_review_required: bool
    line_items: list[EstimateLineItem]
    client_insights: list[str]
    internal_insights: list[str]
    citations: list[CitationRecord] = Field(default_factory=list)


class ReviewAction(BaseModel):
    reviewer_id: str
    override_fields: dict[str, Any] = Field(default_factory=dict)
    note: str | None = None
    mark_reviewed: bool = False
    ready_for_tax_software_entry: bool = False


class CaseReprocessRequest(BaseModel):
    case_id: str
    document_id: str | None = None
    requested_by: str | None = None
    retry_job_id: str | None = None


class ExportRequest(BaseModel):
    export_type: Literal[
        "drake_documents_adapter",
        "drake_portal_adapter",
        "csv_export_adapter",
        "pdf_workpaper_export_adapter",
        "manual_review_queue_adapter",
    ]
    case_id: str
    requested_by: str


class DocumentProcessingJob(BaseModel):
    job_id: str
    status: Literal["queued", "processing", "completed", "failed"]
    case_id: str


class ResearchQuestion(BaseModel):
    question: str
    case_id: str | None = None
    case_facts: dict[str, Any] = Field(default_factory=dict)


class ResearchResolutionRequest(BaseModel):
    query_id: str
    reviewer_id: str
    review_status: Literal["open", "reviewed", "resolved", "escalated"] = "reviewed"
    note: str | None = None
    decision_summary: str | None = None
    escalation_reason: str | None = None
    guidance_label: Literal["safe_internal_guidance", "requires_further_review", "case_specific_only"] | None = None
    resolution_metadata: dict[str, Any] = Field(default_factory=dict)


class RuleCard(BaseModel):
    id: str
    title: str
    summary: str
    scope_tag: str
    authority_level: int
    citations: list[CitationRecord]
    effective_date: str | None = None
    tax_year: int | None = None
    follow_up_questions: list[str] = Field(default_factory=list)


class ResearchChangeEvent(BaseModel):
    id: str
    title: str
    summary: str
    severity: Literal["info", "warning", "critical"]
    effective_date: str | None = None
    source_title: str | None = None
    diff_summary: str | None = None


class ResearchSourceDebug(BaseModel):
    title: str
    source_url: str
    authority_tier: int
    authority_type: str
    relevance_score: float
    used_for: Literal["rule_card", "source_text", "alert", "case_match"]
    draft_only: bool = False
    revision_date: str | None = None
    ranking_reason: str


class ResearchPassage(BaseModel):
    source_title: str
    source_url: str
    authority_type: str
    authority_tier: int
    snippet: str
    relevance_score: float
    ranking_reason: str
    revision_date: str | None = None
    draft_only: bool = False
    source_version_id: str | None = None


class ResearchAnswer(BaseModel):
    answer: str
    citations: list[CitationRecord]
    related_rule_cards: list[RuleCard]
    conflict_detected: bool
    human_review_required: bool
    matched_topics: list[str] = Field(default_factory=list)
    authority_level: int = 9
    answer_mode: Literal["rule_cards", "sources", "hybrid", "fallback"] = "fallback"
    ranking_explanation: str = ""
    related_change_events: list[ResearchChangeEvent] = Field(default_factory=list)
    relevant_alerts: list["ResearchAlert"] = Field(default_factory=list)
    follow_up_questions: list[str] = Field(default_factory=list)
    draft_only_warning: bool = False
    source_freshness_notes: list[str] = Field(default_factory=list)
    source_debug: list[ResearchSourceDebug] = Field(default_factory=list)
    case_rule_matches: list[str] = Field(default_factory=list)
    supporting_passages: list[ResearchPassage] = Field(default_factory=list)
    conflict_summary: str | None = None
    conflict_reasons: list[str] = Field(default_factory=list)


class ResearchAlert(BaseModel):
    title: str
    severity: Literal["info", "warning", "critical"]
    summary: str
    effective_date: str | None = None


class EstimateRerunPayload(BaseModel):
    normalized_profile: NormalizedTaxProfile
    generated_by: str | None = None
    persist_result: bool = False


class SourceCatalogEntry(BaseModel):
    title: str
    source_url: str
    source_type: str
    authority_type: str
    authority_tier: int
    jurisdiction: str = "federal"
    priority_order: int = 1
    topic_tags: list[str] = Field(default_factory=list)
    tax_year: int | None = None
    form_number: str | None = None
    publication_number: str | None = None
    draft_only: bool = False
    scope_tag: str = "general-1040"


class ParsedSourceContent(BaseModel):
    title: str
    source_url: str
    source_type: str
    content_type: str
    authority_type: str
    authority_tier: int
    jurisdiction: str
    revision_date: str | None = None
    tax_year: int | None = None
    form_number: str | None = None
    publication_number: str | None = None
    topic_tags: list[str] = Field(default_factory=list)
    draft_only: bool = False
    checksum: str
    text_content: str
    extracted_summary: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    scope_tag: str = "general-1040"


class SourceVersionDiff(BaseModel):
    changed: bool
    previous_checksum: str | None = None
    current_checksum: str
    diff_summary: str
    excerpt: str | None = None


class IngestionRunRequest(BaseModel):
    run_type: Literal["scheduled", "manual", "retry"] = "manual"
    limit: int | None = None


class SourceIngestionResult(BaseModel):
    source_url: str
    title: str
    status: Literal["unchanged", "updated", "created", "failed", "draft_only"]
    checksum: str | None = None
    change_summary: str | None = None
    source_document_id: str | None = None
    source_version_id: str | None = None
    rule_card_id: str | None = None
    alert_id: str | None = None
    error: str | None = None


class SourceIngestionRunSummary(BaseModel):
    job_id: str | None = None
    run_type: str
    started_at: datetime
    completed_at: datetime | None = None
    source_count: int = 0
    success_count: int = 0
    failed_count: int = 0
    results: list[SourceIngestionResult] = Field(default_factory=list)
