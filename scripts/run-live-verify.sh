#!/usr/bin/env bash
# Run the LIVE integration verification (real LLM providers, real network).
#
# Loads .env.local so the provider keys are present. Nothing is printed from the
# env file. Uses the local free-tier providers, so a run costs ~$0.
set -uo pipefail
cd "$(dirname "$0")/.."

if [ -f ./.env.local ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env.local
  set +a
  echo "loaded .env.local"
else
  echo "WARNING: no .env.local — provider keys may be missing"
fi

exec ./node_modules/.bin/vitest run --config vitest.integration.config.ts "$@"
