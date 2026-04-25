"use client";

import type { ChangeEvent } from "react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { IntakeQuestionnaireRecord } from "@/lib/types";

type Props = {
  caseId: string;
  intake: IntakeQuestionnaireRecord | null;
  action: (formData: FormData) => void | Promise<void>;
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-2 block text-sm font-semibold text-foreground">{children}</label>;
}

function ToggleCard({
  name,
  label,
  description,
  defaultChecked,
  checked,
  onCheckedChange,
}: {
  name: string;
  label: string;
  description?: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}) {
  return (
    <label className="rounded-2xl border border-border bg-white px-4 py-4 text-sm">
      <span className="flex items-start justify-between gap-3">
        <span>
          <span className="block font-medium text-foreground">{label}</span>
          {description ? <span className="mt-1 block text-muted">{description}</span> : null}
        </span>
        <input
          type="checkbox"
          name={name}
          value="true"
          {...(checked === undefined ? { defaultChecked } : { checked, onChange: (event: ChangeEvent<HTMLInputElement>) => onCheckedChange?.(event.target.checked) })}
          className="mt-1"
        />
      </span>
    </label>
  );
}

function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function GuidedIntakeForm({ caseId, intake, action }: Props) {
  const initialWorkflow = intake?.workflowProfile;
  const [residencyStatus, setResidencyStatus] = useState(initialWorkflow?.residencyStatus ?? "citizen_or_resident");
  const [taxpayerCategory, setTaxpayerCategory] = useState(initialWorkflow?.taxpayerCategory ?? "working_professional");
  const [employmentSituation, setEmploymentSituation] = useState(initialWorkflow?.employmentSituation ?? "w2_only");
  const [studentStatus, setStudentStatus] = useState(initialWorkflow?.studentStatus ?? false);
  const [needsEducationReview, setNeedsEducationReview] = useState(initialWorkflow?.needsEducationReview ?? false);
  const [expectsW2, setExpectsW2] = useState(initialWorkflow?.expectsW2 ?? true);
  const [expects1099Nec, setExpects1099Nec] = useState(initialWorkflow?.expects1099Nec ?? false);
  const [expects1099Misc, setExpects1099Misc] = useState(initialWorkflow?.expects1099Misc ?? false);
  const [expects1099Int, setExpects1099Int] = useState(initialWorkflow?.expects1099Int ?? false);
  const [expects1099Div, setExpects1099Div] = useState(initialWorkflow?.expects1099Div ?? false);
  const [receivedUnemploymentIncome, setReceivedUnemploymentIncome] = useState(
    initialWorkflow?.receivedUnemploymentIncome ?? false
  );
  const [soldStocksOrCrypto, setSoldStocksOrCrypto] = useState(initialWorkflow?.soldStocksOrCrypto ?? false);
  const [hadMarketplaceInsurance, setHadMarketplaceInsurance] = useState(
    initialWorkflow?.hadMarketplaceInsurance ?? false
  );
  const [hadMultipleStates, setHadMultipleStates] = useState(initialWorkflow?.hadMultipleStates ?? false);
  const [hasForeignIncomeOrAccounts, setHasForeignIncomeOrAccounts] = useState(
    initialWorkflow?.hasForeignIncomeOrAccounts ?? false
  );
  const [changedImmigrationStatusThisYear, setChangedImmigrationStatusThisYear] = useState(
    initialWorkflow?.changedImmigrationStatusThisYear ?? false
  );
  const [has1098T, setHas1098T] = useState(intake?.has1098T ?? false);

  const showStudentQuestions =
    studentStatus || taxpayerCategory === "student" || residencyStatus === "student_visa";
  const showH1bQuestions = residencyStatus === "h1b_or_work_visa";
  const showGreenCardQuestions = residencyStatus === "green_card_holder";
  const showNonresidentQuestions = residencyStatus === "nonresident_other";
  const showWorkVisaQuestions = showH1bQuestions || showNonresidentQuestions || residencyStatus === "student_visa";
  const show1099Questions = employmentSituation === "1099_only" || employmentSituation === "w2_and_1099" || taxpayerCategory === "self_employed" || taxpayerCategory === "mixed";

  const checklist = useMemo(() => {
    const items = ["Government-issued ID", "Prior-year U.S. tax return if available"];

    if (expectsW2 || employmentSituation === "w2_only" || employmentSituation === "w2_and_1099") {
      items.push("W-2 wage statement");
    }
    if (expects1099Nec) items.push("1099-NEC support");
    if (expects1099Misc) items.push("1099-MISC support");
    if (expects1099Int) items.push("1099-INT support");
    if (expects1099Div) items.push("1099-DIV support");
    if (showStudentQuestions || needsEducationReview || has1098T) {
      items.push("1098-T and tuition payment support");
    }
    if (showWorkVisaQuestions || showGreenCardQuestions) {
      items.push("Visa or immigration status support");
    }
    if (receivedUnemploymentIncome) items.push("1099-G unemployment support");
    if (soldStocksOrCrypto) items.push("Investment statements or 1099-B support");
    if (hadMarketplaceInsurance) items.push("1095-A marketplace insurance support");
    if (hasForeignIncomeOrAccounts) items.push("Foreign income or account support");
    if (hadMultipleStates) items.push("Multi-state wage or withholding support");
    if (changedImmigrationStatusThisYear) items.push("Immigration status change dates or notices");

    return Array.from(new Set(items));
  }, [
    changedImmigrationStatusThisYear,
    employmentSituation,
    expects1099Div,
    expects1099Int,
    expects1099Misc,
    expects1099Nec,
    expectsW2,
    hadMarketplaceInsurance,
    hadMultipleStates,
    has1098T,
    hasForeignIncomeOrAccounts,
    needsEducationReview,
    receivedUnemploymentIncome,
    showGreenCardQuestions,
    showStudentQuestions,
    showWorkVisaQuestions,
    soldStocksOrCrypto,
  ]);

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="caseId" value={caseId} />
      {checklist.map((item) => (
        <input key={item} type="hidden" name="documentChecklist" value={item} />
      ))}

      <section className="rounded-[28px] border border-border bg-stone-50 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Step 1</p>
        <h3 className="mt-2 text-xl font-semibold">Start with your general filing details</h3>
        <p className="mt-2 text-sm text-muted">
          We begin with broad questions first, then the form narrows into the parts that match your tax situation.
        </p>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div>
            <SectionLabel>Filing status</SectionLabel>
            <select
              name="filingStatus"
              defaultValue={intake?.filingStatus ?? "single"}
              className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm"
            >
              <option value="single">Single</option>
              <option value="married_filing_jointly">Married filing jointly</option>
              <option value="married_filing_separately">Married filing separately</option>
              <option value="head_of_household">Head of household</option>
            </select>
          </div>
          <div>
            <SectionLabel>State of residence</SectionLabel>
            <Input name="stateOfResidence" defaultValue={intake?.stateOfResidence ?? ""} placeholder="Example: Texas" />
          </div>
          <div>
            <SectionLabel>Residency or immigration status</SectionLabel>
            <select
              name="residencyStatus"
              value={residencyStatus}
              onChange={(event) => {
                const value = event.target.value;
                setResidencyStatus(value);
                if (value === "student_visa") {
                  setStudentStatus(true);
                  setNeedsEducationReview(true);
                }
              }}
              className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm"
            >
              <option value="citizen_or_resident">U.S. citizen or resident for filing purposes</option>
              <option value="green_card_holder">Green card holder</option>
              <option value="h1b_or_work_visa">H-1B or other work visa</option>
              <option value="student_visa">Student visa</option>
              <option value="nonresident_other">Other nonresident or unsure</option>
            </select>
          </div>
          <div>
            <SectionLabel>Main tax situation this year</SectionLabel>
            <select
              name="taxpayerCategory"
              value={taxpayerCategory}
              onChange={(event) => {
                const value = event.target.value;
                setTaxpayerCategory(value);
                if (value === "student") {
                  setStudentStatus(true);
                  setNeedsEducationReview(true);
                }
              }}
              className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm"
            >
              <option value="working_professional">Working professional</option>
              <option value="student">Student</option>
              <option value="self_employed">Self-employed or contractor</option>
              <option value="mixed">Mixed income situation</option>
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-border bg-stone-50 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Step 2</p>
        <h3 className="mt-2 text-xl font-semibold">Tell us about work, income, and document types</h3>
        <p className="mt-2 text-sm text-muted">
          These answers help us predict which documents should be present and which review checks should be triggered.
        </p>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <SectionLabel>Employment or income situation</SectionLabel>
            <select
              name="employmentSituation"
              value={employmentSituation}
              onChange={(event) => {
                const value = event.target.value;
                setEmploymentSituation(value);
                if (value === "1099_only" || value === "w2_and_1099") {
                  setExpects1099Nec(true);
                }
                if (value === "w2_only" || value === "w2_and_1099") {
                  setExpectsW2(true);
                }
              }}
              className="h-11 w-full rounded-2xl border border-border bg-white px-4 text-sm"
            >
              <option value="w2_only">W-2 employee only</option>
              <option value="1099_only">1099 income only</option>
              <option value="w2_and_1099">Both W-2 and 1099 income</option>
              <option value="not_currently_working">Not currently working or no earned income</option>
            </select>
          </div>

          <ToggleCard
            name="expectsW2"
            label="W-2 expected"
            description="Check this if you had one or more jobs that issue W-2 wage statements."
            checked={expectsW2}
            onCheckedChange={setExpectsW2}
          />
          <ToggleCard
            name="expects1099Nec"
            label="1099-NEC expected"
            description="Use this for contractor, freelance, or gig work reported on 1099-NEC."
            checked={expects1099Nec}
            onCheckedChange={setExpects1099Nec}
          />
          <ToggleCard
            name="expects1099Misc"
            label="1099-MISC expected"
            description="Use this if you expect a 1099-MISC or another non-wage support document."
            checked={expects1099Misc}
            onCheckedChange={setExpects1099Misc}
          />
          <ToggleCard
            name="expects1099Int"
            label="1099-INT expected"
            description="Use this if you received taxable interest income."
            checked={expects1099Int}
            onCheckedChange={setExpects1099Int}
          />
          <ToggleCard
            name="expects1099Div"
            label="1099-DIV expected"
            description="Use this if you received taxable dividend income."
            checked={expects1099Div}
            onCheckedChange={setExpects1099Div}
          />
          <ToggleCard
            name="selfEmployment"
            label="Self-employment or business activity"
            description="Check this if you had contractor or business income that may require Schedule C review."
            defaultChecked={intake?.selfEmployment ?? false}
          />
          <ToggleCard
            name="rentalIncome"
            label="Rental income"
            description="Check this if you had rental property income or expenses."
            defaultChecked={intake?.rentalIncome ?? false}
          />
          <ToggleCard
            name="receivedUnemploymentIncome"
            label="Unemployment income"
            description="Check this if you received unemployment benefits during the year."
            checked={receivedUnemploymentIncome}
            onCheckedChange={setReceivedUnemploymentIncome}
          />
          <ToggleCard
            name="soldStocksOrCrypto"
            label="Stocks or crypto sold"
            description="Check this if you had brokerage sales, crypto gains, or investment activity."
            checked={soldStocksOrCrypto}
            onCheckedChange={setSoldStocksOrCrypto}
          />
          <ToggleCard
            name="hadMarketplaceInsurance"
            label="Marketplace insurance"
            description="Check this if you received health coverage through the Marketplace and expect Form 1095-A."
            checked={hadMarketplaceInsurance}
            onCheckedChange={setHadMarketplaceInsurance}
          />
          <ToggleCard
            name="hadMultipleStates"
            label="Multiple states involved"
            description="Check this if you worked in, moved between, or lived in more than one state."
            checked={hadMultipleStates}
            onCheckedChange={setHadMultipleStates}
          />
          <ToggleCard
            name="hasForeignIncomeOrAccounts"
            label="Foreign income or foreign accounts"
            description="Check this if foreign income, accounts, or reporting could be relevant."
            checked={hasForeignIncomeOrAccounts}
            onCheckedChange={setHasForeignIncomeOrAccounts}
          />
          <ToggleCard
            name="priorYearFiledInUs"
            label="Filed in the U.S. before"
            description="Check this if you filed a U.S. tax return in a prior year."
            defaultChecked={initialWorkflow?.priorYearFiledInUs ?? true}
          />
        </div>
      </section>

      <section className="rounded-[28px] border border-border bg-stone-50 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Step 3</p>
        <h3 className="mt-2 text-xl font-semibold">Residency-specific follow-up questions</h3>
        <p className="mt-2 text-sm text-muted">
          This section adjusts itself based on the filing background you selected above.
        </p>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <ToggleCard
            name="firstYearInUs"
            label="First year in the U.S."
            description="Check this if this was your first tax year with U.S. presence."
            defaultChecked={initialWorkflow?.firstYearInUs ?? false}
          />
          <ToggleCard
            name="livedInUsFullYear"
            label="Lived in the U.S. for the full year"
            description="Uncheck this if you arrived, departed, or changed residency mid-year."
            defaultChecked={initialWorkflow?.livedInUsFullYear ?? true}
          />
          <ToggleCard
            name="spouseHasDifferentResidency"
            label="Spouse has a different residency status"
            description="Check this if you and your spouse may not have the same filing residency treatment."
            defaultChecked={initialWorkflow?.spouseHasDifferentResidency ?? false}
          />
          <ToggleCard
            name="changedImmigrationStatusThisYear"
            label="Immigration or residency status changed this year"
            description="Check this if your visa, work authorization, or residency treatment changed during the year."
            checked={changedImmigrationStatusThisYear}
            onCheckedChange={setChangedImmigrationStatusThisYear}
          />
          <ToggleCard
            name="hasSpouseOrDependentWithoutSsn"
            label="Spouse or dependent may not have an SSN"
            description="Check this if ITIN or identification number review may be needed."
            defaultChecked={initialWorkflow?.hasSpouseOrDependentWithoutSsn ?? false}
          />
        </div>

        {showH1bQuestions ? (
          <div className="mt-6 rounded-3xl border border-primary/20 bg-white p-5">
            <h4 className="text-lg font-semibold">H-1B or work-visa review</h4>
            <p className="mt-2 text-sm text-muted">
              We will pay closer attention to residency treatment, partial-year timing, and work authorization transitions.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <ToggleCard
                name="expectsW2"
                label="Primary income came through payroll"
                description="Most H-1B cases have W-2 wage support."
                checked={expectsW2}
                onCheckedChange={setExpectsW2}
              />
              <ToggleCard
                name="hadMultipleStates"
                label="Worked across more than one state"
                description="This helps us review state filing footprint and withholding."
                checked={hadMultipleStates}
                onCheckedChange={setHadMultipleStates}
              />
            </div>
          </div>
        ) : null}

        {showGreenCardQuestions ? (
          <div className="mt-6 rounded-3xl border border-primary/20 bg-white p-5">
            <h4 className="text-lg font-semibold">Green card review</h4>
            <p className="mt-2 text-sm text-muted">
              We will focus on timing, full-year treatment, and whether household residency facts change the review.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <ToggleCard
                name="changedImmigrationStatusThisYear"
                label="Green card status started or changed this year"
                description="Check this if the start date of permanent residency matters for the year."
                checked={changedImmigrationStatusThisYear}
                onCheckedChange={setChangedImmigrationStatusThisYear}
              />
              <ToggleCard
                name="spouseHasDifferentResidency"
                label="Household has mixed residency facts"
                description="Check this if spouse or dependent review could affect filing treatment."
                defaultChecked={initialWorkflow?.spouseHasDifferentResidency ?? false}
              />
            </div>
          </div>
        ) : null}

        {showNonresidentQuestions ? (
          <div className="mt-6 rounded-3xl border border-primary/20 bg-white p-5">
            <h4 className="text-lg font-semibold">Nonresident or uncertain residency review</h4>
            <p className="mt-2 text-sm text-muted">
              These situations often require extra preparer review before any filing decision is finalized.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <ToggleCard
                name="hasForeignIncomeOrAccounts"
                label="Foreign income or foreign accounts involved"
                description="Check this if non-U.S. income, bank accounts, or cross-border review may apply."
                checked={hasForeignIncomeOrAccounts}
                onCheckedChange={setHasForeignIncomeOrAccounts}
              />
              <ToggleCard
                name="changedImmigrationStatusThisYear"
                label="Residency treatment may have changed during the year"
                description="Check this if your presence, visa, or filing treatment may differ across the year."
                checked={changedImmigrationStatusThisYear}
                onCheckedChange={setChangedImmigrationStatusThisYear}
              />
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-[28px] border border-border bg-stone-50 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Step 4</p>
        <h3 className="mt-2 text-xl font-semibold">Student, school, and family questions</h3>
        <p className="mt-2 text-sm text-muted">
          We only ask deeper student questions when they are relevant to the case.
        </p>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <ToggleCard
            name="studentStatus"
            label="I was a student during the tax year"
            description="Check this if you attended school or university during the year."
            checked={studentStatus}
            onCheckedChange={setStudentStatus}
          />
          <ToggleCard
            name="canBeClaimedDependent"
            label="Someone else may be able to claim me as a dependent"
            description="This can change eligibility for deductions and credits."
            defaultChecked={initialWorkflow?.canBeClaimedDependent ?? false}
          />
          <ToggleCard
            name="needsEducationReview"
            label="Please review education-related credits or expenses"
            description="Check this if tuition, scholarships, or student status may affect the return."
            checked={needsEducationReview}
            onCheckedChange={setNeedsEducationReview}
          />
          <ToggleCard
            name="has1098T"
            label="I expect to upload Form 1098-T"
            description="Use this if your school issued Form 1098-T."
            checked={has1098T}
            onCheckedChange={setHas1098T}
          />
          <div>
            <SectionLabel>Dependents</SectionLabel>
            <Input name="dependentsCount" type="number" defaultValue={String(intake?.dependentsCount ?? 0)} placeholder="Total dependents" />
          </div>
          <div>
            <SectionLabel>Qualifying children</SectionLabel>
            <Input
              name="qualifyingChildCount"
              type="number"
              defaultValue={String(intake?.qualifyingChildCount ?? 0)}
              placeholder="Qualifying children"
            />
          </div>
        </div>

        {showStudentQuestions ? (
          <div className="mt-6 rounded-3xl border border-primary/20 bg-white p-5">
            <h4 className="text-lg font-semibold">Student-focused follow-up</h4>
            <p className="mt-2 text-sm text-muted">
              Because you indicated a student-related case, we are collecting the extra details that usually affect education review.
            </p>
            <div className="mt-4 grid gap-5 md:grid-cols-2">
              <div>
                <SectionLabel>School name</SectionLabel>
                <Input name="schoolName" defaultValue={initialWorkflow?.schoolName ?? ""} placeholder="University or college name" />
              </div>
              <div>
                <SectionLabel>Education expenses paid</SectionLabel>
                <Input
                  name="educationExpenses"
                  type="number"
                  defaultValue={String(intake?.educationExpenses ?? 0)}
                  placeholder="Example: 3500"
                />
              </div>
              <ToggleCard
                name="hasScholarshipsOrGrants"
                label="Scholarships or grants received"
                description="Check this if scholarships, grants, or fellowships may affect the education review."
                defaultChecked={initialWorkflow?.hasScholarshipsOrGrants ?? false}
              />
              <ToggleCard
                name="hasOnCampusJob"
                label="On-campus work income"
                description="Check this if you worked directly through the school or on campus."
                defaultChecked={initialWorkflow?.hasOnCampusJob ?? false}
              />
              <ToggleCard
                name="receivedOptCptIncome"
                label="OPT or CPT income"
                description="Check this if work authorization timing and student employment matter for the review."
                defaultChecked={initialWorkflow?.receivedOptCptIncome ?? false}
              />
            </div>
          </div>
        ) : null}

        {show1099Questions ? (
          <div className="mt-6 rounded-3xl border border-primary/20 bg-white p-5">
            <h4 className="text-lg font-semibold">Contractor or mixed-income follow-up</h4>
            <p className="mt-2 text-sm text-muted">
              Because you selected a 1099 or mixed-income path, we will watch for contractor support and missing expense records.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <ToggleCard
                name="expects1099Nec"
                label="1099-NEC is expected"
                description="Keep this checked if contractor support should be present."
                checked={expects1099Nec}
                onCheckedChange={setExpects1099Nec}
              />
              <ToggleCard
                name="expects1099Misc"
                label="1099-MISC is expected"
                description="Use this if miscellaneous non-wage support should be present."
                checked={expects1099Misc}
                onCheckedChange={setExpects1099Misc}
              />
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-[28px] border border-border bg-stone-50 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Step 5</p>
        <h3 className="mt-2 text-xl font-semibold">Anything else that may affect the review?</h3>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div>
            <SectionLabel>Local tax or city withholding details</SectionLabel>
            <Input
              name="localTaxJurisdiction"
              defaultValue={intake?.localTaxJurisdiction ?? ""}
              placeholder="Example: New York City, Philadelphia, none"
            />
          </div>
          <div>
            <SectionLabel>Additional withholding notes</SectionLabel>
            <Input
              name="withholdingNotes"
              defaultValue={intake?.withholdingNotes ?? ""}
              placeholder="Example: extra withholding from bonus payroll"
            />
          </div>
          <div className="md:col-span-2">
            <SectionLabel>Additional context for your preparer</SectionLabel>
            <Textarea
              name="additionalContext"
              defaultValue={initialWorkflow?.additionalContext ?? ""}
              placeholder="Tell us anything else that matters, like immigration timing, support from parents, unusual income, or missing documents."
            />
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-primary/25 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Step 6</p>
        <h3 className="mt-2 text-xl font-semibold">Expected documents and next step</h3>
        <p className="mt-2 text-sm text-muted">
          Based on your answers, this is the document list we expect next. After you save, upload these documents so the estimate can refresh as quickly as possible.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {checklist.map((item) => (
            <span key={item} className="rounded-full bg-stone-100 px-4 py-2 text-sm">
              {item}
            </span>
          ))}
        </div>
        <div className="mt-6 rounded-2xl bg-stone-50 px-4 py-4 text-sm text-muted">
          Current path: {humanize(residencyStatus)} • {humanize(taxpayerCategory)} • {humanize(employmentSituation)}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <ToggleCard
            name="consentAccepted"
            label="I confirm these answers are complete to the best of my knowledge"
            description="Your estimate will still remain an estimate until a preparer reviews the case."
            defaultChecked={intake?.consentAccepted ?? false}
          />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="submit">Save intake and continue</Button>
          <a href="/portal/uploads" className="inline-flex items-center justify-center rounded-full border border-border px-5 py-2.5 text-sm font-semibold">
            Go to document upload
          </a>
        </div>
      </section>
    </form>
  );
}
