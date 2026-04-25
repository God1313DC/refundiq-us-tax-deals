export type AppRole = "client" | "preparer" | "admin";

export type ConfidenceBand = "high" | "medium" | "low";

export type UserProfile = {
  id: string;
  fullName: string | null;
  email: string;
  role: AppRole;
  organizationId: string | null;
};

export type ExtractedFieldRecord = {
  id: string;
  fieldName: string;
  fieldValue: string;
  sourceLabel: string | null;
  extractionConfidence: number | null;
  manuallyOverridden: boolean;
  normalizationTarget?: string | null;
};

export type DocumentRecord = {
  id: string;
  fileName: string;
  formType: string | null;
  status: string;
  mimeType: string;
  filePath: string;
  checksum: string | null;
  previewUrl?: string | null;
  extractedFields: ExtractedFieldRecord[];
};

export type ReviewNoteRecord = {
  id: string;
  note: string;
  createdAt: string;
  internalOnly: boolean;
  authorName: string;
  authorRole: string;
};

export type AuditLogRecord = {
  id: string;
  action: string;
  entityType: string;
  createdAt: string;
  payload?: Record<string, unknown>;
};

export type InsightRecord = {
  id: string;
  audience: "client" | "internal";
  content: string;
};

export type EstimateLineItemRecord = {
  id?: string;
  label: string;
  amount: number;
  category?: string;
  note: string;
};

export type EstimateRunRecord = {
  id: string;
  engineVersion: string;
  estimatedFederalRefundOrDue: number;
  estimatedStateRefundOrDue: number;
  confidenceBand: ConfidenceBand;
  assumptions: string[];
  missingDataWarnings: string[];
  confidenceReasons?: string[];
  clientInsights?: string[];
  internalInsights?: string[];
  lineItems: EstimateLineItemRecord[];
  humanReviewRequired: boolean;
};

export type CaseRecord = {
  id: string;
  caseNumber: string;
  clientName: string;
  filingStatus: string | null;
  stateOfResidence: string | null;
  status: string;
  confidenceBand: ConfidenceBand;
  normalizedProfile?: Record<string, unknown> | null;
  missingDocuments: string[];
  nextSteps: string[];
  warnings: string[];
  assumptions: string[];
  documents: DocumentRecord[];
  notes: ReviewNoteRecord[];
  statusHistory?: {
    id: string;
    previousStatus: string | null;
    newStatus: string;
    reason: string | null;
    createdAt: string;
  }[];
  ruleMatches?: {
    id: string;
    severity: "info" | "warning" | "critical";
    explanation: string;
    status: string;
    ruleTitle: string;
    ruleSummary: string;
  }[];
  researchQueries?: ResearchQueryRecord[];
  processingJobs?: ProcessingJobRecord[];
  auditLogs?: AuditLogRecord[];
  clientInsights: string[];
  internalInsights: string[];
  estimateRun: EstimateRunRecord | null;
};

export type IntakeQuestionnaireRecord = {
  filingStatus: string | null;
  dependentsCount: number;
  qualifyingChildCount: number;
  educationExpenses: number;
  selfEmployment: boolean;
  rentalIncome: boolean;
  stateOfResidence: string | null;
  localTaxJurisdiction: string | null;
  withholdingNotes: string | null;
  has1098T: boolean;
  consentAccepted: boolean;
  workflowProfile?: {
    residencyStatus: string;
    taxpayerCategory: string;
    studentStatus: boolean;
    schoolName: string;
    firstYearInUs: boolean;
    livedInUsFullYear: boolean;
    spouseHasDifferentResidency: boolean;
    changedImmigrationStatusThisYear: boolean;
    hasSpouseOrDependentWithoutSsn: boolean;
    canBeClaimedDependent: boolean;
    employmentSituation: string;
    expectsW2: boolean;
    expects1099Nec: boolean;
    expects1099Misc: boolean;
    expects1099Int: boolean;
    expects1099Div: boolean;
    priorYearFiledInUs: boolean;
    needsEducationReview: boolean;
    hasScholarshipsOrGrants: boolean;
    hasOnCampusJob: boolean;
    receivedOptCptIncome: boolean;
    receivedUnemploymentIncome: boolean;
    soldStocksOrCrypto: boolean;
    hadMarketplaceInsurance: boolean;
    hadMultipleStates: boolean;
    hasForeignIncomeOrAccounts: boolean;
    documentChecklist: string[];
    additionalContext: string;
  };
};

export type SourceCitationRecord = {
  sourceTitle: string;
  sourceUrl: string;
  sourceAuthority: string;
  excerpt?: string | null;
};

export type RuleCardRecord = {
  id: string;
  title: string;
  summary: string;
  scopeTag: string;
  authorityLevel: number;
  citations: SourceCitationRecord[];
};

export type ResearchAlertRecord = {
  id: string;
  title: string;
  severity: "info" | "warning" | "critical";
  summary: string;
  effectiveDate: string | null;
};

export type ChangeEventRecord = {
  id: string;
  title: string;
  summary: string;
  severity: "info" | "warning" | "critical";
  effectiveDate: string | null;
  sourceTitle: string;
  diffSummary?: string | null;
};

export type SourceHealthRecord = {
  id: string;
  title: string;
  sourceType: string | null;
  authorityType: string;
  draftOnly: boolean;
  lastStatus: string;
  lastSyncedAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
};

export type ResearchQueryReviewRecord = {
  id: string;
  action: string;
  reviewStatus: string;
  note: string | null;
  decisionSummary: string | null;
  escalationReason: string | null;
  guidanceLabel: string | null;
  reviewerName: string;
  createdAt: string;
};

export type ResearchQueryRecord = {
  id: string;
  caseId: string | null;
  caseNumber?: string | null;
  askedByName?: string | null;
  question: string;
  answer: string | null;
  reviewStatus: string;
  authorityLevel: number | null;
  answerMode: string | null;
  conflictDetected: boolean;
  humanReviewRequired: boolean;
  createdAt: string;
  decisionSummary?: string | null;
  reviewerNote?: string | null;
  guidanceLabel?: string | null;
  escalationReason?: string | null;
  draftOnlyWarning?: boolean;
  rankingExplanation?: string | null;
  conflictSummary?: string | null;
  citations?: SourceCitationRecord[];
  followUpQuestions?: string[];
  supportingPassages?: Array<{
    sourceTitle: string;
    snippet: string;
    rankingReason: string;
    relevanceScore: number;
    draftOnly?: boolean;
  }>;
  reviews?: ResearchQueryReviewRecord[];
};

export type ProcessingJobRecord = {
  id: string;
  caseId: string;
  documentId: string | null;
  documentName?: string | null;
  status: string;
  workerJobId: string | null;
  lastError: string | null;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
};

export type AdminUserRecord = {
  id: string;
  fullName: string | null;
  email: string;
  role: AppRole;
  organizationId: string | null;
};
