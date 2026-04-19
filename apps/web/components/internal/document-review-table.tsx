import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { DocumentRecord } from "@/lib/types";

export function DocumentReviewTable({ documents }: { documents: DocumentRecord[] }) {
  return (
    <Card>
      <CardTitle className="mb-4">Document extraction review</CardTitle>
      <Table>
        <THead>
          <TR>
            <TH>Document</TH>
            <TH>Type</TH>
            <TH>Status</TH>
            <TH>Extracted values</TH>
          </TR>
        </THead>
        <TBody>
          {documents.map((document) => (
            <TR key={document.id}>
              <TD className="font-medium">{document.fileName}</TD>
              <TD>{document.formType ?? "Unclassified"}</TD>
              <TD>
                <Badge
                  tone={
                    document.status === "processed"
                      ? "success"
                      : document.status === "review_needed" || document.status === "duplicate"
                        ? "warning"
                        : "danger"
                  }
                >
                  {document.status}
                </Badge>
              </TD>
              <TD>
                <div className="space-y-2">
                  {document.extractedFields.map((field) => (
                    <div key={field.id} className="rounded-2xl bg-stone-50 px-3 py-2">
                      <p className="text-xs uppercase tracking-wide text-muted">{field.fieldName}</p>
                      <p className="font-medium">{field.fieldValue}</p>
                      <p className="text-xs text-muted">{field.sourceLabel}</p>
                    </div>
                  ))}
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </Card>
  );
}
