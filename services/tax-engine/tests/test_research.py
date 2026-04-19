from app.schemas import ResearchQuestion
from app.services.research import ResearchService


class FakeRepository:
    enabled = True

    def __init__(self) -> None:
        self.rule_cards = [
            {
                "id": "rule-education",
                "title": "Education credit review requirement",
                "summary": "Education benefits require tuition support, scholarship review, and eligibility confirmation.",
                "scope_tag": "education",
                "authority_level": 1,
                "effective_date": "2026-02-10",
                "tax_year": 2025,
                "follow_up_questions": ["Do we have payment support beyond Form 1098-T?"],
                "citations": [
                    {
                        "excerpt": "Publication 970 describes education benefit eligibility and documentation considerations.",
                        "source_versions": {
                            "id": "version-p970",
                            "revision_date": "2026-02-10",
                            "source_documents": {
                                "id": "source-p970",
                                "title": "Publication 970",
                                "source_url": "https://www.irs.gov/publications/p970",
                                "authority_type": "irs_publication",
                                "authority_tier": 2,
                                "draft_only": False,
                            },
                        },
                    }
                ],
            },
            {
                "id": "rule-standard-deduction",
                "title": "Standard deduction rule",
                "summary": "Use current Form 1040 instructions for the standard deduction.",
                "scope_tag": "standard-deduction",
                "authority_level": 1,
                "effective_date": "2026-03-25",
                "tax_year": 2025,
                "follow_up_questions": ["Is the filing status confirmed?"],
                "citations": [
                    {
                        "excerpt": "Instructions for Form 1040 and 1040-SR explain standard deduction usage.",
                        "source_versions": {
                            "id": "version-1040",
                            "revision_date": "2026-03-25",
                            "source_documents": {
                                "id": "source-1040",
                                "title": "Instructions for Form 1040 and 1040-SR",
                                "source_url": "https://www.irs.gov/instructions/i1040gi",
                                "authority_type": "irs_form_instructions",
                                "authority_tier": 1,
                                "draft_only": False,
                            },
                        },
                    }
                ],
            },
        ]
        self.source_versions = [
            {
                "id": "version-old-p970",
                "revision_date": "2024-01-01",
                "tax_year": 2024,
                "extracted_summary": "Older education guidance that should be suppressed when a newer final version exists.",
                "text_content": "Older publication 970 guidance for education credits and prior-year treatment.",
                "source_documents": {
                    "id": "source-p970",
                    "title": "Publication 970",
                    "source_url": "https://www.irs.gov/publications/p970",
                    "source_type": "publication",
                    "authority_type": "irs_publication",
                    "authority_tier": 2,
                    "draft_only": False,
                    "topic_tags": ["education", "1098-t"],
                    "last_success_at": "2025-01-01T12:00:00Z",
                    "last_status": "healthy",
                    "publication_number": "970",
                },
            },
            {
                "id": "version-p970",
                "revision_date": "2026-02-10",
                "tax_year": 2025,
                "extracted_summary": "Publication 970 describes education credits and required eligibility review.",
                "text_content": "Publication 970 education credit eligibility and 1098-T review.",
                "source_documents": {
                    "id": "source-p970",
                    "title": "Publication 970",
                    "source_url": "https://www.irs.gov/publications/p970",
                    "source_type": "publication",
                    "authority_type": "irs_publication",
                    "authority_tier": 2,
                    "draft_only": False,
                    "topic_tags": ["education", "1098-t"],
                    "last_success_at": "2026-04-18T12:00:00Z",
                    "last_status": "healthy",
                    "publication_number": "970",
                },
            },
            {
                "id": "version-draft",
                "revision_date": "2026-04-01",
                "tax_year": 2026,
                "extracted_summary": "Draft instructions mention education updates.",
                "text_content": "Draft only update for education rules.",
                "source_documents": {
                    "id": "source-draft",
                    "title": "Draft education instructions",
                    "source_url": "https://www.irs.gov/draft",
                    "source_type": "forms_instructions",
                    "authority_type": "irs_form_instructions",
                    "authority_tier": 1,
                    "draft_only": True,
                    "topic_tags": ["education"],
                    "last_success_at": "2026-04-18T12:00:00Z",
                    "last_status": "healthy",
                    "form_number": "1040",
                },
            },
            {
                "id": "version-1040",
                "revision_date": "2026-03-25",
                "tax_year": 2025,
                "extracted_summary": "Instructions for Form 1040 and 1040-SR explain the standard deduction and filing status logic.",
                "text_content": "Use the standard deduction amounts listed in the current Instructions for Form 1040 and 1040-SR.",
                "source_documents": {
                    "id": "source-1040",
                    "title": "Instructions for Form 1040 and 1040-SR",
                    "source_url": "https://www.irs.gov/instructions/i1040gi",
                    "source_type": "forms_instructions",
                    "authority_type": "irs_form_instructions",
                    "authority_tier": 1,
                    "draft_only": False,
                    "topic_tags": ["standard-deduction", "form-1040"],
                    "last_success_at": "2026-04-18T12:00:00Z",
                    "last_status": "healthy",
                    "form_number": "1040",
                },
            },
        ]
        self.alerts = [
            {
                "id": "alert-edu",
                "title": "Education scenarios require reviewer confirmation",
                "severity": "warning",
                "summary": "Do not finalize education credits from intake alone.",
                "effective_date": "2026-02-10",
                "impacted_case_types": ["education-credit"],
                "authority_level": 1,
                "related_rule_card_id": "rule-education",
            }
        ]
        self.changes = [
            {
                "id": "change-edu",
                "title": "Publication 970 source update detected",
                "summary": "Education guidance changed and should be reviewed.",
                "severity": "info",
                "effective_date": "2026-02-10",
                "diff_summary": "Source content hash changed.",
                "impacted_topics": ["education"],
                "source_documents": {"title": "Publication 970"},
            }
        ]
        self.case_matches = [
            {
                "id": "match-1",
                "severity": "warning",
                "explanation": "Education credit verification needed for this case.",
                "status": "open",
                "rule_cards": {
                    "id": "rule-education",
                    "title": "Education credit review requirement",
                    "summary": "Education benefit review is required.",
                    "scope_tag": "education",
                    "authority_level": 1,
                    "follow_up_questions": ["Has student eligibility been confirmed?"],
                    "effective_date": "2026-02-10",
                    "tax_year": 2025,
                },
            }
        ]

    def get_rule_cards(self):
        return self.rule_cards

    def get_source_versions(self):
        return self.source_versions

    def get_recent_alerts(self):
        return self.alerts

    def get_change_events(self):
        return self.changes

    def get_case_rule_matches(self, case_id: str):
        return self.case_matches if case_id == "case-1" else []


