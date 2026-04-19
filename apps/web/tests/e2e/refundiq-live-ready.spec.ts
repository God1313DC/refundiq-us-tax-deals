import { expect, test } from "@playwright/test";

import { adminFixture, clientFixture, intakeFixture, preparerFixture } from "./fixtures";

const runLiveE2E = process.env.RUN_WEB_E2E === "true";

test.describe("RefundIQ live-ready browser scaffolding", () => {
  test.skip(!runLiveE2E, "Set RUN_WEB_E2E=true with live Supabase-backed credentials to run browser integration tests.");

  test("client signup/login, intake, uploads, and client-safe estimate flow", async ({ page }) => {
    await page.goto("/signup");
    await page.getByPlaceholder("Full name").fill(clientFixture.fullName);
    await page.getByPlaceholder("Email address").fill(clientFixture.email);
    await page.locator('input[name="password"]').fill(clientFixture.password);
    await page.locator('input[name="confirm_password"]').fill(clientFixture.password);
    await page.getByRole("button", { name: /create secure account/i }).click();

    await expect(page).toHaveURL(/\/portal/);
    await page.goto("/portal/intake");
    await page.locator('select[name="filing_status"]').selectOption("single");
    await page.locator('input[name="state_of_residence"]').fill(intakeFixture.stateOfResidence);
    await page.locator('input[name="education_expenses"]').fill(intakeFixture.educationExpenses);
    await page.locator('textarea[name="withholding_notes"]').fill(intakeFixture.withholdingNotes);
    await page.locator('input[name="consent_accepted"]').check();
    await page.getByRole("button", { name: /save intake/i }).click();

    await page.goto("/portal/uploads");
    await expect(page.getByText(/secure upload center/i)).toBeVisible();
    await expect(page.getByText(/estimate only/i)).toBeVisible();
  });

  test("internal preparer flow covers review, rerun, research, and history", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("Email address").fill(preparerFixture.email);
    await page.getByPlaceholder("Password").fill(preparerFixture.password);
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/internal/);
    await expect(page.getByText(/case review/i)).toBeVisible();

    await page.goto("/internal/research");
    await expect(page.getByText(/tax research intelligence/i)).toBeVisible();
    await page.goto("/internal/research/history");
    await expect(page.getByText(/research answer history/i)).toBeVisible();
  });

  test("admin flow covers source sync and operational dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("Email address").fill(adminFixture.email);
    await page.getByPlaceholder("Password").fill(adminFixture.password);
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByText(/admin operations/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /run source sync now/i })).toBeVisible();
  });
});
