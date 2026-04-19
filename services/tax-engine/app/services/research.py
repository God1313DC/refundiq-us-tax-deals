from __future__ import annotations

import re
from datetime import datetime
from typing import Any

from app.schemas import (
    CitationRecord,
    ResearchAlert,
    ResearchAnswer,
    ResearchChangeEvent,
    ResearchPassage,
    ResearchQuestion,
    ResearchSourceDebug,
    RuleCard,
)
from app.services.research_repository import SupabaseResearchRepository
from app.services.rules.constants import IRS_CITATIONS


FALLBACK_RULE_CARDS = [
    RuleCard(
        id="fallback-standard-deduction",
        title="2025 standard deduction by filing status",
        summary="Use the 2025 standard deduction amounts for common 1040 estimate scenarios unless itemizing is supported and reviewed.",
        scope_tag="standard-deduction",
        authority_level=1,
        citations=[CitationRecord(**IRS_CITATIONS[0]), CitationRecord(**IRS_CITATIONS[1])],
        follow_up_questions=["Is the filing status confirmed for the taxpayer?"],
    ),
    RuleCard(
        id="fallback-education-credit-review",
        title="Education credit review requirement",
        summary="Education credits should only be estimated when tuition support, scholarship offsets, and student eligibility inputs are present.",
        scope_tag="education",
        authority_level=1,
        citations=[CitationRecord(**IRS_CITATIONS[2]), CitationRecord(**IRS_CITATIONS[0])],
        follow_up_questions=[
            "Do we have payment support in addition to Form 1098-T?",
            "Has student eligibility been confirmed?",
        ],
    ),
]

FALLBACK_ALERTS = [
    ResearchAlert(
        title="Research corpus fallback mode",
        severity="warning",
        summary="Database-backed source material is unavailable, so RefundIQ is using starter fallback guidance only.",
        effective_date=None,
    )
]


