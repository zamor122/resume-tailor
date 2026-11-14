#!/bin/bash
# Vercel REST helper for the DOMAIN-OWNING account (zamor122s-projects).
#
# WHY THIS EXISTS: the repo's local `.vercel` link points at the OTHER project attached to this
# repo (quickly1/resume-tailor), so `vercel env ...` from this directory resolves the wrong
# project and errors. The CLI can also not be trusted to pick the right scope here — the repo has
# two Vercel projects and only one owns airesumetailor.com. This talks to the REST API with an
# explicit teamId + projectId, so there is no ambiguity.
#
# SECRETS: the token is read from ~/.vercel-zamor/auth.json by this script and is NEVER echoed.
# Usage:
#   vercel_zamor.sh ids
#   vercel_zamor.sh envlist
#   vercel_zamor.sh envset <NAME> <VALUE>
#   vercel_zamor.sh redeploy
set -euo pipefail

TEAM_SLUG="zamor122s-projects"
PROJECT_NAME="resume-tailor"
# TOKEN SOURCE, in preference order:
#  1. $VERCEL_TOKEN, or VERCEL_TOKEN=... in .env.local — a durable Access Token from
#     vercel.com/account/tokens. PREFERRED: the CLI's device-login token turned out to be
#     short-lived in practice (a login that worked, then returned 403 invalidToken:true minutes
#     later), which makes it useless for a repeatable ops task.
#  2. ~/.vercel-zamor/auth.json — the CLI login token, as a fallback.
# Note: the CLI writes auth.json as PRETTY-PRINTED JSON, so a compact "token":"…" pattern matches
# nothing and the script dies silently — the pattern below tolerates the whitespace.
TOKEN="${VERCEL_TOKEN:-}"
if [ -z "${TOKEN:-}" ] && [ -f .env.local ]; then
  TOKEN="$(grep -oE '^VERCEL_TOKEN=[^[:space:]]+' .env.local | head -1 | cut -d= -f2- || true)"
fi
if [ -z "${TOKEN:-}" ] && [ -f "$HOME/.vercel-zamor/auth.json" ]; then
  TOKEN="$(grep -oE '"token"[[:space:]]*:[[:space:]]*"[^"]*"' "$HOME/.vercel-zamor/auth.json" | head -1 | sed 's/.*:[[:space:]]*"//; s/"$//')"
fi
API="https://api.vercel.com"

if [ -z "${TOKEN:-}" ]; then
  echo "ERROR: no Vercel token found (set VERCEL_TOKEN in .env.local, or log in with --global-config ~/.vercel-zamor)" >&2
  exit 1
fi

auth=(-H "Authorization: Bearer ${TOKEN}")

resolve_ids() {
  TEAM_ID="$(curl -s "${auth[@]}" "${API}/v2/teams" | jq -r --arg s "$TEAM_SLUG" '.teams[] | select(.slug==$s) | .id')"
  if [ -z "$TEAM_ID" ] || [ "$TEAM_ID" = "null" ]; then
    echo "ERROR: team slug '$TEAM_SLUG' not found for this token" >&2
    exit 1
  fi
  PROJECT_ID="$(curl -s "${auth[@]}" "${API}/v9/projects?teamId=${TEAM_ID}&limit=100" | jq -r --arg n "$PROJECT_NAME" '.projects[] | select(.name==$n) | .id')"
  if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "null" ]; then
    echo "ERROR: project '$PROJECT_NAME' not found in team '$TEAM_SLUG'" >&2
    exit 1
  fi
}

set_env_var() {
  local NAME="$1" VALUE="$2"
  # Upsert: replace any existing production entry for this key, then create it fresh.
  local EXISTING
  EXISTING="$(curl -s "${auth[@]}" "${API}/v9/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}" \
    | jq -r --arg k "$NAME" '.envs[]? | select(.key==$k and (.target|index("production"))) | .id')"
  if [ -n "$EXISTING" ]; then
    curl -s -X DELETE "${auth[@]}" "${API}/v9/projects/${PROJECT_ID}/env/${EXISTING}?teamId=${TEAM_ID}" >/dev/null
    echo "replaced existing ${NAME}"
  fi
  printf '%s' "$VALUE" | jq -Rs --arg k "$NAME" '{key:$k, value:., type:"encrypted", target:["production"]}' > /tmp/_vpayload.json
  curl -s -X POST "${auth[@]}" -H "Content-Type: application/json" \
    "${API}/v10/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}&upsert=true" \
    -d @/tmp/_vpayload.json | jq -r 'if .error then "ERROR: \(.error.message)" else "SET \(.key) [\(.target|join(","))] id=\(.id)" end'
  rm -f /tmp/_vpayload.json
}

case "${1:-}" in
  ids)
    resolve_ids
    echo "team_slug=${TEAM_SLUG} team_id=${TEAM_ID}"
    echo "project=${PROJECT_NAME} project_id=${PROJECT_ID}"
    # Prove this project is the one that owns the domain.
    curl -s "${auth[@]}" "${API}/v9/projects/${PROJECT_ID}/domains?teamId=${TEAM_ID}" \
      | jq -r '.domains[]? | "domain: \(.name)"'
    ;;
  envlist)
    resolve_ids
    curl -s "${auth[@]}" "${API}/v9/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}" \
      | jq -r '.envs[]? | "\(.key)\t\(.target|join(","))"'
    ;;
  envset)
    resolve_ids
    set_env_var "${2:?NAME required}" "${3:?VALUE required}"
    ;;
  # Push the Langfuse keys from .env.local straight to Vercel production.
  # The values are read and used entirely inside this script — they are never printed and never
  # interpolated into a command line (which the security scanner blocks, with good reason).
  sync-langfuse)
    resolve_ids
    if [ ! -f .env.local ]; then
      echo "ERROR: .env.local not found (run from the repo root)" >&2
      exit 1
    fi
    set -a
    # shellcheck disable=SC1091
    . ./.env.local
    set +a
    for k in LANGFUSE_PUBLIC_KEY LANGFUSE_SECRET_KEY; do
      v="${!k:-}"
      if [ -z "$v" ]; then
        echo "SKIP  ${k} — still empty in .env.local"
      else
        set_env_var "$k" "$v"
      fi
    done
    ;;
  redeploy)
    resolve_ids
    LATEST="$(curl -s "${auth[@]}" "${API}/v6/deployments?projectId=${PROJECT_ID}&teamId=${TEAM_ID}&target=production&limit=1" | jq -r '.deployments[0].uid')"
    echo "latest production deployment: ${LATEST}"
    curl -s -X POST "${auth[@]}" -H "Content-Type: application/json" \
      "${API}/v13/deployments?teamId=${TEAM_ID}&forceNew=1" \
      -d "{\"name\":\"${PROJECT_NAME}\",\"deploymentId\":\"${LATEST}\",\"target\":\"production\"}" \
      | jq -r 'if .error then "ERROR: \(.error.message)" else "REDEPLOY created id=\(.id // .uid) url=https://\(.url)" end'
    ;;
  *)
    echo "usage: $0 ids|envlist|envset <NAME> <VALUE>|sync-langfuse|redeploy" >&2
    exit 2
    ;;
esac
