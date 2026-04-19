import { ArrowRight, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { CLIENT_RESULT_DISCLAIMER } from "@/lib/disclaimers";
import { formatCurrency } from "@/lib/utils";

export function EstimateCard({
  federal,
  state,
  confidence
}: {
  federal: number;
  state: number;
  confidence: "high" | "medium" | "low";
}) {
  const total = federal + state;
  const tone =
    confidence === "high" ? "success" : confidence === "medium" ? "warning" : "danger";

  return (
    <Card className="bg-gradient-to-br from-secondary to-[#24495f] text-white">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-teal-200">Estimated result</p>
          <h3 className="mt-3 text-5xl font-semibold">{formatCurrency(total)}</h3>
          <p className="mt-3 text-sm text-slate-200">
            Federal estimate: {formatCurrency(federal)} · State estimate: {formatCurrency(state)}
          </p>
        </div>
        <Badge tone={tone}>{confidence} confidence</Badge>
      </div>
      <div className="mt-6 grid gap-4 rounded-[24px] bg-white/10 p-5 md:grid-cols-[1fr_auto]">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-teal-200" />
          <div>
            <CardTitle className="text-white">Estimate only</CardTitle>
            <CardDescription className="mt-1 text-slate-200">
              {CLIENT_RESULT_DISCLAIMER}
            </CardDescription>
          </div>
        </div>
        <Button className="self-center">
          Ready to file? Contact US Tax Deals <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
