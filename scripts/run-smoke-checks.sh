#!/usr/bin/env sh
set -eu

echo "Checking web health..."
curl -fsS "${NEXT_PUBLIC_SITE_URL:-http://localhost:3000}/api/health" >/dev/null

echo "Checking API health..."
curl -fsS "${FASTAPI_BASE_URL:-http://localhost:8000}/health" >/dev/null

echo "Checking API readiness..."
curl -fsS "${FASTAPI_BASE_URL:-http://localhost:8000}/ready" >/dev/null

echo "RefundIQ smoke checks passed."
