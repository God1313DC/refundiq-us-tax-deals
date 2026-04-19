STANDARD_DEDUCTIONS_2025 = {
    "single": 15750,
    "married_filing_separately": 15750,
    "head_of_household": 23625,
    "married_filing_jointly": 31500,
}

FEDERAL_BRACKETS_2025 = {
    "single": [
        (12400, 0.10),
        (50400, 0.12),
        (105700, 0.22),
        (201775, 0.24),
        (256225, 0.32),
        (640600, 0.35),
        (float("inf"), 0.37),
    ],
    "married_filing_jointly": [
        (24800, 0.10),
        (100800, 0.12),
        (211400, 0.22),
        (403550, 0.24),
        (512450, 0.32),
        (768700, 0.35),
        (float("inf"), 0.37),
    ],
    "married_filing_separately": [
        (12400, 0.10),
        (50400, 0.12),
        (105700, 0.22),
        (201775, 0.24),
        (256225, 0.32),
        (384350, 0.35),
        (float("inf"), 0.37),
    ],
    "head_of_household": [
        (17700, 0.10),
        (67700, 0.12),
        (111650, 0.22),
        (210850, 0.24),
        (269600, 0.32),
        (640600, 0.35),
        (float("inf"), 0.37),
    ],
}

IRS_CITATIONS = [
    {
        "source_title": "Instructions for Form 1040 and 1040-SR (2025)",
        "source_url": "https://www.irs.gov/instructions/i1040gi",
        "authority_type": "irs_form_instructions",
        "excerpt": "Use Form 1040 or 1040-SR for 2025 individual returns and related schedules."
    },
    {
        "source_title": "Publication 17 (2025), Your Federal Income Tax",
        "source_url": "https://www.irs.gov/publications/p17",
        "authority_type": "irs_publication",
        "excerpt": "Explains filing, withholding, standard deduction, and return preparation rules for individuals."
    },
    {
        "source_title": "Publication 970 (2025), Tax Benefits for Education",
        "source_url": "https://www.irs.gov/publications/p970",
        "authority_type": "irs_publication",
        "excerpt": "Describes education credit eligibility and limits for 2025."
    },
]
