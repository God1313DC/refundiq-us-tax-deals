import { AlertTriangle, CheckCircle2, FileWarning } from "lucide-react";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export function NextStepsCard({
  missingDocuments,
  nextSteps
}: {
  missingDocuments: string[];
  nextSteps: string[];
}) {
  return (
    <Card className="grid gap-6 lg:grid-cols-2">
      <div>
        <div className="mb-4 flex items-center gap-2">
          <FileWarning className="h-5 w-5 text-accent" />
          <CardTitle>Missing documents</CardTitle>
        </div>
        <ul className="space-y-3">
          {missingDocuments.map((item) => (
            <li key={item} className="rounded-2xl bg-stone-50 px-4 py-3 text-sm text-foreground">
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <div className="mb-4 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <CardTitle>Next steps</CardTitle>
        </div>
        <ul className="space-y-3">
          {nextSteps.map((item) => (
            <li key={item} className="flex gap-3 rounded-2xl bg-stone-50 px-4 py-3 text-sm text-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-accent" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
