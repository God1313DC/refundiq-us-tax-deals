import Link from "next/link";
import {
  ArrowRight,
  ClipboardCheck,
  FileStack,
  LockKeyhole,
  ShieldCheck,
  Sparkles
} from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PRIMARY_DISCLAIMER } from "@/lib/disclaimers";

const features = [
  {
    title: "Client intake that feels guided",
    description: "Collect filing status, dependents, education, self-employment, and withholding details in one workflow.",
    icon: ClipboardCheck
  },
  {
    title: "Secure document review",
    description: "Upload W-2s, 1099s, 1098s, prior-year returns, IDs, and supporting records into a structured case file.",
    icon: FileStack
  },
  {
    title: "Traceable estimate engine",
    description: "Every estimated result includes assumptions, warnings, confidence, and a clear handoff for preparer review.",
    icon: ShieldCheck
  }
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="relative overflow-hidden bg-secondary">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.35),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(217,119,6,0.22),transparent_32%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
          <div className="text-white">
            <Badge className="mb-5 bg-white/10 text-white" tone="neutral">
              CPA-assist, not DIY chaos
            </Badge>
            <h1 className="max-w-3xl text-5xl font-semibold tracking-tight md:text-6xl">
              RefundIQ for <span className="text-teal-300">US Tax Deals</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-slate-200">
              A premium intake and refund-estimation platform for common U.S. individual returns.
              Secure for clients, detailed for preparers, and always clear that results are estimated
              until human review.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/portal">
                <Button className="bg-white text-secondary hover:bg-stone-100">
                  Explore client portal <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/internal">
                <Button variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10">
                  View internal dashboard
                </Button>
              </Link>
            </div>
            <p className="mt-8 max-w-2xl text-sm text-slate-300">{PRIMARY_DISCLAIMER}</p>
          </div>
          <Card className="border-white/10 bg-white/95 p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-primary">Client result snapshot</p>
                <h2 className="mt-2 text-4xl font-semibold">$2,875 estimated refund</h2>
              </div>
              <Badge tone="warning">medium confidence</Badge>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl bg-stone-50 p-5">
                <p className="text-sm font-medium text-muted">Missing documents</p>
                <ul className="mt-3 space-y-2 text-sm">
                  <li>1098-T payment detail</li>
                  <li>Local tax withholding</li>
                </ul>
              </div>
              <div className="rounded-3xl bg-stone-50 p-5">
                <p className="text-sm font-medium text-muted">Next steps</p>
                <ul className="mt-3 space-y-2 text-sm">
                  <li>Upload remaining support</li>
                  <li>Schedule preparer review</li>
                </ul>
              </div>
            </div>
            <div className="mt-6 rounded-3xl bg-secondary p-5 text-white">
              <div className="flex items-start gap-3">
                <LockKeyhole className="mt-0.5 h-5 w-5 text-teal-300" />
                <div>
                  <p className="font-semibold">Secure and review-first</p>
                  <p className="mt-1 text-sm text-slate-200">
                    Clients see only the simplified estimate, missing documents, and next steps. Internal
                    staff get the calculation trace, extraction details, notes, and exports.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="mb-10 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Why teams use it</p>
          <h2 className="mt-3 text-3xl font-semibold">Built to reduce intake chaos before returns reach tax software</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title}>
              <feature.icon className="h-10 w-10 text-primary" />
              <CardTitle className="mt-5">{feature.title}</CardTitle>
              <CardDescription className="mt-3">{feature.description}</CardDescription>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20 lg:px-8">
        <Card className="grid gap-8 bg-gradient-to-r from-[#f8f2e8] via-white to-[#eef7f5] md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Business flow</p>
            <h3 className="mt-3 text-3xl font-semibold">Every estimate ends with a human-reviewed next step</h3>
            <p className="mt-4 max-w-3xl text-muted">
              RefundIQ is intentionally designed to support US Tax Deals preparers, not replace them. The result page always
              directs clients back into review and filing support.
            </p>
          </div>
          <div className="rounded-[28px] bg-secondary px-6 py-5 text-white shadow-soft">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-teal-300" />
              <span className="font-semibold">Ready to file? Contact US Tax Deals</span>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