class ResearchService:
    def __init__(self, repository: SupabaseResearchRepository | Any | None = None) -> None:
        self.repository = repository or SupabaseResearchRepository()

    def _coerce_question(self, question: ResearchQuestion | dict) -> ResearchQuestion:
        if isinstance(question, ResearchQuestion):
            return question
        return ResearchQuestion.model_validate(question)

    def ask(self, question: ResearchQuestion | dict) -> ResearchAnswer:
        question = self._coerce_question(question)
        if not getattr(self.repository, "enabled", True):
            return self._fallback_answer(question)

        rule_rows = self.repository.get_rule_cards()
        source_rows = self.repository.get_source_versions()
        alert_rows = self.repository.get_recent_alerts()
        change_rows = self.repository.get_change_events()
        case_matches = self.repository.get_case_rule_matches(question.case_id) if question.case_id else []

        if not rule_rows and not source_rows:
            return self._fallback_answer(question)

        terms = build_search_terms(question)
        matched_topics = derive_topics(terms, question.case_facts)

        scored_rule_cards = [
            (score_rule_card(row, terms, question.case_facts, case_matches), row)
            for row in rule_rows
        ]
        scored_rule_cards = [(score, row) for score, row in scored_rule_cards if score > 0]
        scored_rule_cards.sort(key=lambda item: (-item[0], item[1].get("authority_level", 9)))

        scored_sources = [
            (score_source_version(row, terms, question.case_facts), row)
            for row in source_rows
        ]
        scored_sources = [(score, row) for score, row in scored_sources if score > 0]
        scored_sources.sort(
            key=lambda item: (
                -(item[0] + authority_bonus(item[1].get("source_documents", {}).get("authority_tier"))),
                item[1].get("source_documents", {}).get("authority_tier", 9),
            )
        )

        top_rule_rows = [row for _, row in scored_rule_cards[:3]]
        top_source_rows = [row for _, row in scored_sources[:4]]
        top_passages = retrieve_top_passages(top_source_rows, top_rule_rows, terms, question.case_facts, case_matches)

        related_rule_cards = [map_rule_card(row) for row in top_rule_rows]
        passage_excerpt_by_version = {passage.source_version_id: passage.snippet for passage in top_passages}
        citations = dedupe_citations(
            [citation for card in related_rule_cards for citation in card.citations]
            + [
                map_source_citation(row, passage_excerpt_by_version.get(row.get("id")))
                for row in top_source_rows
            ]
        )

        related_change_events = select_change_events(change_rows, matched_topics, top_source_rows)
        relevant_alerts = select_alerts(alert_rows, matched_topics, top_rule_rows)
        follow_up_questions = dedupe_strings(
            [question for card in related_rule_cards for question in card.follow_up_questions]
            + follow_ups_from_case_matches(case_matches)
        )
        case_rule_matches = [item.get("explanation", "") for item in case_matches if item.get("explanation")]

        draft_only_warning = any(citation.draft_only for citation in citations)
        conflict_reasons = detect_conflict_reasons(citations, relevant_alerts, top_passages)
        conflict_detected = bool(conflict_reasons)
        answer_mode = determine_answer_mode(bool(top_rule_rows), bool(top_source_rows))
        authority_level = min((citation.authority_tier or 9 for citation in citations), default=9)
        source_debug = build_source_debug(scored_rule_cards[:3], scored_sources[:4], case_matches)
        source_freshness_notes = build_freshness_notes(citations)
        ranking_explanation = build_ranking_explanation(answer_mode, authority_level, source_debug)
        answer = build_answer_text(
            question,
            related_rule_cards,
            top_source_rows,
            related_change_events,
            relevant_alerts,
            draft_only_warning,
            conflict_detected,
            top_passages,
        )

        return ResearchAnswer(
            answer=answer,
            citations=citations,
            related_rule_cards=related_rule_cards,
            conflict_detected=conflict_detected,
            human_review_required=True,
            matched_topics=matched_topics,
            authority_level=authority_level,
            answer_mode=answer_mode,
            ranking_explanation=ranking_explanation,
            related_change_events=related_change_events,
            relevant_alerts=relevant_alerts,
            follow_up_questions=follow_up_questions,
            draft_only_warning=draft_only_warning,
            source_freshness_notes=source_freshness_notes,
            source_debug=source_debug,
            case_rule_matches=case_rule_matches,
            supporting_passages=top_passages,
            conflict_summary=("; ".join(conflict_reasons[:2]) if conflict_reasons else None),
            conflict_reasons=conflict_reasons,
        )

    def get_recent_alerts(self) -> list[ResearchAlert]:
        if getattr(self.repository, "enabled", False):
            alert_rows = self.repository.get_recent_alerts()
            if alert_rows:
                return [
                    ResearchAlert(
                        title=row["title"],
                        severity=row["severity"],
                        summary=row["summary"],
                        effective_date=row.get("effective_date"),
                    )
                    for row in alert_rows
                ]
        return FALLBACK_ALERTS

    def _fallback_answer(self, question: ResearchQuestion) -> ResearchAnswer:
        matched_cards = FALLBACK_RULE_CARDS[:]
        citations = [citation for card in matched_cards for citation in card.citations]
        matched_topics = derive_topics(build_search_terms(question), question.case_facts) or ["general-1040"]
        return ResearchAnswer(
            answer=(
                "Database-backed research material is currently unavailable, so this answer is using RefundIQ starter fallback guidance only. "
                "A preparer should verify the issue against current IRS materials before relying on it."
            ),
            citations=citations,
            related_rule_cards=matched_cards,
            conflict_detected=True,
            human_review_required=True,
            matched_topics=matched_topics,
            authority_level=1,
            answer_mode="fallback",
            ranking_explanation="Fallback mode was used because the ingested research corpus was unavailable.",
            relevant_alerts=FALLBACK_ALERTS,
            follow_up_questions=dedupe_strings(
                [item for card in matched_cards for item in card.follow_up_questions]
            ),
            draft_only_warning=False,
            source_freshness_notes=[],
            source_debug=[],
        )


def build_search_terms(question: ResearchQuestion) -> list[str]:
    tokens = re.findall(r"[a-z0-9-]{3,}", question.question.lower())
    for key, value in question.case_facts.items():
        tokens.extend(re.findall(r"[a-z0-9-]{3,}", f"{key} {value}".lower()))
    return dedupe_strings(tokens)


def derive_topics(terms: list[str], case_facts: dict[str, Any]) -> list[str]:
    topics: list[str] = []
    if "education" in terms or case_facts.get("tuition_paid") or case_facts.get("has_1098_t"):
        topics.append("education")
    if "withholding" in terms or case_facts.get("federal_withholding") is not None:
        topics.append("withholding")
    if "standard" in terms or "deduction" in terms or case_facts.get("filing_status"):
        topics.append("standard-deduction")
    if "iris" in terms or "1099" in terms:
        topics.append("iris-a2a")
    if "mef" in terms:
        topics.append("mef")
    if "tin" in terms:
        topics.append("tin-matching")
    if "transcript" in terms or "tds" in terms:
        topics.append("transcript-workflow")
    return dedupe_strings(topics or ["general-1040"])


