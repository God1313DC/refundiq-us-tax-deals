export type WorkflowProfile = {
  residencyStatus: "citizen_or_resident" | "h1b_or_work_visa" | "green_card_holder" | "student_visa" | "nonresident_other";
  taxpayerCategory: "working_professional" | "student" | "self_employed" | "mixed";
  studentStatus: boolean;
  schoolName: string;
  firstYearInUs: boolean;
  livedInUsFullYear: boolean;
  spouseHasDifferentResidency: boolean;
  changedImmigrationStatusThisYear: boolean;
  hasSpouseOrDependentWithoutSsn: boolean;
  canBeClaimedDependent: boolean;
  employmentSituation: "w2_only" | "1099_only" | "w2_and_1099" | "not_currently_working";
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

export type ParsedWorkflowNotes = {
  freeText: string;
  workflowProfile: WorkflowProfile;
};

export const DEFAULT_WORKFLOW_PROFILE: WorkflowProfile = {
  residencyStatus: "citizen_or_resident",
  taxpayerCategory: "working_professional",
  studentStatus: false,
  schoolName: "",
  firstYearInUs: false,
  livedInUsFullYear: true,
  spouseHasDifferentResidency: false,
  changedImmigrationStatusThisYear: false,
  hasSpouseOrDependentWithoutSsn: false,
  canBeClaimedDependent: false,
  employmentSituation: "w2_only",
  expectsW2: true,
  expects1099Nec: false,
  expects1099Misc: false,
  expects1099Int: false,
  expects1099Div: false,
  priorYearFiledInUs: true,
  needsEducationReview: false,
  hasScholarshipsOrGrants: false,
  hasOnCampusJob: false,
  receivedOptCptIncome: false,
  receivedUnemploymentIncome: false,
  soldStocksOrCrypto: false,
  hadMarketplaceInsurance: false,
  hadMultipleStates: false,
  hasForeignIncomeOrAccounts: false,
  documentChecklist: [],
  additionalContext: "",
};

const WORKFLOW_PREFIX = "__REFUNDIQ_WORKFLOW__";

export function serializeWorkflowNotes(freeText: string | null | undefined, workflowProfile: WorkflowProfile) {
  return `${WORKFLOW_PREFIX}${JSON.stringify({
    freeText: freeText?.trim() ?? "",
    workflowProfile,
  })}`;
}

export function parseWorkflowNotes(raw: string | null | undefined): ParsedWorkflowNotes {
  if (!raw) {
    return {
      freeText: "",
      workflowProfile: { ...DEFAULT_WORKFLOW_PROFILE },
    };
  }

  if (!raw.startsWith(WORKFLOW_PREFIX)) {
    return {
      freeText: raw,
      workflowProfile: { ...DEFAULT_WORKFLOW_PROFILE },
    };
  }

  try {
    const parsed = JSON.parse(raw.slice(WORKFLOW_PREFIX.length));
    return {
      freeText: typeof parsed?.freeText === "string" ? parsed.freeText : "",
      workflowProfile: {
        ...DEFAULT_WORKFLOW_PROFILE,
        ...(parsed?.workflowProfile ?? {}),
      },
    };
  } catch {
    return {
      freeText: raw,
      workflowProfile: { ...DEFAULT_WORKFLOW_PROFILE },
    };
  }
}
