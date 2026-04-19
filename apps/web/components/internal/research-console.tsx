"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ResearchResponse = {
  answer: string;
  conflict_detected: boolean;
  human_review_required: boolean;
  authority_level: number;
  answer_mode: string;
  ranking_explanation: string;
  draft_only_warning: boolean;
  matched_topics: string[];
  source_freshness_notes: string[];
  follow_up_questions: string[];
  case_rule_matches: string[];
  conflict_summary?: string | null;
  conflict_reasons: string[];
  supporting_passages: Array<{
    source_title: string;
    source_url: string;
    authority_type: string;
    authority_tier: number;
    snippet: string;
    relevance_score: number;
    ranking_reason: string;
    revision_date?: string | null;
    draft_only: boolean;
  }>;
  citations: Array<{
    source_title: string;
    source_url: string;
    authority_type: string;
    excerpt?: string | null;
    authority_tier?: number | null;
    revision_date?: string | null;
    effective_date?: string | null;
    draft_only?: boolean;
  }>;
  related_rule_cards: Array<{
    id: string;
    title: string;
    summary: string;
    scope_tag: string;
    effective_date?: string | null;
    tax_year?: number | null;
    follow_up_questions?: string[];
  }>;
  related_change_events: Array<{
    id: string;
    title: string;
    summary: string;
    severity: string;
    effective_date?: string | null;
    source_title?: string | null;
    diff_summary?: string | null;
  }>;
  relevant_alerts: Array<{
    title: string;
    severity: string;
    summary: string;
    effective_date?: string | null;
  }>;
  source_debug: Array<{
    title: string;
    source_url: string;
    authority_tier: number;
    authority_type: string;
    relevance_score: number;
    used_for: string;
    draft_only: boolean;
    revision_date?: string | null;
    ranking_reason: string;
  }>;
};