def score_rule_card(row: dict[str, Any], terms: list[str], case_facts: dict[str, Any], case_matches: list[dict[str, Any]]) -> float:
    haystack = " ".join(
        [
            str(row.get("title", "")),
            str(row.get("summary", "")),
            str(row.get("scope_tag", "")),
        ]
    ).lower()
    score = sum(3 for term in terms if term in haystack)
    if row.get("scope_tag") in derive_topics(terms, case_facts):
        score += 6
    if any(item.get("rule_cards", {}).get("id") == row.get("id") for item in case_matches):
        score += 8
    score += authority_bonus(row.get("authority_level"))
    return score


def score_source_version(row: dict[str, Any], terms: list[str], case_facts: dict[str, Any]) -> float:
    source = row.get("source_documents", {}) or {}
    haystack = " ".join(
        [
            str(source.get("title", "")),
            str(source.get("source_type", "")),
            str(source.get("topic_tags", "")),
            str(row.get("extracted_summary", "")),
            str(row.get("text_content", ""))[:2500],
        ]
    ).lower()
    score = sum(2 for term in terms if term in haystack)
    if any(topic in source.get("topic_tags", []) for topic in derive_topics(terms, case_facts)):
        score += 5
    if source.get("form_number") and str(source.get("form_number")).lower() in haystack:
        score += 2
    if source.get("publication_number") and str(source.get("publication_number")).lower() in haystack:
        score += 2
    score += recency_bonus(row.get("revision_date"))
    if source.get("last_status") == "failed":
        score -= 5
    return score


def authority_bonus(authority_tier: int | None) -> float:
    tier = authority_tier or 9
    return max(0, 10 - tier)


def map_rule_card(row: dict[str, Any]) -> RuleCard:
    return RuleCard(
        id=row["id"],
        title=row["title"],
        summary=row["summary"],
        scope_tag=row["scope_tag"],
        authority_level=row.get("authority_level", 9),
        effective_date=row.get("effective_date"),
        tax_year=row.get("tax_year"),
        follow_up_questions=row.get("follow_up_questions") or [],
        citations=[
            CitationRecord(
                source_title=citation.get("source_versions", {}).get("source_documents", {}).get("title", "Source"),
                source_url=citation.get("source_versions", {}).get("source_documents", {}).get("source_url", "#"),
                authority_type=citation.get("source_versions", {}).get("source_documents", {}).get("authority_type", "irs"),
                authority_tier=citation.get("source_versions", {}).get("source_documents", {}).get("authority_tier"),
                excerpt=citation.get("excerpt"),
                revision_date=citation.get("source_versions", {}).get("revision_date"),
                draft_only=bool(citation.get("source_versions", {}).get("source_documents", {}).get("draft_only")),
                source_document_id=citation.get("source_versions", {}).get("source_documents", {}).get("id"),
                source_version_id=citation.get("source_versions", {}).get("id"),
            )
            for citation in row.get("citations", [])
        ],
    )


def map_source_citation(row: dict[str, Any], excerpt_override: str | None = None) -> CitationRecord:
    source = row.get("source_documents", {}) or {}
    return CitationRecord(
        source_title=source.get("title", "Source"),
        source_url=source.get("source_url", "#"),
        authority_type=source.get("authority_type", "irs"),
        authority_tier=source.get("authority_tier"),
        excerpt=(excerpt_override or row.get("extracted_summary") or row.get("text_content") or "")[:260],
        revision_date=row.get("revision_date"),
        draft_only=bool(source.get("draft_only")),
        source_document_id=source.get("id"),
        source_version_id=row.get("id"),
    )


def select_change_events(rows: list[dict[str, Any]], matched_topics: list[str], source_rows: list[dict[str, Any]]) -> list[ResearchChangeEvent]:
    source_titles = {row.get("source_documents", {}).get("title") for row in source_rows}
    events: list[ResearchChangeEvent] = []
    for row in rows:
        impacted_topics = row.get("impacted_topics") or []
        if impacted_topics and not set(impacted_topics).intersection(matched_topics):
            if row.get("source_documents", {}).get("title") not in source_titles:
                continue
        events.append(
            ResearchChangeEvent(
                id=row["id"],
                title=row["title"],
                summary=row["summary"],
                severity=row["severity"],
                effective_date=row.get("effective_date"),
                source_title=row.get("source_documents", {}).get("title"),
                diff_summary=row.get("diff_summary"),
            )
        )
    return events[:4]


