import { Lock, Upload } from "lucide-react";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { getClientPrimaryCase } from "@/lib/data";

const acceptedTypes = [
  "W-2",
  "1099-NEC",
  "1099-MISC",
  "1099-INT",
  "1099-DIV",
  "1098-T",
  "1098 mortgage interest",
  "Prior-year return PDF",
  "ID documents",
  "Additional PDF, image, or text files"
];

export default async function UploadsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;
  const profile = await requireRole(["client"]);
  const clientCase = await getClientPrimaryCase(profile.id);

  return (
    <DashboardShell
      title="Document uploads"
      subtitle="Upload the files needed to estimate your return. We accept PDFs, images, HEIC, and text-based supporting files."
      role="Client Portal"
      nav={[
        { href: "/portal", label: "Estimate" },
        { href: "/portal/profile", label: "Profile" },
        { href: "/portal/intake", label: "Intake questionnaire" },
        { href: "/portal/uploads", label: "Uploads", active: true }
      ]}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <Card className="border-dashed border-primary/40 bg-white">
          <Upload className="h-12 w-12 text-primary" />
          <CardTitle className="mt-5">Secure upload center</CardTitle>
          <CardDescription className="mt-2">
            By uploading, you confirm that RefundIQ provides an estimate only and that final filing requires preparer review.
          </CardDescription>
          <form
            action="/api/uploads"
            method="post"
            encType="multipart/form-data"
            className="mt-6 space-y-4"
          >
            <input type="hidden" name="caseId" value={clientCase?.id ?? ""} />
            <div className="rounded-[24px] border border-border bg-stone-50 p-5">
              <label className="mb-3 block text-sm font-medium text-foreground">Choose file</label>
              <input
                type="file"
                name="document"
                accept=".pdf,.jpg,.jpeg,.png,.heic,.heif,.txt"
                className="block w-full text-sm"
                required
              />
            </div>
            <label className="flex items-start gap-3 rounded-[24px] border border-border bg-stone-50 p-4 text-sm">
              <input type="checkbox" name="consentAccepted" value="true" required className="mt-1" />
              <span>
                I understand this tool provides an estimate only and that final filing requires review by a qualified tax professional.
              </span>
            </label>
            <Button>Upload securely</Button>
          </form>
          <div className="mt-6 flex flex-wrap gap-2">
            {acceptedTypes.map((type) => (
              <Badge key={type}>{type}</Badge>
            ))}
          </div>
          <div className="mt-8 flex items-center gap-4">
            <span className="flex items-center gap-2 text-sm text-muted">
              <Lock className="h-4 w-4 text-primary" />
              Private storage and reviewer access controls
            </span>
          </div>
          {params.error ? (
            <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{params.error}</p>
          ) : null}
          {params.success ? (
            <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Upload received. Processing status will update after review.
            </p>
          ) : null}
        </Card>
        <Card>
          <CardTitle>Uploaded documents</CardTitle>
          <div className="mt-5 space-y-3">
            {(clientCase?.documents ?? []).map((document) => (
              <div key={document.id} className="rounded-2xl bg-stone-50 px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{document.fileName}</p>
                    <p className="text-sm text-muted">{document.formType ?? "Unclassified"}</p>
                  </div>
                  <Badge
                    tone={document.status === "processed" ? "success" : document.status === "duplicate" ? "warning" : "info"}
                  >
                    {document.status}
                  </Badge>
                </div>
                {document.previewUrl ? (
                  <a
                    href={document.previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block text-sm font-medium text-primary"
                  >
                    Preview document
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
