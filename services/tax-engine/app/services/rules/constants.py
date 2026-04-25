STANDARD_DEDUCTIONS_2025 = {
    "single": 15750,
    "married_filing_separately": 15750,
    "head_of_household": 23625,
    "married_filing_jointly": 31500,
}

FEDERAL_BRACKETS_2025 = {
    "single": [
        (11925, 0.10),
        (48475, 0.12),
        (103350, 0.22),
        (197300, 0.24),
        (250525, 0.32),
        (626350, 0.35),
        (float("inf"), 0.37),
    ],
    "married_filing_jointly": [
        (23850, 0.10),
        (96950, 0.12),
        (206700, 0.22),
        (394600, 0.24),
        (501050, 0.32),
        (751600, 0.35),
        (float("inf"), 0.37),
    ],
    "married_filing_separately": [
        (11925, 0.10),
        (48475, 0.12),
        (103350, 0.22),
        (197300, 0.24),
        (250525, 0.32),
        (375800, 0.35),
        (float("inf"), 0.37),
    ],
    "head_of_household": [
        (17000, 0.10),
        (64850, 0.12),
        (103350, 0.22),
        (197300, 0.24),
        (250500, 0.32),
        (626350, 0.35),
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
