export const clientFixture = {
  fullName: process.env.E2E_CLIENT_FULL_NAME ?? "Taylor Integration",
  email: process.env.E2E_CLIENT_EMAIL ?? "integration-client@ustaxdeals.test",
  password: process.env.E2E_CLIENT_PASSWORD ?? "RefundIQTest!234"
};

export const preparerFixture = {
  email: process.env.E2E_PREPARER_EMAIL ?? "integration-preparer@ustaxdeals.test",
  password: process.env.E2E_PREPARER_PASSWORD ?? "RefundIQPrep!234"
};

export const adminFixture = {
  email: process.env.E2E_ADMIN_EMAIL ?? "integration-admin@ustaxdeals.test",
  password: process.env.E2E_ADMIN_PASSWORD ?? "RefundIQAdmin!234"
};

export const intakeFixture = {
  stateOfResidence: "Texas",
  withholdingNotes: "Starter live-integration questionnaire response.",
  educationExpenses: "1200"
};
