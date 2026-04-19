export type ConfidenceBand = "high" | "medium" | "low";

export type ClientCase = {
  id: string;
  clientName: string;
  filingStatus: string;
  state: string;
  estimateFederal: number;
  estimateState: number;
  amountDue: number;
  confidence: ConfidenceBand;
  missingDocuments: string[];
  nextSteps: string[];
  warnings: string[];
  assumptions: string[];
  documents: Array<{
    id: string;
    name: string;
    type: string;
    status: "processed" | "review-needed" | "missing";
    extractedValues: Array<{ field: string; value: string; source: string }>;
  }>;
  lineItems: Array<{ label: string; amount: number; note: string }>;
  internalInsights: string[];
  clientInsights: string[];
  notes: Array<{ author: string; role: string; text: string; timestamp: string }>;
};

export const demoCases: ClientCase[] = [
  {
    id: "case-1024",
    clientName: "Jordan Miles",
    filingStatus: "Single",
    state: "Texas",
    estimateFederal: 2875,
    estimateState: 0,
    amountDue: 0,
    confidence: "medium",
    missingDocuments: ["1098-T box 1 payment detail", "Local tax withholding detail"],
    nextSteps: [
      "Upload remaining education support documents",
      "Confirm whether any additional 1099 income exists",
      "Schedule a preparer review before filing"
    ],
    warnings: [
      "Education credit scenario needs supporting payment detail",
      "Confidence lowered because one withholding field is still incomplete"
    ],
    assumptions: [
      "Using 2025 standard deduction for single filer",
      "Education credit estimate uses available intake answers and uploaded 1098-T"
    ],
    documents: [
      {
        id: "doc-w2-1",
        name: "Acme Payroll W-2.pdf",
        type: "W-2",
        status: "processed",
        extractedValues: [
          { field: "wages", value: "$58,400", source: "W-2 Box 1" },
          { field: "federal_withholding", value: "$6,150", source: "W-2 Box 2" },
          { field: "state_wages", value: "$58,400", source: "W-2 Box 16" }
        ]
      },
      {
        id: "doc-1098t-1",
        name: "State University 1098-T.pdf",
        type: "1098-T",
        status: "review-needed",
        extractedValues: [
          { field: "qualified_tuition_amount", value: "$4,000", source: "1098-T Box 1" },
          { field: "scholarships", value: "$750", source: "1098-T Box 5" }
        ]
      }
    ],
    lineItems: [
      { label: "W-2 wages", amount: 58400, note: "Primary earned income" },
      { label: "Adjusted gross income", amount: 58400, note: "No adjustments applied in MVP demo" },
      { label: "Standard deduction", amount: -15750, note: "2025 single standard deduction" },
      { label: "Estimated federal tax", amount: -5015, note: "Deterministic bracket calculation" },
      { label: "Withholding", amount: 6150, note: "W-2 federal withholding" },
      { label: "Education estimate", amount: 1740, note: "Limited-scope education scenario credit" }
    ],
    internalInsights: [
      "W-2 withholding appears adequate, but local withholding details are still absent from intake.",
      "Education credit scenario should be reviewed against student eligibility and payment support."
    ],
    clientInsights: [
      "Your estimate could improve if we confirm your education expenses.",
      "You appear to be on track for a refund, but final review is still required."
    ],
    notes: [
      {
        author: "Casey Rivera",
        role: "Preparer",
        text: "Requested school payment detail before marking reviewed.",
        timestamp: "2026-04-18 11:20 ET"
      }
    ]
  },
  {
    id: "case-2048",
    clientName: "Morgan & Alex Harper",
    filingStatus: "Married Filing Jointly",
    state: "California",
    estimateFederal: 0,
    estimateState: -320,
    amountDue: 1240,
    confidence: "low",
    missingDocuments: ["Second spouse W-2", "1099-INT for online savings", "Prior-year return"],
    nextSteps: [
      "Upload the second W-2 and interest statement",
      "Verify whether self-employment expenses are complete",
      "Hold filing until preparer resolves withholding gap"
    ],
    warnings: [
      "Refund estimate is not reliable until all income documents are complete",
      "Balance due may increase if additional 1099 income is confirmed"
    ],
    assumptions: [
      "Using MFJ standard deduction",
      "Self-employment expenses estimated from intake narrative pending source support"
    ],
    documents: [
      {
        id: "doc-nec-1",
        name: "Freelance 1099-NEC.jpg",
        type: "1099-NEC",
        status: "processed",
        extractedValues: [
          { field: "nonemployee_compensation", value: "$18,900", source: "1099-NEC Box 1" },
          { field: "payer_tin_status", value: "captured", source: "OCR parse" }
        ]
      },
      {
        id: "doc-id-1",
        name: "DriverLicense-front.png",
        type: "ID",
        status: "processed",
        extractedValues: [
          { field: "identity_verification", value: "pass", source: "document review status" }
        ]
      }
    ],
    lineItems: [
      { label: "W-2 wages received", amount: 43200, note: "Only one spouse document uploaded" },
      { label: "1099-NEC net income", amount: 15700, note: "After provisional expense assumption" },
      { label: "Estimated self-employment tax", amount: -2218, note: "Simplified SE tax formula" },
      { label: "Estimated federal tax", amount: -7385, note: "Before missing-income resolution" },
      { label: "Withholding received", amount: 6160, note: "Known documents only" }
    ],
    internalInsights: [
      "Case confidence is low because one spouse income stream is incomplete.",
      "Ask for prior-year return to compare withholding pattern and dependent treatment."
    ],
    clientInsights: [
      "You may owe tax because withholding appears low relative to current income.",
      "Your estimate could change once the remaining documents are uploaded."
    ],
    notes: [
      {
        author: "Jamie Chen",
        role: "Reviewer",
        text: "Flagged for manual review before tax software entry.",
        timestamp: "2026-04-18 14:45 ET"
      }
    ]
  }
];

export const queueStats = {
  openCases: 18,
  reviewReady: 6,
  lowConfidence: 5,
  exportsPending: 4
};