def test_db_backed_research_answers_include_citations_and_hybrid_mode():
    service = ResearchService(repository=FakeRepository())
    answer = service.ask(
        ResearchQuestion(
            question="How should we review a 1098-T education credit estimate?",
            case_facts={"tuition_paid": 4000, "has_1098_t": True},
        )
    )

    assert answer.citations
    assert answer.answer_mode == "hybrid"
    assert answer.authority_level in {1, 2}
    assert answer.related_rule_cards
    assert answer.supporting_passages


def test_source_ranking_prefers_higher_authority_material():
    service = ResearchService(repository=FakeRepository())
    answer = service.ask(
        ResearchQuestion(
            question="What should we cite for standard deduction logic?",
            case_facts={"filing_status": "single"},
        )
    )

    assert answer.citations[0].authority_tier == 1
    assert "authority tier" in answer.ranking_explanation.lower()
    assert answer.supporting_passages[0].authority_tier == 1


def test_passage_ranking_prefers_recent_exact_matches():
    service = ResearchService(repository=FakeRepository())
    answer = service.ask(
        ResearchQuestion(
            question="What do the current Form 1040 instructions say about the standard deduction?",
            case_facts={"filing_status": "single"},
        )
    )

    assert answer.supporting_passages
    assert "standard deduction" in answer.supporting_passages[0].snippet.lower()
    assert answer.supporting_passages[0].authority_tier == 1


def test_outdated_source_is_suppressed_when_newer_final_source_exists():
    service = ResearchService(repository=FakeRepository())
    answer = service.ask(
        ResearchQuestion(
            question="How should we review education credit support?",
            case_facts={"tuition_paid": 4000},
        )
    )

    version_ids = [item.source_version_id for item in answer.supporting_passages]
    assert "version-old-p970" not in version_ids


def test_conflict_and_draft_only_handling_are_exposed():
    service = ResearchService(repository=FakeRepository())
    answer = service.ask(
        ResearchQuestion(
            question="Does draft education guidance affect this case?",
            case_facts={"tuition_paid": 4000},
        )
    )

    assert answer.draft_only_warning is True
    assert answer.conflict_detected is True
    assert answer.conflict_reasons


def test_recency_handling_adds_source_freshness_notes():
    service = ResearchService(repository=FakeRepository())
    answer = service.ask(
        ResearchQuestion(
            question="What publication should we review for education benefits?",
            case_facts={"tuition_paid": 4000},
        )
    )

    assert answer.source_freshness_notes
    assert "Publication 970" in " ".join(answer.source_freshness_notes)


def test_case_aware_answer_enriches_follow_up_questions_and_matches():
    service = ResearchService(repository=FakeRepository())
    answer = service.ask(
        ResearchQuestion(
            question="What should the preparer verify for this case?",
            case_id="case-1",
            case_facts={"tuition_paid": 4000},
        )
    )

    assert answer.case_rule_matches
    assert answer.follow_up_questions
    assert answer.relevant_alerts
    assert answer.supporting_passages


def test_recent_alerts_are_available():
    service = ResearchService(repository=FakeRepository())
    alerts = service.get_recent_alerts()
    assert alerts
    assert alerts[0].title