def select_alerts(rows: list[dict[str, Any]], matched_topics: list[str], rule_rows: list[dict[str, Any]]) -> list[ResearchAlert]:
    rule_ids = {row["id"] for row in rule_rows}
    selected: list[ResearchAlert] = []
    for row in rows:
        impacted = row.get("impacted_case_types") or []
        if row.get("related_rule_card_id") in rule_ids or any(topic in " ".join(impacted).lower() for topic in matched_topics):
            selected.append(
                ResearchAlert(
                    title=row["title"],
                    severity=row["severity"],
                    summary=row["summary"],
                    effective_date=row.get("effective_date"),
                )
            )
    return selected[:4]


def follow_ups_from_case_matches(case_matches: list[dict[str, Any]]) -> list[str]:
    followups: list[str] = []
    for item in case_matches:
        rule = item.get("rule_cards", {}) or {}
        followups.extend(rule.get("follow_up_questions") or [])
    return followups


def dedupe_citations(citations: list[CitationRecord]) -> list[CitationRecord]:
    deduped: list[CitationRecord] = []
    seen = set()
    for citation in citations:
        key = (citation.source_title, citation.source_url, citation.excerpt)
        if key in seen:
            continue
        seen.add(key)
        deduped.append(citation)
    return deduped[:8]


def dedupe_strings(items: list[str]) -> list[str]:
    seen = set()
    results: list[str] = []
    for item in items:
        if not item or item in seen:
            continue
        seen.add(item)
        results.append(item)
    return results


def detect_conflict_reasons(
    citations: list[CitationRecord],
    alerts: list[ResearchAlert],
    passages: list[ResearchPassage],
) -> list[str]:
    reasons: list[str] = []
    if any(c.draft_only for c in citations) and any(not c.draft_only for c in citations):
        reasons.append("Draft-only and final-authority materials were both retrieved for this topic.")
    if any(alert.severity in {"warning", "critical"} for alert in alerts):
        reasons.append("Active research alerts indicate that current guidance or workflow treatment is still sensitive.")
    revision_dates = sorted({citation.revision_date for citation in citations if citation.revision_date})
    if len(revision_dates) > 2:
        reasons.append("Multiple revision dates were retrieved, so outdated-versus-current guidance should be checked.")
    if passages:
        tiers = {passage.authority_tier for passage in passages}
        if min(tiers) < max(tiers):
            reasons.append("Supporting passages came from mixed authority tiers, so the higher-tier source should control.")
    return dedupe_strings(reasons)


def determine_answer_mode(has_rule_cards: bool, has_sources: bool) -> str:
    if has_rule_cards and has_sources:
        return "hybrid"
    if has_rule_cards:
        return "rule_cards"
    if has_sources:
        return "sources"
    return "fallback"


def build_source_debug(
    scored_rule_cards: list[tuple[float, dict[str, Any]]],
    scored_sources: list[tuple[float, dict[str, Any]]],
    case_matches: list[dict[str, Any]],
) -> list[ResearchSourceDebug]:
    items: list[ResearchSourceDebug] = []
    for score, row in scored_rule_cards:
        citations = row.get("citations") or []
        authority_tier = min(
            [
                citation.get("source_versions", {}).get("source_documents", {}).get("authority_tier", 9)
                for citation in citations
            ]
            or [row.get("authority_level", 9)]
        )
        items.append(
            ResearchSourceDebug(
                title=row["title"],
                source_url=(citations[0].get("source_versions", {}).get("source_documents", {}).get("source_url", "#") if citations else "#"),
                authority_tier=authority_tier,
                authority_type=(citations[0].get("source_versions", {}).get("source_documents", {}).get("authority_type", "rule-card") if citations else "rule-card"),
                relevance_score=score,
                used_for="rule_card",
                draft_only=bool(citations and citations[0].get("source_versions", {}).get("source_documents", {}).get("draft_only")),
                revision_date=(citations[0].get("source_versions", {}).get("revision_date") if citations else None),
                ranking_reason="Matched question terms and existing rule-card scope with authoritative citations.",
            )
        )
    for score, row in scored_sources:
        source = row.get("source_documents", {}) or {}
        items.append(
            ResearchSourceDebug(
                title=source.get("title", "Source"),
                source_url=source.get("source_url", "#"),
                authority_tier=source.get("authority_tier", 9),
                authority_type=source.get("authority_type", "irs"),
                relevance_score=score,
                used_for="source_text",
                draft_only=bool(source.get("draft_only")),
                revision_date=row.get("revision_date"),
                ranking_reason="Matched question terms against ingested source summaries and stored source text.",
            )
        )
    for match in case_matches[:2]:
        rule = match.get("rule_cards", {}) or {}
        items.append(
            ResearchSourceDebug(
                title=rule.get("title", "Case rule match"),
                source_url="#",
                authority_tier=rule.get("authority_level", 9),
                authority_type="case_rule_match",
                relevance_score=100.0,
                used_for="case_match",
                draft_only=False,
                revision_date=rule.get("effective_date"),
                ranking_reason="Matched because the current case already carries this internal rule flag.",
            )
        )
    return items[:8]


