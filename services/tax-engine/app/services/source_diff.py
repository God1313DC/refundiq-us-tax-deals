from __future__ import annotations

import difflib

from app.schemas import SourceVersionDiff


def build_source_diff(previous_text: str | None, previous_checksum: str | None, current_text: str, current_checksum: str) -> SourceVersionDiff:
    if previous_checksum == current_checksum:
        return SourceVersionDiff(
            changed=False,
            previous_checksum=previous_checksum,
            current_checksum=current_checksum,
            diff_summary="No material source-content change detected.",
            excerpt=None,
        )

    previous_lines = (previous_text or "").splitlines()[:30]
    current_lines = current_text.splitlines()[:30]
    diff_lines = list(difflib.unified_diff(previous_lines, current_lines, lineterm=""))[:12]
    excerpt = "\n".join(diff_lines[:8]) if diff_lines else None
    return SourceVersionDiff(
        changed=True,
        previous_checksum=previous_checksum,
        current_checksum=current_checksum,
        diff_summary="Source content hash changed. Review affected rule cards and alerts before changing filing logic.",
        excerpt=excerpt,
    )
