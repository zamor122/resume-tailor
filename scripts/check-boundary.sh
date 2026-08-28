#!/bin/bash
# Boundary check: ensures no LLM-service imports exist outside the runtime boundary.
# Run in CI; exits 0 when clean, 1 when violations found.

set -euo pipefail

API_DIR="src/app/api"
RUNTIME_DIR="src/app/runtime"
ALLOWED_MODULES="model-fallback|ai-provider|services/providers"

echo "🔍 Checking LLM-service import boundary…"

# Find any api route that imports the LLM layer but is NOT the runtime itself.
VIOLATIONS=$(grep -rln -E "$ALLOWED_MODULES" "$API_DIR" 2>/dev/null || true)

if [ -z "$VIOLATIONS" ]; then
  echo "✅ Boundary clean — zero LLM-service imports in api/ routes (runtime uses the registry)."
  exit 0
fi

echo "❌ Boundary violations — these api/ routes import the LLM layer directly:"
echo "$VIOLATIONS"
echo ""
echo "  These must either:"
echo "    • become runtime step nodes (registered throug the registry)"
echo "    • become deterministic (no LLM)"
echo "    • be recategorzed as admin-only routes (explicitly out of scope)"
exit 1