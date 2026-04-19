#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request


def fetch_json(url: str) -> tuple[bool, dict]:
    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            return True, json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as exc:
        return False, {"error": str(exc)}


def main() -> int:
    web_base = os.getenv("LIVE_WEB_BASE_URL", os.getenv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000"))
    api_base = os.getenv("LIVE_API_BASE_URL", os.getenv("FASTAPI_BASE_URL", "http://localhost:8000"))

    checks = {
        "web_health": f"{web_base}/api/health",
        "api_health": f"{api_base}/health",
        "api_ready": f"{api_base}/ready",
        "research_alerts": f"{api_base}/v1/research/alerts",
    }

    failed = False
    for label, url in checks.items():
        ok, payload = fetch_json(url)
        print(f"\n[{label}] {url}")
        print(json.dumps(payload, indent=2))
        failed = failed or not ok

    if failed:
        print("\nRefundIQ live verification found one or more failed checks.")
        return 1

    print("\nRefundIQ live verification checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