def build_freshness_notes(citations: list[CitationRecord]) -> list[str]:
    notes = []
    for citation in citations:
        if citation.revision_date:
            notes.append(f"{citation.source_title} revision context: {citation.revision_date}.")
        elif citation.effective_date:
            notes.append(f"{citation.source_title} effective context: {citation.effective_date}.")
    return dedupe_strings(notes)[:5]


def build_ranking_explanation(answer_mode: str, authority_level: int, source_debug: list[ResearchSourceDebug]) -> str:
    if not source_debug:
        return "No authoritative sources were available, so fallback guidance was used."
    lead = source_debug[0]
    return (
        f"Answer mode: {answer_mode}. Highest-ranked material came from authority tier {authority_level} "
        f"using {lead.used_for.replace('_', ' ')} support from {lead.title}. "
        "RefundIQ ranks IRS forms/instructions and publications ahead of lower-tier material and only uses secondary material as non-authoritative support."
    )


def build_answer_text(
    question: ResearchQuestion,
    rule_cards: list[RuleCard],
    source_rows: list[dict[str, Any]],
    change_events: list[ResearchChangeEvent],
    alerts: list[ResearchAlert],
    draft_only_warning: bool,
    conflict_detected: bool,
    passages: list[ResearchPassage],
) -> str:
    parts = [
        "Based on RefundIQ's ingested authoritative research corpus, this issue should stay in preparer-review mode until the cited guidance and case facts are confirmed."
    ]
    if rule_cards:
        rule_summary = " ".join(card.summary for card in rule_cards[:2])
        parts.append(f"Rule-card summary: {rule_summary}")
    if source_rows:
        snippets = []
        for passage in passages[:2]:
            snippets.append(f"{passage.source_title}: {passage.snippet}")
        if snippets:
            parts.append("Source-backed summary: " + " ".join(snippets))
    if change_events:
        parts.append(f"Recent change context: {change_events[0].title}. {change_events[0].summary}")
    if alerts:
        parts.append(f"Operational alert: {alerts[0].summary}")
    if draft_only_warning:
        parts.append("One or more matched materials are draft-only and should not be treated as final authority.")
    if conflict_detected:
        parts.append("Potential source ambiguity or update conflict was detected, so a human reviewer should confirm the current filing position before relying on this answer.")
    return " ".join(parts)