export function ResearchConsole() {
  const [question, setQuestion] = useState(
    "Can we estimate an education credit when a 1098-T is uploaded but payment support is incomplete?"
  );
  const [caseId, setCaseId] = useState("");
  const [caseFacts, setCaseFacts] = useState('{"tuition_paid": 4000, "federal_withholding": 6150}');
  const [result, setResult] = useState<ResearchResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setLoading(true);
    try {
      const response = await fetch("/api/internal/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          case_id: caseId || undefined,
          case_facts: JSON.parse(caseFacts || "{}")
        })
      });
      const data = await response.json();
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardTitle>Ask Tax Research AI</CardTitle>
        <CardDescription className="mt-2">
          Internal-only. Answers must remain source-cited and review-oriented.
        </CardDescription>
        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Question</label>
            <Input value={question} onChange={(event) => setQuestion(event.target.value)} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Case ID (optional)</label>
            <Input value={caseId} onChange={(event) => setCaseId(event.target.value)} placeholder="Link this answer to a live case" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Case facts (JSON)</label>
            <Textarea value={caseFacts} onChange={(event) => setCaseFacts(event.target.value)} />
          </div>
          <Button onClick={onSubmit} disabled={loading}>
            {loading ? "Researching..." : "Generate cited answer"}
          </Button>
        </div>
      </Card>

      <Card>
        <CardTitle>Research answer</CardTitle>
        {result ? (
          <div className="mt-5 space-y-5">
            {result.conflict_detected ? (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
                Conflict or ambiguity detected. A preparer should confirm the current authoritative filing position before relying on this answer.
                {result.conflict_summary ? <p className="mt-2">{result.conflict_summary}</p> : null}
              </div>
            ) : null}
            {result.draft_only_warning ? (
              <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900">
                Draft-only source material was matched. Draft forms or draft guidance are not final authority.
              </div>
            ) : null}
            <div className="rounded-2xl bg-stone-50 p-4 text-sm">{result.answer}</div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-amber-50 p-4 text-sm">
                Conflict detected: {result.conflict_detected ? "Yes" : "No"}
              </div>
              <div className="rounded-2xl bg-sky-50 p-4 text-sm">
                Human review required: {result.human_review_required ? "Yes" : "No"}
              </div>
              <div className="rounded-2xl bg-emerald-50 p-4 text-sm">
                Authority tier used: {result.authority_level}
              </div>
            </div>
            <div className="rounded-2xl bg-white p-4 text-sm ring-1 ring-border">
              <p className="font-semibold">Ranking explanation</p>
              <p className="mt-2 text-muted">{result.ranking_explanation}</p>
              <p className="mt-2 text-xs uppercase tracking-wide text-muted">Answer mode: {result.answer_mode}</p>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-muted">Matched topics</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {result.matched_topics.map((topic) => (
                  <span key={topic} className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase">
                    {topic}
                  </span>
                ))}
              </div>
            </div>
            {result.follow_up_questions.length ? (
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-muted">Suggested follow-up questions</p>
                <div className="mt-3 space-y-2">
                  {result.follow_up_questions.map((item) => (
                    <div key={item} className="rounded-2xl bg-stone-50 px-4 py-3 text-sm">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {result.supporting_passages.length ? (
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-muted">Top retrieved passages</p>
                <div className="mt-3 space-y-3">
                  {result.supporting_passages.map((passage) => (
                    <a
                      key={`${passage.source_title}-${passage.snippet}`}
                      href={passage.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-2xl border border-border p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">{passage.source_title}</p>
                        <span className="text-xs uppercase tracking-wide text-muted">
                          tier {passage.authority_tier} · score {passage.relevance_score.toFixed(1)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-foreground">{passage.snippet}</p>
                      <p className="mt-2 text-xs text-muted">{passage.ranking_reason}</p>
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
            {result.case_rule_matches.length ? (
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-muted">Case-aware rule matches</p>
                <div className="mt-3 space-y-2">
                  {result.case_rule_matches.map((item) => (
                    <div key={item} className="rounded-2xl bg-stone-50 px-4 py-3 text-sm">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-muted">Citations</p>
              <div className="mt-3 space-y-3">
                {result.citations.map((citation) => (
                  <a
                    key={`${citation.source_title}-${citation.source_url}`}
                    href={citation.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-2xl border border-border p-4 hover:bg-stone-50"
                  >
                    <p className="font-medium">{citation.source_title}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-muted">{citation.authority_type}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-muted">
                      Tier {citation.authority_tier ?? "?"}
                      {citation.revision_date ? ` · Revision ${citation.revision_date}` : ""}
                      {citation.draft_only ? " · Draft only" : ""}
                    </p>
                    {citation.excerpt ? <p className="mt-2 text-sm text-muted">{citation.excerpt}</p> : null}
                  </a>
                ))}
              </div>
            </div>
            {result.related_change_events.length ? (
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-muted">Relevant change events</p>
                <div className="mt-3 space-y-3">
                  {result.related_change_events.map((change) => (
                    <div key={change.id} className="rounded-2xl border border-border p-4">
                      <p className="font-medium">{change.title}</p>
                      <p className="mt-2 text-sm text-muted">{change.summary}</p>
                      {change.source_title ? <p className="mt-2 text-xs text-muted">{change.source_title}</p> : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {result.relevant_alerts.length ? (
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-muted">Relevant research alerts</p>
                <div className="mt-3 space-y-3">
                  {result.relevant_alerts.map((alert) => (
                    <div key={`${alert.title}-${alert.effective_date ?? "current"}`} className="rounded-2xl bg-stone-50 p-4 text-sm">
                      <p className="font-medium">{alert.title}</p>
                      <p className="mt-2 text-muted">{alert.summary}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {result.conflict_reasons.length ? (
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-muted">Conflict reasons</p>
                <div className="mt-3 space-y-2">
                  {result.conflict_reasons.map((reason) => (
                    <div key={reason} className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
                      {reason}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {result.source_freshness_notes.length ? (
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-muted">Source freshness</p>
                <div className="mt-3 space-y-2">
                  {result.source_freshness_notes.map((note) => (
                    <div key={note} className="rounded-2xl bg-stone-50 px-4 py-3 text-sm">
                      {note}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {result.source_debug.length ? (
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-muted">Debug: sources used and ranking</p>
                <div className="mt-3 space-y-3">
                  {result.source_debug.map((item) => (
                    <a
                      key={`${item.title}-${item.used_for}-${item.source_url}`}
                      href={item.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-2xl border border-border p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">{item.title}</p>
                        <span className="text-xs uppercase tracking-wide text-muted">
                          {item.used_for} · tier {item.authority_tier}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-muted">{item.ranking_reason}</p>
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <CardDescription className="mt-4">
            Submit a question to see a source-cited internal answer and matching rule cards.
          </CardDescription>
        )}
      </Card>
    </div>
  );
}
