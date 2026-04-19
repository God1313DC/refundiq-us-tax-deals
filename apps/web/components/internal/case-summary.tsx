import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { CaseRecord } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

export function CaseSummary({ taxCase }: { taxCase: CaseRecord }) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Card>
        <CardTitle>{taxCase.clientName}</CardTitle>
        <CardDescription className="mt-2">
          {taxCase.filingStatus} · {taxCase.stateOfResidence}
        </CardDescription>
        <Badge
          className="mt-4"
          tone={
            taxCase.confidenceBand === "high"
              ? "success"
              : taxCase.confidenceBand === "medium"
                ? "warning"
                : "danger"
          }
        >
          {taxCase.confidenceBand} confidence
        </Badge>
      </Card>
      <Card>
        <CardTitle>Estimated federal</CardTitle>
        <p className="mt-3 text-3xl font-semibold">
          {formatCurrency(taxCase.estimateRun?.estimatedFederalRefundOrDue ?? 0)}
        </p>
        <CardDescription className="mt-2">
          State estimate: {formatCurrency(taxCase.estimateRun?.estimatedStateRefundOrDue ?? 0)}
        </CardDescription>
      </Card>
      <Card>
        <CardTitle>Human review status</CardTitle>
        <p className="mt-3 text-base text-foreground">
          {taxCase.confidenceBand === "low"
            ? "Manual review required before software entry"
            : "Needs preparer sign-off before final filing"}
        </p>
        <CardDescription className="mt-2">
          Estimates remain provisional until a reviewer marks the case ready.
        </CardDescription>
      </Card>
    </div>
  );
}