def retrieve_top_passages(
    source_rows: list[dict[str, Any]],
    rule_rows: list[dict[str, Any]],
    terms: list[str],
    case_facts: dict[str, Any],
    case_matches: list[dict[str, Any]],
) -> list[ResearchPassage]:
    passages: list[ResearchPassage] = []
    preferred_topics = derive_topics(terms, case_facts)
    case_boost = 3 if case_matches else 0

    for row in source_rows:
        source = row.get("source_documents", {}) or {}
        chunks = split_passages(row.get("text_content") or row.get("extracted_summary") or "")
        for chunk in chunks[:10]:
            score = score_passage(chunk, source, row, terms, preferred_topics) + case_boost
            if score <= 0:
                continue
            passages.append(
                ResearchPassage(
                    source_title=source.get("title", "Source"),
                    source_url=source.get("source_url", "#"),
                    authority_type=source.get("authority_type", "irs"),
                    authority_tier=source.get("authority_tier", 9),
                    snippet=chunk[:320],
                    relevance_score=score,
                    ranking_reason=build_passage_reason(chunk, source, row, preferred_topics),
                    revision_date=row.get("revision_date"),
                    draft_only=bool(source.get("draft_only")),
                    source_version_id=row.get("id"),
                )
            )

    for row in rule_rows:
        citations = row.get("citations") or []
        for citation in citations[:1]:
            source = citation.get("source_versions", {}).get("source_documents", {}) or {}
            chunk = citation.get("excerpt") or row.get("summary") or ""
            score = score_passage(
                chunk,
                source,
                {"revision_date": citation.get("source_versions", {}).get("revision_date")},
                terms,
                preferred_topics,
            ) + 4
            passages.append(
                ResearchPassage(
                    source_title=source.get("title", row.get("title", "Rule card")),
                    source_url=source.get("source_url", "#"),
                    authority_type=source.get("authority_type", "rule-card"),
                    authority_tier=source.get("authority_tier", row.get("authority_level", 9)),
                    snippet=chunk[:320],
                    relevance_score=score,
                    ranking_reason="Ranked highly because a matching rule card already summarizes this source-backed point.",
                    revision_date=citation.get("source_versions", {}).get("revision_date"),
                    draft_only=bool(source.get("draft_only")),
                    source_version_id=citation.get("source_versions", {}).get("id"),
                )
            )

    passages.sort(
        key=lambda item: (
            -(item.relevance_score + authority_bonus(item.authority_tier) + recency_bonus(item.revision_date)),
            item.authority_tier,
            item.draft_only,
        )
    )
    filtered = suppress_outdated_passages(passages)
    return filtered[:6]


def split_passages(text: str) -> list[str]:
    normalized = re.sub(r"\s+", " ", text).strip()
    if not normalized:
        return []
    raw = re.split(r"(?<=[.!?])\s+", normalized)
    return [chunk.strip() for chunk in raw if len(chunk.strip()) > 40]


def score_passage(
    chunk: str,
    source: dict[str, Any],
    row: dict[str, Any],
    terms: list[str],
    preferred_topics: list[str],
) -> float:
    haystack = f"{chunk} {source.get('title', '')} {source.get('topic_tags', [])}".lower()
    score = sum(2.5 for term in terms if term in haystack)
    if any(topic in haystack for topic in preferred_topics):
        score += 4
    score += authority_bonus(source.get("authority_tier"))
    score += recency_bonus(row.get("revision_date"))
    if source.get("draft_only"):
        score -= 1
    if source.get("form_number") and str(source.get("form_number")).lower() in haystack:
        score += 2
    if source.get("publication_number") and str(source.get("publication_number")).lower() in haystack:
        score += 2
    return score


def build_passage_reason(chunk: str, source: dict[str, Any], row: dict[str, Any], preferred_topics: list[str]) -> str:
    reasons = [f"Authority tier {source.get('authority_tier', 9)}"]
    if row.get("revision_date"):
        reasons.append(f"revision {row['revision_date']}")
    if any(topic in chunk.lower() for topic in preferred_topics):
        reasons.append("exact topical phrase match")
    if source.get("draft_only"):
        reasons.append("draft-only caution")
    return ", ".join(reasons)


def recency_bonus(revision_date: str | None) -> float:
    if not revision_date:
        return 0
    try:
        parsed = datetime.fromisoformat(revision_date.replace("Z", "+00:00"))
    except ValueError:
        parsed = None
        for fmt in ("%Y-%m-%d", "%d-%b-%Y", "%B %d, %Y"):
            try:
                parsed = datetime.strptime(revision_date, fmt)
                break
            except ValueError:
                continue
        if parsed is None:
            return 0
    age_days = max((datetime.now() - parsed.replace(tzinfo=None)).days, 0)
    if age_days <= 120:
        return 3
    if age_days <= 365:
        return 1.5
    return -1


def suppress_outdated_passages(passages: list[ResearchPassage]) -> list[ResearchPassage]:
    latest_by_title: dict[str, str | None] = {}
    for passage in passages:
        current = latest_by_title.get(passage.source_title)
        if not current or (passage.revision_date and (current is None or str(passage.revision_date) > str(current))):
            latest_by_title[passage.source_title] = passage.revision_date

    filtered: list[ResearchPassage] = []
    for passage in passages:
        latest = latest_by_title.get(passage.source_title)
        if latest and passage.revision_date and str(passage.revision_date) < str(latest) and not passage.draft_only:
            continue
        filtered.append(passage)
    return filtered
