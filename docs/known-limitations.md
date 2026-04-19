# Known Limitations

- The OCR pipeline is still a controlled starter implementation and not yet tied to a production OCR vendor
- OCR provider abstraction is present, but only stub/mock providers ship in this repo
- State tax estimates remain limited-scope and should be reviewed before operational use
- The tax engine only covers a narrow MVP slice of common Form 1040 scenarios
- Unsupported or ambiguous cases are intentionally routed toward human review instead of forced automation
- PDF workpaper export is currently summary-oriented rather than a fully rendered production workpaper packet
- Research ingestion monitoring includes a local scheduler loop, but production still needs a hardened cron/orchestrator
- Research answers are database-backed and source-ranked, but passage retrieval, source-conflict analysis, and synthesis remain heuristic and should still be reviewed by qualified staff
- Conflict detection highlights likely ambiguity such as draft-vs-final and revision spread, but it does not replace manual legal/tax comparison
- Password reset UI now exists, but it still depends on a correctly configured Supabase auth email setup
- Role-management and admin operations are intentionally conservative and should be further hardened before production use
